import { z } from "zod";
import { google } from "googleapis";
import { getGoogleOAuthClient } from "../googleoauth-client";

// Zod Schemas for Drive tools
export const SearchDriveFilesSchema = z.object({
  query: z.string().describe("Drive search query (e.g., 'name contains \"report\"', 'mimeType = \"application/pdf\"')"),
  pageSize: z.number().optional().default(10).describe("Maximum number of results to return (default: 10, max: 100)"),
  driveId: z.string().optional().describe("ID of the shared drive to search (optional)"),
  includeItemsFromAllDrives: z.boolean().optional().default(true).describe("Whether to include items from all drives (default: true)"),
  corpora: z.string().optional().describe("Corpora to search (e.g., 'user', 'drive', 'allDrives') (optional)"),
});

export const GetDriveFileContentSchema = z.object({
  fileId: z.string().describe("ID of the Drive file to retrieve content for"),
});

export const ListDriveItemsSchema = z.object({
  folderId: z.string().optional().default('root').describe("ID of the folder to list items from (default: 'root')"),
  pageSize: z.number().optional().default(100).describe("Maximum number of items to return (default: 100)"),
  driveId: z.string().optional().describe("ID of the shared drive (optional)"),
  includeItemsFromAllDrives: z.boolean().optional().default(true).describe("Whether to include items from all drives (default: true)"),
  corpora: z.string().optional().describe("Corpora to search (e.g., 'user', 'drive', 'allDrives') (optional)"),
});

export const CreateDriveFileSchema = z.object({
  fileName: z.string().describe("Name for the new file"),
  content: z.string().optional().describe("Content to write to the file (optional if fileUrl is provided)"),
  folderId: z.string().optional().default('root').describe("ID of the parent folder (default: 'root')"),
  mimeType: z.string().optional().default('text/plain').describe("MIME type of the file (default: 'text/plain')"),
  fileUrl: z.string().optional().describe("URL to fetch file content from (optional if content is provided)"),
});

export async function searchDriveFiles(userId: string, query: string, pageSize: number = 10, driveId?: string, includeItemsFromAllDrives: boolean = true, corpora?: string) {
  const oauth2Client = await getGoogleOAuthClient(userId);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const params: any = {
    q: query,
    pageSize: Math.min(pageSize, 100),
    fields: 'nextPageToken, files(id, name, mimeType, webViewLink, iconLink, modifiedTime, size)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: includeItemsFromAllDrives,
  };
  if (driveId) {
    params.driveId = driveId;
    params.corpora = corpora || 'drive';
  } else if (corpora) {
    params.corpora = corpora;
  }
  const response = await drive.files.list(params);
  const files = response.data.files || [];
  return files.map(f => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    webViewLink: f.webViewLink,
    iconLink: f.iconLink,
    modifiedTime: f.modifiedTime,
    size: f.size,
  }));
}

export async function getDriveFileContent(userId: string, fileId: string) {
  const oauth2Client = await getGoogleOAuthClient(userId);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  // Get file metadata
  const fileMeta = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, webViewLink',
    supportsAllDrives: true,
  });
  const mimeType = fileMeta.data.mimeType || '';
  const fileName = fileMeta.data.name || 'Unknown File';
  // For Google Docs, export as text/csv; else get_media
  let exportMimeType: string | undefined = undefined;
  if (mimeType === 'application/vnd.google-apps.document') exportMimeType = 'text/plain';
  if (mimeType === 'application/vnd.google-apps.spreadsheet') exportMimeType = 'text/csv';
  if (mimeType === 'application/vnd.google-apps.presentation') exportMimeType = 'text/plain';
  let contentBuffer: Buffer = Buffer.alloc(0);
  if (exportMimeType) {
    const res = await drive.files.export({ fileId, mimeType: exportMimeType }, { responseType: 'arraybuffer' });
    contentBuffer = Buffer.from(res.data as ArrayBuffer);
  } else {
    const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
    contentBuffer = Buffer.from(res.data as ArrayBuffer);
  }
  // Try to decode as UTF-8, else show binary note
  let bodyText: string;
  try {
    bodyText = contentBuffer.toString('utf-8');
  } catch {
    bodyText = `[Binary or unsupported text encoding for mimeType '${mimeType}' - ${contentBuffer.length} bytes]`;
  }
  const header = `File: "${fileName}" (ID: ${fileId}, Type: ${mimeType})\nLink: ${fileMeta.data.webViewLink || '#'}\n\n--- CONTENT ---\n`;
  return header + bodyText;
}

export async function listDriveItems(userId: string, folderId: string = 'root', pageSize: number = 100, driveId?: string, includeItemsFromAllDrives: boolean = true, corpora?: string) {
  const oauth2Client = await getGoogleOAuthClient(userId);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const query = `'${folderId}' in parents and trashed=false`;
  const params: any = {
    q: query,
    pageSize: Math.min(pageSize, 100),
    fields: 'nextPageToken, files(id, name, mimeType, webViewLink, iconLink, modifiedTime, size)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: includeItemsFromAllDrives,
  };
  if (driveId) {
    params.driveId = driveId;
    params.corpora = corpora || 'drive';
  } else if (corpora) {
    params.corpora = corpora;
  }
  const response = await drive.files.list(params);
  const files = response.data.files || [];
  return files.map(f => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    webViewLink: f.webViewLink,
    iconLink: f.iconLink,
    modifiedTime: f.modifiedTime,
    size: f.size,
  }));
}

export async function createDriveFile(userId: string, fileName: string, content?: string, folderId: string = 'root', mimeType: string = 'text/plain', fileUrl?: string) {
  const oauth2Client = await getGoogleOAuthClient(userId);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  let fileData: Buffer | undefined = undefined;
  let usedMimeType = mimeType;
  if (fileUrl) {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`Failed to fetch file from URL: ${fileUrl} (status ${res.status})`);
    fileData = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type');
    if (contentType && contentType !== 'application/octet-stream') usedMimeType = contentType;
  } else if (content) {
    fileData = Buffer.from(content, 'utf-8');
  } else {
    throw new Error("You must provide either 'content' or 'fileUrl'.");
  }
  const fileMetadata: any = {
    name: fileName,
    parents: [folderId],
    mimeType: usedMimeType,
  };
  const media = { mimeType: usedMimeType, body: fileData ? Buffer.from(fileData) : undefined };
  const created = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, webViewLink',
    supportsAllDrives: true,
  });
  const link = created.data.webViewLink || 'No link available';
  return `Successfully created file '${created.data.name || fileName}' (ID: ${created.data.id || 'N/A'}) in folder '${folderId}'. Link: ${link}`;
}
