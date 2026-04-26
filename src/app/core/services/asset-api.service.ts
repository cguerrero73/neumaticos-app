/**
 * Asset API Service
 * Integración con EAM via REST usando HttpClient + Interceptors
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, catchError, map } from 'rxjs';
import { eamConfigService } from '../config/eam-config.service';
import { errorService } from './error.service';

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
  constructor(private readonly http: HttpClient) {}

  private readonly endpoint = '/eam/assets';

  /**
   * Obtiene un asset por ID
   * @param code - código del asset
   * @param org - organización
   * @returns El ID enviado al endpoint es code#org encoded
   */
  getAsset(code: string, org: string): Observable<AssetEquipment | null> {
    // Concatenar code#org y encoder
    const assetId = `${code}#${org}`;
    const encodedId = encodeURIComponent(assetId);

    return this.request<any>(`${this.endpoint}/${encodedId}`).pipe(
      map((response) => {
        // Extraer de: response.Result.ResultData.AssetEquipment
        return response?.Result?.ResultData?.AssetEquipment || null;
      }),
      catchError((error: HttpErrorResponse) => {
        errorService.error(`Error al obtener asset: ${error.message || 'Error desconocido'}`);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Solicitud genérica a la API
   */
  private request<T>(
    path: string,
    options?: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      body?: any;
    },
  ): Observable<T> {
    const url = path;
    const method = options?.method || 'GET';

    const headers = new HttpHeaders({
      ...eamConfigService.getHeaders(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    // Para GET no mandamos body, para el resto sí
    if (method === 'GET') {
      return this.http.get<T>(url, { headers });
    } else if (method === 'POST') {
      return this.http.post<T>(url, { AssetEquipment: options?.body }, { headers });
    } else if (method === 'PUT') {
      return this.http.put<T>(url, { AssetEquipment: options?.body }, { headers });
    } else if (method === 'PATCH') {
      return this.http.patch<T>(url, { AssetEquipment: options?.body }, { headers });
    } else {
      return this.http.delete<T>(url, { headers });
    }
  }
}
