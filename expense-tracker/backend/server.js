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

// CORS: support multiple allowed origins (comma-separated CLIENT_URL)
// Also auto-allows ALL *.vercel.app subdomains (any depth, any branch preview)
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // non-browser (Postman, curl, mobile)
  if (allowedOrigins.includes(origin)) return true;
  // Allow any vercel.app subdomain (handles preview + production URLs)
  if (origin.endsWith('.vercel.app')) return true;
  // Allow localhost on any port for local dev
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
  return false;
};

// Must be registered BEFORE routes so preflight OPTIONS requests get CORS headers
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    console.warn(`🚫 CORS blocked: ${origin}`);
    callback(new Error(`CORS: origin ${origin} is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Explicitly handle OPTIONS preflight for all routes
app.options('*', cors());

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
