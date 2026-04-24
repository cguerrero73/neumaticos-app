/**
 * Asset API Service
 * Integración con EAM via griddata
 */

import { Injectable } from '@angular/core';
import { eamConfigService } from '../config/eam-config.service';
import { eamGridDataService } from './eam-grid-data.service';

export interface AssetEquipment {
  ASSETID?: string;
  DESCRIPTION?: string;
  ORG?: string;
  STATUS?: string;
  SETUP?: string;
  [key: string]: any;
}

export interface AssetInfo {
  EQUIPMENTCODE: string;
  DESCRIPTION: string;
  STATUSDESCRIPTION: string;
  SETUPDESCRIPTION?: string;
}

@Injectable({ providedIn: 'root' })
export class AssetApiService {
  /**
   * Obtiene un asset por ID usando griddata (ZUN001)
   * @param code - código del asset (obj_code)
   * @param org - organización (obj_org)
   */
  async getAsset(code: string, org: string): Promise<AssetEquipment | null> {
    try {
      const filters = [
        { ALIAS_NAME: 'obj_code', OPERATOR: '=', VALUE: code, JOINER: 'AND', SEQNUM: 0 },
      ];

      if (org) {
        filters.push({
          ALIAS_NAME: 'obj_org',
          OPERATOR: '=',
          VALUE: org,
          JOINER: 'AND',
          SEQNUM: 1,
        });
      }

      const body = {
        GRID: {
          GRID_NAME: 'ZUN001',
          NUMBER_OF_ROWS_FIRST_RETURNED: 1000,
          CURSOR_POSITION: 0,
        },
        MULTIADDON_FILTERS: {
          MADDON_FILTER: filters,
        },
        GRID_TYPE: { TYPE: 'LIST' },
        REQUEST_TYPE: 'LIST.DATA_ONLY.STORED',
      };

      const response = await eamGridDataService.query(body);

      // Campos en el orden que vienen en D[] (según metadata FIELDS)
      const fields = ['obj_code', 'obj_desc', 'obj_setup', 'obj_org', 'obj_status'];
      const rows = eamGridDataService.parseGridData<any>(response, fields);

      if (rows.length > 0) {
        return {
          ASSETID: rows[0].obj_code,
          DESCRIPTION: rows[0].obj_desc,
          ORG: rows[0].obj_org,
          STATUS: rows[0].obj_status,
          SETUP: rows[0].obj_setup,
        };
      }

      return null;
    } catch (e) {
      console.error('Error getting asset:', e);
      return null;
    }
  }
}

export const assetApiService = new AssetApiService();
