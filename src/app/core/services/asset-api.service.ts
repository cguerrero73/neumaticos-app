/**
 * Asset API Service
 * Integración con EAM via REST usando HttpClient + Interceptors
 *
 * IMPORTANTE: La app se conecta al proxy local (/eam/*)
 * que reenvía al servidor Hexagon EAM
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, catchError, map } from 'rxjs';
import { eamConfigService } from '../config/eam-config.service';
import { errorService } from './error.service';
import { EamGridDataService } from './eam-grid-data.service';
import { GridQueryRequest } from '../models/grid.model';
import { EquipmentTreeNode } from '../../pages/home/home.page';

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

// Respuesta cruda del asset API (puede contener ErrorAlert)
interface RawAssetResponse {
  ErrorAlert?: { Message: string; Name: string }[];
  Result?: {
    ResultData?: {
      AssetEquipment?: AssetEquipment;
    };
  };
}

@Injectable({ providedIn: 'root' })
export class AssetApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly gridData: EamGridDataService,
  ) {}

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

    return this.request<RawAssetResponse>(`${this.endpoint}/${encodedId}`).pipe(
      map((response) => {
        // Extraer de: response.Result.ResultData.AssetEquipment
        return response?.Result?.ResultData?.AssetEquipment || null;
      }),
      catchError((error: HttpErrorResponse) => {
        // El error se maneja en el interceptor, solo releamos
        return throwError(() => error);
      }),
    );
  }

  /**
   * Obtiene la jerarquía de equipos (hijos) usando grid query
   * @param parentCode - código del equipo padre
   * @param org - organización
   * @returns Observable con array de EquipmentTreeNode
   */
  getEquipmentHierarchy(parentCode: string, org: string): Observable<EquipmentTreeNode[]> {
    // Grid query para obtener estructura de equipos
    // Usamos el grid "zuchil" que contiene la jerarquía de equipos
    const gridRequest: GridQueryRequest = {
      GRID: {
        GRID_NAME: 'zuchil',
      },
      ADDON_FILTER: {
        ALIAS_NAME: 'PARENT_EQUIPMENT_CODE',
        OPERATOR: '=',
        VALUE: parentCode,
      },
      REQUEST_TYPE: 'LIST.COUNT.STORED',
    };

    return new Observable((observer) => {
      this.gridData.query(gridRequest).then(
        (result) => {
          const tree = this.buildTree(result.rows, parentCode);
          observer.next(tree);
          observer.complete();
        },
        (error) => {
          // El error se maneja en el interceptor
          observer.error(error);
        },
      );
    });
  }

  /**
   * Construye el árbol de equipos a partir de las filas del grid
   */
  private buildTree(rows: any[], rootCode: string): EquipmentTreeNode[] {
    // Map para lookup rápido
    const nodeMap = new Map<string, EquipmentTreeNode>();

    // Crear nodos
    rows.forEach((row: any) => {
      const node: EquipmentTreeNode = {
        code: row.EQUIPMENT_CODE || '',
        description: row.DESCRIPTION || '',
        type: row.EQUIPMENT_TYPE,
        status: row.STATUS,
        children: [],
        expanded: false,
      };
      nodeMap.set(node.code, node);
    });

    // Construir árbol
    const roots: EquipmentTreeNode[] = [];

    // Agregar el root si existe en los resultados
    if (nodeMap.has(rootCode)) {
      const rootNode = nodeMap.get(rootCode)!;
      roots.push(rootNode);
    }

    // Agregar hijos directos del root
    const directChildren = rows.filter((r: any) => r.PARENT_EQUIPMENT_CODE === rootCode);
    directChildren.forEach((child: any) => {
      const childNode = nodeMap.get(child.EQUIPMENT_CODE);
      if (childNode) {
        roots.push(childNode);
      }
    });

    return roots;
  }

  /**
   * Solicitud genérica a la API (via proxy)
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
