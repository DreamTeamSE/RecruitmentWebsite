import { Application, Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const createError = (message: string, statusCode: number = 500): ApiError => {
  const error: ApiError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = createError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

export const globalErrorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
};

export const setupErrorHandlers = (app: Application): void => {
  app.use(notFoundHandler);
  app.use(globalErrorHandler);
};