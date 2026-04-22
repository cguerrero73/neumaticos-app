/**
 * Tire Inventory Model
 * Modelo para el inventario de neumáticos
 */

export type TireStatus = 'AVAILABLE' | 'RESERVED' | 'USED' | 'DAMAGED';

export interface TireInventoryItem {
  id: string;
  measure: string; // Ej: "205/55R16"
  brand: string; // Ej: "Bridgestone"
  model: string; // Ej: "Potenza RE97AS"
  status: TireStatus;
  dot?: string; // Ej: "2024"
  depth?: number; // Profundidad en mm
  pressure?: number; // Presión recomendada en PSI
}
