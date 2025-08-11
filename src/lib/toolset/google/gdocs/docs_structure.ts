/**
 * Google Docs Document Structure Parsing and Analysis
 * 
 * Utilities for parsing and analyzing Google Docs document structure
 */
import { logger } from '@/lib/utils/logger';

export interface DocumentElement {
  type: string;
  start_index: number;
  end_index: number;
  [key: string]: any;
}

export interface TableCell {
  row: number;
  column: number;
  start_index: number;
  end_index: number;
  insertion_index: number;
  content: string;
  content_elements: any[];
}

export interface TableInfo {
  index: number;
  start_index: number;
  end_index: number;
  rows: number;
  columns: number;
  cells: TableCell[][];
}

export interface DocumentStructure {
  title: string;
  body: DocumentElement[];
  tables: DocumentElement[];
  headers: Record<string, any>;
  footers: Record<string, any>;
  total_length: number;
}

export function parseDocumentStructure(docData: any): DocumentStructure {
  const structure: DocumentStructure = {
    title: docData.title || '',
    body: [],
    tables: [],
    headers: {},
    footers: {},
    total_length: 0
  };

  const body = docData.body || {};
  const content = body.content || [];

  for (const element of content) {
    const elementInfo = parseElement(element);
    if (elementInfo) {
      structure.body.push(elementInfo);
      if (elementInfo.type === 'table') {
        structure.tables.push(elementInfo);
      }
    }
  }

  if (structure.body.length > 0) {
    const lastElement = structure.body[structure.body.length - 1];
    structure.total_length = lastElement.end_index || 0;
  }

  // Parse headers and footers
  for (const [headerId, headerData] of Object.entries(docData.headers || {})) {
    structure.headers[headerId] = parseSegment(headerData);
  }

  for (const [footerId, footerData] of Object.entries(docData.footers || {})) {
    structure.footers[footerId] = parseSegment(footerData);
  }

  return structure;
}

function parseElement(element: any): DocumentElement | null {
  const elementInfo: DocumentElement = {
    type: '',
    start_index: element.startIndex || 0,
    end_index: element.endIndex || 0
  };

  if (element.paragraph) {
    elementInfo.type = 'paragraph';
    elementInfo.text = extractParagraphText(element.paragraph);
    elementInfo.style = element.paragraph.paragraphStyle || {};
  } else if (element.table) {
    elementInfo.type = 'table';
    elementInfo.rows = element.table.tableRows?.length || 0;
    elementInfo.columns = element.table.tableRows?.[0]?.tableCells?.length || 0;
    elementInfo.cells = parseTableCells(element.table);
    elementInfo.table_style = element.table.tableStyle || {};
  } else if (element.sectionBreak) {
    elementInfo.type = 'section_break';
    elementInfo.section_style = element.sectionBreak.sectionStyle || {};
  } else if (element.tableOfContents) {
    elementInfo.type = 'table_of_contents';
  } else {
    return null;
  }

  return elementInfo;
}

function parseTableCells(table: any): TableCell[][] {
  const cells: TableCell[][] = [];
  const tableRows = table.tableRows || [];

  for (let rowIdx = 0; rowIdx < tableRows.length; rowIdx++) {
    const row = tableRows[rowIdx];
    const rowCells: TableCell[] = [];
    const tableCells = row.tableCells || [];

    for (let colIdx = 0; colIdx < tableCells.length; colIdx++) {
      const cell = tableCells[colIdx];
      let insertionIndex = (cell.startIndex || 0) + 1;

      const contentElements = cell.content || [];
      for (const element of contentElements) {
        if (element.paragraph) {
          const paragraph = element.paragraph;
          const paraElements = paragraph.elements || [];
          if (paraElements.length > 0) {
            const firstElement = paraElements[0];
            if (firstElement.startIndex !== undefined) {
              insertionIndex = firstElement.startIndex;
              break;
            }
          }
        }
      }

      rowCells.push({
        row: rowIdx,
        column: colIdx,
        start_index: cell.startIndex || 0,
        end_index: cell.endIndex || 0,
        insertion_index: insertionIndex,
        content: extractCellText(cell),
        content_elements: contentElements
      });
    }

    cells.push(rowCells);
  }

  return cells;
}

function extractParagraphText(paragraph: any): string {
  const textParts: string[] = [];
  for (const element of paragraph.elements || []) {
    if (element.textRun) {
      textParts.push(element.textRun.content || '');
    }
  }
  return textParts.join('');
}

function extractCellText(cell: any): string {
  const textParts: string[] = [];
  for (const element of cell.content || []) {
    if (element.paragraph) {
      textParts.push(extractParagraphText(element.paragraph));
    }
  }
  return textParts.join('');
}

function parseSegment(segmentData: any): any {
  const content = segmentData.content || [];
  return {
    content,
    start_index: content[0]?.startIndex || 0,
    end_index: content[content.length - 1]?.endIndex || 0
  };
}

export function findTables(docData: any): TableInfo[] {
  const tables: TableInfo[] = [];
  const structure = parseDocumentStructure(docData);

  for (let idx = 0; idx < structure.tables.length; idx++) {
    const tableInfo = structure.tables[idx];
    tables.push({
      index: idx,
      start_index: tableInfo.start_index,
      end_index: tableInfo.end_index,
      rows: tableInfo.rows,
      columns: tableInfo.columns,
      cells: tableInfo.cells
    });
  }

  return tables;
}

export function getTableCellIndices(
  docData: any,
  tableIndex = 0
): Array<Array<[number, number]>> | null {
  const tables = findTables(docData);
  
  if (tableIndex >= tables.length) {
    logger.warn(`Table index ${tableIndex} not found. Document has ${tables.length} tables.`);
    return null;
  }

  const table = tables[tableIndex];
  const cellIndices: Array<Array<[number, number]>> = [];

  for (const row of table.cells) {
    const rowIndices: Array<[number, number]> = [];
    for (const cell of row) {
      const cellContent = cell.content_elements;
      let startIdx = cell.start_index + 1;
      let endIdx = cell.end_index - 1;

      for (const element of cellContent) {
        if (element.paragraph) {
          const paraElements = element.paragraph.elements || [];
          if (paraElements.length > 0) {
            const firstTextElement = paraElements[0];
            if (firstTextElement.startIndex !== undefined) {
              startIdx = firstTextElement.startIndex;
              endIdx = firstTextElement.endIndex || startIdx + 1;
              break;
            }
          }
        }
      }

      rowIndices.push([startIdx, endIdx]);
    }
    cellIndices.push(rowIndices);
  }

  return cellIndices;
}

export function findElementAtIndex(docData: any, index: number): DocumentElement | null {
  const structure = parseDocumentStructure(docData);

  for (const element of structure.body) {
    if (element.start_index <= index && index < element.end_index) {
      const elementCopy = { ...element };

      if (element.type === 'table' && element.cells) {
        for (let rowIdx = 0; rowIdx < element.cells.length; rowIdx++) {
          for (let colIdx = 0; colIdx < element.cells[rowIdx].length; colIdx++) {
            const cell = element.cells[rowIdx][colIdx];
            if (cell.start_index <= index && index < cell.end_index) {
              (elementCopy as any).containing_cell = {
                row: rowIdx,
                column: colIdx,
                cell_start: cell.start_index,
                cell_end: cell.end_index
              };
              break;
            }
          }
        }
      }

      return elementCopy;
    }
  }

  return null;
}

export function getNextParagraphIndex(docData: any, afterIndex = 0): number {
  const structure = parseDocumentStructure(docData);

  for (const element of structure.body) {
    if (element.type === 'paragraph' && element.start_index > afterIndex) {
      return element.start_index;
    }
  }

  return Math.max(structure.total_length - 1, 1);
}

export interface DocumentStats {
  total_elements: number;
  tables: number;
  paragraphs: number;
  section_breaks: number;
  total_length: number;
  has_headers: boolean;
  has_footers: boolean;
  total_table_cells?: number;
  largest_table?: number;
}

export function analyzeDocumentComplexity(docData: any): DocumentStats {
  const structure = parseDocumentStructure(docData);

  const stats: DocumentStats = {
    total_elements: structure.body.length,
    tables: structure.tables.length,
    paragraphs: structure.body.filter(e => e.type === 'paragraph').length,
    section_breaks: structure.body.filter(e => e.type === 'section_break').length,
    total_length: structure.total_length,
    has_headers: Object.keys(structure.headers).length > 0,
    has_footers: Object.keys(structure.footers).length > 0
  };

  if (structure.tables.length > 0) {
    const totalCells = structure.tables.reduce(
      (sum, table) => sum + (table.rows * table.columns), 0
    );
    stats.total_table_cells = totalCells;
    stats.largest_table = Math.max(...structure.tables.map(t => t.rows * t.columns));
  }

  return stats;
}