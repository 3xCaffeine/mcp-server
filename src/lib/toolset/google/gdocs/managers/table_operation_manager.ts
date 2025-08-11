/**
 * Table Operation Manager
 * 
 * High-level table operations that orchestrate multiple Google Docs API calls
 */
import { logger } from '@/lib/utils/logger';
import { ValidationManager } from './validation_manager';

interface TableInfo {
  rows: number;
  columns: number;
  cells: any[][];
  start_index: number;
  end_index: number;
}

interface TableCreationResult {
  success: boolean;
  message: string;
  metadata?: {
    rows: number;
    columns: number;
    populated_cells: number;
    table_index: number;
  };
}

export class TableOperationManager {
  private service: any;
  private validationManager: ValidationManager;

  constructor(service: any) {
    this.service = service;
    this.validationManager = new ValidationManager();
  }

  async createAndPopulateTable(
    documentId: string,
    tableData: string[][],
    index: number,
    boldHeaders = true
  ): Promise<TableCreationResult> {
    logger.debug(`Creating table at index ${index}, dimensions: ${tableData.length}x${tableData[0]?.length || 0}`);

    const [isValid, errorMsg] = this.validationManager.validateTableData(tableData);
    if (!isValid) {
      return { success: false, message: `Invalid table data: ${errorMsg}` };
    }

    const rows = tableData.length;
    const cols = tableData[0].length;

    try {
      // Step 1: Create empty table
      await this.createEmptyTable(documentId, index, rows, cols);

      // Step 2: Get fresh document structure
      const freshTables = await this.getDocumentTables(documentId);
      if (!freshTables || freshTables.length === 0) {
        return { success: false, message: "Could not find table after creation" };
      }

      // Step 3: Populate cells
      const populationCount = await this.populateTableCells(
        documentId, tableData, boldHeaders
      );

      const metadata = {
        rows,
        columns: cols,
        populated_cells: populationCount,
        table_index: freshTables.length - 1
      };

      return {
        success: true,
        message: `Successfully created ${rows}x${cols} table and populated ${populationCount} cells`,
        metadata
      };

    } catch (error) {
      logger.error(`Failed to create and populate table: ${error}`);
      return { success: false, message: `Table creation failed: ${error}` };
    }
  }

  private async createEmptyTable(
    documentId: string,
    index: number,
    rows: number,
    cols: number
  ): Promise<void> {
    logger.debug(`Creating ${rows}x${cols} table at index ${index}`);

    await this.service.documents().batchUpdate({
      documentId,
      requestBody: {
        requests: [{
          insertTable: {
            location: { index },
            rows,
            columns: cols
          }
        }]
      }
    });
  }

  private async getDocumentTables(documentId: string): Promise<TableInfo[]> {
    const doc = await this.service.documents().get({ documentId });
    return this.findTables(doc.data);
  }

  private findTables(docData: any): TableInfo[] {
    const tables: TableInfo[] = [];
    const body = docData.body?.content || [];

    for (const element of body) {
      if (element.table) {
        const table = element.table;
        const rows = table.tableRows || [];
        const cells = rows.map((row: any) => 
          (row.tableCells || []).map((cell: any) => ({
            start_index: cell.startIndex,
            end_index: cell.endIndex,
            insertion_index: (cell.startIndex || 0) + 1,
            content: ''
          }))
        );

        tables.push({
          rows: rows.length,
          columns: rows[0]?.tableCells?.length || 0,
          cells,
          start_index: element.startIndex,
          end_index: element.endIndex
        });
      }
    }

    return tables;
  }

  private async populateTableCells(
    documentId: string,
    tableData: string[][],
    boldHeaders: boolean
  ): Promise<number> {
    let populationCount = 0;

    for (let rowIdx = 0; rowIdx < tableData.length; rowIdx++) {
      logger.debug(`Processing row ${rowIdx}: ${tableData[rowIdx].length} cells`);

      for (let colIdx = 0; colIdx < tableData[rowIdx].length; colIdx++) {
        const cellText = tableData[rowIdx][colIdx];
        if (!cellText) continue;

        try {
          const success = await this.populateSingleCell(
            documentId, rowIdx, colIdx, cellText, boldHeaders && rowIdx === 0
          );

          if (success) {
            populationCount++;
            logger.debug(`Populated cell (${rowIdx},${colIdx})`);
          } else {
            logger.warn(`Failed to populate cell (${rowIdx},${colIdx})`);
          }
        } catch (error) {
          logger.error(`Error populating cell (${rowIdx},${colIdx}): ${error}`);
        }
      }
    }

    return populationCount;
  }

  private async populateSingleCell(
    documentId: string,
    rowIdx: number,
    colIdx: number,
    cellText: string,
    applyBold: boolean
  ): Promise<boolean> {
    try {
      const tables = await this.getDocumentTables(documentId);
      if (!tables || tables.length === 0) return false;

      const table = tables[tables.length - 1];
      const cells = table.cells;

      if (rowIdx >= cells.length || colIdx >= cells[rowIdx].length) {
        logger.error(`Cell (${rowIdx},${colIdx}) out of bounds`);
        return false;
      }

      const cell = cells[rowIdx][colIdx];
      const insertionIndex = cell.insertion_index;

      const requests: any[] = [{
        insertText: {
          location: { index: insertionIndex },
          text: cellText
        }
      }];

      if (applyBold) {
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

      await this.service.documents().batchUpdate({
        documentId,
        requestBody: { requests }
      });

      return true;
    } catch (error) {
      logger.error(`Failed to populate single cell: ${error}`);
      return false;
    }
  }

  async populateExistingTable(
    documentId: string,
    tableIndex: number,
    tableData: string[][],
    clearExisting = false
  ): Promise<TableCreationResult> {
    try {
      const tables = await this.getDocumentTables(documentId);
      if (tableIndex >= tables.length) {
        return {
          success: false,
          message: `Table index ${tableIndex} not found. Document has ${tables.length} tables`
        };
      }

      const tableInfo = tables[tableIndex];
      const tableRows = tableInfo.rows;
      const tableCols = tableInfo.columns;
      const dataRows = tableData.length;
      const dataCols = tableData[0]?.length || 0;

      if (dataRows > tableRows || dataCols > tableCols) {
        return {
          success: false,
          message: `Data (${dataRows}x${dataCols}) exceeds table dimensions (${tableRows}x${tableCols})`
        };
      }

      const populationCount = await this.populateExistingTableCells(
        documentId, tableIndex, tableData
      );

      const metadata = {
        rows: tableRows,
        columns: tableCols,
        populated_cells: populationCount,
        table_index: tableIndex
      };

      return {
        success: true,
        message: `Successfully populated ${populationCount} cells in existing table`,
        metadata
      };

    } catch (error) {
      return { success: false, message: `Failed to populate existing table: ${error}` };
    }
  }

  private async populateExistingTableCells(
    documentId: string,
    tableIndex: number,
    tableData: string[][]
  ): Promise<number> {
    let populationCount = 0;

    for (let rowIdx = 0; rowIdx < tableData.length; rowIdx++) {
      for (let colIdx = 0; colIdx < tableData[rowIdx].length; colIdx++) {
        const cellText = tableData[rowIdx][colIdx];
        if (!cellText) continue;

        const tables = await this.getDocumentTables(documentId);
        if (tableIndex >= tables.length) break;

        const table = tables[tableIndex];
        const cells = table.cells;

        if (rowIdx >= cells.length || colIdx >= cells[rowIdx].length) continue;

        const cell = cells[rowIdx][colIdx];
        const cellEnd = cell.end_index - 1;

        try {
          await this.service.documents().batchUpdate({
            documentId,
            requestBody: {
              requests: [{
                insertText: {
                  location: { index: cellEnd },
                  text: cellText
                }
              }]
            }
          });
          populationCount++;
        } catch (error) {
          logger.error(`Failed to populate existing cell (${rowIdx},${colIdx}): ${error}`);
        }
      }
    }

    return populationCount;
  }
}