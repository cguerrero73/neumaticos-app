/**
 * EAM Grid Data Service
 * Consulta genérica de grids a la API de EAM via proxy
 */

import { Injectable } from '@angular/core';
import { eamConfigService } from '../config/eam-config.service';

export interface ParsedGridRow {
  [fieldName: string]: string | number | null;
}

@Injectable({ providedIn: 'root' })
export class EamGridDataService {
  /**
   * Consulta un grid de EAM
   * @param body - JSON tal cual lo envía EAM para el grid
   */
  async query(body: any): Promise<any> {
    const url = '/griddata';
    const headers = eamConfigService.getHeaders();

    const options: RequestInit = {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Parsea los datos crudos del grid por posición
   * @param gridResponse - respuesta cruda del griddata
   * @param fields - array de nombres de campos (si es menor que D[], se crean field1, field2...)
   * @returns array de objetos con los campos nombrados
   */
  parseGridData<T = ParsedGridRow>(gridResponse: any, fields: string[]): T[] {
    const rows = gridResponse?.Result?.ResultData?.GRID?.DATA?.ROW;

    if (!rows || !Array.isArray(rows)) {
      return [];
    }

    return rows.map((row: any) => {
      const parsed: any = {};

      if (row.D && Array.isArray(row.D)) {
        // Recorrer todas las celdas de D[]
        row.D.forEach((cell: { value: string; n: string | number }, index: number) => {
          // Usar nombre proporcionado o generar fieldN si no hay suficiente
          const fieldName = index < fields.length ? fields[index] : `field${index + 1}`;
          parsed[fieldName] = cell?.value ?? null;
        });
      }

      return parsed as T;
    });
  }
}

export const eamGridDataService = new EamGridDataService();
