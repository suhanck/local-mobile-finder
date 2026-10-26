const express = require('express');
const router = express.Router();
const { searchPhones } = require('../controllers/phoneController');

// Public route: no authenticate middleware
router.get('/search', searchPhones);

module.exports = router;