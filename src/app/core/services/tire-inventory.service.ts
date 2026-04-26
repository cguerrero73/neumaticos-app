/**
 * Tire Inventory Service
 * Gestiona el inventario de cubiertas disponibles
 * Preparado para REST, actualmente usa mock data
 */

import { TireInventoryItem, TireStatus } from '../models/tire-inventory.model';
import { loggerService } from './logger.service';

export class TireInventoryService {
  private readonly baseUrl = '/api/tire-inventory';

  /**
   * Obtiene inventario de neumáticos con filtros
   */
  async getInventory(filters?: {
    measure?: string;
    brand?: string;
    status?: TireStatus;
  }): Promise<TireInventoryItem[]> {
    // TODO: reemplazar con llamada real a API
    // return fetch(...).then(r => r.json());

    return this.getMockInventory(filters);
  }

  /**
   * Obtiene lista de neumáticos reemplazos (los que se quitaron del vehículo)
   */
  async getReplacedTires(): Promise<TireInventoryItem[]> {
    // Por ahora vacío - se llena cuando se hace drag & drop
    return [];
  }

  /**
   * Agrega un neumático a la lista de reemplazados
   */
  async addReplacedTire(tire: TireInventoryItem): Promise<void> {
    // Por ahora en memoria - después persistir a API
    loggerService.debug('Added replaced tire', tire);
  }

  /**
   * Marca un neumático como usado (no disponible)
   */
  async markAsUsed(tireId: string): Promise<void> {
    // TODO: PUT /api/tire-inventory/:id/status
    loggerService.debug('Mark as used', { tireId });
  }

  /**
   * Mock inventory data
   */
  private getMockInventory(filters?: {
    measure?: string;
    brand?: string;
    status?: TireStatus;
  }): TireInventoryItem[] {
    const all: TireInventoryItem[] = [
      // Bridgestone
      {
        id: 'T001',
        measure: '195/65R15',
        brand: 'Bridgestone',
        model: 'Potenza RE97AS',
        status: 'AVAILABLE',
        dot: '2024',
        depth: 8.5,
        pressure: 32,
      },
      {
        id: 'T002',
        measure: '205/55R16',
        brand: 'Bridgestone',
        model: 'Potenza RE97AS',
        status: 'AVAILABLE',
        dot: '2024',
        depth: 9.0,
        pressure: 32,
      },
      {
        id: 'T003',
        measure: '225/45R17',
        brand: 'Bridgestone',
        model: 'Potenza S001',
        status: 'AVAILABLE',
        dot: '2024',
        depth: 7.5,
        pressure: 32,
      },
      {
        id: 'T004',
        measure: '215/60R16',
        brand: 'Bridgestone',
        model: 'Turanza ER30',
        status: 'RESERVED',
        dot: '2023',
        depth: 6.0,
        pressure: 30,
      },

      // Michelin
      {
        id: 'T005',
        measure: '195/65R15',
        brand: 'Michelin',
        model: 'Primacy 4',
        status: 'AVAILABLE',
        dot: '2024',
        depth: 8.0,
        pressure: 32,
      },
      {
        id: 'T006',
        measure: '205/55R16',
        brand: 'Michelin',
        model: 'Primacy 4',
        status: 'AVAILABLE',
        dot: '2024',
        depth: 8.5,
        pressure: 32,
      },
      {
        id: 'T007',
        measure: '225/50R17',
        brand: 'Michelin',
        model: 'Pilot Sport 4',
        status: 'AVAILABLE',
        dot: '2024',
        depth: 7.0,
        pressure: 33,
      },
      {
        id: 'T008',
        measure: '235/45R18',
        brand: 'Michelin',
        model: 'Pilot Sport 4S',
        status: 'AVAILABLE',
        dot: '2024',
        depth: 8.0,
        pressure: 33,
      },

      // Goodyear
      {
        id: 'T009',
        measure: '195/65R15',
        brand: 'Goodyear',
        model: 'Eagle Sport',
        status: 'AVAILABLE',
        dot: '2024',
        depth: 8.0,
        pressure: 32,
      },
      {
        id: 'T010',
        measure: '205/60R16',
        brand: 'Goodyear',
        model: 'Eagle Sport',
        status: 'AVAILABLE',
        dot: '2024',
        depth: 7.5,
        pressure: 32,
      },
      {
        id: 'T011',
        measure: '215/55R17',
        brand: 'Goodyear',
        model: 'Eagle F1',
        status: 'AVAILABLE',
        dot: '2023',
        depth: 5.5,
        pressure: 31,
      },
      {
        id: 'T012',
        measure: '225/45R17',
        brand: 'Goodyear',
        model: 'Eagle F1 Asymmetric',
        status: 'RESERVED',
        dot: '2024',
        depth: 7.0,
        pressure: 32,
      },

      // Continental
      {
        id: 'T013',
        measure: '205/55R16',
        brand: 'Continental',
        model: 'ContiPremiumContact 5',
        status: 'AVAILABLE',
        dot: '2024',
        depth: 8.5,
        pressure: 32,
      },
      {
        id: 'T014',
        measure: '225/45R17',
        brand: 'Continental',
        model: 'ContiSportContact 5',
        status: 'AVAILABLE',
        dot: '2024',
        depth: 7.5,
        pressure: 33,
      },
      {
        id: 'T015',
        measure: '235/40R18',
        brand: 'Continental',
        model: 'SportContact 6',
        status: 'AVAILABLE',
        dot: '2024',
        depth: 8.0,
        pressure: 33,
      },
      {
        id: 'T016',
        measure: '215/60R17',
        brand: 'Continental',
        model: 'ContiCrossContact LX',
        status: 'USED',
        dot: '2022',
        depth: 3.5,
        pressure: 30,
      },

      // Pirelli
      {
        id: 'T017',
        measure: '195/65R15',
        brand: 'Pirelli',
        model: 'P7 Cinturato',
        status: 'AVAILABLE',
        dot: '2024',
        depth: 8.0,
        pressure: 32,
      },
      {
        id: 'T018',
        measure: '205/55R17',
        brand: 'Pirelli',
        model: 'P7 Cinturato',
        status: 'AVAILABLE',
        dot: '2024',
        depth: 7.5,
        pressure: 32,
      },
      {
        id: 'T019',
        measure: '245/40R18',
        brand: 'Pirelli',
        model: 'P Zero',
        status: 'AVAILABLE',
        dot: '2024',
        depth: 8.5,
        pressure: 34,
      },
      {
        id: 'T020',
        measure: '275/35R19',
        brand: 'Pirelli',
        model: 'P Zero Corsa',
        status: 'AVAILABLE',
        dot: '2024',
        depth: 9.0,
        pressure: 35,
      },
    ];

    // Apply filters
    let result = [...all];

    if (filters?.measure) {
      const m = filters.measure.toLowerCase();
      result = result.filter((t) => t.measure.toLowerCase().includes(m));
    }

    if (filters?.brand) {
      const b = filters.brand.toLowerCase();
      result = result.filter((t) => t.brand.toLowerCase() === b);
    }

    if (filters?.status) {
      result = result.filter((t) => t.status === filters.status);
    } else {
      // Por defecto solo disponibles
      result = result.filter((t) => t.status === 'AVAILABLE');
    }

    return result;
  }
}

export const tireInventoryService = new TireInventoryService();
