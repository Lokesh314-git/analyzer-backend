import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.routes.js';
import { syncManager } from './services/synchronization/syncManager.js';
import { getSheetConfig } from './config/sheets.config.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Production CORS origin determination
const configuredOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean)
  : [];

const localOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, server-to-server, curl, health probes)
    if (!origin) return callback(null, true);

    // If FRONTEND_URL is unset, '*', or in non-production, allow all origins
    if (process.env.NODE_ENV !== 'production' || configuredOrigins.length === 0 || configuredOrigins.includes('*')) {
      return callback(null, true);
    }

    const cleanOrigin = origin.replace(/\/+$/, '');
    if (configuredOrigins.includes(cleanOrigin) || localOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
  credentials: true
};

// Security & middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root health check endpoint for Render Web Service probes & monitoring
app.get('/health', (req, res) => {
  const syncState = syncManager.getSyncState();
  res.status(200).json({
    status: 'ok',
    service: 'semester-marks-backend',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    sheetsIntegration: {
      status: syncState.status,
      lastSuccessfulSync: syncState.lastSuccessfulSync || null
    }
  });
});

// Strict academic data privacy: prevent caching of student records in all downstream caches
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// API routes
app.use('/api', apiRoutes);

// Error handling middleware (safely logs without leaking student PII)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', err.message || 'An unexpected error occurred.');
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : (err.message || 'An unexpected error occurred.')
  });
});

// Bind explicitly to 0.0.0.0 for Render container networking
const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`Semester Marks Analytics Backend running on port ${PORT}`);
  console.log(`Root health endpoint: http://localhost:${PORT}/health`);
  console.log(`API health endpoint:  http://localhost:${PORT}/api/health`);
  console.log(`Live Google Sheets direct fetching active (no cache)`);
  if (configuredOrigins.length > 0) {
    console.log(`Allowed CORS origins: ${configuredOrigins.join(', ')}`);
  }
  console.log(`====================================================`);

  // Initial connectivity check to Google Sheets at startup
  syncManager.getFreshStudentData().then(res => {
    console.log(`Initial Google Sheets Connectivity: ${res.success ? 'SUCCESS' : 'NOTICE'}`);
    if (res.success) {
      console.log(`Verified Live Spreadsheet: ${res.students.length} students loaded.`);
    } else {
      console.log(`Initial check note: ${res.error}`);
    }
  }).catch(err => {
    console.warn(`Initial Google Sheets connectivity note: ${err.message}`);
  });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default app;
