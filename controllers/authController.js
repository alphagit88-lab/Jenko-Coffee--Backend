const User = require('../models/User');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

exports.login = async (req, res) => {
  try {
    const { email, username, phone, password } = req.body;
    const identifier = email || username || phone;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide credentials' });
    }

    let user;
    if (email) user = await User.findByEmail(email);
    if (!user && username) user = await User.findByUsername(username);
    if (!user && phone) user = await User.findByPhone(phone);
    if (!user && !email && !username && !phone) return res.status(400).json({ success: false, message: 'Missing login credentials' });

    if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or you are not a staff member' });
    }

    const isMatch = await User.verifyPassword(user, password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('🔴 LOGIN ERROR:', error.message, error.code, error.detail);
    res.status(500).json({ success: false, message: 'Server Error', detail: error.message });
  }
};

// Get Admin Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('🔴 GET PROFILE ERROR:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Update Admin Profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const userId = req.user.id;

    if (password) {
      const hashedPassword = await User.hashPassword(password);
      await User.updatePassword(userId, hashedPassword);
    }

    const updatedUser = await User.update(userId, { name, email });
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('🔴 UPDATE PROFILE ERROR:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
