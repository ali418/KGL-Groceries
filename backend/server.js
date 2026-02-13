const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
      styleSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://ui-avatars.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Swagger Documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

// Basic Auth Middleware for Swagger
const basicAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="KGL API Docs"');
    return res.status(401).send('Authentication required');
  }

  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  const user = auth[0];
  const pass = auth[1];

  // Default credentials (should be in .env)
  const validUser = process.env.DOCS_USER || 'admin';
  const validPass = process.env.DOCS_PASSWORD || 'password123';

  if (user === validUser && pass === validPass) {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="KGL API Docs"');
    return res.status(401).send('Authentication required');
  }
};

app.use('/api-docs', basicAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Logging
app.use(morgan('combined'));

// Database connection
// Database connection string logic
const getDbConnectionString = () => {
  return process.env.MONGODB_URI || 'mongodb://mongo:krlXDpEwvHqYqEreBvIMjvCnwsjwTGTA@trolley.proxy.rlwy.net:47875';
};

let dbConnectionError = null;
const connectDB = async () => {
  const connStr = getDbConnectionString();
  
  // Log masked connection string for debugging
  if (!process.env.MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI not found in environment variables. Using provided fallback.');
  }
  const maskedStr = connStr.replace(/:([^:@]+)@/, ':****@');
  console.log(`Attempting to connect to MongoDB: ${maskedStr}`);

  try {
    // Add event listeners for better debugging
    mongoose.connection.on('connecting', () => { console.log('⏳ MongoDB connecting...'); });
    mongoose.connection.on('connected', () => { console.log('✅ MongoDB connected'); });
    mongoose.connection.on('disconnected', () => { console.log('❌ MongoDB disconnected'); });
    mongoose.connection.on('error', (err) => { 
      console.error('❌ MongoDB connection error event:', err); 
      dbConnectionError = err.message;
    });

    await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 30000, // Keep high timeout
      socketTimeoutMS: 45000,
      authSource: 'admin',
      // Removed directConnection and family: 4 to let driver auto-detect best settings for the proxy
    });
    
    // Explicitly set null on success (though event listener handles logging)
    dbConnectionError = null;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    dbConnectionError = error.message;
    // Retry logic
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Middleware to check DB connection status
app.use((req, res, next) => {
  // Allow health check and debug routes even if DB is down
  if (req.path === '/api/health' || req.path === '/api/debug/db') {
    return next();
  }

  if (mongoose.connection.readyState !== 1) {
    const connStr = getDbConnectionString();
    const maskedStr = connStr.replace(/:([^:@]+)@/, ':****@');
    
    return res.status(503).json({
      message: 'Service Unavailable: Database connection not established',
      ready_state: mongoose.connection.readyState,
      ready_state_text: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
      last_error: dbConnectionError,
      env_uri_set: !!process.env.MONGODB_URI,
      using_uri: maskedStr
    });
  }
  next();
});

// DB Debug Route
app.get('/api/debug/db', (req, res) => {
  const connStr = getDbConnectionString();
  const maskedStr = connStr.replace(/:([^:@]+)@/, ':****@');
  
  res.status(200).json({
    readyState: mongoose.connection.readyState,
    readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
    lastError: dbConnectionError,
    env_uri_set: !!process.env.MONGODB_URI,
    using_uri: maskedStr
  });
});

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Sales Route
const salesRoutes = require('./routes/sales');
app.use('/api/sales', salesRoutes);

// Produce Route (Helper for Dropdowns)
const produceRoutes = require('./routes/produce');
app.use('/api/produce', produceRoutes);

// User Management Route
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// Branch Route (Helper)
const branchRoutes = require('./routes/branches');
app.use('/api/branches', branchRoutes);

// Credit Sales Route (SRD Requirement)
const creditSalesRoutes = require('./routes/creditSales');
app.use('/api/credit-sales', creditSalesRoutes);

// Reports Route (SRD Requirement)
const reportsRoutes = require('./routes/reports');
app.use('/api/reports', reportsRoutes);

// Seed Route (To populate DB on remote server)
const seedRoutes = require('./routes/seed');
app.use('/api/seed', seedRoutes);



// Procurement Exercise Route (Capstone)
const procurementRoutes = require('./routes/procurement');
app.use('/kgl/procurement', procurementRoutes);

app.use(express.static(path.resolve(__dirname, '../frontend')));
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/login.html'));
});

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'KGL Groceries API is running',
    timestamp: new Date().toISOString()
  });
});

// JSON Parse Error Handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Bad JSON:', err.message);
    return res.status(400).json({ message: 'Bad Request: Invalid JSON syntax' });
  }
  next(err);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'API endpoint not found'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
});
connectDB();

module.exports = app;
