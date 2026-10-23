
const pool = require('../config/db');

// Create a shop for the logged-in owner
const createShop = async (req, res) => {
    try {
        const {
            name,
            address,
            city,
            phone,
            latitude,
            longitude
        } = req.body;

        if (!name || !address || !city || !phone) {
            return res.status(400).json({
                error: 'Name, address, city and phone are required'
            });
        }

        // Get the owner ID from the verified JWT, not the request body
        const ownerId = req.owner.id;

        const result = await pool.query(
            `INSERT INTO shops
             (owner_id, name, address, city, phone, latitude, longitude)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                ownerId,
                name,
                address,
                city,
                phone,
                latitude ?? null,
                longitude ?? null
            ]
        );

        return res.status(201).json({
            message: 'Shop created successfully',
            shop: result.rows[0]
        });
    } catch (error) {
        console.error('Create shop error:', error.message);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};

// Get shops belonging only to the logged-in owner
const getMyShops = async (req, res) => {
    try {
        const ownerId = req.owner.id;

        const result = await pool.query(
            'SELECT * FROM shops WHERE owner_id = $1 ORDER BY id',
            [ownerId]
        );

        return res.status(200).json({
            shops: result.rows
        });
    } catch (error) {
        console.error('Get shops error:', error.message);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};

// Update a shop only if it belongs to the logged-in owner
const updateShop = async (req, res) => {
    try {
        const shopId = req.params.id;
        const ownerId = req.owner.id;

        const {
            name,
            address,
            city,
            phone,
            latitude,
            longitude
        } = req.body;

        if (!name || !address || !city || !phone) {
            return res.status(400).json({
                error: 'Name, address, city and phone are required'
            });
        }

        const result = await pool.query(
            `UPDATE shops
             SET name = $1,
                 address = $2,
                 city = $3,
                 phone = $4,
                 latitude = $5,
                 longitude = $6
             WHERE id = $7 AND owner_id = $8
             RETURNING *`,
            [
                name,
                address,
                city,
                phone,
                latitude ?? null,
                longitude ?? null,
                shopId,
                ownerId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Shop not found'
            });
        }

        return res.status(200).json({
            message: 'Shop updated successfully',
            shop: result.rows[0]
        });
    } catch (error) {
        console.error('Update shop error:', error.message);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};

module.exports = {
    createShop,
    getMyShops,
    updateShop
};
