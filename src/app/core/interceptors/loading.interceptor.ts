/**
 * Loading Interceptor
 * Automatiza el manejo de estados de carga para todas las requests HTTP
 * Cada request muestra loading, cuando todas completan (success o error) se oculta
 */

import {
  HttpInterceptorFn,
  HttpHandlerFn,
  HttpRequest,
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { tap, finalize, catchError } from 'rxjs/operators';
import { loadingService } from '../services/loading.service';

/**
 * Interceptor funcional (para Angular 15+)
 * Encadena el loading show/hide automáticamente en cada request
 */
export const loadingInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  // Solo trackear requests HTTP, no eventos internos
  if (req.headers.has('X-No-Loading')) {
    return next(req);
  }

  const message = `${req.method} ${req.url}`;
  loadingService.show(message);

  return next(req).pipe(
    tap({
      // Request exitoso
      next: () => {
        // El finally ya hace hide(), no necesitamos hacer nada aquí
      },
      // Error en request
      error: () => {
        // El finally igualmente hace hide(), pero podemos loguear si queremos
      },
    }),
    finalize(() => {
      loadingService.hide();
    }),
    catchError((error: HttpErrorResponse) => {
      // Acá podemos manejar errores específicos si queremos
      // Por ahora el finalize ya hace el hide()
      return throwError(() => error);
    }),
  );
};

/**
 * Alternativa: interceptor de clase (para casos que necesiten más control)
 */
export class LoadingInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip si tiene header especial
    if (req.headers.has('X-No-Loading')) {
      return next.handle(req);
    }

    const message = `${req.method} ${req.url}`;
    loadingService.show(message);

    return next.handle(req).pipe(
      finalize(() => {
        loadingService.hide();
      }),
    );
  }
}
