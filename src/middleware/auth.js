
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
    const header = req.headers.authorization;

    // Check whether the Authorization header exists
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Access denied. No token provided'
        });
    }

    // Extract the token after "Bearer "
    const token = header.split(' ')[1];

    try {
        // Verify the token using our JWT secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach the logged-in owner's details to the request
        req.owner = decoded;

        // Allow the request to continue
        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Invalid or expired token'
        });
    }
};

module.exports = { authenticate };
