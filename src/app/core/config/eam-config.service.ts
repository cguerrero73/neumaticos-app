/**
 * EAM Configuration Service
 * Maneja la configuración por cliente (multi-tenant)
 *
 * IMPORTANTE: La app se conecta al proxy local (/eam/*)
 * que reenvía al servidor Hexagon EAM
 */

import { Injectable, signal } from '@angular/core';

export interface EamConfig {
  // URL del servidor EAM (se usa via proxy en desarrollo)
  eamBaseUrl: string;
  apiKey: string; // API Key del cliente
  tenant: string; // Tenant EAM
  organization: string; // Organization EAM
  // Custom field que contiene la configuración de ruedas (varía por cliente)
  wheelConfigField?: string; // ej: "USERDEFINEDAREA.CUSTOMFIELD[].TEXT_FIELD" o similar
}

const DEFAULT_CONFIG: EamConfig = {
  eamBaseUrl: '',
  apiKey: '',
  tenant: '',
  organization: '',
  wheelConfigField: '',
};

@Injectable({ providedIn: 'root' })
export class EamConfigService {
  private readonly STORAGE_KEY = 'eam_config';

  // Estado reactivo de la configuración
  private _config = signal<EamConfig>(this.loadFromStorage());

  // Computed para acceso fácil
  config = this._config.asReadonly();

  // Flag para saber si está configurado
  isConfigured = () => {
    const c = this._config();
    return c.eamBaseUrl.length > 0 && c.apiKey.length > 0;
  };

  /**
   * Actualiza la configuración
   */
  updateConfig(config: Partial<EamConfig>) {
    const current = this._config();
    const updated = { ...current, ...config };
    this._config.set(updated);
    this.saveToStorage(updated);
  }

  /**
   * Obtiene headers para requests (para el proxy)
   */
  getHeaders(): Record<string, string> {
    const c = this._config();
    return {
      tenant: c.tenant,
      organization: c.organization,
      apiversion: 'v1',
      'X-API-Key': c.apiKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Obtiene URL base del EAM (para el proxy)
   */
  getEamBaseUrl(): string {
    return this._config().eamBaseUrl;
  }

  /**
   * Resetea configuración
   */
  reset() {
    this._config.set(DEFAULT_CONFIG);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private loadFromStorage(): EamConfig {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading EAM config:', e);
    }
    return DEFAULT_CONFIG;
  }

  private saveToStorage(config: EamConfig) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Error saving EAM config:', e);
    }
  }
}

export const eamConfigService = new EamConfigService();
