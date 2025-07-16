import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './api/routes/routes';
import { setupMiddleware } from './middleware';
import { setupErrorHandlers } from './middleware/errorHandler';
import { HealthService } from './services/healthService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const ALLOWED_ORIGINS = [
  'http://localhost:3001',
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  /\.amplifyapp\.com$/,
  /\.cloudfront\.net$/
];

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

setupMiddleware(app);

app.get('/health', async (req, res) => {
  try {
    const healthStatus = await HealthService.checkHealth();
    const statusCode = HealthService.getStatusCode(healthStatus);
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check service failed',
      database: {
        connected: false,
        error: 'Health check service error'
      },
      application: {
        version: 'unknown',
        uptime: 0,
        environment: process.env.NODE_ENV || 'development'
      }
    });
  }
});

app.use('/api', router);

setupErrorHandlers(app);

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
