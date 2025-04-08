const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());
require('dotenv').config();

const pool = new Pool({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.PORT,
});

app.post('/products', async (req, res) => {
  const { name, price, description, stock } = req.body;
  const result = await pool.query(
    'INSERT INTO products (name, price, description, stock) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, price, description, stock]
  );
  res.status(201).json(result.rows[0]);
});

app.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  if (result.rows.length > 0) res.json(result.rows[0]);
  else res.status(404).json({ message: 'Product not found' });
});

app.listen(3001, () => console.log('Product Service running on port 3001'));