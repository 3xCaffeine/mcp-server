/**
 * Google Docs Helper Functions
 * 
 * Utility functions for common Google Docs operations
 */

export interface TextStyleOptions {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
}

export function buildTextStyle(options: TextStyleOptions): [any, string[]] {
  const textStyle: any = {};
  const fields: string[] = [];

  if (options.bold !== undefined) {
    textStyle.bold = options.bold;
    fields.push('bold');
  }

  if (options.italic !== undefined) {
    textStyle.italic = options.italic;
    fields.push('italic');
  }

  if (options.underline !== undefined) {
    textStyle.underline = options.underline;
    fields.push('underline');
  }

  if (options.fontSize !== undefined) {
    textStyle.fontSize = { magnitude: options.fontSize, unit: 'PT' };
    fields.push('fontSize');
  }

  if (options.fontFamily) {
    textStyle.weightedFontFamily = { fontFamily: options.fontFamily };
    fields.push('weightedFontFamily');
  }

  return [textStyle, fields];
}

export function createInsertTextRequest(index: number, text: string): any {
  return {
    insertText: {
      location: { index },
      text
    }
  };
}

export function createDeleteRangeRequest(startIndex: number, endIndex: number): any {
  return {
    deleteContentRange: {
      range: {
        startIndex,
        endIndex
      }
    }
  };
}

export function createFormatTextRequest(
  startIndex: number,
  endIndex: number,
  options: TextStyleOptions
): any | null {
  const [textStyle, fields] = buildTextStyle(options);
  
  if (!textStyle || fields.length === 0) return null;

  return {
    updateTextStyle: {
      range: {
        startIndex,
        endIndex
      },
      textStyle,
      fields: fields.join(',')
    }
  };
}

export function createFindReplaceRequest(
  findText: string,
  replaceText: string,
  matchCase = false
): any {
  return {
    replaceAllText: {
      containsText: {
        text: findText,
        matchCase
      },
      replaceText
    }
  };
}

export function createInsertTableRequest(index: number, rows: number, columns: number): any {
  return {
    insertTable: {
      location: { index },
      rows,
      columns
    }
  };
}

export function createInsertPageBreakRequest(index: number): any {
  return {
    insertPageBreak: {
      location: { index }
    }
  };
}

export function createInsertImageRequest(
  index: number,
  imageUri: string,
  width?: number,
  height?: number
): any {
  const request: any = {
    insertInlineImage: {
      location: { index },
      uri: imageUri
    }
  };

  const objectSize: any = {};
  if (width !== undefined) {
    objectSize.width = { magnitude: width, unit: 'PT' };
  }
  if (height !== undefined) {
    objectSize.height = { magnitude: height, unit: 'PT' };
  }

  if (Object.keys(objectSize).length > 0) {
    request.insertInlineImage.objectSize = objectSize;
  }

  return request;
}

export function createBulletListRequest(
  startIndex: number,
  endIndex: number,
  listType = "UNORDERED"
): any {
  const bulletPreset = listType === "UNORDERED"
    ? 'BULLET_DISC_CIRCLE_SQUARE'
    : 'NUMBERED_DECIMAL_ALPHA_ROMAN';

  return {
    createParagraphBullets: {
      range: {
        startIndex,
        endIndex
      },
      bulletPreset
    }
  };
}

export interface BatchOperation {
  type: string;
  [key: string]: any;
}

export function validateOperation(operation: BatchOperation): [boolean, string] {
  if (!operation.type) {
    return [false, "Missing 'type' field"];
  }

  const requiredFields: Record<string, string[]> = {
    insert_text: ['index', 'text'],
    delete_text: ['start_index', 'end_index'],
    replace_text: ['start_index', 'end_index', 'text'],
    format_text: ['start_index', 'end_index'],
    insert_table: ['index', 'rows', 'columns'],
    insert_page_break: ['index'],
    find_replace: ['find_text', 'replace_text']
  };

  if (!(operation.type in requiredFields)) {
    return [false, `Unsupported operation type: ${operation.type}`];
  }

  for (const field of requiredFields[operation.type]) {
    if (!(field in operation)) {
      return [false, `Missing required field: ${field}`];
    }
  }

  return [true, ""];
}