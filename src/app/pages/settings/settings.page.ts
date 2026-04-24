import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EamConfig, eamConfigService } from '../../core/config/eam-config.service';
import { assetApiService } from '../../core/services/asset-api.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
})
export class SettingsPage implements OnInit {
  // Configuración actual (copia para editar)
  config: EamConfig = {
    eamBaseUrl: '',
    apiKey: '',
    tenant: '',
    organization: '',
    wheelConfigField: '',
  };

  // Estado de UI
  testing = signal(false);
  saving = signal(false);
  currentConfig = signal<EamConfig | null>(null);

  // Resultados
  testResult: { success: boolean; message: string } | null = null;
  saveResult: { success: boolean; message: string } | null = null;

  ngOnInit() {
    // Cargar config actual
    const saved = eamConfigService.config();
    if (saved.eamBaseUrl) {
      this.config = { ...saved };
      this.currentConfig.set(saved);
    }
  }

  async testConnection() {
    this.testing.set(true);
    this.testResult = null;

    try {
      // Guardar temporalmente para probar
      eamConfigService.updateConfig(this.config);

      // Intentar obtener asset de prueba
      const asset = await assetApiService.getAsset('TEST');

      this.testResult = {
        success: !!asset,
        message: asset ? `Conexión exitosa! Asset: ${asset.ASSETID}` : 'No se encontraron assets',
      };
    } catch (e: any) {
      this.testResult = {
        success: false,
        message: `Error: ${e.message || 'No se pudo conectar'}`,
      };
    } finally {
      this.testing.set(false);
    }
  }

  save() {
    this.saving.set(true);

    try {
      eamConfigService.updateConfig(this.config);
      this.currentConfig.set({ ...this.config });

      this.saveResult = {
        success: true,
        message: 'Configuración guardada correctamente.',
      };

      // Limpiar mensaje después de 3 seg
      setTimeout(() => {
        this.saveResult = null;
      }, 3000);
    } catch (e: any) {
      this.saveResult = {
        success: false,
        message: `Error: ${e.message}`,
      };
    } finally {
      this.saving.set(false);
    }
  }

  maskUrl(url: string): string {
    if (!url) return '-';
    try {
      const u = new URL(url);
      return `${u.protocol}//${u.host}/...`;
    } catch {
      return url;
    }
  }

  maskValue(value: string): string {
    if (!value) return '-';
    if (value.length <= 8) return '****';
    return value.substring(0, 4) + '****' + value.substring(value.length - 4);
  }
}
