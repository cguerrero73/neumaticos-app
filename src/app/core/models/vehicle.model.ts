// Vehicle model - viene de API REST
export interface Vehicle {
  id: string;
  code: string;
  type: string;
  plate: string;
  wheelConfig: string; // Ej: "S1", "D1", "S1-D1"
}

// Tire position model
export interface TirePosition {
  id: string;
  code: string | null;
  position: string;
  hasTire: boolean;
  pressure?: number;
  depth?: number;
}

// Vehicle con neumáticos - respuesta de API
export interface VehicleWithTires extends Vehicle {
  positions: TirePosition[];
}

// Axle definition calculada - para el layout
export interface AxleDefinition {
  type: 'S' | 'D'; // Simple o Doble
  axleIndex: number;
  positions: WheelPosition[];
}

// Posición de cada rueda en el diagrama
export interface WheelPosition {
  side: 'L' | 'R';
  innerIndex: number;
  position: string;
  x: number;
  y: number;
}

// Config parseada
export interface ParsedGroup {
  type: 'S' | 'D';
  count: number;
}

// Options para el layout
export interface LayoutOptions {
  leftEdge: number;
  rightEdge: number;
  wheelSpacing: number;
  sameGroupSpacing: number;
  diffGroupSpacing: number;
  startY: number;
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  leftEdge: 80,
  rightEdge: 220,
  wheelSpacing: 25,
  sameGroupSpacing: 40,
  diffGroupSpacing: 80,
  startY: 30,
};
