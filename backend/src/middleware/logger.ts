import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger.service';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, url } = req;
    const { statusCode } = res;
    
    const logMessage = `${method} ${url}`;
    const logContext = { statusCode, duration: `${duration}ms` };
    
    if (statusCode >= 400) {
      logger.error(logMessage, logContext);
    } else {
      logger.info(logMessage, logContext);
    }
  });
  
  next();
};