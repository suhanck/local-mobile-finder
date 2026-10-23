
require('dotenv').config();

const express = require('express');

const app = express();

const authRoutes = require('./src/routes/authRoutes');

app.use(express.json());

app.use('/api/auth', authRoutes);

app.use('/api/shops', require('./src/routes/shopRoutes'));



app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});


const pool = require('./src/config/db');

app.get('/api/db-test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Database error:', error.message);
        res.status(500).json({ error: 'Database connection failed' });
    }
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
