const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const app = express();
app.use(express.json());
require('dotenv').config();

// Hàm thử lại kết nối
const connectWithRetry = async () => {
  const pool = new Pool({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: process.env.PORT,
  });

  for (let i = 0; i < 10; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('Connected to order-db');
      return pool;
    } catch (err) {
      console.log(`Failed to connect to order-db, retrying (${i + 1}/10)...`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Chờ 5 giây
    }
  }
  throw new Error('Failed to connect to order-db after 10 attempts');
};

// Khởi tạo pool với retry
let pool;
connectWithRetry().then(p => {
  pool = p;

  app.post('/orders', async (req, res) => {
    const { customer_id, product_id, quantity } = req.body;

    try {
      // Kiểm tra khách hàng
      const customer = await axios.get(`http://api-gateway:80/customers/${customer_id}`);
      if (!customer.data) return res.status(404).json({ message: 'Customer not found' });

      // Kiểm tra sản phẩm và tồn kho
      const product = await axios.get(`http://api-gateway:80/products/${product_id}`);
      if (!product.data || product.data.stock < quantity) {
        return res.status(400).json({ message: 'Product not available' });
      }

      // Tạo đơn hàng
      const result = await pool.query(
        'INSERT INTO orders (customer_id, product_id, quantity, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [customer_id, product_id, quantity, 'pending']
      );

      // Giảm tồn kho (gọi Product Service)
      await axios.put(`http://api-gateway:80/products/${product_id}`, {
        stock: product.data.stock - quantity,
      });

      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  });

  app.get('/orders/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (result.rows.length > 0) res.json(result.rows[0]);
      else res.status(404).json({ message: 'Order not found' });
    } catch (err) {
      res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  });

  app.listen(3002, () => console.log('Order Service running on port 3002'));
}).catch(err => {
  console.error(err.message);
  process.exit(1); // Thoát nếu không kết nối được
});