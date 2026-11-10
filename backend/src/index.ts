import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.routes.js';
import { syncManager } from './services/synchronization/syncManager.js';
import { getSheetConfig } from './config/sheets.config.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Strict academic data privacy: prevent caching of student records in all downstream caches
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// API routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`Semester Marks Analytics Backend running on port ${PORT}`);
  console.log(`Health endpoint: http://localhost:${PORT}/api/health`);
  console.log(`Live Google Sheets direct fetching active (no cache)`);
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

