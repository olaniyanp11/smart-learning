const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

function redirectIfAuthenticated(req, res, next) {
  const token = req.cookies.token;

  if (!token) return next(); // Not authenticated, continue to login/register

  console.log('Checking token for redirect...');

  jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret", (err, decoded) => {
    if (err) {
      // Invalid or expired token → treat as not authenticated
      res.clearCookie('token');
      return next();
    }

    req.user = decoded; // Attach user data

    // ✅ Safe to use decoded.role here
    const dashboard = decoded.role === 'admin'
      ? '/admin/dashboard'
      : '/user';

    return res.redirect(dashboard);
  });
}

module.exports = redirectIfAuthenticated;
