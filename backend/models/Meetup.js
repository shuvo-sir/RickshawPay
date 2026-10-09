const mongoose = require('mongoose');

const meetupSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  ownerUserId: { type: String, required: true, index: true },
  ownerTokenHash: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  createdAt: { type: Date, expires: 3600, default: Date.now },
});

module.exports = mongoose.model('Meetup', meetupSchema);