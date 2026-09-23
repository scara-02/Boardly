const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Security headers ─────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Multi-Tenant SaaS API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// ── API routes ───────────────────────────────────────────────────
app.use('/api', routes);

// ── 404 handler ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// ── Centralized error handler ────────────────────────────────────
app.use(errorHandler);

module.exports = app;
