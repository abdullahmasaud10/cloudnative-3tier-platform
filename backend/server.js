/**
 * @file server.js
 * @description Enterprise Express REST API for CloudNative 3-Tier Platform
 * @author Abdullah Masaud <abdullahmasaud10@gmail.com>
 */

const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

// Database Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password123@db:5432/umer_pansar'
});

// Middleware
app.use(express.json());

// Enable CORS for decoupling / development environments
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Health-Check Probe (For Container Health & Kubernetes Probes)
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'UP', database: 'CONNECTED', timestamp: new Date() });
  } catch (err) {
    res.status(503).json({ status: 'DOWN', database: 'DISCONNECTED', error: err.message });
  }
});

// GET /api/products - Retrieve all catalog items
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('ERROR: Failed to fetch products:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/orders - Submit customer order
app.post('/api/orders', async (req, res) => {
  const { customer_name, phone, address, total_price, items } = req.body;
  if (!customer_name || !phone || !total_price) {
    return res.status(400).json({ error: 'Missing required order fields' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO orders (customer_name, phone, address, total_price, items) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [customer_name, phone, address || '', total_price, JSON.stringify(items || [])]
    );
    res.status(201).json({ message: 'Order created successfully', orderId: result.rows[0].id });
  } catch (err) {
    console.error('ERROR: Failed to persist order:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/orders - Administrative order retrieval
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('ERROR: Failed to fetch orders:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Graceful Process Lifecycle Management
const server = app.listen(PORT, () => {
  console.log(`[INFO] Application listening on port ${PORT}`);
  console.log(`[INFO] Node environment: ${process.env.NODE_ENV || 'development'}`);
});

process.on('SIGTERM', () => {
  console.log('[INFO] SIGTERM signal received: closing HTTP server gracefully');
  server.close(() => {
    pool.end(() => {
      console.log('[INFO] Database pool disconnected');
      process.exit(0);
    });
  });
});
