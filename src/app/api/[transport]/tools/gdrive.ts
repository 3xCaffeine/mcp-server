
import { z } from "zod";
import {
  SearchDriveFilesSchema,
  GetDriveFileContentSchema,
  ListDriveItemsSchema,
  CreateDriveFileSchema,
  searchDriveFiles,
  getDriveFileContent,
  listDriveItems,
  createDriveFile,
} from "@/lib/toolset/google/gdrive";

//
export function registerGdriveTools(server: any, session: { userId: string; scopes?: string }) {
  // Type inference from Zod schemas
  type SearchDriveFilesInput = z.infer<typeof SearchDriveFilesSchema>;
  type GetDriveFileContentInput = z.infer<typeof GetDriveFileContentSchema>;
  type ListDriveItemsInput = z.infer<typeof ListDriveItemsSchema>;
  type CreateDriveFileInput = z.infer<typeof CreateDriveFileSchema>;

  // Search Drive files
  server.tool(
    "search_drive_files",
    "Search files and folders in Google Drive using query syntax",
    SearchDriveFilesSchema.shape,
    async ({ query, pageSize, driveId, includeItemsFromAllDrives, corpora }: SearchDriveFilesInput) => {
      try {
        const results = await searchDriveFiles(session.userId, query, pageSize, driveId, includeItemsFromAllDrives, corpora);
        if (!results.length) {
          return {
            content: [{ type: "text", text: `No files found for query: \"${query}\"` }],
          };
        }
        const filesText = results.map(f =>
          `ID: ${f.id}\nName: ${f.name}\nType: ${f.mimeType}\nModified: ${f.modifiedTime}\nSize: ${f.size}\nLink: ${f.webViewLink}`
        ).join('\n---\n');
        return {
          content: [{ type: "text", text: `Found ${results.length} files for query: \"${query}\"\n\n${filesText}` }],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error searching Drive files: ${error.message}` }],
        };
      }
    },
  );

  // Get Drive file content
  server.tool(
    "get_drive_file_content",
    "Retrieve the content of a specific Google Drive file by ID",
    GetDriveFileContentSchema.shape,
    async ({ fileId }: GetDriveFileContentInput) => {
      try {
        const result = await getDriveFileContent(session.userId, fileId);
        return {
          content: [{ type: "text", text: result }],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error getting file content: ${error.message}` }],
        };
      }
    },
  );

  // List Drive items
  server.tool(
    "list_drive_items",
    "List files and folders in a specific Google Drive folder",
    ListDriveItemsSchema.shape,
    async ({ folderId, pageSize, driveId, includeItemsFromAllDrives, corpora }: ListDriveItemsInput) => {
      try {
        const results = await listDriveItems(session.userId, folderId, pageSize, driveId, includeItemsFromAllDrives, corpora);
        if (!results.length) {
          return {
            content: [{ type: "text", text: `No items found in folder '${folderId}'.` }],
          };
        }
        const itemsText = results.map(f =>
          `ID: ${f.id}\nName: ${f.name}\nType: ${f.mimeType}\nModified: ${f.modifiedTime}\nSize: ${f.size}\nLink: ${f.webViewLink}`
        ).join('\n---\n');
        return {
          content: [{ type: "text", text: `Found ${results.length} items in folder '${folderId}':\n\n${itemsText}` }],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error listing Drive items: ${error.message}` }],
        };
      }
    },
  );

  // Create Drive file
  server.tool(
    "create_drive_file",
    "Create a new file in Google Drive, with content or from a URL",
    CreateDriveFileSchema.shape,
    async ({ fileName, content, folderId, mimeType, fileUrl }: CreateDriveFileInput) => {
      try {
        const result = await createDriveFile(session.userId, fileName, content, folderId, mimeType, fileUrl);
        return {
          content: [{ type: "text", text: result }],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error creating Drive file: ${error.message}` }],
        };
      }
    },
  );
}

// 4. Capabilities object
export const gdriveToolsCapabilities = {
  search_drive_files: {
    description: "Search files and folders in Google Drive using query syntax",
  },
  get_drive_file_content: {
    description: "Retrieve the content of a specific Google Drive file by ID",
  },
  list_drive_items: {
    description: "List files and folders in a specific Google Drive folder",
  },
  create_drive_file: {
    description: "Create a new file in Google Drive, with content or from a URL",
  },
};
