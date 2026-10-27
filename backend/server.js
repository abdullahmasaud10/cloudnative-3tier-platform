const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Connection Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/umer_pansar'
});

// 1. Health Check Endpoint (For Kubernetes Probes)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        store: 'Umer Pansar & Dry Fruits',
        owner: 'Muhammad Umer (0312-9484670)',
        timestamp: new Date().toISOString()
    });
});

// 2. Get Products (With Category & Search Filter)
app.get('/api/products', async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = 'SELECT * FROM products';
        const params = [];
        const conditions = [];

        if (category && category !== 'All') {
            params.push(category);
            conditions.push(`category = $${params.length}`);
        }
        if (search) {
            params.push(`%${search}%`);
            conditions.push(`(name_en ILIKE $${params.length} OR name_ur ILIKE $${params.length})`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY id ASC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('DB Error:', err.message);
        res.status(500).json({ error: 'Database query failed' });
    }
});

// 3. Customer Place Order (Stored in PostgreSQL)
app.post('/api/orders', async (req, res) => {
    const { customer_name, phone, address, items, total_price } = req.body;
    try {
        const query = `
            INSERT INTO orders (customer_name, phone, address, items, total_price, status)
            VALUES ($1, $2, $3, $4, $5, 'Pending')
            RETURNING id, customer_name, phone, address, items, total_price, status, created_at;
        `;
        const values = [customer_name, phone, address || 'Store Pickup / N/A', items, total_price];
        const result = await pool.query(query, values);

        console.log(`🛒 [NEW ORDER] ID: #${result.rows[0].id} | Customer: ${customer_name} | Rs ${total_price}`);
        res.status(201).json({
            success: true,
            message: 'Order placed successfully and recorded in PostgreSQL!',
            order: result.rows[0]
        });
    } catch (err) {
        console.error('Order Insert Error:', err.message);
        res.status(500).json({ error: 'Failed to record order' });
    }
});

// 4. Admin: Get All Orders (Sorted by newest first)
app.get('/api/admin/orders', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Admin Orders Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// 5. Admin: Update Order Status (Pending -> Dispatched -> Delivered)
app.patch('/api/admin/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const result = await pool.query(
            'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        console.log(`📦 [STATUS UPDATE] Order #${id} -> ${status}`);
        res.json({ success: true, order: result.rows[0] });
    } catch (err) {
        console.error('Admin Status Update Error:', err.message);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// 6. Admin: Dashboard Analytics & Statistics
app.get('/api/admin/stats', async (req, res) => {
    try {
        const ordersRes = await pool.query(`
            SELECT 
                COUNT(*) as total_orders,
                COALESCE(SUM(total_price), 0) as total_revenue,
                COUNT(*) FILTER (WHERE status = 'Pending') as pending_orders,
                COUNT(*) FILTER (WHERE status = 'Dispatched') as dispatched_orders,
                COUNT(*) FILTER (WHERE status = 'Delivered') as delivered_orders
            FROM orders;
        `);
        const productsRes = await pool.query('SELECT COUNT(*) as total_products FROM products;');

        res.json({
            orders: ordersRes.rows[0],
            products: productsRes.rows[0]
        });
    } catch (err) {
        console.error('Admin Stats Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
});

// Listen on Port
app.listen(PORT, () => {
    console.log(`🚀 Umer Pansar Enterprise Backend running on port ${PORT}`);
    console.log(`📦 Shop Owner: Muhammad Umer | 0312-9484670`);
});
