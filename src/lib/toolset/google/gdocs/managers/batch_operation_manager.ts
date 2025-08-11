/**
 * 🎯 Batch Operation Manager
 * 
 * High-level batch operation management for Google Docs
 * Extracts complex validation and request building logic
 */

import { logger } from '@/lib/utils/logger';
import {
  createInsertTextRequest,
  createDeleteRangeRequest,
  createFormatTextRequest,
  createFindReplaceRequest,
  createInsertTableRequest,
  createInsertPageBreakRequest,
  validateOperation
} from '../docs_helpers';

// 🛠️ Types
export interface BatchOperation {
  type: string;
  [key: string]: any;
}

export interface BatchResult {
  success: boolean;
  message: string;
  metadata: {
    operationsCount: number;
    requestsCount: number;
    repliesCount: number;
    operationSummary: string[];
  };
}

export interface SupportedOperation {
  required: string[];
  optional?: string[];
  description: string;
}

export interface BatchOperationsInfo {
  supportedOperations: Record<string, SupportedOperation>;
  exampleOperations: BatchOperation[];
}

/**
 * 🚀 High-level manager for Google Docs batch operations
 * 
 * Handles complex multi-operation requests including:
 * - Operation validation and request building
 * - Batch execution with proper error handling
 * - Operation result processing and reporting
 */
export class BatchOperationManager {
  private service: any;

  /**
   * Initialize the batch operation manager
   * @param service - Google Docs API service instance
   */
  constructor(service: any) {
    this.service = service;
  }

  /**
   * 🔧 Execute multiple document operations in a single atomic batch
   * 
   * @param documentId - ID of the document to update
   * @param operations - List of operation dictionaries
   * @returns Tuple of [success, message, metadata]
   */
  async executeBatchOperations(
    documentId: string,
    operations: BatchOperation[]
  ): Promise<BatchResult> {
    logger.info(`✅ Executing batch operations on document ${documentId}`);
    logger.info(`📊 Operations count: ${operations.length}`);

    if (!operations || operations.length === 0) {
      return {
        success: false,
        message: "No operations provided. Please provide at least one operation.",
        metadata: {
          operationsCount: 0,
          requestsCount: 0,
          repliesCount: 0,
          operationSummary: []
        }
      };
    }

    try {
      // 📋 Validate and build requests
      const [requests, operationDescriptions] = await this.validateAndBuildRequests(operations);

      if (!requests || requests.length === 0) {
        return {
          success: false,
          message: "No valid requests could be built from operations",
          metadata: {
            operationsCount: operations.length,
            requestsCount: 0,
            repliesCount: 0,
            operationSummary: []
          }
        };
      }

      // ⚡ Execute the batch
      const result = await this.executeBatchRequests(documentId, requests);

      // 📊 Process results
      const metadata = {
        operationsCount: operations.length,
        requestsCount: requests.length,
        repliesCount: result?.replies?.length || 0,
        operationSummary: operationDescriptions.slice(0, 5)  // First 5 operations
      };

      const summary = this.buildOperationSummary(operationDescriptions);

      return {
        success: true,
        message: `Successfully executed ${operations.length} operations (${summary})`,
        metadata
      };

    } catch (error) {
      logger.error(`❌ Failed to execute batch operations: ${error}`);
      return {
        success: false,
        message: `Batch operation failed: ${error}`,
        metadata: {
          operationsCount: operations.length,
          requestsCount: 0,
          repliesCount: 0,
          operationSummary: []
        }
      };
    }
  }

  /**
   * ✅ Validate operations and build API requests
   * 
   * @param operations - List of operation dictionaries
   * @returns Tuple of [requests, operation_descriptions]
   */
  private async validateAndBuildRequests(
    operations: BatchOperation[]
  ): Promise<[any[], string[]]> {
    const requests: any[] = [];
    const operationDescriptions: string[] = [];

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      
      // 🔍 Validate operation structure
      const [isValid, errorMsg] = validateOperation(op);
      if (!isValid) {
        throw new Error(`Operation ${i + 1}: ${errorMsg}`);
      }

      const opType = op.type;

      try {
        // 🏗️ Build request based on operation type
        const [request, description] = this.buildOperationRequest(op, opType);
        
        // Handle both single request and list of requests
        if (Array.isArray(request)) {
          // Multiple requests (e.g., replace_text)
          requests.push(...request);
          operationDescriptions.push(description);
        } else if (request) {
          // Single request
          requests.push(request);
          operationDescriptions.push(description);
        }

      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Operation ${i + 1} (${opType}) failed: ${error.message}`);
        }
        throw error;
      }
    }

    return [requests, operationDescriptions];
  }

  /**
   * 🛠️ Build a single operation request
   * 
   * @param op - Operation dictionary
   * @param opType - Operation type
   * @returns Tuple of [request, description]
   */
  private buildOperationRequest(
    op: BatchOperation,
    opType: string
  ): [any | any[], string] {
    switch (opType) {
      case 'insert_text':
        const insertRequest = createInsertTextRequest(op.index, op.text);
        return [insertRequest, `insert text at ${op.index}`];

      case 'delete_text':
        const deleteRequest = createDeleteRangeRequest(op.startIndex, op.endIndex);
        return [deleteRequest, `delete text ${op.startIndex}-${op.endIndex}`];

      case 'replace_text':
        // Replace is delete + insert (must be done in this order)
        const deleteReq = createDeleteRangeRequest(op.startIndex, op.endIndex);
        const insertReq = createInsertTextRequest(op.startIndex, op.text);
        const truncatedText = op.text.length > 20 ? `${op.text.substring(0, 20)}...` : op.text;
        return [
          [deleteReq, insertReq],
          `replace text ${op.startIndex}-${op.endIndex} with '${truncatedText}'`
        ];

      case 'format_text':
        const formatRequest = createFormatTextRequest(
          op.startIndex,
          op.endIndex,
          {
            bold: op.bold,
            italic: op.italic,
            underline: op.underline,
            fontSize: op.fontSize,
            fontFamily: op.fontFamily
          }
        );

        if (!formatRequest) {
          throw new Error("No formatting options provided");
        }

        // Build format description
        const formatChanges: string[] = [];
        const formatMap = [
          ['bold', 'bold'],
          ['italic', 'italic'],
          ['underline', 'underline'],
          ['fontSize', 'font size'],
          ['fontFamily', 'font family']
        ];

        for (const [param, name] of formatMap) {
          if (op[param] !== undefined) {
            const value = param === 'fontSize' ? `${op[param]}pt` : op[param];
            formatChanges.push(`${name}: ${value}`);
          }
        }

        return [
          formatRequest,
          `format text ${op.startIndex}-${op.endIndex} (${formatChanges.join(', ')})`
        ];

      case 'insert_table':
        const tableRequest = createInsertTableRequest(op.index, op.rows, op.columns);
        return [tableRequest, `insert ${op.rows}x${op.columns} table at ${op.index}`];

      case 'insert_page_break':
        const pageBreakRequest = createInsertPageBreakRequest(op.index);
        return [pageBreakRequest, `insert page break at ${op.index}`];

      case 'find_replace':
        const findReplaceRequest = createFindReplaceRequest(
          op.findText, op.replaceText, op.matchCase || false
        );
        return [findReplaceRequest, `find/replace '${op.findText}' → '${op.replaceText}'`];

      default:
        const supportedTypes = [
          'insert_text', 'delete_text', 'replace_text', 'format_text',
          'insert_table', 'insert_page_break', 'find_replace'
        ];
        throw new Error(
          `Unsupported operation type '${opType}'. Supported: ${supportedTypes.join(', ')}`
        );
    }
  }

  /**
   * ⚡ Execute the batch requests against Google Docs API
   * 
   * @param documentId - Document ID
   * @param requests - List of API requests
   * @returns API response
   */
  private async executeBatchRequests(
    documentId: string,
    requests: any[]
  ): Promise<any> {
    return await fetch(`/api/docs/${documentId}/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    }).then(res => res.json());
  }

  /**
   * 📋 Build concise summary of operations performed
   * 
   * @param operationDescriptions - List of operation descriptions
   * @returns Summary string
   */
  private buildOperationSummary(operationDescriptions: string[]): string {
    if (!operationDescriptions.length) {
      return "no operations";
    }

    const summaryItems = operationDescriptions.slice(0, 3);
    let summary = summaryItems.join(', ');

    if (operationDescriptions.length > 3) {
      const remaining = operationDescriptions.length - 3;
      summary += ` and ${remaining} more operation${remaining > 1 ? 's' : ''}`;
    }

    return summary;
  }

  /**
   * 📖 Get information about supported batch operations
   * 
   * @returns Dictionary with supported operation types and parameters
   */
  getSupportedOperations(): BatchOperationsInfo {
    return {
      supportedOperations: {
        insert_text: {
          required: ['index', 'text'],
          description: 'Insert text at specified index'
        },
        delete_text: {
          required: ['startIndex', 'endIndex'],
          description: 'Delete text in specified range'
        },
        replace_text: {
          required: ['startIndex', 'endIndex', 'text'],
          description: 'Replace text in range with new text'
        },
        format_text: {
          required: ['startIndex', 'endIndex'],
          optional: ['bold', 'italic', 'underline', 'fontSize', 'fontFamily'],
          description: 'Apply formatting to text range'
        },
        insert_table: {
          required: ['index', 'rows', 'columns'],
          description: 'Insert table at specified index'
        },
        insert_page_break: {
          required: ['index'],
          description: 'Insert page break at specified index'
        },
        find_replace: {
          required: ['findText', 'replaceText'],
          optional: ['matchCase'],
          description: 'Find and replace text throughout document'
        }
      },
      exampleOperations: [
        { type: 'insert_text', index: 1, text: 'Hello World' },
        { type: 'format_text', startIndex: 1, endIndex: 12, bold: true },
        { type: 'insert_table', index: 20, rows: 2, columns: 3 }
      ]
    };
  }
}