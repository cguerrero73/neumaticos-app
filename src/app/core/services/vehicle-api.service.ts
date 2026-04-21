import { VehicleWithTires, Vehicle } from '../models/vehicle.model';

/**
 * Vehicle API Service
 * Preparado para REST, actualmente usa mock data
 */
export class VehicleApiService {
  private readonly baseUrl = '/api/vehicles'; // TODO: configurable

  /**
   * Obtiene vehículo por código/placa
   */
  async getVehicle(code: string): Promise<VehicleWithTires> {
    // TODO: reemplazar con llamada real a API
    // return fetch(`${this.baseUrl}/${code}`).then(r => r.json());

    return this.getMockVehicle(code);
  }

  /**
   * Simula escaneo de vehículo
   */
  async scanVehicle(): Promise<VehicleWithTires> {
    const configs = [
      'S1',
      'S2',
      'S3',
      'D1',
      'D2',
      'D3',
      'S1-D1',
      'S1-D2',
      'S2-D1',
      'S1-D1-D1',
      'S1-D2-D3',
      'S1-D3-D3-D3',
      'D1-D1',
      'D2-D2',
      'D1-D2-D3',
    ];

    const plates = ['ABC-123', 'DEF-456', 'GHI-789', 'JKL-012', 'MNO-345', 'PQR-678'];

    const randomConfig = configs[Math.floor(Math.random() * configs.length)];
    const randomPlate = plates[Math.floor(Math.random() * plates.length)];

    return this.getMockVehicle(`${randomPlate}:${randomConfig}`);
  }

  /**
   * Obtiene mock vehicle (para desarrollo)
   */
  private async getMockVehicle(input: string): Promise<VehicleWithTires> {
    let code = input;
    let wheelConfig = 'S1';

    // Parsear formato "codigo:config"
    if (input.includes(':')) {
      const parts = input.split(':');
      code = parts[0];
      wheelConfig = parts[1] || 'S1';
    } else if (/^[SD]\d+(-[SD]\d+)*$/.test(input)) {
      wheelConfig = input;
      code = 'AUTO-' + wheelConfig;
    }

    // Importar servicio de layout para generar posiciones
    const { wheelLayoutService } = await import('./wheel-layout.service');

    const axles = wheelLayoutService.calculateAxles(wheelConfig);
    const positions = wheelLayoutService.generateTirePositions(axles);
    const typeDesc = wheelLayoutService.describeConfig(wheelConfig);

    return {
      id: '1',
      code,
      type: typeDesc,
      plate: code,
      wheelConfig,
      positions,
    };
  }

  /**
   * Actualiza datos de un neumático
   */
  async updateTire(
    vehicleId: string,
    positionId: string,
    data: { pressure?: number; depth?: number; code?: string },
  ): Promise<void> {
    // TODO: PUT /api/vehicles/:id/positions/:positionId
    console.log('Update tire:', vehicleId, positionId, data);
  }

  /**
   * Crea orden de trabajo
   */
  async createWorkOrder(
    vehicleId: string,
    positionId: string,
    type: 'CHANGE' | 'DEPTH',
  ): Promise<void> {
    // TODO: POST /api/work-orders
    console.log('Create work order:', vehicleId, positionId, type);
  }
}

export const vehicleApiService = new VehicleApiService();
