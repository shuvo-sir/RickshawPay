const User = require('../models/User');
const { getBearerToken, hashToken } = require('../utils/auth');

async function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication is required' });
  }

  try {
    const user = await User.findOne({ tokenHash: hashToken(token) }).select('userId').lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }
    req.user = user;
    return next();
  } catch (error) {
    console.error('Authentication lookup error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
}

module.exports = { requireAuth };
