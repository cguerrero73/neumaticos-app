/**
 * Logging Service
 * Centralized logging with levels for better debugging
 */

import { Injectable, signal } from '@angular/core';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
}

@Injectable({ providedIn: 'root' })
export class LoggerService {
  // Log entries for debugging (keep last 100)
  logs = signal<LogEntry[]>([]);

  private readonly isDevelopment = true; // Set to false in production

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
    };

    // Add to history
    this.logs.update((logs) => [...logs.slice(-99), entry]);

    // Console output in development
    if (this.isDevelopment) {
      const prefix = `[${level.toUpperCase()}]`;
      switch (level) {
        case 'debug':
          console.debug(prefix, message, data ?? '');
          break;
        case 'info':
          console.info(prefix, message, data ?? '');
          break;
        case 'warn':
          console.warn(prefix, message, data ?? '');
          break;
        case 'error':
          console.error(prefix, message, data ?? '');
          break;
      }
    }
  }

  clearLogs() {
    this.logs.set([]);
  }
}

// Global instance for non-Angular contexts
export const loggerService = new LoggerService();
