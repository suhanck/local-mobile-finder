
const pool = require('../config/db');

const ALLOWED_STATUSES = [
    'in_stock',
    'low',
    'out_of_stock'
];

// 1. Add a new phone listing
const addListing = async (req, res) => {
    let client;
    let transactionStarted = false;

    try {
        client = await pool.connect();

        const ownerId = req.owner.id;

        const {
            shop_id,
            brand,
            model_name,
            ram_gb,
            storage_gb,
            color,
            price,
            stock_status
        } = req.body;

        // Validate required fields
        if (
            shop_id === undefined ||
            typeof brand !== 'string' ||
            !brand.trim() ||
            typeof model_name !== 'string' ||
            !model_name.trim() ||
            ram_gb === undefined ||
            storage_gb === undefined ||
            typeof color !== 'string' ||
            !color.trim() ||
            price === undefined ||
            !stock_status
        ) {
            return res.status(400).json({
                error: 'All listing fields are required'
            });
        }

        // Validate numeric fields
        const shopId = Number(shop_id);
        const ram = Number(ram_gb);
        const storage = Number(storage_gb);
        const listingPrice = Number(price);

        if (
    !Number.isInteger(shopId) ||
    shopId <= 0 ||
    !Number.isInteger(ram) ||
    ram <= 0 ||
    !Number.isInteger(storage) ||
    storage <= 0 ||
    !Number.isFinite(listingPrice) ||
    listingPrice <= 0 ||
    listingPrice > 99999999
) {
            return res.status(400).json({
                error: 'Invalid shop, RAM, storage, or price'
            });
        }

        // Validate stock status
        if (!ALLOWED_STATUSES.includes(stock_status)) {
            return res.status(400).json({
                error: 'Invalid stock status'
            });
        }

        // Check shop ownership
        const shopResult = await pool.query(
            `SELECT id
             FROM shops
             WHERE id = $1 AND owner_id = $2`,
            [shopId, ownerId]
        );

        if (shopResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Shop not found'
            });
        }

        // Start transaction
        await client.query('BEGIN');
        transactionStarted = true;

        // Get existing phone model or create it
        const modelResult = await client.query(
            `INSERT INTO phone_models (brand, model_name)
             VALUES ($1, $2)
             ON CONFLICT (brand, model_name)
             DO UPDATE SET model_name = EXCLUDED.model_name
             RETURNING id`,
            [brand.trim(), model_name.trim()]
        );

        const modelId = modelResult.rows[0].id;

        // Get existing variant or create it
        const variantResult = await client.query(
            `INSERT INTO variants
                (model_id, ram_gb, storage_gb, color)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (model_id, ram_gb, storage_gb, color)
             DO UPDATE SET color = EXCLUDED.color
             RETURNING id`,
            [modelId, ram, storage, color.trim()]
        );

        const variantId = variantResult.rows[0].id;

        // Create or update listing for this shop and variant
        const listingResult = await client.query(
            `INSERT INTO listings
                (shop_id, variant_id, price, stock_status)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (shop_id, variant_id)
             DO UPDATE SET
                price = EXCLUDED.price,
                stock_status = EXCLUDED.stock_status,
                updated_at = NOW()
             RETURNING *`,
            [shopId, variantId, listingPrice, stock_status]
        );

        await client.query('COMMIT');
        transactionStarted = false;

        return res.status(201).json({
            message: 'Listing created or updated successfully',
            listing: listingResult.rows[0]
        });
    } catch (error) {
        if (client && transactionStarted) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error(
                    'Rollback error:',
                    rollbackError.message
                );
            }
        }

        console.error('Add listing error:', error.message);

        return res.status(500).json({
            error: 'Internal server error'
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};


// 2. Get all listings belonging to the logged-in owner
const getMyListings = async (req, res) => {
    try {
        const ownerId = req.owner.id;

        const result = await pool.query(
            `SELECT
                l.id AS listing_id,
                l.shop_id,
                s.name AS shop_name,
                s.city,
                pm.brand,
                pm.model_name,
                v.ram_gb,
                v.storage_gb,
                v.color,
                l.price,
                l.stock_status,
                l.updated_at
             FROM listings l
             JOIN shops s ON l.shop_id = s.id
             JOIN variants v ON l.variant_id = v.id
             JOIN phone_models pm ON v.model_id = pm.id
             WHERE s.owner_id = $1
             ORDER BY l.updated_at DESC`,
            [ownerId]
        );

        return res.status(200).json({
            count: result.rows.length,
            listings: result.rows
        });
    } catch (error) {
        console.error('Get listings error:', error.message);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};


// 3. Update listing price or stock status
const updateListing = async (req, res) => {
    try {
        const listingId = req.params.id;
        const ownerId = req.owner.id;

        const { price, stock_status } = req.body;

        // Validate listing ID
        if (
            !/^[1-9]\d*$/.test(listingId) ||
            !Number.isSafeInteger(Number(listingId))
        ) {
            return res.status(400).json({
                error: 'Invalid listing ID'
            });
        }

        // Require at least one field
        if (price === undefined && stock_status === undefined) {
            return res.status(400).json({
                error: 'Provide price or stock_status to update'
            });
        }

        // Validate price
        if (
            price !== undefined &&
            (
                price === null ||
                price === '' ||
                !Number.isFinite(Number(price)) ||
                Number(price) <= 0
            )
        ) {
            return res.status(400).json({
                error: 'Price must be a positive number'
            });
        }

        // Validate stock status
        if (
            stock_status !== undefined &&
            !ALLOWED_STATUSES.includes(stock_status)
        ) {
            return res.status(400).json({
                error: 'Invalid stock status'
            });
        }

        const result = await pool.query(
            `UPDATE listings
             SET price = COALESCE($1, price),
                 stock_status = COALESCE($2, stock_status),
                 updated_at = NOW()
             WHERE id = $3
               AND shop_id IN (
                   SELECT id
                   FROM shops
                   WHERE owner_id = $4
               )
             RETURNING *`,
            [
                price === undefined ? null : Number(price),
                stock_status === undefined ? null : stock_status,
                Number(listingId),
                ownerId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Listing not found'
            });
        }

        return res.status(200).json({
            message: 'Listing updated successfully',
            listing: result.rows[0]
        });
    } catch (error) {
        console.error('Update listing error:', error.message);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};


// 4. Delete a listing owned by the logged-in owner
const deleteListing = async (req, res) => {
    try {
        const listingId = req.params.id;
        const ownerId = req.owner.id;

        // Validate listing ID
        if (
            !/^[1-9]\d*$/.test(listingId) ||
            !Number.isSafeInteger(Number(listingId))
        ) {
            return res.status(400).json({
                error: 'Invalid listing ID'
            });
        }

        const result = await pool.query(
            `DELETE FROM listings
             WHERE id = $1
               AND shop_id IN (
                   SELECT id
                   FROM shops
                   WHERE owner_id = $2
               )
             RETURNING id`,
            [Number(listingId), ownerId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Listing not found'
            });
        }

        return res.status(200).json({
            message: 'Listing deleted successfully',
            id: result.rows[0].id
        });
    } catch (error) {
        console.error('Delete listing error:', error.message);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};


module.exports = {
    addListing,
    getMyListings,
    updateListing,
    deleteListing
};
