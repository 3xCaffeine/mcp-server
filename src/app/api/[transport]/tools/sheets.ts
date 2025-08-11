import { z } from "zod";
import {
    ListSpreadsheetsSchema,
    GetSpreadsheetInfoSchema,
    ReadSheetValuesSchema,
    ModifySheetValuesSchema,
    CreateSpreadsheetSchema,
    CreateSheetSchema,
    listSpreadsheets,
    getSpreadsheetInfo,
    readSheetValues,
    modifySheetValues,
    createSpreadsheet,
    createSheet,
} from "@/lib/toolset/google/sheets";

export const sheetsToolsCapabilities = {
    list_spreadsheets: {
        description: "List spreadsheets from Google Drive that the user has access to",
    },
    get_spreadsheet_info: {
        description: "Get information about a specific spreadsheet including its sheets",
    },
    read_sheet_values: {
        description: "Read values from a specific range in a Google Sheet",
    },
    modify_sheet_values: {
        description: "Modify values in a specific range of a Google Sheet - can write, update, or clear values",
    },
    create_spreadsheet: {
        description: "Create a new Google Spreadsheet",
    },
    create_sheet: {
        description: "Create a new sheet within an existing spreadsheet",
    },
};

// Type inference from Zod schemas
type ListSpreadsheetsInput = z.infer<typeof ListSpreadsheetsSchema>;
type GetSpreadsheetInfoInput = z.infer<typeof GetSpreadsheetInfoSchema>;
type ReadSheetValuesInput = z.infer<typeof ReadSheetValuesSchema>;
type ModifySheetValuesInput = z.infer<typeof ModifySheetValuesSchema>;
type CreateSpreadsheetInput = z.infer<typeof CreateSpreadsheetSchema>;
type CreateSheetInput = z.infer<typeof CreateSheetSchema>;

export function registerSheetsTools(server: any, session: { userId: string; scopes?: string }) {
    // List spreadsheets
    server.tool(
        "list_spreadsheets",
        "List spreadsheets from Google Drive that the user has access to",
        ListSpreadsheetsSchema.shape,
        async ({ userGoogleEmail, maxResults }: ListSpreadsheetsInput) => {
            try {
                const spreadsheets = await listSpreadsheets(session.userId, userGoogleEmail, maxResults);

                if (spreadsheets.length === 0) {
                    return {
                        content: [{ type: "text", text: `No spreadsheets found for ${userGoogleEmail}.` }],
                    };
                }

                const spreadsheetsList = spreadsheets.map(file =>
                    `- "${file.name}" (ID: ${file.id}) | Modified: ${file.modifiedTime || 'Unknown'} | Link: ${file.webViewLink || 'No link'}`
                ).join('\n');

                return {
                    content: [{
                        type: "text",
                        text: `Successfully listed ${spreadsheets.length} spreadsheets for ${userGoogleEmail}:\n${spreadsheetsList}`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error listing spreadsheets: ${error.message}` }],
                };
            }
        },
    );

    // Get spreadsheet info
    server.tool(
        "get_spreadsheet_info",
        "Get information about a specific spreadsheet including its sheets",
        GetSpreadsheetInfoSchema.shape,
        async ({ userGoogleEmail, spreadsheetId }: GetSpreadsheetInfoInput) => {
            try {
                const info = await getSpreadsheetInfo(session.userId, userGoogleEmail, spreadsheetId);

                const sheetsInfo = info.sheets.map(sheet =>
                    `  - "${sheet.title}" (ID: ${sheet.sheetId}) | Size: ${sheet.rowCount}x${sheet.columnCount}`
                ).join('\n');

                return {
                    content: [{
                        type: "text",
                        text: `Spreadsheet: "${info.title}" (ID: ${info.spreadsheetId})\n` +
                            `Sheets (${info.sheets.length}):\n` +
                            (sheetsInfo || "  No sheets found")
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error getting spreadsheet info: ${error.message}` }],
                };
            }
        },
    );

    // Read sheet values
    server.tool(
        "read_sheet_values",
        "Read values from a specific range in a Google Sheet",
        ReadSheetValuesSchema.shape,
        async ({ userGoogleEmail, spreadsheetId, rangeName }: ReadSheetValuesInput) => {
            try {
                const values = await readSheetValues(session.userId, userGoogleEmail, spreadsheetId, rangeName);

                if (values.length === 0) {
                    return {
                        content: [{ type: "text", text: `No data found in range '${rangeName}' for ${userGoogleEmail}.` }],
                    };
                }

                // Format the output as a readable table
                const formattedRows = values.slice(0, 50).map((row, i) => {
                    // Pad row with empty strings to show structure
                    const maxCols = Math.max(...values.map(r => r.length));
                    const paddedRow = row.concat(Array(Math.max(0, maxCols - row.length)).fill(""));
                    return `Row ${(i + 1).toString().padStart(2)}: [${paddedRow.map(cell => `"${cell}"`).join(', ')}]`;
                });

                const output = `Successfully read ${values.length} rows from range '${rangeName}' in spreadsheet ${spreadsheetId} for ${userGoogleEmail}:\n` +
                    formattedRows.join('\n') +
                    (values.length > 50 ? `\n... and ${values.length - 50} more rows` : "");

                return {
                    content: [{ type: "text", text: output }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error reading sheet values: ${error.message}` }],
                };
            }
        },
    );

    // Modify sheet values
    server.tool(
        "modify_sheet_values",
        "Modify values in a specific range of a Google Sheet - can write, update, or clear values",
        ModifySheetValuesSchema.shape,
        async ({ userGoogleEmail, spreadsheetId, rangeName, values, valueInputOption, clearValues }: ModifySheetValuesInput) => {
            try {
                if (!clearValues && (!values || values.length === 0)) {
                    return {
                        content: [{ type: "text", text: "Either 'values' must be provided or 'clearValues' must be true." }],
                    };
                }

                const result = await modifySheetValues(
                    session.userId,
                    userGoogleEmail,
                    spreadsheetId,
                    rangeName,
                    values,
                    valueInputOption,
                    clearValues
                );

                let message: string;
                if (result.operation === "clear") {
                    message = `Successfully cleared range '${result.clearedRange}' in spreadsheet ${spreadsheetId} for ${userGoogleEmail}.`;
                } else {
                    message = `Successfully updated range '${rangeName}' in spreadsheet ${spreadsheetId} for ${userGoogleEmail}. ` +
                        `Updated: ${result.updatedCells} cells, ${result.updatedRows} rows, ${result.updatedColumns} columns.`;
                }

                return {
                    content: [{ type: "text", text: message }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error modifying sheet values: ${error.message}` }],
                };
            }
        },
    );

    // Create spreadsheet
    server.tool(
        "create_spreadsheet",
        "Create a new Google Spreadsheet",
        CreateSpreadsheetSchema.shape,
        async ({ userGoogleEmail, title, sheetNames }: CreateSpreadsheetInput) => {
            try {
                const result = await createSpreadsheet(session.userId, userGoogleEmail, title, sheetNames);

                return {
                    content: [{
                        type: "text",
                        text: `Successfully created spreadsheet '${title}' for ${userGoogleEmail}. ` +
                            `ID: ${result.spreadsheetId} | URL: ${result.spreadsheetUrl}`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error creating spreadsheet: ${error.message}` }],
                };
            }
        },
    );

    // Create sheet
    server.tool(
        "create_sheet",
        "Create a new sheet within an existing spreadsheet",
        CreateSheetSchema.shape,
        async ({ userGoogleEmail, spreadsheetId, sheetName }: CreateSheetInput) => {
            try {
                const result = await createSheet(session.userId, userGoogleEmail, spreadsheetId, sheetName);

                return {
                    content: [{
                        type: "text",
                        text: `Successfully created sheet '${result.sheetName}' (ID: ${result.sheetId}) in spreadsheet ${spreadsheetId} for ${userGoogleEmail}.`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error creating sheet: ${error.message}` }],
                };
            }
        },
    );
}
