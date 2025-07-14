import express, { Application } from 'express';
import { requestLogger } from './logger';

export const setupMiddleware = (app: Application): void => {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  if (process.env.NODE_ENV !== 'test') {
    app.use(requestLogger);
  }
};