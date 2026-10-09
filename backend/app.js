const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const meetupRoutes = require('./routes/meetupRoutes');
const rideRoutes = require('./routes/rideRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/meetup', meetupRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api', (_req, res) => {
	res.status(404).json({ success: false, message: 'API endpoint not found' });
});

module.exports = app;