/**
 * Google Docs Table Operations
 * 
 * Utilities for creating and manipulating tables in Google Docs
 */
import { logger } from '@/lib/utils/logger';

export interface TableStyleOptions {
  borderWidth?: number;
  borderColor?: [number, number, number];
  backgroundColor?: [number, number, number];
  headerBackground?: [number, number, number];
}

export interface TableData {
  [key: string]: any;
}

export function buildTablePopulationRequests(
  tableInfo: any,
  data: string[][],
  boldHeaders = true
): any[] {
  const requests: any[] = [];
  const cells = tableInfo.cells || [];

  if (!cells.length) {
    logger.warn("No cell information found in table_info");
    return requests;
  }

  for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
    if (rowIdx >= cells.length) {
      logger.warn(`Data has more rows (${data.length}) than table (${cells.length})`);
      break;
    }

    for (let colIdx = 0; colIdx < data[rowIdx].length; colIdx++) {
      if (colIdx >= cells[rowIdx].length) {
        logger.warn(`Data has more columns (${data[rowIdx].length}) than table row ${rowIdx} (${cells[rowIdx].length})`);
        break;
      }

      const cell = cells[rowIdx][colIdx];
      const cellText = data[rowIdx][colIdx];

      if (!cellText) continue;

      const existingContent = (cell.content || '').trim();
      const insertionIndex = cell.insertion_index || cell.start_index + 1;

      if (!existingContent || existingContent === '\n') {
        requests.push({
          insertText: {
            location: { index: insertionIndex },
            text: cellText
          }
        });

        if (boldHeaders && rowIdx === 0) {
          requests.push({
            updateTextStyle: {
              range: {
                startIndex: insertionIndex,
                endIndex: insertionIndex + cellText.length
              },
              textStyle: { bold: true },
              fields: 'bold'
            }
          });
        }
      } else {
        const cellEnd = cell.end_index - 1;
        requests.push({
          insertText: {
            location: { index: cellEnd },
            text: cellText
          }
        });

        if (boldHeaders && rowIdx === 0) {
          requests.push({
            updateTextStyle: {
              range: {
                startIndex: cellEnd,
                endIndex: cellEnd + cellText.length
              },
              textStyle: { bold: true },
              fields: 'bold'
            }
          });
        }
      }
    }
  }

  return requests;
}

export function formatTableData(rawData: string | string[] | string[][]): string[][] {
  if (typeof rawData === 'string') {
    const lines = rawData.trim().split('\n');
    if (rawData.includes('\t')) {
      return lines.map(line => line.split('\t'));
    } else if (rawData.includes(',')) {
      return lines.map(line => line.split(','));
    } else {
      return lines.map(line => line.split(' ').filter(cell => cell.trim()));
    }
  }

  if (Array.isArray(rawData)) {
    if (rawData.length === 0) return [[]];
    
    if (Array.isArray(rawData[0])) {
      return (rawData as string[][]).map(row => row.map(cell => String(cell || '')));
    } else {
      return (rawData as string[]).map(cell => [String(cell || '')]);
    }
  }

  return [[String(rawData)]];
}

export function createTableWithData(
  index: number,
  data: string[][],
  headers?: string[],
  boldHeaders = true
): any[] {
  const requests: any[] = [];

  const fullData = headers ? [headers, ...data] : data;
  const normalizedData = formatTableData(fullData);

  if (!normalizedData.length || !normalizedData[0].length) {
    throw new Error("Cannot create table with empty data");
  }

  const rows = normalizedData.length;
  const cols = normalizedData[0].length;

  for (const row of normalizedData) {
    while (row.length < cols) {
      row.push('');
    }
  }

  requests.push({
    insertTable: {
      location: { index },
      rows,
      columns: cols
    }
  });

  return requests;
}

export function buildTableStyleRequests(
  tableStartIndex: number,
  styleOptions: TableStyleOptions
): any[] {
  const requests: any[] = [];

  if (Object.keys(styleOptions).some(key => 
    ['borderWidth', 'borderColor', 'backgroundColor'].includes(key)
  )) {
    const tableCellStyle: any = {};
    const fields: string[] = [];

    if (styleOptions.borderWidth !== undefined) {
      const borderWidth = { magnitude: styleOptions.borderWidth, unit: 'PT' };
      tableCellStyle.borderTop = { width: borderWidth };
      tableCellStyle.borderBottom = { width: borderWidth };
      tableCellStyle.borderLeft = { width: borderWidth };
      tableCellStyle.borderRight = { width: borderWidth };
      fields.push('borderTop', 'borderBottom', 'borderLeft', 'borderRight');
    }

    if (styleOptions.borderColor) {
      const borderColor = { color: { rgbColor: styleOptions.borderColor } };
      ['borderTop', 'borderBottom', 'borderLeft', 'borderRight'].forEach(side => {
        if (tableCellStyle[side]) {
          tableCellStyle[side].color = borderColor.color;
        }
      });
    }

    if (styleOptions.backgroundColor) {
      tableCellStyle.backgroundColor = {
        color: { rgbColor: styleOptions.backgroundColor }
      };
      fields.push('backgroundColor');
    }

    if (Object.keys(tableCellStyle).length && fields.length) {
      requests.push({
        updateTableCellStyle: {
          tableStartLocation: { index: tableStartIndex },
          tableCellStyle,
          fields: fields.join(',')
        }
      });
    }
  }

  if (styleOptions.headerBackground) {
    requests.push({
      updateTableCellStyle: {
        tableRange: {
          tableCellLocation: {
            tableStartLocation: { index: tableStartIndex },
            rowIndex: 0,
            columnIndex: 0
          },
          rowSpan: 1,
          columnSpan: 100
        },
        tableCellStyle: {
          backgroundColor: {
            color: { rgbColor: styleOptions.headerBackground }
          }
        },
        fields: 'backgroundColor'
      }
    });
  }

  return requests;
}

export function extractTableAsData(tableInfo: any): string[][] {
  const data: string[][] = [];
  const cells = tableInfo.cells || [];

  for (const row of cells) {
    const rowData: string[] = [];
    for (const cell of row) {
      rowData.push((cell.content || '').trim());
    }
    data.push(rowData);
  }

  return data;
}

export function findTableByContent(
  tables: any[],
  searchText: string,
  caseSensitive = false
): number | null {
  const searchStr = caseSensitive ? searchText : searchText.toLowerCase();

  for (let idx = 0; idx < tables.length; idx++) {
    const table = tables[idx];
    for (const row of table.cells || []) {
      for (const cell of row) {
        const content = (cell.content || '').toLowerCase();
        if (content.includes(searchStr)) {
          return idx;
        }
      }
    }
  }

  return null;
}

export interface ValidationResult {
  isValid: boolean;
  error: string;
}

export function validateTableData(data: string[][]): ValidationResult {
  if (!data || data.length === 0) {
    return { isValid: false, error: "Data is empty. Use format: [['col1', 'col2'], ['row1col1', 'row1col2']]" };
  }

  if (!Array.isArray(data)) {
    return { isValid: false, error: `Data must be a list, got ${typeof data}` };
  }

  if (!data.every(row => Array.isArray(row))) {
    return { isValid: false, error: "Data must be a 2D list (list of lists)" };
  }

  const colCounts = data.map(row => row.length);
  const uniqueCounts = [...new Set(colCounts)];
  if (uniqueCounts.length > 1) {
    return { isValid: false, error: `All rows must have same number of columns. Found: ${colCounts}` };
  }

  const rows = data.length;
  const cols = colCounts[0];

  if (rows > 1000) {
    return { isValid: false, error: `Too many rows (${rows}). Google Docs limit is 1000 rows.` };
  }

  if (cols > 20) {
    return { isValid: false, error: `Too many columns (${cols}). Google Docs limit is 20 columns.` };
  }

  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[i].length; j++) {
      if (data[i][j] === null || data[i][j] === undefined) {
        return { isValid: false, error: `Cell (${i},${j}) is null. Use empty strings for empty cells.` };
      }
    }
  }

  return { isValid: true, error: `Valid table data: ${rows}x${cols} table format` };
}