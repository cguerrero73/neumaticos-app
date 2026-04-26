/**
 * Error Service
 * Manejo centralizado de notificaciones de errores
 */

import { Injectable, signal } from '@angular/core';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class ErrorService {
  private readonly AUTO_DISMISS_MS = 10000; // 10 segundos

  // Cola de notificaciones
  notifications = signal<Toast[]>([]);

  /**
   * Muestra una notificación
   * @param message - Texto a mostrar
   * @param type - Tipo de notificación
   */
  show(message: string, type: ToastType = 'error') {
    const id = this.generateId();
    const toast: Toast = {
      id,
      message,
      type,
      timestamp: Date.now(),
    };

    // Agregar a la cola (máximo 5 visibles)
    this.notifications.update((current) => {
      const updated = [toast, ...current].slice(0, 5);
      return updated;
    });

    // Auto-dismiss después de 10s
    setTimeout(() => {
      this.dismiss(id);
    }, this.AUTO_DISMISS_MS);

    return id;
  }

  /**
   * Cierra una notificación por ID
   */
  dismiss(id: string) {
    this.notifications.update((current) => current.filter((t) => t.id !== id));
  }

  /**
   * Cierra todas las notificaciones
   */
  clearAll() {
    this.notifications.set([]);
  }

  /**
   * Helper para mostrar error
   */
  error(message: string) {
    return this.show(message, 'error');
  }

  /**
   * Helper para mostrar éxito
   */
  success(message: string) {
    return this.show(message, 'success');
  }

  /**
   * Helper para mostrar warning
   */
  warning(message: string) {
    return this.show(message, 'warning');
  }

  /**
   * Helper para mostrar info
   */
  info(message: string) {
    return this.show(message, 'info');
  }

  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export const errorService = new ErrorService();
