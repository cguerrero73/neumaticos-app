/**
 * Asset API Service
 * Integración con EAM AssetEquipment API
 */

import { Injectable } from '@angular/core';
import { eamConfigService, EamConfig } from '../config/eam-config.service';

/**
 * Respuesta de la API Assets
 */
/**
 * Datos extraídos del equipo para mostrar en UI
 */
export interface AssetInfo {
  EQUIPMENTCODE: string;
  DESCRIPTION: string;
  STATUSDESCRIPTION: string;
  TYPEDESCRIPTION?: string;
}

/**
 * Interfaz que refleja la estructura real del API de EAM
 */
export interface EamAssetId {
  EQUIPMENTCODE?: string;
  ORGANIZATIONID?: { ORGANIZATIONCODE?: string; DESCRIPTION?: string };
}

export interface EamStatus {
  STATUSCODE?: string;
  DESCRIPTION?: string;
}

export interface EamType {
  TYPECODE?: string;
  DESCRIPTION?: string;
}

export interface PartAssociation {
  PARTID?: string;
  PARTNUMBER?: string;
  PARTDESCRIPTION?: string;
  QUANTITY?: number;
  POSITION?: string;
}

export interface FleetVehicleInfo {
  ISVEHICLE?: string;
  VEHICLESTATUS?: string;
  VEHICLETYPE?: string;
}

export interface EamCustomField {
  PROPERTYCODE?: string;
  TEXT_FIELD?: string;
  NUMBER_FIELD?: string;
  CODEDESC_FIELD?: { CODEVALUE?: string; DESCRIPTION?: string };
}

export interface UserDefinedArea {
  CUSTOMFIELD?: EamCustomField[];
}

export interface AssetEquipment {
  ASSETID?: EamAssetId | string;
  DESCRIPTION?: string;
  STATUS?: EamStatus | string;
  TYPE?: EamType | string;
  CLASSID?: any;
  DEPARTMENTID?: any;
  ASSETNUM?: string;
  // Part Association (neumáticos)
  PartAssociation?: PartAssociation;
  // Info del vehículo
  FleetVehicleInfo?: FleetVehicleInfo;
  // Campos de usuario (USERDEFINEDAREA)
  USERDEFINEDAREA?: UserDefinedArea;
  // Campos de usuario (UserDefinedFields - UDFCHAR01, UDFCHAR02, etc.)
  UserDefinedFields?: UserDefinedFields;
  // Campos adicionales
  [key: string]: any;
}

export interface UserDefinedFields {
  UDFCHAR01?: string;
  UDFCHAR02?: string;
  UDFCHAR03?: string;
  UDFCHAR04?: string;
  UDFCHAR05?: string;
  UDFCHAR06?: string;
  UDFCHAR07?: string;
  UDFCHAR08?: string;
  UDFCHAR09?: string;
  UDFCHAR10?: string;
  [key: string]: any;
}

export interface AssetsApiResponse {
  AssetEquipment?: AssetEquipment | AssetEquipment[];
  // Campos adicionales de respuesta
  total?: number;
  [key: string]: any;
}

export interface GetAssetResponse {
  AssetEquipment: AssetEquipment;
}

export interface AddAssetResponse {
  ASSETUID?: string;
  [key: string]: any;
}

/**
 * Parsea los datos crudos del API a formato limpio
 * Maneja la estructura anidada de EAM: ASSETID.EQUIPMENTCODE, STATUS.DESCRIPTION, etc.
 */
export function mapAssetToInfo(asset: AssetEquipment): AssetInfo {
  // Extraer EQUIPMENTCODE de ASSETID (puede ser string o objeto { EQUIPMENTCODE: string })
  let equipmentCode = '';
  const assetId = asset.ASSETID;
  if (typeof assetId === 'string') {
    equipmentCode = assetId;
  } else if (assetId && typeof assetId === 'object') {
    equipmentCode = (assetId as EamAssetId).EQUIPMENTCODE || '';
  }

  // Extraer DESCRIPTION de STATUS
  let statusDesc = '';
  const status = asset.STATUS;
  if (typeof status === 'string') {
    statusDesc = status;
  } else if (status && typeof status === 'object') {
    statusDesc = (status as EamStatus).DESCRIPTION || (status as EamStatus).STATUSCODE || '';
  }

  // Extraer DESCRIPTION de TYPE
  let typeDesc = '';
  const type = asset.TYPE;
  if (typeof type === 'string') {
    typeDesc = type;
  } else if (type && typeof type === 'object') {
    typeDesc = (type as EamType).DESCRIPTION || '';
  }

  return {
    EQUIPMENTCODE: equipmentCode,
    DESCRIPTION: asset.DESCRIPTION || '',
    STATUSDESCRIPTION: statusDesc,
    TYPEDESCRIPTION: typeDesc,
  };
}

/**
 * Obtiene el valor de un custom field del asset por su path directo
 * Ejemplo: "UserDefinedFields.UDFCHAR10" -> asset.UserDefinedFields.UDFCHAR10
 */
export function getAssetField(asset: AssetEquipment, path: string): string | null {
  console.log('getAssetField called with:', { path, asset });
  if (!path) return null;

  // Split por puntos para acceder subniveles
  const parts = path.split('.');
  let value: any = asset;

  for (const part of parts) {
    value = value?.[part];
  }

  console.log('getAssetField value:', value);

  // Retornar como string
  return value != null ? String(value) : null;
}

@Injectable({ providedIn: 'root' })
export class AssetApiService {
  // Usar /eam que se reenvía al proxy
  private readonly endpoint = '/eam/assets';

  /**
   * Obtiene todos los assets (equipos)
   */
  async getAssets(): Promise<AssetEquipment[]> {
    const response = await this.request<AssetsApiResponse>('GET', this.endpoint);
    if (!response.AssetEquipment) return [];
    return Array.isArray(response.AssetEquipment)
      ? response.AssetEquipment
      : [response.AssetEquipment];
  }

  /**
   * Obtiene un asset por ID
   */
  async getAsset(id: string): Promise<AssetEquipment | null> {
    try {
      // Codificar ID para manejar caracteres especiales
      const encodedId = encodeURIComponent(id);
      const response = await this.request<any>('GET', `${this.endpoint}/${encodedId}`);

      // Estructura: { Result: { ResultData: { AssetEquipment: {...} } } }
      const asset = response?.Result?.ResultData?.AssetEquipment;

      if (asset) {
        return asset;
      }

      // También puede venir directo en ResultData
      if (response?.ResultData?.AssetEquipment) {
        return response.ResultData.AssetEquipment;
      }

      return null;
    } catch (e) {
      console.error('Error getting asset:', e);
      return null;
    }
  }

  /**
   * Obtiene la info formateada de un asset
   */
  async getAssetInfo(id: string): Promise<AssetInfo | null> {
    const asset = await this.getAsset(id);
    return asset ? mapAssetToInfo(asset) : null;
  }

  /**
   * Obtiene assets por tipo (ej: 'VEHICLE')
   */
  async getAssetsByType(type: string): Promise<AssetEquipment[]> {
    // TODO: Implementar filtro si la API lo soporta
    const all = await this.getAssets();
    return all.filter((a) => a.TYPE === type);
  }

  /**
   * Obtiene assets por código/búsqueda
   */
  async searchAssets(query: string): Promise<AssetEquipment[]> {
    // Buscar todos y filtrar localmente (o implementar filtro en API si lo soporta)
    const all = await this.getAssets();
    const q = query.toLowerCase();
    return all.filter((a) => {
      // Manejar ASSETID como string o objeto
      const assetId =
        typeof a.ASSETID === 'string' ? a.ASSETID : (a.ASSETID as EamAssetId)?.EQUIPMENTCODE || '';

      return (
        assetId.toLowerCase().includes(q) ||
        a.ASSETNUM?.toLowerCase().includes(q) ||
        a.DESCRIPTION?.toLowerCase().includes(q)
      );
    });
  }

  /**
   * Crea un nuevo asset
   */
  async createAsset(asset: Partial<AssetEquipment>): Promise<string | null> {
    const response = await this.request<AddAssetResponse>('POST', this.endpoint, asset);
    return response?.ASSETUID || null;
  }

  /**
   * Actualiza un asset (PUT completo)
   */
  async updateAsset(id: string, asset: Partial<AssetEquipment>): Promise<boolean> {
    try {
      const encodedId = encodeURIComponent(id);
      await this.request('PUT', `${this.endpoint}/${encodedId}`, asset);
      return true;
    } catch (e) {
      console.error('Error updating asset:', e);
      return false;
    }
  }

  /**
   * Actualiza campos específicos (PATCH)
   */
  async patchAsset(id: string, data: Partial<AssetEquipment>): Promise<boolean> {
    try {
      const encodedId = encodeURIComponent(id);
      await this.request('PATCH', `${this.endpoint}/${encodedId}`, data);
      return true;
    } catch (e) {
      console.error('Error patching asset:', e);
      return false;
    }
  }

  /**
   * Elimina un asset
   */
  async deleteAsset(id: string): Promise<boolean> {
    try {
      const encodedId = encodeURIComponent(id);
      await this.request('DELETE', `${this.endpoint}/${encodedId}`);
      return true;
    } catch (e) {
      console.error('Error deleting asset:', e);
      return false;
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
    // En desarrollo usamos /eam que va al proxy local
    // En producción podría ir directo si hay CORS habilitado
    const url = `${path}`;
    const headers = eamConfigService.getHeaders();

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
