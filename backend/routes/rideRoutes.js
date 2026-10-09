const express = require('express');
const mongoose = require('mongoose');
const Ride = require('../models/Ride');
const { requireAuth } = require('../middleware/requireAuth');
const { isValidRidePayload } = require('../utils/validation');

const router = express.Router();

router.post('/complete', requireAuth, async (req, res) => {
  try {
    const payload = {
      userId: req.user.userId,
      startLat: Number(req.body.startLat),
      startLon: Number(req.body.startLon),
      endLat: Number(req.body.endLat),
      endLon: Number(req.body.endLon),
      distanceKm: Number(req.body.distanceKm),
      estimatedFare: Number(req.body.estimatedFare),
      actualFarePaid: Number(req.body.actualFarePaid),
    };

    if (!isValidRidePayload(payload)) {
      return res.status(400).json({ success: false, message: 'Valid ride details are required' });
    }

    const ride = await Ride.create(payload);
    return res.status(201).json({
      success: true,
      ride: {
        id: ride._id,
        ...payload,
        date: ride.date,
      },
    });
  } catch (error) {
    console.error('Ride completion error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

router.get('/history', requireAuth, async (req, res) => {
  try {
    const rides = await Ride.find({ userId: req.user.userId }).sort({ date: -1 }).limit(100).lean();
    return res.json({ success: true, rides });
  } catch (error) {
    console.error('Ride history error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'A valid ride ID is required' });
    }

    const deletion = await Ride.deleteOne({
      _id: req.params.id,
      userId: req.user.userId,
    });
    if (deletion.deletedCount !== 1) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Ride deletion error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;