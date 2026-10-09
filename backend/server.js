require('dotenv').config();

const app = require('./app');
const { connectDatabase } = require('./config/database');

async function startServer() {
  try {
    await connectDatabase();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Backend startup failed: MongoDB connection is required.', error.message);
    process.exitCode = 1;
  }
}

void startServer();