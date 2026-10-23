
const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');

const {
    createShop,
    getMyShops,
    updateShop
} = require('../controllers/shopController');

// List the routes in this order
router.get('/mine', authenticate, getMyShops);
router.post('/', authenticate, createShop);
router.put('/:id', authenticate, updateShop);

module.exports = router;
