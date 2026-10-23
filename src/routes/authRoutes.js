
const express = require('express');
const router = express.Router();

const { register, login } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);

router.get('/me', authenticate, (req, res) => {
    res.json({ owner: req.owner });
});

module.exports = router;
