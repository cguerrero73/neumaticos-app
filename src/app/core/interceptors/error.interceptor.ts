/**
 * Error Interceptor
 * Handles HTTP errors with categorization and retry logic
 */

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, retry, throwError, timer } from 'rxjs';
import { errorService } from '../services/error.service';
import { loggerService } from '../services/logger.service';

export type ErrorCategory =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'server'
  | 'unknown';

export interface CategorizedError {
  category: ErrorCategory;
  message: string;
  statusCode?: number;
  isRetryable: boolean;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

/**
 * Categorizes an HTTP error into a specific type
 */
export function categorizeError(error: HttpErrorResponse): CategorizedError {
  const statusCode = error.status;

  // Network errors (0 = no response, CORS issues, etc.)
  if (statusCode === 0 || error.statusText === 'Unknown Error') {
    return {
      category: 'network',
      message: 'Error de conexión. Verificá tu red e intentá de nuevo.',
      statusCode,
      isRetryable: true,
    };
  }

  // Timeout
  if (statusCode === 0 && error.message?.includes('timeout')) {
    return {
      category: 'timeout',
      message: 'La solicitud tardó demasiado. Intentá de nuevo.',
      statusCode,
      isRetryable: true,
    };
  }

  // 401 Unauthorized
  if (statusCode === 401) {
    return {
      category: 'unauthorized',
      message: 'Sesión expirada. Por favor, volvé a iniciar.',
      statusCode,
      isRetryable: false,
    };
  }

  // 403 Forbidden
  if (statusCode === 403) {
    return {
      category: 'forbidden',
      message: 'No tenés permisos para realizar esta acción.',
      statusCode,
      isRetryable: false,
    };
  }

  // 404 Not Found
  if (statusCode === 404) {
    return {
      category: 'not_found',
      message: 'El recurso solicitado no fue encontrado.',
      statusCode,
      isRetryable: false,
    };
  }

  // 400 Bad Request (validation errors)
  if (statusCode === 400) {
    return {
      category: 'validation',
      message: error.error?.message || 'Datos inválidos. Verificá la información.',
      statusCode,
      isRetryable: false,
    };
  }

  // 500+ Server errors
  if (statusCode >= 500) {
    return {
      category: 'server',
      message: 'Error del servidor. Intentá más tarde.',
      statusCode,
      isRetryable: true,
    };
  }

  // Default
  return {
    category: 'unknown',
    message: error.message || 'Ocurrió un error inesperado.',
    statusCode,
    isRetryable: false,
  };
}

/**
 * Error Interceptor Functional
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip error handling for certain endpoints (e.g., health checks)
  if (req.headers.has('X-No-Error-Handling')) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const categorized = categorizeError(error);

      // Log the error
      loggerService.error(`HTTP Error [${categorized.category}]`, {
        url: req.url,
        status: categorized.statusCode,
        error: error.message,
      });

      // Show toast for user-facing errors
      errorService.error(categorized.message);

      // Re-throw with categorized info attached
      return throwError(() => ({
        ...error,
        categorized,
      }));
    }),
  );
};

/**
 * Retry interceptor for transient failures
 * Automatically retries retryable requests up to MAX_RETRIES times
 */
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip retry for non-idempotent requests
  if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'DELETE') {
    return next(req);
  }

  // Skip retry for certain requests
  if (req.headers.has('X-No-Retry')) {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count: MAX_RETRIES,
      delay: (error, retryCount) => {
        loggerService.info(`Retry attempt ${retryCount} for ${req.url}`);
        return timer(RETRY_DELAY_MS * retryCount); // Use timer to create observable delay
      },
    }),
    catchError((error: HttpErrorResponse) => {
      loggerService.error(`All retries exhausted for ${req.url}`, {
        error: error.message,
        status: error.status,
      });
      return throwError(() => error);
    }),
  );
};
