/**
 * Validation Manager
 * 
 * Centralized validation logic for Google Docs operations
 */
import { logger } from '@/lib/utils/logger';

export interface ValidationRules {
  tableMaxRows: number;
  tableMaxColumns: number;
  documentIdPattern: RegExp;
  maxTextLength: number;
  fontSizeRange: [number, number];
  validHeaderFooterTypes: string[];
  validSectionTypes: string[];
  validListTypes: string[];
  validElementTypes: string[];
}

export type ValidationResult = [boolean, string];

export class ValidationManager {
  private validationRules: ValidationRules;

  constructor() {
    this.validationRules = this.setupValidationRules();
  }

  private setupValidationRules(): ValidationRules {
    return {
      tableMaxRows: 1000,
      tableMaxColumns: 20,
      documentIdPattern: /^[a-zA-Z0-9-_]+$/,
      maxTextLength: 1000000,
      fontSizeRange: [1, 400],
      validHeaderFooterTypes: ["DEFAULT", "FIRST_PAGE_ONLY", "EVEN_PAGE"],
      validSectionTypes: ["header", "footer"],
      validListTypes: ["UNORDERED", "ORDERED"],
      validElementTypes: ["table", "list", "page_break"]
    };
  }

  validateDocumentId(documentId: string): ValidationResult {
    if (!documentId) return [false, "Document ID cannot be empty"];
    if (typeof documentId !== 'string') return [false, `Document ID must be a string, got ${typeof documentId}`];
    if (documentId.length < 20) return [false, "Document ID appears too short to be valid"];
    return [true, ""];
  }

  validateTableData(tableData: string[][]): ValidationResult {
    if (!tableData || tableData.length === 0) {
      return [false, "Table data cannot be empty. Required format: [['col1', 'col2'], ['row1col1', 'row1col2']]"];
    }

    if (!Array.isArray(tableData)) {
      return [false, `Table data must be a list, got ${typeof tableData}. Required format: [['col1', 'col2'], ['row1col1', 'row1col2']]`];
    }

    const nonListRows = tableData
      .map((row, i) => ({ row, index: i }))
      .filter(item => !Array.isArray(item.row));
    
    if (nonListRows.length > 0) {
      return [false, `All rows must be lists. Rows ${nonListRows.map(r => r.index)} are not lists`];
    }

    const emptyRows = tableData
      .map((row, i) => ({ row, index: i }))
      .filter(item => item.row.length === 0);
    
    if (emptyRows.length > 0) {
      return [false, `Rows cannot be empty. Empty rows found at indices: ${emptyRows.map(r => r.index)}`];
    }

    const colCounts = tableData.map(row => row.length);
    const uniqueCounts = [...new Set(colCounts)];
    if (uniqueCounts.length > 1) {
      return [false, `All rows must have the same number of columns. Found column counts: ${colCounts}`];
    }

    const rows = tableData.length;
    const cols = colCounts[0];

    if (rows > this.validationRules.tableMaxRows) {
      return [false, `Too many rows (${rows}). Maximum allowed: ${this.validationRules.tableMaxRows}`];
    }

    if (cols > this.validationRules.tableMaxColumns) {
      return [false, `Too many columns (${cols}). Maximum allowed: ${this.validationRules.tableMaxColumns}`];
    }

    for (let rowIdx = 0; rowIdx < tableData.length; rowIdx++) {
      for (let colIdx = 0; colIdx < tableData[rowIdx].length; colIdx++) {
        const cell = tableData[rowIdx][colIdx];
        if (cell === null || cell === undefined) {
          return [false, `Cell (${rowIdx},${colIdx}) is ${cell}. All cells must be strings, use empty string '' for empty cells.`];
        }
        if (typeof cell !== 'string') {
          return [false, `Cell (${rowIdx},${colIdx}) is ${typeof cell}, not string. All cells must be strings. Value: ${JSON.stringify(cell)}`];
        }
      }
    }

    return [true, `Valid table data: ${rows}×${cols} table format`];
  }

  validateTextFormattingParams(
    bold?: boolean,
    italic?: boolean,
    underline?: boolean,
    fontSize?: number,
    fontFamily?: string
  ): ValidationResult {
    const formattingParams = [bold, italic, underline, fontSize, fontFamily];
    if (formattingParams.every(param => param === undefined)) {
      return [false, "At least one formatting parameter must be provided"];
    }

    for (const [param, name] of [[bold, 'bold'], [italic, 'italic'], [underline, 'underline']]) {
      if (param !== undefined && typeof param !== 'boolean') {
        return [false, `${name} parameter must be boolean (true/false), got ${typeof param}`];
      }
    }

    if (fontSize !== undefined) {
      if (!Number.isInteger(fontSize)) {
        return [false, `font_size must be an integer, got ${typeof fontSize}`];
      }
      const [minSize, maxSize] = this.validationRules.fontSizeRange;
      if (fontSize < minSize || fontSize > maxSize) {
        return [false, `font_size must be between ${minSize} and ${maxSize} points, got ${fontSize}`];
      }
    }

    if (fontFamily !== undefined) {
      if (typeof fontFamily !== 'string') {
        return [false, `font_family must be a string, got ${typeof fontFamily}`];
      }
      if (!fontFamily.trim()) {
        return [false, "font_family cannot be empty"];
      }
    }

    return [true, ""];
  }

  validateIndex(index: number, context = "Index"): ValidationResult {
    if (!Number.isInteger(index)) {
      return [false, `${context} must be an integer, got ${typeof index}`];
    }
    if (index < 0) {
      return [false, `${context} ${index} is negative. You MUST call inspect_doc_structure first to get the proper insertion index.`];
    }
    return [true, ""];
  }

  validateIndexRange(
    startIndex: number,
    endIndex?: number,
    documentLength?: number
  ): ValidationResult {
    if (!Number.isInteger(startIndex)) {
      return [false, `start_index must be an integer, got ${typeof startIndex}`];
    }
    if (startIndex < 0) {
      return [false, `start_index cannot be negative, got ${startIndex}`];
    }

    if (endIndex !== undefined) {
      if (!Number.isInteger(endIndex)) {
        return [false, `end_index must be an integer, got ${typeof endIndex}`];
      }
      if (endIndex <= startIndex) {
        return [false, `end_index (${endIndex}) must be greater than start_index (${startIndex})`];
      }
    }

    if (documentLength !== undefined) {
      if (startIndex >= documentLength) {
        return [false, `start_index (${startIndex}) exceeds document length (${documentLength})`];
      }
      if (endIndex !== undefined && endIndex > documentLength) {
        return [false, `end_index (${endIndex}) exceeds document length (${documentLength})`];
      }
    }

    return [true, ""];
  }

  validateElementInsertionParams(
    elementType: string,
    index: number,
    additionalParams: Record<string, any> = {}
  ): ValidationResult {
    if (!this.validationRules.validElementTypes.includes(elementType)) {
      const validTypes = this.validationRules.validElementTypes.join(', ');
      return [false, `Invalid element_type '${elementType}'. Must be one of: ${validTypes}`];
    }

    if (!Number.isInteger(index) || index < 0) {
      return [false, `index must be a non-negative integer, got ${index}`];
    }

    if (elementType === "table") {
      const { rows, columns } = additionalParams;
      if (!rows || !columns) {
        return [false, "Table insertion requires 'rows' and 'columns' parameters"];
      }
      if (!Number.isInteger(rows) || !Number.isInteger(columns)) {
        return [false, "Table rows and columns must be integers"];
      }
      if (rows <= 0 || columns <= 0) {
        return [false, "Table rows and columns must be positive integers"];
      }
      if (rows > this.validationRules.tableMaxRows) {
        return [false, `Too many rows (${rows}). Maximum: ${this.validationRules.tableMaxRows}`];
      }
      if (columns > this.validationRules.tableMaxColumns) {
        return [false, `Too many columns (${columns}). Maximum: ${this.validationRules.tableMaxColumns}`];
      }
    }

    return [true, ""];
  }

  validateHeaderFooterParams(sectionType: string, headerFooterType: string): ValidationResult {
    if (!this.validationRules.validSectionTypes.includes(sectionType)) {
      const validTypes = this.validationRules.validSectionTypes.join(', ');
      return [false, `section_type must be one of: ${validTypes}, got '${sectionType}'`];
    }

    if (!this.validationRules.validHeaderFooterTypes.includes(headerFooterType)) {
      const validTypes = this.validationRules.validHeaderFooterTypes.join(', ');
      return [false, `header_footer_type must be one of: ${validTypes}, got '${headerFooterType}'`];
    }

    return [true, ""];
  }

  validateBatchOperations(operations: any[]): ValidationResult {
    if (!operations || operations.length === 0) {
      return [false, "Operations list cannot be empty"];
    }
    if (!Array.isArray(operations)) {
      return [false, `Operations must be a list, got ${typeof operations}`];
    }

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      if (typeof op !== 'object' || op === null) {
        return [false, `Operation ${i+1} must be a dictionary, got ${typeof op}`];
      }
      if (!op.type) {
        return [false, `Operation ${i+1} missing required 'type' field`];
      }
    }

    return [true, ""];
  }

  validateTextContent(text: string, maxLength?: number): ValidationResult {
    if (typeof text !== 'string') {
      return [false, `Text must be a string, got ${typeof text}`];
    }

    const maxLen = maxLength || this.validationRules.maxTextLength;
    if (text.length > maxLen) {
      return [false, `Text too long (${text.length} characters). Maximum: ${maxLen}`];
    }

    return [true, ""];
  }

  getValidationSummary() {
    return {
      constraints: { ...this.validationRules },
      supported_operations: {
        table_operations: ['create_table', 'populate_table'],
        text_operations: ['insert_text', 'format_text', 'find_replace'],
        element_operations: ['insert_table', 'insert_list', 'insert_page_break'],
        header_footer_operations: ['update_header', 'update_footer']
      },
      data_formats: {
        table_data: "2D list of strings: [['col1', 'col2'], ['row1col1', 'row1col2']]",
        text_formatting: "Optional boolean/integer parameters for styling",
        document_indices: "Non-negative integers for position specification"
      }
    };
  }
}