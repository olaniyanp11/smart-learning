const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  // Try to get token from cookies
  const token = req.cookies?.token;

  // If no token, redirect to logout/login
  if (!token) {
    console.warn("No JWT token found in cookies.");
    return res.redirect('/logout');
  }

  console.log('Verifying token...');

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");

    // Attach user info to request
    req.user = decoded;
    next(); // Move to next middleware
  } catch (err) {
    const isLoggedIn = false;
    console.error("JWT verification error:", err);

    if (err.name === "TokenExpiredError") {
      req.flash("error", "Session expired, please login again");
    } else {
      req.flash("error", "Invalid token, please login again");
    }

    // Render logout/login page safely
    return res.render('logout', { title: 'Login Page', user: null, isLoggedIn });
  }
}

module.exports = authenticateToken;
