/**
 * EAM Grid Query Models
 * Interfaces para el schema de requests/responses del grid query de EAM
 */

// ErrorAlert que puede venir en la respuesta del EAM
export interface ErrorAlert {
  Message: string;
  Name: string;
}

// Request enviado al EAM via POST /eam/griddata
export interface GridQueryRequest {
  GRID: GridConfig;
  ADDON_SORT?: GridSort;
  ADDON_FILTER?: GridFilter;
  MULTIADDON_FILTERS?: GridMultiFilter;
  GRID_TYPE?: { TYPE: string };
  DATASPY?: { DATASPY_ID: number };
  LOV?: GridLov;
  REQUEST_TYPE: string;
}

export interface GridConfig {
  GRID_NAME: string;
  USER_FUNCTION_NAME?: string;
  GRID_ID?: number;
  NUMBER_OF_ROWS_FIRST_RETURNED?: number;
  CURSOR_POSITION?: number;
  CURRENT_TAB_NAME?: string;
  TAB_NAME?: string;
  RESULT_IN_SAXORDER?: string;
  TERSERESPONSE?: string;
  LOCALIZE_RESULT?: string;
  CUSTOM_FIELDS_CLASS_FILTER?: string;
  WSGRIDSZ_OVERRIDE?: number;
}

export interface GridSort {
  ALIAS_NAME: string;
  TYPE: 'ASC' | 'DESC';
}

export interface GridFilter {
  ALIAS_NAME: string;
  OPERATOR: string;
  VALUE: string;
}

export interface GridMultiFilter {
  MADDON_FILTER: GridFilterItem[];
}

export interface GridFilterItem {
  ALIAS_NAME: string;
  OPERATOR: string;
  VALUE: string;
  LPAREN?: string;
  RPAREN?: string;
  JOINER?: 'AND' | 'OR';
  SEQNUM?: number;
}

export interface GridLov {
  LOV_PARAMETERS: {
    LOV_PARAMETER: GridLovParameter[];
  };
}

export interface GridLovParameter {
  ALIAS_NAME: string;
  TYPE: string;
  VALUE: string;
}

// Respuesta parseada del grid query
export interface GridQueryResult {
  rows: GridRow[];
  totalRows: number;
  fieldMapping: Record<string, string>; // "1" → "EQUIPMENT_CODE"
  gridName: string;
}

// Fila parseada con nombres de campo como propiedades
export type GridRow = Record<string, string | number | null>;

// Respuesta cruda del EAM (sin parsear)
export interface RawGridResponse {
  ErrorAlert?: ErrorAlert[];
  GRID?: RawGridFullResponse;
  Result?: {
    ResultData?: {
      GRID?: RawGridFullResponse;
      GRID1?: RawGridFullResponse;
    };
  };
}

export interface RawGridFullResponse {
  DATA?: {
    ROW?: RawGridRow[];
  };
  HEADER?: {
    DATATABLE?: {
      COLUMNS?: {
        COLUMN?: RawGridColumn[];
      };
    };
  };
  ROWCOUNT?: number;
}

export interface RawGridRow {
  D?: RawGridCell[];
  // Puede tener más campos según el grid
  [key: string]: any;
}

export interface RawGridCell {
  value?: string | number;
  n?: string | number;
}

export interface RawGridColumn {
  NAME?: string;
  INDEX?: string | number;
  COLUMNNAME?: string;
}

// Tipo de request para el grid
export type GridRequestType =
  | 'LIST.COUNT.STORED'
  | 'LIST.DATA_ONLY.STORED'
  | 'LIST.HEAD_ONLY.STORED'
  | 'LOV.DATA_ONLY.STORED';

// Helper para crear request defaults
export function createGridRequest(
  gridName: string,
  requestType: GridRequestType = 'LIST.COUNT.STORED',
): GridQueryRequest {
  return {
    GRID: {
      GRID_NAME: gridName,
    },
    GRID_TYPE: {
      TYPE: 'LIST',
    },
    REQUEST_TYPE: requestType,
  };
}
