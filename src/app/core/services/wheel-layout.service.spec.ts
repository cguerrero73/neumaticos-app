import { describe, it, expect, beforeEach } from 'vitest';
import { WheelLayoutService } from './wheel-layout.service';

describe('WheelLayoutService', () => {
  let service: WheelLayoutService;

  beforeEach(() => {
    service = new WheelLayoutService();
  });

  describe('parseWheelConfig', () => {
    it('should return empty array for empty string', () => {
      expect(service.parseWheelConfig('')).toEqual([]);
    });

    it('should return empty array for null/undefined', () => {
      expect(service.parseWheelConfig(null as any)).toEqual([]);
      expect(service.parseWheelConfig(undefined as any)).toEqual([]);
    });

    it('should parse single simple axle S1', () => {
      const result = service.parseWheelConfig('S1');
      expect(result).toEqual([{ type: 'S', count: 1 }]);
    });

    it('should parse double axle D1', () => {
      const result = service.parseWheelConfig('D1');
      expect(result).toEqual([{ type: 'D', count: 1 }]);
    });

    it('should parse multiple axles S1-D2', () => {
      const result = service.parseWheelConfig('S1-D2');
      expect(result).toEqual([
        { type: 'S', count: 1 },
        { type: 'D', count: 2 },
      ]);
    });

    it('should convert lowercase to uppercase', () => {
      const result = service.parseWheelConfig('s1-d2');
      expect(result).toEqual([
        { type: 'S', count: 1 },
        { type: 'D', count: 2 },
      ]);
    });

    it('should default count to 1 if not specified', () => {
      const result = service.parseWheelConfig('S-D');
      expect(result).toEqual([
        { type: 'S', count: 1 },
        { type: 'D', count: 1 },
      ]);
    });
  });

  describe('calculateAxles', () => {
    it('should return empty array for empty config', () => {
      expect(service.calculateAxles('')).toEqual([]);
    });

    it('should calculate single simple axle', () => {
      const axles = service.calculateAxles('S1');
      expect(axles.length).toBe(1);
      expect(axles[0].type).toBe('S');
      expect(axles[0].positions.length).toBe(2); // 2 wheels (L + R)
    });

    it('should calculate single double axle', () => {
      const axles = service.calculateAxles('D1');
      expect(axles.length).toBe(1);
      expect(axles[0].type).toBe('D');
      expect(axles[0].positions.length).toBe(4); // 4 wheels (2L + 2R)
    });

    it('should calculate multiple axles', () => {
      const axles = service.calculateAxles('S1-D1');
      expect(axles.length).toBe(2);
      expect(axles[0].type).toBe('S');
      expect(axles[1].type).toBe('D');
    });

    it('should assign correct position numbers', () => {
      const axles = service.calculateAxles('S1');
      const positions = axles[0].positions;

      // Position numbers should be sequential across the axle
      expect(positions[0].positionNumber).toBe(1);
      expect(positions[1].positionNumber).toBe(2);
    });

    it('should assign correct position numbers across multiple axles', () => {
      const axles = service.calculateAxles('S1-D1');

      // Simple axle (2 wheels): positions 1, 2
      expect(axles[0].positions[0].positionNumber).toBe(1);
      expect(axles[0].positions[1].positionNumber).toBe(2);

      // Double axle (4 wheels): positions 3, 4, 5, 6
      expect(axles[1].positions[0].positionNumber).toBe(3);
    });

    it('should sort positions by x coordinate within each axle', () => {
      const axles = service.calculateAxles('D1');
      const positions = axles[0].positions;

      // Left positions should come before right positions (sorted by x)
      const xValues = positions.map((p) => p.x);
      expect(xValues).toEqual([...xValues].sort((a, b) => a - b));
    });
  });

  describe('generateTirePositions', () => {
    it('should return empty array for empty axles', () => {
      const result = service.generateTirePositions([]);
      expect(result).toEqual([]);
    });

    it('should generate correct number of positions', () => {
      const axles = service.calculateAxles('S1');
      const positions = service.generateTirePositions(axles);

      expect(positions.length).toBe(2); // S1 has 2 wheels
    });

    it('should assign unique IDs', () => {
      const axles = service.calculateAxles('S1-D1');
      const positions = service.generateTirePositions(axles);

      const ids = positions.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should set hasTire to true by default', () => {
      const axles = service.calculateAxles('S1');
      const positions = service.generateTirePositions(axles);

      positions.forEach((p) => {
        expect(p.hasTire).toBe(true);
      });
    });

    it('should include position number from axle definition', () => {
      const axles = service.calculateAxles('S1');
      const positions = service.generateTirePositions(axles);

      const positionNumbers = positions.map((p) => p.positionNumber);
      expect(positionNumbers).toEqual([1, 2]);
    });
  });

  describe('describeConfig', () => {
    it('should return "Sin configuración" for empty config', () => {
      expect(service.describeConfig('')).toBe('Sin configuración');
    });

    it('should describe single simple axle', () => {
      expect(service.describeConfig('S1')).toBe('1 eje simple');
    });

    it('should describe single double axle', () => {
      expect(service.describeConfig('D1')).toBe('1 eje doble');
    });

    it('should describe multiple axles', () => {
      expect(service.describeConfig('S1-D1')).toBe('1 eje simple + 1 eje doble');
    });

    it('should describe plural for multiple same type', () => {
      expect(service.describeConfig('S2')).toBe('2 ejes simples');
      expect(service.describeConfig('D2')).toBe('2 ejes dobles');
    });
  });
});
