
const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');

const {
    addListing,
    getMyListings,
    updateListing,
    deleteListing
} = require('../controllers/listingController');

router.post('/', authenticate, addListing);
router.get('/', authenticate, getMyListings);
router.put('/:id', authenticate, updateListing);
router.delete('/:id', authenticate, deleteListing);

module.exports = router;
