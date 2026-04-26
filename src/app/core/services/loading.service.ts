/**
 * Loading Service
 * Estado centralizado de carga para la UI
 * Usa contador de requests para manejar múltiples requests concurrentes
 */

import { Injectable, signal, computed } from '@angular/core';

export type LoadingType = 'spinner' | 'skeleton' | 'progress';

export interface LoadingState {
  active: boolean;
  type: LoadingType;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class LoadingService {
  // Contador de requests activos
  private activeRequests = signal(0);

  // Timeout para cleanup automático
  private readonly TIMEOUT_MS = 30000; // 30 segundos

  // Estado de UI (deprecated, usar isActive())
  state = signal<LoadingState>({ active: false, type: 'spinner' });

  // Historial de estados (para debugging)
  history = signal<{ timestamp: number; message: string }[]>([]);

  /**
   * Computed que indica si hay loading activo
   */
  isActive = computed(() => this.activeRequests() > 0);

  /**
   * Incrementa el contador de requests
   */
  show(message = 'Cargando...', type: LoadingType = 'spinner') {
    this.activeRequests.update((n) => n + 1);
    this.state.set({ active: true, type, message });
    this.addHistory(`+1 REQUEST: ${message} (total: ${this.activeRequests()})`);
  }

  /**
   * Decrementa el contador de requests
   */
  hide() {
    this.activeRequests.update((n) => Math.max(0, n - 1));
    const remaining = this.activeRequests();
    const current = this.state();

    if (remaining === 0) {
      this.state.set({ active: false, type: 'spinner' });
    }

    this.addHistory(`-1 REQUEST (restantes: ${remaining})`);
  }

  /**
   * Wrapper para operaciones async
   * Nota: para HttpClient, usar interceptor - esto es solo para casos especiales
   */
  async wrap<T>(operation: () => Promise<T>, message = 'Cargando...'): Promise<T> {
    this.show(message);
    try {
      return await operation();
    } finally {
      this.hide();
    }
  }

  /**
   * Versión con safety net para promises externas
   */
  trackRequest<T>(promise: Promise<T>, message = 'Cargando...'): Promise<T> {
    this.show(message);

    // Safety net: si no se llama hide() en 30s, forzar cleanup
    const timeoutId = setTimeout(() => {
      console.warn(`[LoadingService] Safety net: request "${message}" did not complete in time`);
      this.hide();
    }, this.TIMEOUT_MS);

    return promise.finally(() => {
      clearTimeout(timeoutId);
      this.hide();
    });
  }

  private addHistory(entry: string) {
    this.history.update((h) => [...h.slice(-19), { timestamp: Date.now(), message: entry }]);
  }
}

export const loadingService = new LoadingService();
