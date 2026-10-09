const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  startLat: { type: Number, required: true },
  startLon: { type: Number, required: true },
  endLat: { type: Number, required: true },
  endLon: { type: Number, required: true },
  distanceKm: { type: Number, required: true },
  estimatedFare: { type: Number, required: true },
  actualFarePaid: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Ride', rideSchema);