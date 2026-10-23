
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 1. Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                error: 'Name, email and password are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters'
            });
        }

        // 2. Check whether email already exists
        const existing = await pool.query(
            'SELECT id FROM owners WHERE email = $1',
            [email]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({
                error: 'Email already registered'
            });
        }

        // 3. Hash the password
        const hash = await bcrypt.hash(password, 10);

        // 4. Insert the owner into the database
        const result = await pool.query(
            `INSERT INTO owners (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email`,
            [name, email, hash]
        );

        // 5. Return the new owner (without password hash)
        return res.status(201).json({
            message: 'Owner registered successfully',
            owner: result.rows[0]
        });

    } catch (error) {
        console.error('Registration error:', error.message);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};

module.exports = { register };
