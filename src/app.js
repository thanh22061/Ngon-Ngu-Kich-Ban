const express = require('express');
const cors = require('cors');
const path = require('path');
const { CLIENT_URL } = require('./config/environment');
const errorHandler = require('./middleware/error.middleware');
const ApiError = require('./utils/apiError');

const app = express();

// Middlewares
app.use(
  cors({
    origin: [CLIENT_URL, 'http://localhost:5000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve Frontend static files
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'SportZone API Server is healthy and running!',
    timestamp: new Date().toISOString(),
  });
});

// Import and mount all API routes
const apiRoutes = require('./routes');
app.use('/api/v1', apiRoutes);

// Handle 404 for undefined API routes
app.use('/api/*', (req, res, next) => {
  next(ApiError.notFound(`Không tìm thấy đường dẫn API ${req.originalUrl} trên máy chủ`));
});

// Serve SPA Frontend for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
