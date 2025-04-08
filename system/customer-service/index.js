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

app.post('/customers', async (req, res) => {
  const { name, address, phone, email } = req.body;
  const result = await pool.query(
    'INSERT INTO customers (name, address, phone, email) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, address, phone, email]
  );
  res.status(201).json(result.rows[0]);
});

app.get('/customers/:id', async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
  if (result.rows.length > 0) res.json(result.rows[0]);
  else res.status(404).json({ message: 'Customer not found' });
});

app.listen(3003, () => console.log('Customer Service running on port 3003'));