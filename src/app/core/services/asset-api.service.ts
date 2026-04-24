/**
 * Asset API Service
 * Integración con EAM via REST directo
 */

import { Injectable } from '@angular/core';
import { eamConfigService } from '../config/eam-config.service';

export interface AssetEquipment {
  ASSETID?: { EQUIPMENTCODE?: string; DESCRIPTION?: string };
  STATUS?: { DESCRIPTION?: string };
  UserDefinedFields?: { UDFCHAR01?: string; UDFCHAR10?: string };
  [key: string]: any;
}

export interface AssetInfo {
  EQUIPMENTCODE: string;
  DESCRIPTION: string;
  STATUSDESCRIPTION: string;
  SETUPDESCRIPTION: string;
}

@Injectable({ providedIn: 'root' })
export class AssetApiService {
  private readonly endpoint = '/eam/assets';

  /**
   * Obtiene un asset por ID
   * @param code - código del asset
   * @param org - organización
   * @returns El ID enviado al endpoint es code#org encoded
   */
  async getAsset(code: string, org: string): Promise<AssetEquipment | null> {
    try {
      // Concatenar code#org y encoder
      const assetId = `${code}#${org}`;
      const encodedId = encodeURIComponent(assetId);

      const response = await this.request<any>('GET', `${this.endpoint}/${encodedId}`);

      // Extraer de: response.Result.ResultData.AssetEquipment
      return response?.Result?.ResultData?.AssetEquipment || null;
    } catch (e) {
      console.error('Error getting asset:', e);
      return null;
    }
  }

  /**
   * Solicitud genérica a la API
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: any,
  ): Promise<T> {
    const url = path;
    const headers = {
      ...eamConfigService.getHeaders(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify({ AssetEquipment: body });
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

export const assetApiService = new AssetApiService();
