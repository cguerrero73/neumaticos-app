import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { PlatformService } from '../../core/services/platform.service';
import { wheelLayoutService } from '../../core/services/wheel-layout.service';
import { VehicleWithTires, AxleDefinition, TirePosition } from '../../core/models/vehicle.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  // Services
  private readonly platformService: PlatformService;

  // State
  manualCode = '';
  vehicle = signal<VehicleWithTires | null>(null);
  showContextMenu = signal(false);
  selectedPosition = signal<TirePosition | null>(null);
  selectedIndex = signal(0);

  constructor() {
    this.platformService = new PlatformService();
  }

  // Delegar cálculo de ejes al servicio
  axleDefinitions = computed(() => {
    const v = this.vehicle();
    if (!v) return [];
    return wheelLayoutService.calculateAxles(v.wheelConfig || 'S1');
  });

  // Delegar posiciones de neumáticos al servicio
  tirePositions = computed(() => {
    const axles = this.axleDefinitions();
    if (axles.length === 0) return [];
    return wheelLayoutService.generateTirePositions(axles);
  });

  // Detectar si necesita ruedas verticales
  needsVerticalWheels(): boolean {
    return this.platformService.needsVerticalWheels();
  }

  // Calcular índice global de la rueda
  getGlobalIndex(axleIndex: number, positionIndex: number): number {
    const axles = this.axleDefinitions();
    let globalIndex = 0;

    for (let i = 0; i < axleIndex; i++) {
      globalIndex += axles[i].positions.length;
    }

    return globalIndex + positionIndex;
  }

  simulateScan() {
    // Lista de configuraciones posibles
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

    // Seleccionar una al azar
    const randomConfig = configs[Math.floor(Math.random() * configs.length)];
    const plates = ['ABC-123', 'DEF-456', 'GHI-789', 'JKL-012', 'MNO-345', 'PQR-678'];
    const randomPlate = plates[Math.floor(Math.random() * plates.length)];

    this.loadVehicleWithConfig(`${randomPlate}:${randomConfig}`);
  }

  loadVehicle() {
    if (this.manualCode.trim()) {
      // Soporta formato: "S1" o "S1-D2" o "codigo:S1-D2"
      const input = this.manualCode.trim().toUpperCase();
      this.loadVehicleWithConfig(input);
    }
  }

  loadMockVehicle(code: string) {
    this.loadVehicleWithConfig(code + ':S1');
  }

  loadVehicleWithConfig(input: string) {
    let code = input;
    let wheelConfig = 'S1';

    // Parsear formato "codigo:config" o solo "config"
    if (input.includes(':')) {
      const parts = input.split(':');
      code = parts[0];
      wheelConfig = parts[1] || 'S1';
    } else if (/^[SD]\d+(-[SD]\d+)*$/.test(input)) {
      wheelConfig = input;
      code = 'AUTO-' + wheelConfig;
    }

    // Usar servicio para obtener description
    const typeDesc = wheelLayoutService.describeConfig(wheelConfig);
    const axles = wheelLayoutService.calculateAxles(wheelConfig);
    const positions = wheelLayoutService.generateTirePositions(axles);

    const mock: VehicleWithTires = {
      id: '1',
      code,
      type: typeDesc,
      plate: code,
      wheelConfig,
      positions,
    };

    this.vehicle.set(mock);
    this.manualCode = '';
  }

  clearVehicle() {
    this.vehicle.set(null);
  }

  openContextMenu(event: MouseEvent, index: number) {
    this.selectedPosition.set(this.vehicle()!.positions[index]);
    this.selectedIndex.set(index);
    this.showContextMenu.set(true);
  }

  closeContextMenu() {
    this.showContextMenu.set(false);
    this.selectedPosition.set(null);
  }

  viewDetail() {
    const pos = this.selectedPosition();
    alert(
      `Detalles del neumático:\nCódigo: ${pos?.code || 'N/A'}\nPresión: ${pos?.pressure || 'N/A'} PSI\nProfundidad: ${pos?.depth || 'N/A'} mm\nPosición: ${pos?.position}`,
    );
    this.closeContextMenu();
  }

  changeTire() {
    alert('Cambiar neumáticocreando nuevo código RFID...');
    this.closeContextMenu();
  }

  createWorkOrder() {
    alert(
      'Crear Orden de Trabajo\nTipo: Cambio de neumático\nPosición: ' +
        this.selectedPosition()?.position,
    );
    this.closeContextMenu();
  }

  registerDepth() {
    alert('Registrar profundidad de dibujo');
    this.closeContextMenu();
  }
}
