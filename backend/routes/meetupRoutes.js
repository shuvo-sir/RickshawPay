const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const Meetup = require('../models/Meetup');
const { createOpaqueToken, hashToken, safeTokenEquals } = require('../utils/auth');
const { isValidCoordinate, isValidMeetupCode } = require('../utils/validation');

const router = express.Router();

router.post('/create', requireAuth, async (req, res) => {
  try {
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ success: false, message: 'Valid coordinates are required' });
    }

    let code = createOpaqueToken(16);
    let exists = await Meetup.findOne({ code });
    while (exists) {
      code = createOpaqueToken(16);
      exists = await Meetup.findOne({ code });
    }

    const ownerToken = createOpaqueToken();
    const meetup = new Meetup({
      code,
      latitude,
      longitude,
      ownerUserId: req.user.userId,
      ownerTokenHash: hashToken(ownerToken),
    });
    await meetup.save();
    return res.json({ success: true, code, ownerToken });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

router.post('/update', requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    if (!isValidMeetupCode(code) || !isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ success: false, message: 'A valid meetup code and coordinates are required' });
    }

    const ownerToken = req.get('x-meetup-owner-token');
    const meetup = await Meetup.findOne({ code, ownerUserId: req.user.userId });
    if (!meetup || typeof ownerToken !== 'string' || !safeTokenEquals(meetup.ownerTokenHash, hashToken(ownerToken))) {
      return res.status(403).json({ success: false, message: 'Only the meetup owner can update this location' });
    }
    meetup.latitude = latitude;
    meetup.longitude = longitude;
    await meetup.save();
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false });
  }
});

router.get('/:code', requireAuth, async (req, res) => {
  try {
    const { code } = req.params;
    const meetup = await Meetup.findOne({ code });

    if (meetup) {
      return res.json({ success: true, latitude: meetup.latitude, longitude: meetup.longitude });
    }
    return res.status(404).json({ success: false, message: 'Code not found or expired' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

router.delete('/:code', requireAuth, async (req, res) => {
  try {
    const { code } = req.params;
    if (!isValidMeetupCode(code)) {
      return res.status(400).json({ success: false, message: 'A valid meetup code is required' });
    }

    const ownerToken = req.get('x-meetup-owner-token');
    const meetup = await Meetup.findOne({ code, ownerUserId: req.user.userId }).select('ownerTokenHash').lean();
    if (!meetup || typeof ownerToken !== 'string' || !safeTokenEquals(meetup.ownerTokenHash, hashToken(ownerToken))) {
      return res.status(403).json({ success: false, message: 'Only the meetup owner can delete this code' });
    }

    const deletion = await Meetup.deleteOne({ code, ownerUserId: req.user.userId });
    return res.json({ success: true, deleted: deletion.deletedCount === 1 });
  } catch (error) {
    console.error('Meetup code deletion error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;