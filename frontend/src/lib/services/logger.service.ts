
/**
 * Centralized logging service with environment-based levels
 * Provides structured logging and controls output based on environment
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;

  private constructor() {
    // Set log level based on environment
    this.logLevel = this.getLogLevel();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getLogLevel(): LogLevel {
    const env = process.env.NODE_ENV;
    const appEnv = process.env.APP_ENV;
    
    if (env === 'production' && appEnv === 'production') {
      return LogLevel.ERROR;
    }
    if (env === 'development' || appEnv === 'development') {
      return LogLevel.DEBUG;
    }
    return LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context } = entry;
    const levelName = LogLevel[level];
    let formatted = `[${timestamp}] ${levelName}: ${message}`;
    
    if (context && Object.keys(context).length > 0) {
      formatted += ` | Context: ${JSON.stringify(context)}`;
    }
    
    return formatted;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    
    if (error) {
      console.error(this.formatMessage(entry), error);
    } else {
      console.error(this.formatMessage(entry));
    }

    // In production, you might want to send errors to a service like Sentry
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    console.warn(this.formatMessage(entry));
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    console.info(this.formatMessage(entry));
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    console.debug(this.formatMessage(entry));
  }

  // Convenience methods for common use cases
  apiCall(method: string, url: string, context?: Record<string, unknown>): void {
    this.info(`API ${method.toUpperCase()} ${url}`, context);
  }

  apiError(method: string, url: string, error: Error, context?: Record<string, unknown>): void {
    this.error(`API ${method.toUpperCase()} ${url} failed`, error, context);
  }

  userAction(action: string, context?: Record<string, unknown>): void {
    this.info(`User action: ${action}`, context);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();