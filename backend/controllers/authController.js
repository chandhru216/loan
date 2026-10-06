const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'loantracker_jwt_secret_key_2025_safe_and_secure';
  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc  Register user
// @route POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, phone });
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        darkMode: user.darkMode,
        notifications: user.notifications,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Login user
// @route POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Demo fallback for cloud deployments without MongoDB connection
    const isDemo = (email === 'demo@loantracker.com' && password === 'demo1234');

    if (mongoose.connection.readyState !== 1 && isDemo) {
      const demoUser = {
        id: 'demo-user-12345',
        name: 'Arjun Sharma',
        email: 'demo@loantracker.com',
        phone: '+91 98765 43210',
        darkMode: false,
        notifications: { emiReminders: true, spendingAlerts: true, monthlyReports: true },
        createdAt: new Date()
      };
      const token = generateToken(demoUser.id);
      return res.json({ success: true, token, user: demoUser });
    }

    let user;
    try {
      user = await User.findOne({ email }).select('+password');
    } catch (err) {
      if (isDemo) {
        const demoUser = {
          id: 'demo-user-12345',
          name: 'Arjun Sharma',
          email: 'demo@loantracker.com',
          phone: '+91 98765 43210',
          darkMode: false,
          notifications: { emiReminders: true, spendingAlerts: true, monthlyReports: true },
          createdAt: new Date()
        };
        const token = generateToken(demoUser.id);
        return res.json({ success: true, token, user: demoUser });
      }
      throw err;
    }

    if (!user) {
      if (isDemo) {
        const demoUser = {
          id: 'demo-user-12345',
          name: 'Arjun Sharma',
          email: 'demo@loantracker.com',
          phone: '+91 98765 43210',
          darkMode: false,
          notifications: { emiReminders: true, spendingAlerts: true, monthlyReports: true },
          createdAt: new Date()
        };
        const token = generateToken(demoUser.id);
        return res.json({ success: true, token, user: demoUser });
      }
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        darkMode: user.darkMode,
        notifications: user.notifications,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    if (req.body?.email === 'demo@loantracker.com' && req.body?.password === 'demo1234') {
      const demoUser = {
        id: 'demo-user-12345',
        name: 'Arjun Sharma',
        email: 'demo@loantracker.com',
        phone: '+91 98765 43210',
        darkMode: false,
        notifications: { emiReminders: true, spendingAlerts: true, monthlyReports: true },
        createdAt: new Date()
      };
      const token = generateToken(demoUser.id);
      return res.json({ success: true, token, user: demoUser });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get current user
// @route GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Update profile
// @route PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, darkMode, notifications } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, darkMode, notifications },
      { new: true, runValidators: true }
    );

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Change password
// @route PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
