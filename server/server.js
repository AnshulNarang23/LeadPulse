const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const leadRoutes = require('./routes/leadRoutes');
const seedDatabase = require('./seed/seeder');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found.' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

const PORT = process.env.PORT || 5000;

// Connect to Mongo and start server if not imported by Jest
if (process.env.NODE_ENV !== 'test') {
  const startServer = async () => {
    let mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      try {
        console.log('No MONGODB_URI provided. Starting MongoMemoryServer fallback for standalone local execution...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        mongoUri = mongod.getUri();
        console.log(`MongoMemoryServer running at: ${mongoUri}`);
      } catch (err) {
        console.error('Could not start MongoMemoryServer fallback:', err);
      }
    }

    try {
      await mongoose.connect(mongoUri || 'mongodb://127.0.0.1:27017/lead_management');
      console.log('MongoDB connected successfully.');
      await seedDatabase();
      app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
      });
    } catch (err) {
      console.error('MongoDB connection error:', err);
    }
  };

  startServer();
}

module.exports = app;
