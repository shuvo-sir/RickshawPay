const express = require('express');
const User = require('../models/User');
const { createOpaqueToken, hashToken } = require('../utils/auth');

const router = express.Router();

router.post('/register', async (_req, res) => {
  try {
    const userId = `user_${createOpaqueToken(16)}`;
    const token = createOpaqueToken();
    await User.create({ userId, tokenHash: hashToken(token) });
    return res.status(201).json({ success: true, userId, token });
  } catch (error) {
    console.error('Installation registration error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
