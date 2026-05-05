/**
 * Barcode Scanner Service
 * Wrapper para @capacitor-mlkit/barcode-scanning v8
 * Provee API simple para escanear códigos de barras y QR
 */

import { Injectable } from '@angular/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

export interface ScanResult {
  code: string;
  format?: string;
}

export enum ScanErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  CAMERA_UNAVAILABLE = 'CAMERA_UNAVAILABLE',
  SCANNER_UNAVAILABLE = 'SCANNER_UNAVAILABLE',
  UNKNOWN = 'UNKNOWN',
}

export class ScanError extends Error {
  constructor(
    message: string,
    public readonly code: ScanErrorCode,
  ) {
    super(message);
    this.name = 'ScanError';
  }
}

/**
 * Resultado de verificar disponibilidad del scanner
 */
export interface AvailabilityResult {
  available: boolean;
  reason?: string;
}

@Injectable({ providedIn: 'root' })
export class BarcodeScannerService {
  /**
   * Verifica si el scanner está disponible (cámara + permisos)
   */
  async isAvailable(): Promise<AvailabilityResult> {
    try {
      // Verificar si el plugin está disponible
      const isSupported = await BarcodeScanner.isSupported();
      if (!isSupported.supported) {
        return {
          available: false,
          reason: 'Barcode scanning is not supported on this device',
        };
      }

      // Verificar permisos de cámara
      const status = await BarcodeScanner.checkPermissions();
      if (status.camera !== 'granted') {
        return {
          available: false,
          reason: 'Camera permission not granted',
        };
      }

      return { available: true };
    } catch (error) {
      return {
        available: false,
        reason: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Solicita permisos de cámara
   */
  async requestPermissions(): Promise<'granted' | 'denied' | 'prompt'> {
    const result = await BarcodeScanner.requestPermissions();
    // Map the actual camera permission states to our simplified types
    switch (result.camera) {
      case 'granted':
        return 'granted';
      case 'denied':
        return 'denied';
      default:
        return 'prompt';
    }
  }

  /**
   * Escanea un código de barras o QR
   * @returns El código escaneado
   * @throws ScanError si hay error de permisos o scanner
   */
  async scan(): Promise<ScanResult> {
    // Verificar disponibilidad primero
    const availability = await this.isAvailable();
    if (!availability.available) {
      if (availability.reason?.includes('permission')) {
        throw new ScanError(
          'Camera permission denied. Please enable camera access in your device settings.',
          ScanErrorCode.PERMISSION_DENIED,
        );
      }
      throw new ScanError(
        availability.reason || 'Scanner is not available',
        ScanErrorCode.SCANNER_UNAVAILABLE,
      );
    }

    try {
      // Usar el método scan() que devuelve ScanResult directamente
      const result = await BarcodeScanner.scan();

      if (result.barcodes && result.barcodes.length > 0) {
        const barcode = result.barcodes[0];
        if (!barcode.rawValue) {
          throw new ScanError('No barcode or QR code detected', ScanErrorCode.UNKNOWN);
        }
        return {
          code: barcode.rawValue,
          format: String(barcode.format),
        };
      }

      // No se detectó ningún código
      throw new ScanError('No barcode or QR code detected', ScanErrorCode.UNKNOWN);
    } catch (error: any) {
      if (error instanceof ScanError) {
        throw error;
      }

      // Manejar errores de permisos
      if (error?.message?.includes('permission') || error?.code === 'CAMERA_PERMISSION_DENIED') {
        throw new ScanError(
          'Camera permission denied. Please enable camera access in your device settings.',
          ScanErrorCode.PERMISSION_DENIED,
        );
      }

      throw new ScanError(this.getErrorMessage(error), ScanErrorCode.UNKNOWN);
    }
  }

  /**
   * Detiene el scanner si está activo
   */
  async stopScan(): Promise<void> {
    try {
      await BarcodeScanner.stopScan();
    } catch (error) {
      // Ignorar errores al detener
      console.warn('[BarcodeScannerService] stopScan error:', error);
    }
  }

  /**
   * Convierte errores a mensajes legibles
   */
  private getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }
    if (error?.message) {
      return error.message;
    }
    if (error?.code) {
      const codeMessages: Record<string, string> = {
        CAMERA_PERMISSION_DENIED: 'Camera permission denied',
        CAMERA_UNAVAILABLE: 'Camera is not available on this device',
        SCANNER_UNAVAILABLE: 'Barcode scanner is not available',
      };
      return codeMessages[error.code] || `Scanner error: ${error.code}`;
    }
    return 'An unknown error occurred during scanning';
  }
}

export const barcodeScannerService = new BarcodeScannerService();
