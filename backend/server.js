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
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
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
const connectDB = async () => {
  try {
    // Use environment variable or fallback to the provided Railway MongoDB URI
    const connStr = process.env.MONGODB_URI || 'mongodb://mongo:krlXDpEwvHqYqEreBvIMjvCnwsjwTGTA@trolley.proxy.rlwy.net:47875';
    
    await mongoose.connect(connStr, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
    });
    console.log(`✅ MongoDB connected successfully: ${connStr.includes('localhost') ? 'Local' : 'Remote'}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    // Don't exit process in production, just log error so app stays up (though non-functional for DB)
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

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
