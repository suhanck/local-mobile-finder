const pool = require('../config/db');

// Only these strings can ever reach ORDER BY (prevents SQL injection)
const SORT_OPTIONS = {
    price_asc: 'l.price ASC',
    price_desc: 'l.price DESC',
    newest: 'l.updated_at DESC'
};

const searchPhones = async (req, res) => {
    try {
        const { q, city, minPrice, maxPrice, sort } = req.query;

        // Pagination: page >= 1, limit between 1 and 50
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
        const offset = (page - 1) * limit;

        const conditions = [];
        const values = [];

        // Text search on brand + model name
        if (typeof q === 'string' && q.trim()) {
            values.push(`%${q.trim()}%`);
            conditions.push(
                `(pm.brand || ' ' || pm.model_name) ILIKE $${values.length}`
            );
        }

        // City filter
        if (typeof city === 'string' && city.trim()) {
            values.push(city.trim());
            conditions.push(`s.city ILIKE $${values.length}`);
        }

        // Price filters
        if (minPrice !== undefined) {
    const price = Number(minPrice);

    if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
            error: 'minPrice must be a non-negative number'
        });
    }

    values.push(price);
    conditions.push(`l.price >= $${values.length}`);
}

       if (maxPrice !== undefined) {
    const price = Number(maxPrice);

    if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
            error: 'maxPrice must be a non-negative number'
        });
    }

    values.push(price);
    conditions.push(`l.price <= $${values.length}`);
}


        if (
    minPrice !== undefined &&
    maxPrice !== undefined &&
    Number(minPrice) > Number(maxPrice)
) {
    return res.status(400).json({
        error: 'minPrice cannot be greater than maxPrice'
    });
}

        const whereClause = conditions.length
            ? 'WHERE ' + conditions.join(' AND ')
            : '';

        const orderBy = SORT_OPTIONS[sort] || 'l.price ASC';

        // LIMIT and OFFSET also go through placeholders
        values.push(limit);
        const limitPlaceholder = `$${values.length}`;
        values.push(offset);
        const offsetPlaceholder = `$${values.length}`;

        const result = await pool.query(
            `SELECT
                l.id AS listing_id,
                pm.brand,
                pm.model_name,
                v.ram_gb,
                v.storage_gb,
                v.color,
                l.price,
                l.stock_status,
                l.updated_at,
                s.id AS shop_id,
                s.name AS shop_name,
                s.address,
                s.city,
                s.phone,
                COUNT(*) OVER() AS total_count
             FROM listings l
             JOIN shops s ON l.shop_id = s.id
             JOIN variants v ON l.variant_id = v.id
             JOIN phone_models pm ON v.model_id = pm.id
             ${whereClause}
             ORDER BY ${orderBy}
             LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
            values
        );

        const total = result.rows.length ? Number(result.rows[0].total_count) : 0;

        const results = result.rows.map(({ total_count, ...row }) => ({
            ...row,
            maps_link:
                'https://www.google.com/maps/search/?api=1&query=' +
                encodeURIComponent(`${row.shop_name}, ${row.address}, ${row.city}`)
        }));

        return res.status(200).json({
            page,
            limit,
            total,
            count: results.length,
            results
        });
    } catch (error) {
        console.error('Search error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { searchPhones };