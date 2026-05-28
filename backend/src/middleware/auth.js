const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

// Authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Bug fix: JWTs must respect expiration and use only the configured secret.
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add user details to request object
    req.user = decoded;
    next();
  } catch (error) {
    // Bug fix: do not leak token verification details to the client.
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

// Role authorization middleware
const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. User context missing.' });
    }

    // Role-based verification
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden. Requires role: ${roles.join(' or ')}` });
    }

    next();
  };
};

const authorizeAdminOnlyLegacy = authorize('ADMIN'); 

module.exports = {
  authenticate,
  authorize,
  authorizeAdminOnlyLegacy,
};
