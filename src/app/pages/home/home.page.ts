import { Component, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { PlatformService } from '../../core/services/platform.service';
import { wheelLayoutService } from '../../core/services/wheel-layout.service';
import { tireInventoryService } from '../../core/services/tire-inventory.service';
import {
  assetApiService,
  AssetEquipment,
  mapAssetToInfo,
  AssetInfo,
  getAssetField,
} from '../../core/services/asset-api.service';
import { VehicleWithTires, AxleDefinition, TirePosition } from '../../core/models/vehicle.model';
import { TireInventoryItem, TireStatus } from '../../core/models/tire-inventory.model';
import { eamConfigService } from '../../core/config/eam-config.service';

interface TireFilters {
  measure?: string;
  brand?: string;
  status?: TireStatus;
}

interface PendingMovement {
  action: 'REPLACE' | 'SWAP' | 'EXTRACT';
  position: string;
  from?: string;
  to?: string;
  tire: TireInventoryItem;
  originalTire?: TirePosition;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage implements OnInit {
  // Services
  private readonly platformService: PlatformService;

  // State
  manualCode = '';
  manualOrg = '';
  vehicle = signal<VehicleWithTires | null>(null);
  selectedPosition = signal<TirePosition | null>(null);
  assetInfo = signal<AssetInfo | null>(null);

  // Inventory
  inventory = signal<TireInventoryItem[]>([]);
  replacedTires = signal<TireInventoryItem[]>([]);
  filters = signal<TireFilters>({});
  isDraggingOver = signal(false);
  dragTargetPosition = signal<string | null>(null);
  dragData = signal<{ source: 'inventory' | 'diagram'; data: any } | null>(null);
  pendingMovements = signal<PendingMovement[]>([]);

  constructor() {
    this.platformService = new PlatformService();
  }

  ngOnInit() {
    this.loadInventory();
    // Cargar organización guardada
    this.manualOrg = localStorage.getItem('eam_org') || '';
  }

  // Guardar organización cuando cambia
  saveOrg() {
    if (this.manualOrg) {
      localStorage.setItem('eam_org', this.manualOrg);
    }
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

  // Inventory filtrado
  filteredInventory = computed(() => {
    const f = this.filters();
    const items = this.inventory();

    return items.filter((tire) => {
      if (f.measure && !tire.measure.toLowerCase().includes(f.measure.toLowerCase())) {
        return false;
      }
      if (f.brand && tire.brand !== f.brand) {
        return false;
      }
      if (f.status && tire.status !== f.status) {
        return false;
      }
      return true;
    });
  });

  // Cargar inventario
  async loadInventory() {
    const items = await tireInventoryService.getInventory();
    this.inventory.set(items);
  }

  // Detectar si necesita ruedas verticales
  needsVerticalWheels(): boolean {
    return this.platformService.needsVerticalWheels();
  }

  isSelected(position: string): boolean {
    return this.selectedPosition()?.position === position;
  }

  hasTire(position: string): boolean {
    const pos = this.vehicle()?.positions.find((p) => p.position === position);
    return pos?.hasTire ?? false;
  }

  // ===== Drag desde inventario =====
  onDragStart(event: DragEvent, tire: TireInventoryItem) {
    // Crear drag image personalizado
    const dragImg = document.createElement('div');
    dragImg.className = 'drag-image';
    dragImg.innerHTML = `
      <div class="drag-tire-card">
        <div class="drag-measure">${tire.measure}</div>
        <div class="drag-brand">${tire.brand}</div>
      </div>
    `;
    dragImg.style.cssText = `
      position: fixed;
      top: -1000px;
      left: -1000px;
      z-index: 10000;
      pointer-events: none;
    `;

    // Agregar estilos
    const style = document.createElement('style');
    style.textContent = `
      .drag-tire-card {
        background: #1a202c;
        border: 2px solid #48bb78;
        border-radius: 8px;
        padding: 8px 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .drag-measure {
        font-size: 14px;
        font-weight: 700;
      }
      .drag-brand {
        font-size: 11px;
        color: #718096;
      }
    `;
    dragImg.appendChild(style);
    document.body.appendChild(dragImg);

    try {
      event.dataTransfer!.setDragImage(dragImg, 60, 30);
    } catch (e) {
      // setDragImage puede fallar en algunos browsers, ignoramos
    }

    // Limpiar después de un tiempo
    setTimeout(() => dragImg.remove(), 0);

    event.dataTransfer?.setData(
      'application/json',
      JSON.stringify({
        source: 'inventory',
        tire,
      }),
    );
    this.dragData.set({ source: 'inventory', data: tire });
  }

  // ===== Drag desde rueda del diagrama (para swap) =====
  onWheelDragStart(event: DragEvent, position: string) {
    const currentPos = this.vehicle()?.positions.find((p) => p.position === position);
    if (!currentPos || !currentPos.code) {
      event.preventDefault();
      return;
    }

    // Crear drag image personalizado
    const dragImg = document.createElement('div');
    dragImg.className = 'drag-image';
    dragImg.innerHTML = `
      <div class="drag-tire-card">
        <div class="drag-measure">${currentPos.code}</div>
        <div class="drag-brand">${position}</div>
      </div>
    `;
    dragImg.style.cssText = `
      position: fixed;
      top: -1000px;
      left: -1000px;
      z-index: 10000;
      pointer-events: none;
    `;

    const style = document.createElement('style');
    style.textContent = `
      .drag-tire-card {
        background: #1a202c;
        border: 2px solid #e53e3e;
        border-radius: 8px;
        padding: 8px 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .drag-measure {
        font-size: 14px;
        font-weight: 700;
      }
      .drag-brand {
        font-size: 11px;
        color: #718096;
      }
    `;
    dragImg.appendChild(style);
    document.body.appendChild(dragImg);

    try {
      event.dataTransfer!.setDragImage(dragImg, 60, 30);
    } catch (e) {}

    setTimeout(() => dragImg.remove(), 0);

    const dragPayload = {
      source: 'diagram',
      position,
      tireId: currentPos.id,
      tireCode: currentPos.code,
    };

    event.dataTransfer?.setData('application/json', JSON.stringify(dragPayload));
    this.dragData.set({ source: 'diagram', data: dragPayload });
  }

  onWheelDragEnd(event: DragEvent) {
    this.dragData.set(null);
  }

  // ===== Filtros =====
  applyFilters() {
    // La señal se actualiza automáticamente por ngModel
    // Forzamos update para computed
    this.filters.update((f) => ({ ...f }));
  }

  // ===== Drag & Drop por rueda =====
  onWheelDragOver(event: DragEvent, position: string) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer!.dropEffect = 'move';
  }

  onWheelDragEnter(event: DragEvent, position: string) {
    event.preventDefault();
    event.stopPropagation();
    this.dragTargetPosition.set(position);
  }

  onWheelDragLeave(event: DragEvent) {
    this.dragTargetPosition.set(null);
  }

  onWheelDrop(event: DragEvent, targetPosition: string) {
    event.preventDefault();
    event.stopPropagation();
    this.dragTargetPosition.set(null);

    const data = event.dataTransfer?.getData('application/json');
    if (!data) return;

    try {
      const dragItem = JSON.parse(data);
      const vehicle = this.vehicle();
      const currentPos = vehicle?.positions.find((p) => p.position === targetPosition);

      if (dragItem.source === 'inventory') {
        if (currentPos && currentPos.hasTire) {
          // Posición ocupada → REPLACE
          this.replaceTire(targetPosition, dragItem.tire);
        } else {
          // Posición vacía → INSTALAR
          this.installTire(targetPosition, dragItem.tire);
        }
      } else if (dragItem.source === 'diagram') {
        // Intercambiar entre dos posiciones del diagrama
        this.swapTires(targetPosition, dragItem.position);
      }
    } catch (e) {
      console.error('Drop parse error:', e);
    }

    this.dragData.set(null);
  }

  // ===== Reemplazo - aplica inmediatamente =====
  replaceTire(targetPosition: string, newTire: TireInventoryItem) {
    const vehicle = this.vehicle();
    if (!vehicle) return;

    const currentPos = vehicle.positions.find((p) => p.position === targetPosition);

    // Agregar a historial (nuevo arriba)
    this.pendingMovements.update((movements) => [
      {
        action: 'REPLACE',
        position: targetPosition,
        tire: newTire,
        originalTire: currentPos || undefined,
      },
      ...movements,
    ]);

    // Aplicar inmediatamente al vehículo
    const updatedPositions = vehicle.positions.map((pos) => {
      if (pos.position === targetPosition) {
        return {
          ...pos,
          id: newTire.id,
          code: `${newTire.measure} ${newTire.brand}`,
          hasTire: true,
          pressure: newTire.pressure,
          depth: newTire.depth,
        };
      }
      return pos;
    });

    this.vehicle.set({ ...vehicle, positions: updatedPositions });

    // Quitar del inventario
    this.inventory.update((items) => items.filter((t) => t.id !== newTire.id));

    // Si hay neumático actual, mover a reemplazados
    if (currentPos && currentPos.code) {
      const replaced: TireInventoryItem = {
        id: currentPos.id || `R-${Date.now()}`,
        measure: currentPos.code,
        brand: currentPos.code,
        model: '',
        status: 'USED',
      };
      this.replacedTires.update((tires) => [...tires, replaced]);
    }
  }

  // ===== Instalar en posición vacía =====
  installTire(targetPosition: string, newTire: TireInventoryItem) {
    const vehicle = this.vehicle();
    if (!vehicle) return;

    // Agregar a historial
    this.pendingMovements.update((movements) => [
      {
        action: 'EXTRACT',
        position: targetPosition,
        tire: newTire,
        originalTire: undefined,
      },
      ...movements,
    ]);

    // Aplicar inmediatamente
    const updatedPositions = vehicle.positions.map((pos) => {
      if (pos.position === targetPosition) {
        return {
          ...pos,
          id: newTire.id,
          code: `${newTire.measure} ${newTire.brand}`,
          hasTire: true,
          pressure: newTire.pressure,
          depth: newTire.depth,
        };
      }
      return pos;
    });

    this.vehicle.set({ ...vehicle, positions: updatedPositions });
    this.inventory.update((items) => items.filter((t) => t.id !== newTire.id));
  }

  // ===== Swap - aplica inmediatamente =====
  swapTires(pos1: string, pos2: string) {
    const vehicle = this.vehicle();
    if (!vehicle) return;

    const pos1Obj = vehicle.positions.find((p) => p.position === pos1);
    const pos2Obj = vehicle.positions.find((p) => p.position === pos2);

    if (!pos1Obj || !pos2Obj) return;

    // Agregar a historial
    this.pendingMovements.update((movements) => [
      {
        action: 'SWAP',
        position: pos1,
        from: pos1,
        to: pos2,
        tire: {} as TireInventoryItem,
        originalTire: pos2Obj,
      },
      ...movements,
    ]);

    // Aplicar inmediatamente
    const updatedPositions = vehicle.positions.map((pos) => {
      if (pos.position === pos1) {
        return { ...pos, ...pos2Obj };
      }
      if (pos.position === pos2) {
        return { ...pos, ...pos1Obj };
      }
      return pos;
    });

    this.vehicle.set({ ...vehicle, positions: updatedPositions });
  }

  // ===== Métodos para movimientos pendientes =====
  removeMovement(index: number) {
    this.pendingMovements.update((movements) => movements.filter((_, i) => i !== index));
  }

  clearMovements() {
    this.pendingMovements.set([]);
    // Recargar inventario si había usado
    this.loadInventory();
  }

  applyMovements() {
    const movements = this.pendingMovements();
    const vehicle = this.vehicle();

    if (!vehicle || movements.length === 0) return;

    // Aplicar cada movimiento
    let updatedPositions = [...vehicle.positions];

    for (const move of movements) {
      if (move.action === 'REPLACE') {
        // Encontrar y actualizar posición
        updatedPositions = updatedPositions.map((pos) => {
          if (pos.position === move.position) {
            return {
              ...pos,
              id: move.tire.id,
              code: `${move.tire.measure} ${move.tire.brand}`,
              hasTire: true,
              pressure: move.tire.pressure,
              depth: move.tire.depth,
            };
          }
          return pos;
        });

        // Quitar del inventario
        this.inventory.update((items) => items.filter((t) => t.id !== move.tire.id));
      } else if (move.action === 'SWAP' && move.originalTire) {
        // Intercambiar
        const other = updatedPositions.find((p) => p.position === move.to);
        const current = updatedPositions.find((p) => p.position === move.position);

        if (other && current) {
          updatedPositions = updatedPositions.map((pos) => {
            if (pos.position === move.position) {
              return { ...pos, ...other };
            }
            if (pos.position === move.to) {
              return { ...pos, ...current };
            }
            return pos;
          });
        }
      }
    }

    // Actualizar vehículo
    this.vehicle.set({
      ...vehicle,
      positions: updatedPositions,
    });

    // Limpiar movimientos
    const appliedCount = movements.length;
    this.pendingMovements.set([]);

    alert(`Applied ${appliedCount} movements successfully!`);
  }

  simulateScan() {
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

    this.loadVehicleWithConfig(`${randomPlate}:${randomConfig}`);
  }

  loadVehicle() {
    if (this.manualCode.trim()) {
      const input = this.manualCode.trim().toUpperCase();
      this.loadVehicleWithConfig(input);
    }
  }

  loadMockVehicle(code: string) {
    this.loadVehicleWithConfig(code + ':S1');
  }

  async loadVehicleWithConfig(input: string) {
    let code = input.trim().toUpperCase();

    // Intentar buscar en EAM si está configurado
    if (eamConfigService.isConfigured()) {
      try {
        // Guardar organización
        this.saveOrg();

        // Concatenar código + # + organización
        const org = this.manualOrg.trim().toUpperCase();
        const searchCode = org ? `${code}#${org}` : code;

        // Buscar asset en EAM por código (URL encoded)
        const asset = await assetApiService.getAsset(encodeURIComponent(searchCode));

        if (asset) {
          // El asset existe en EAM - cargarlo
          this.loadFromEamAsset(asset);
          this.manualCode = '';
          return;
        } else {
          // No existe en EAM
          this.showToast('Equipo no encontrado en EAM');
          return;
        }
      } catch (e: any) {
        console.error('Error consultando EAM:', e);
        this.showToast(`Error al buscar: ${e.message || 'Intente más tarde'}`);
        return;
      }
    }

    // Fallback: generar mock local (si EAM no está configurado)
    let wheelConfig = 'S1';

    if (input.includes(':')) {
      const parts = input.split(':');
      code = parts[0].toUpperCase();
      wheelConfig = parts[1] || 'S1';
    } else if (/^[SD]\d+(-[SD]\d+)*$/.test(input)) {
      wheelConfig = input;
      code = 'AUTO-' + wheelConfig;
    }

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
    this.loadInventory();
  }

  // Helper para mostrar toast
  private showToast(message: string) {
    // Usar alert por ahora (después podemos usar un toast service)
    alert(message);
  }

  // Cargar vehículo desde asset de EAM
  private loadFromEamAsset(asset: AssetEquipment) {
    // Extraer código del asset - puede ser string o objeto { EQUIPMENTCODE: string }
    const rawAssetId = asset.ASSETID;
    const equipmentCode =
      typeof rawAssetId === 'string'
        ? rawAssetId
        : (rawAssetId as any)?.EQUIPMENTCODE || asset.ASSETNUM || 'UNKNOWN';

    // Extraer tipo - puede ser string o objeto { DESCRIPTION: string }
    const rawType = asset.TYPE;
    const typeDesc =
      typeof rawType === 'string' ? rawType : (rawType as any)?.DESCRIPTION || 'Vehículo';

    // Obtener wheel config del custom field configurado
    const wheelConfigField = eamConfigService.config().wheelConfigField;
    const wheelConfig = wheelConfigField ? getAssetField(asset, wheelConfigField) || 'S1' : 'S1';

    const axles = wheelLayoutService.calculateAxles(wheelConfig);
    const positions = wheelLayoutService.generateTirePositions(axles);

    const vehicle: VehicleWithTires = {
      id: equipmentCode,
      code: equipmentCode,
      type: typeDesc,
      plate: equipmentCode,
      wheelConfig,
      positions,
    };

    // Extraer info formateada para UI
    const info = mapAssetToInfo(asset);

    this.vehicle.set(vehicle);
    this.assetInfo.set(info);
    this.manualCode = '';
    this.loadInventory();
  }

  clearVehicle() {
    this.vehicle.set(null);
    this.selectedPosition.set(null);
    this.replacedTires.set([]);
  }

  selectWheel(axleIndex: number, positionIndex: number) {
    const axles = this.axleDefinitions();
    let globalIndex = 0;

    for (let i = 0; i < axleIndex; i++) {
      globalIndex += axles[i].positions.length;
    }

    const pos = this.vehicle()!.positions[globalIndex + positionIndex];
    this.selectedPosition.set(pos ?? null);
  }

  clearSelection() {
    this.selectedPosition.set(null);
  }

  viewDetail() {
    const pos = this.selectedPosition();
    alert(
      `Detalles del neumático:\nCódigo: ${pos?.code || 'N/A'}\nPresión: ${pos?.pressure || 'N/A'} PSI\nProfundidad: ${pos?.depth || 'N/A'} mm\nPosición: ${pos?.position}`,
    );
  }

  changeTire() {
    alert('Arrastrá un neumático del inventario a la posición deseada');
  }

  createWorkOrder() {
    alert(
      'Crear Orden de Trabajo\nTipo: Cambio de neumático\nPosición: ' +
        this.selectedPosition()?.position,
    );
  }

  registerDepth() {
    alert('Registrar profundidad de dibujo');
  }
}
