/**
 * EAM Grid Data Service
 * Consulta genérica de grids a la API de EAM via proxy
 *
 * Estrategia de caching:
 * 1. Primer query → LIST.COUNT.STORED (trae metadata + conteo)
 * 2. Si falta field mapping → LIST.HEAD_ONLY.STORED (trae solo metadata de campos)
 * 3. Queries siguientes → LIST.DATA_ONLY.STORED (trae solo datos, usa cache)
 *
 * El field mapping se cachea en sessionStorage por nombre de grid
 *
 * Nota: El manejo de errores (incluyendo ErrorAlert) está centralizado en el errorInterceptor
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { eamConfigService } from '../config/eam-config.service';
import {
  GridQueryRequest,
  GridQueryResult,
  GridRow,
  RawGridResponse,
  RawGridRow,
  RawGridCell,
  GridRequestType,
  createGridRequest,
} from '../models/grid.model';

const SESSION_KEY_PREFIX = 'grid_';
const SESSION_KEY_SUFFIX = '_mapping';

// Valor por defecto para GRID_TYPE
const DEFAULT_GRID_TYPE = 'LIST';

@Injectable({ providedIn: 'root' })
export class EamGridDataService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = '/eam/griddata';

  constructor() {}

  /**
   * Consulta un grid de EAM con estrategia inteligente de caching
   *
   * Estrategia:
   * 1. Siempre hacer LIST.DATA_ONLY.STORED para obtener datos
   * 2. Si hay campos sin mapear, hacer LIST.HEAD_ONLY.STORED para completar el mapping
   * 3. Re-parsear con el mapping completo
   *
   * @param request - Request del grid (contiene GRID_NAME, filtros, etc.)
   * @param fieldsToExtract - Array de nombres de campos que interesan (opcional, solo para validación)
   * @returns GridQueryResult con rows, totalRows y fieldMapping
   */
  async query(request: GridQueryRequest, fieldsToExtract?: string[]): Promise<GridQueryResult> {
    const gridName = request.GRID.GRID_NAME;

    console.log('\n🟢 EamGridDataService.query() START');
    console.log('   Grid name:', gridName);
    console.log('   Fields to extract:', fieldsToExtract);
    console.log('   Request type:', request.REQUEST_TYPE);

    // Aplicar defaults
    const enrichedRequest = this.enrichRequest(request);
    console.log('   Enriched request type:', enrichedRequest.REQUEST_TYPE);

    // Obtener field mapping del cache
    let fieldMapping = this.getFieldMappingFromCache(gridName);
    console.log(
      '   Cached field mapping keys:',
      Object.keys(fieldMapping).length > 0 ? Object.keys(fieldMapping) : 'none',
    );

    // Siempre hacer LIST.DATA_ONLY.STORED para obtener los datos
    console.log('   ➡️ Executing DATA_ONLY.STORED to get rows');
    const dataResponse = await this.executeQuery({
      ...enrichedRequest,
      REQUEST_TYPE: 'LIST.DATA_ONLY.STORED',
    });

    // Parsear respuesta con el mapping actual (o vacío)
    let result = this.parseResponse(dataResponse, fieldMapping, false);

    // Verificar si hay campos sin mapear (índices que no tenemos en el mapping)
    const unmappedIndexes = this.findUnmappedIndexes(result.rows, fieldMapping);

    if (unmappedIndexes.length > 0) {
      console.log('   ⚠️ Found unmapped field indexes:', unmappedIndexes);
      console.log('   🔄 Fetching HEAD_ONLY.STORED for field mapping');

      // Hacer HEAD_ONLY.STORED para obtener el mapping de campos
      const headRequest = createGridRequest(gridName, 'LIST.HEAD_ONLY.STORED');
      headRequest.GRID = { ...enrichedRequest.GRID };
      const headResponse = await this.executeQuery(headRequest);

      // Extraer nuevo field mapping
      const newFieldMapping = this.extractFieldMappingFromResponse(headResponse, gridName);
      console.log('   📋 New field mapping from HEAD_ONLY:', newFieldMapping);

      // Actualizar cache
      fieldMapping = newFieldMapping;
      this.saveFieldMappingToCache(gridName, fieldMapping);

      // Re-parsear con el mapping completo
      result = this.parseResponse(dataResponse, fieldMapping, false);
    }

    // Extraer total de filas si viene en la respuesta
    const totalRows = this.extractTotalRows(dataResponse);

    console.log('   ✅ Query complete - rows:', result.rows.length, 'totalRows:', totalRows);


    return {
      ...result,
      fieldMapping,
      gridName,
      totalRows,
    };
  }

  /**
   * Enriquece el request con valores por defecto
   */
  private enrichRequest(request: GridQueryRequest): GridQueryRequest {
    const gridName = request.GRID.GRID_NAME;

    return {
      ...request,
      GRID: {
        ...request.GRID,
        GRID_NAME: gridName, // Preservar el GRID_NAME original
      },
      GRID_TYPE: request.GRID_TYPE || { TYPE: DEFAULT_GRID_TYPE },
      REQUEST_TYPE: request.REQUEST_TYPE || 'LIST.COUNT.STORED',
    };
  }

  /**
   * Ejecuta el query usando HttpClient (el manejo de errores está en el interceptor)
   */
  private async executeQuery(request: GridQueryRequest): Promise<RawGridResponse> {
    const gridName = request.GRID?.GRID_NAME || 'unknown';
    const requestType = request.REQUEST_TYPE || 'LIST.COUNT.STORED';

    console.log('\n🔵 EamGridDataService.executeQuery()');
    console.log('   Grid:', gridName);
    console.log('   Request type:', requestType);
    console.log('   Endpoint:', this.endpoint);
    console.log('   Headers:', eamConfigService.getHeaders());
    console.log('   Request body:', JSON.stringify(request, null, 2));

    const headers = new HttpHeaders({
      ...eamConfigService.getHeaders(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    // HttpClient ya maneja errores via el interceptor
    // Si hay 4xx con ErrorAlert, el interceptor lo detecta y lanza
    const response = await firstValueFrom(
      this.http.post<RawGridResponse>(this.endpoint, request, { headers }),
    );

    console.log(
      '   Response received:',
      JSON.stringify(response, null, 2).substring(0, 500) + '...',
    );

    return response;
  }

  /**
   * Parsea la respuesta cruda del EAM
   */
  private parseResponse(
    response: RawGridResponse,
    fieldMapping: Record<string, string>,
    extractTotalRows: boolean,
  ): { rows: GridRow[]; totalRows: number } {
    let rows: GridRow[] = [];
    let totalRows = 0;

    // Extraer total de filas (puede venir en diferentes lugares según el tipo de request)
    if (extractTotalRows) {
      totalRows = this.extractTotalRows(response);
    }

    // Extraer las filas de datos
    const rawRows = this.extractRawRows(response);

    // Parsear cada fila usando el field mapping
    rows = rawRows.map((rawRow) => this.parseRow(rawRow, fieldMapping));

    return { rows, totalRows };
  }

  /**
   * Extrae el total de filas de la respuesta
   */
  private extractTotalRows(response: RawGridResponse): number {
    return (
      response?.GRID?.ROWCOUNT ||
      response?.Result?.ResultData?.GRID?.ROWCOUNT ||
      response?.Result?.ResultData?.GRID1?.ROWCOUNT ||
      response?.Result?.ResultData?.GRID?.DATA?.ROW?.length ||
      0
    );
  }

  /**
   * Extrae las filas crudas de la respuesta
   */
  private extractRawRows(response: RawGridResponse): RawGridRow[] {
    return (
      response?.GRID?.DATA?.ROW ||
      response?.Result?.ResultData?.GRID?.DATA?.ROW ||
      response?.Result?.ResultData?.GRID1?.DATA?.ROW ||
      []
    );
  }

  /**
   * Parsea una fila cruda a fila con nombres de campo
   */
  private parseRow(rawRow: RawGridRow, fieldMapping: Record<string, string>): GridRow {
    const parsed: GridRow = {};

    if (rawRow.D && Array.isArray(rawRow.D)) {
      rawRow.D.forEach((cell: RawGridCell) => {
        const fieldIndex = String(cell.n);
        const fieldName = fieldMapping[fieldIndex] || `field_${fieldIndex}`;
        parsed[fieldName] = cell.value ?? null;
      });
    }

    return parsed;
  }

  /**
   * Extrae el field mapping desde la respuesta del COUNT o HEAD request
   */
  private extractFieldMappingFromResponse(
    response: RawGridResponse,
    gridName: string,
  ): Record<string, string> {
    const mapping: Record<string, string> = {};

    // Formato 1: GRID.HEADER.DATATABLE.COLUMNS.COLUMN (formato antiguo)
    const columns =
      response?.GRID?.HEADER?.DATATABLE?.COLUMNS?.COLUMN ||
      response?.Result?.ResultData?.GRID?.HEADER?.DATATABLE?.COLUMNS?.COLUMN ||
      [];

    if (Array.isArray(columns) && columns.length > 0) {
      columns.forEach((col: any) => {
        const index = String(col.INDEX || col.index);
        const name = col.NAME || col.COLUMNNAME || col.name || col.columnname;
        if (index && name) {
          mapping[index] = name;
        }
      });
      console.log('   📋 Field mapping from COLUMNS format, keys:', Object.keys(mapping));
      return mapping;
    }

    // Formato 2: GRID.FIELDS.FIELD (nuevo formato EAM con aliasnum como índice)
    const fields =
      response?.GRID?.FIELDS?.FIELD || response?.Result?.ResultData?.GRID?.FIELDS?.FIELD || [];

    if (Array.isArray(fields) && fields.length > 0) {
      fields.forEach((field: any) => {
        // aliasnum es el índice numérico que usan las filas
        const index = String(field.aliasnum);
        const name = field.name || field.label;
        if (index && name) {
          mapping[index] = name;
        }
      });
      console.log('   📋 Field mapping from FIELDS format, keys:', Object.keys(mapping));
      return mapping;
    }

    // Si no encontramos en el header, intentar del primer registro
    if (Object.keys(mapping).length === 0) {
      const rawRows = this.extractRawRows(response);
      if (rawRows.length > 0) {
        const firstRow = rawRows[0];
        if (firstRow.D && Array.isArray(firstRow.D)) {
          firstRow.D.forEach((cell: RawGridCell, idx: number) => {
            const index = String(cell.n || idx + 1);
            if (!mapping[index]) {
              mapping[index] = `field_${index}`;
            }
          });
        }
      }
    }

    return mapping;
  }

  /**
   * Obtiene el field mapping del sessionStorage
   */
  private getFieldMappingFromCache(gridName: string): Record<string, string> {
    try {
      const key = `${SESSION_KEY_PREFIX}${gridName}${SESSION_KEY_SUFFIX}`;
      const cached = sessionStorage.getItem(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Error reading field mapping from cache:', e);
    }
    return {};
  }

  /**
   * Guarda el field mapping en sessionStorage
   */
  private saveFieldMappingToCache(gridName: string, fieldMapping: Record<string, string>): void {
    try {
      const key = `${SESSION_KEY_PREFIX}${gridName}${SESSION_KEY_SUFFIX}`;
      sessionStorage.setItem(key, JSON.stringify(fieldMapping));
    } catch (e) {
      console.warn('Error saving field mapping to cache:', e);
    }
  }

  /**
   * Verifica si tenemos todos los campos necesarios en el mapping
   */
  private hasAllFields(mapping: Record<string, string>, requiredFields: string[]): boolean {
    const mappedValues = Object.values(mapping);
    return requiredFields.every((field) => mappedValues.includes(field));
  }

  /**
   * Limpia el cache de field mapping para un grid específico
   */
  clearCache(gridName?: string): void {
    if (gridName) {
      const key = `${SESSION_KEY_PREFIX}${gridName}${SESSION_KEY_SUFFIX}`;
      sessionStorage.removeItem(key);
    } else {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(SESSION_KEY_PREFIX) && key.endsWith(SESSION_KEY_SUFFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => sessionStorage.removeItem(key));
    }
  }

  /**
   * Obtiene el cache actual para un grid (para debugging)
   */
  getCachedMapping(gridName: string): Record<string, string> {
    return this.getFieldMappingFromCache(gridName);
  }

  /**
   * Encuentra índices de campos que no están mapeados en las filas
   */
  private findUnmappedIndexes(rows: GridRow[], fieldMapping: Record<string, string>): string[] {
    const unmapped: Set<string> = new Set();

    for (const row of rows) {
      for (const key of Object.keys(row)) {
        // Si la key no está en el mapping, es un índice sin mapear
        const isMapped = Object.values(fieldMapping).some((v) => v === key);
        if (!isMapped && !fieldMapping[key]) {
          // La key es un índice numérico que no está en el mapping
          unmapped.add(key);
        }
      }
    }

    return Array.from(unmapped);
  }
}
