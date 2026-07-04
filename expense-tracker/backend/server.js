const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from backend directory explicitly
dotenv.config({ path: path.join(__dirname, '.env') });

// ✅ Validate critical environment variables at startup
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is not defined in .env — server cannot start');
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error('❌ FATAL: MONGO_URI is not defined in .env — server cannot start');
  process.exit(1);
}

const app = express();

// CORS: support multiple allowed origins (comma-separated CLIENT_URL for deployment)
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} is not allowed`));
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/goals', require('./routes/goals'));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'Expense Tracker API is running' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Expense Tracker API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    console.log(`🔐 JWT auth enabled (expires: ${process.env.JWT_EXPIRE || '7d'})`);
    console.log(`🌐 CORS allowed origins: ${allowedOrigins.join(', ')}`);
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
