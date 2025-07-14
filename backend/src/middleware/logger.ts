import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, url } = req;
    const { statusCode } = res;
    
    const log = `${method} ${url} ${statusCode} - ${duration}ms`;
    
    if (statusCode >= 400) {
      console.error(`❌ ${log}`);
    } else {
      console.log(`✅ ${log}`);
    }
  });
  
  next();
};