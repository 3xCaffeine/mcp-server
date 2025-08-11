import { z } from "zod";
import { google } from "googleapis";
import { getGoogleOAuthClient } from "../googleoauth-client";

// Zod Schema definitions for Google Sheets tools
export const ListSpreadsheetsSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    maxResults: z.number().optional().default(25).describe("Maximum number of spreadsheets to return (default: 25)"),
});

export const GetSpreadsheetInfoSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    spreadsheetId: z.string().describe("The ID of the spreadsheet to get info for"),
});

export const ReadSheetValuesSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    spreadsheetId: z.string().describe("The ID of the spreadsheet"),
    rangeName: z.string().optional().default("A1:Z1000").describe("The range to read (e.g., 'Sheet1!A1:D10', 'A1:D10'). Defaults to 'A1:Z1000'"),
});

export const ModifySheetValuesSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    spreadsheetId: z.string().describe("The ID of the spreadsheet"),
    rangeName: z.string().describe("The range to modify (e.g., 'Sheet1!A1:D10', 'A1:D10')"),
    values: z.array(z.array(z.string())).optional().describe("2D array of values to write/update. Required unless clearValues=true"),
    valueInputOption: z.enum(["RAW", "USER_ENTERED"]).optional().default("USER_ENTERED").describe("How to interpret input values"),
    clearValues: z.boolean().optional().default(false).describe("If true, clears the range instead of writing values"),
});

export const CreateSpreadsheetSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    title: z.string().describe("The title of the new spreadsheet"),
    sheetNames: z.array(z.string()).optional().describe("List of sheet names to create. If not provided, creates one sheet with default name"),
});

export const CreateSheetSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    spreadsheetId: z.string().describe("The ID of the spreadsheet"),
    sheetName: z.string().describe("The name of the new sheet"),
});

/**
 * List spreadsheets from Google Drive that the user has access to
 */
export async function listSpreadsheets(userId: string, userGoogleEmail: string, maxResults: number = 25) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const response = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        pageSize: maxResults,
        fields: "files(id,name,modifiedTime,webViewLink)",
        orderBy: "modifiedTime desc",
    });

    const files = response.data.files || [];
    return files.map(file => ({
        id: file.id,
        name: file.name,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
    }));
}

/**
 * Get information about a specific spreadsheet including its sheets
 */
export async function getSpreadsheetInfo(userId: string, userGoogleEmail: string, spreadsheetId: string) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    const response = await sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId,
    });

    const spreadsheet = response.data;
    const title = spreadsheet.properties?.title || "Unknown";
    const sheetsData = spreadsheet.sheets || [];

    const sheets_info = sheetsData.map(sheet => {
        const props = sheet.properties;
        return {
            title: props?.title || "Unknown",
            sheetId: props?.sheetId || "Unknown",
            rowCount: props?.gridProperties?.rowCount || "Unknown",
            columnCount: props?.gridProperties?.columnCount || "Unknown",
        };
    });

    return {
        title,
        spreadsheetId,
        sheets: sheets_info,
    };
}

/**
 * Read values from a specific range in a Google Sheet
 */
export async function readSheetValues(userId: string, userGoogleEmail: string, spreadsheetId: string, rangeName: string = "A1:Z1000") {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: rangeName,
    });

    const values = response.data.values || [];
    return values;
}

/**
 * Modify values in a specific range of a Google Sheet
 */
export async function modifySheetValues(
    userId: string,
    userGoogleEmail: string,
    spreadsheetId: string,
    rangeName: string,
    values?: string[][],
    valueInputOption: "RAW" | "USER_ENTERED" = "USER_ENTERED",
    clearValues: boolean = false
) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    if (clearValues) {
        const response = await sheets.spreadsheets.values.clear({
            spreadsheetId: spreadsheetId,
            range: rangeName,
        });

        return {
            operation: "clear",
            clearedRange: response.data.clearedRange || rangeName,
        };
    } else {
        if (!values) {
            throw new Error("Values must be provided when clearValues is false");
        }

        const response = await sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: rangeName,
            valueInputOption: valueInputOption,
            requestBody: {
                values: values,
            },
        });

        return {
            operation: "update",
            updatedCells: response.data.updatedCells || 0,
            updatedRows: response.data.updatedRows || 0,
            updatedColumns: response.data.updatedColumns || 0,
            updatedRange: response.data.updatedRange || rangeName,
        };
    }
}

/**
 * Create a new Google Spreadsheet
 */
export async function createSpreadsheet(userId: string, userGoogleEmail: string, title: string, sheetNames?: string[]) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    const spreadsheetBody: any = {
        properties: {
            title: title,
        },
    };

    if (sheetNames && sheetNames.length > 0) {
        spreadsheetBody.sheets = sheetNames.map(name => ({
            properties: { title: name },
        }));
    }

    const response = await sheets.spreadsheets.create({
        requestBody: spreadsheetBody,
    });

    const spreadsheet = response.data;
    return {
        spreadsheetId: spreadsheet.spreadsheetId,
        spreadsheetUrl: spreadsheet.spreadsheetUrl,
        title: spreadsheet.properties?.title,
    };
}

/**
 * Create a new sheet within an existing spreadsheet
 */
export async function createSheet(userId: string, userGoogleEmail: string, spreadsheetId: string, sheetName: string) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    const requestBody = {
        requests: [
            {
                addSheet: {
                    properties: {
                        title: sheetName,
                    },
                },
            },
        ],
    };

    const response = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: requestBody,
    });

    const sheetId = response.data.replies?.[0]?.addSheet?.properties?.sheetId;

    return {
        sheetName,
        sheetId,
        spreadsheetId,
    };
}
