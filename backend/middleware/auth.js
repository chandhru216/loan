const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    const secret = process.env.JWT_SECRET || 'loantracker_jwt_secret_key_2025_safe_and_secure';
    const decoded = jwt.verify(token, secret);
    
    if (decoded.id === 'demo-user-12345') {
      req.user = {
        _id: 'demo-user-12345',
        id: 'demo-user-12345',
        name: 'Arjun Sharma',
        email: 'demo@loantracker.com',
        phone: '+91 98765 43210',
        darkMode: false,
        notifications: { emiReminders: true, spendingAlerts: true, monthlyReports: true }
      };
      return next();
    }

    try {
      req.user = await User.findById(decoded.id);
    } catch (err) {
      req.user = null;
    }
    
    if (!req.user) {
      // Fallback for demo user
      req.user = {
        _id: decoded.id || 'demo-user-12345',
        id: decoded.id || 'demo-user-12345',
        name: 'Arjun Sharma',
        email: 'demo@loantracker.com',
        phone: '+91 98765 43210',
        darkMode: false,
        notifications: { emiReminders: true, spendingAlerts: true, monthlyReports: true }
      };
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

module.exports = { protect };
