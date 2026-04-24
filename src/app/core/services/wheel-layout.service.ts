import {
  AxleDefinition,
  ParsedGroup,
  LayoutOptions,
  DEFAULT_LAYOUT_OPTIONS,
  TirePosition,
} from '../models/vehicle.model';

/**
 * Wheel Layout Service - Lógica de negocio pura
 * Sin dependencias de Angular - reusable en cualquier contexto
 */
export class WheelLayoutService {
  /**
   * Parsea configuración string a grupos
   * "S1-D2" -> [{type: 'S', count: 1}, {type: 'D', count: 2}]
   */
  parseWheelConfig(config: string): ParsedGroup[] {
    if (!config) return [];

    const parts = config.split('-');
    return parts.map((part) => ({
      type: part[0].toUpperCase() as 'S' | 'D',
      count: parseInt(part.slice(1), 10) || 1,
    }));
  }

  /**
   * Calcula posiciones de todos los ejes
   */
  calculateAxles(
    wheelConfig: string,
    options: LayoutOptions = DEFAULT_LAYOUT_OPTIONS,
  ): AxleDefinition[] {
    const parsed = this.parseWheelConfig(wheelConfig);
    if (parsed.length === 0) return [];

    const axles: AxleDefinition[] = [];
    let globalAxleIndex = 0;
    let currentY = options.startY;
    let positionCounter = 1;

    parsed.forEach((group) => {
      for (let i = 0; i < group.count; i++) {
        const isLastOfGroup = i === group.count - 1;

        const positions = this.calculateAxlePositions(
          group.type,
          globalAxleIndex,
          options,
          currentY,
          positionCounter,
        );

        // Actualizar contador según cantidad de ruedas en este eje
        positionCounter += positions.length;

        axles.push({
          type: group.type,
          axleIndex: globalAxleIndex,
          positions,
        });

        currentY += isLastOfGroup ? options.diffGroupSpacing : options.sameGroupSpacing;
        globalAxleIndex++;
      }
    });

    return axles;
  }

  /**
   * Calcula posiciones de ruedas para un eje específico
   */
  private calculateAxlePositions(
    type: 'S' | 'D',
    axleIndex: number,
    options: LayoutOptions,
    y: number,
    positionCounter: number,
  ): AxleDefinition['positions'] {
    const { leftEdge, rightEdge, wheelSpacing } = options;

    const positions: AxleDefinition['positions'] = [];

    if (type === 'S') {
      // Simple: una rueda a cada lado
      positions.push({
        side: 'L',
        innerIndex: 0,
        position: `Eje ${axleIndex + 1} Izq`,
        positionNumber: positionCounter++,
        x: leftEdge,
        y,
      });
      positions.push({
        side: 'R',
        innerIndex: 0,
        position: `Eje ${axleIndex + 1} Der`,
        positionNumber: positionCounter++,
        x: rightEdge,
        y,
      });
    } else {
      // Doble: dos ruedas juntas de cada lado
      positions.push({
        side: 'L',
        innerIndex: 0,
        position: `Eje ${axleIndex + 1} Izq 1`,
        positionNumber: positionCounter++,
        x: leftEdge,
        y,
      });
      positions.push({
        side: 'L',
        innerIndex: 1,
        position: `Eje ${axleIndex + 1} Izq 2`,
        positionNumber: positionCounter++,
        x: leftEdge + wheelSpacing,
        y,
      });
      positions.push({
        side: 'R',
        innerIndex: 0,
        position: `Eje ${axleIndex + 1} Der 1`,
        positionNumber: positionCounter++,
        x: rightEdge - wheelSpacing,
        y,
      });
      positions.push({
        side: 'R',
        innerIndex: 1,
        position: `Eje ${axleIndex + 1} Der 2`,
        positionNumber: positionCounter++,
        x: rightEdge,
        y,
      });
    }

    return positions.sort((a, b) => a.x - b.x);
  }

  /**
   * Genera posiciones de neumáticos desde axles
   * Cada posición tiene un número secuencial 1 a n por vehículo
   */
  generateTirePositions(axles: AxleDefinition[]): TirePosition[] {
    if (axles.length === 0) return [];

    const positions: TirePosition[] = [];
    let tireIdCounter = 1;

    axles.forEach((axle) => {
      axle.positions.forEach((pos) => {
        positions.push({
          id: String(tireIdCounter++),
          code: `PY-${7800 + tireIdCounter}`,
          position: pos.position,
          positionNumber: pos.positionNumber || 1,
          hasTire: true,
          pressure: 32,
          depth: 8.5,
        });
      });
    });

    return positions;
  }

  /**
   * Describe la configuración en texto legible
   */
  describeConfig(wheelConfig: string): string {
    const parsed = this.parseWheelConfig(wheelConfig);
    if (parsed.length === 0) return 'Sin configuración';

    return parsed
      .map((p) =>
        p.count === 1
          ? p.type === 'S'
            ? '1 eje simple'
            : '1 eje doble'
          : p.type === 'S'
            ? `${p.count} ejes simples`
            : `${p.count} ejes dobles`,
      )
      .join(' + ');
  }
}

// Export singleton instance
export const wheelLayoutService = new WheelLayoutService();
