import { z } from "zod";
import { 
  SearchDocsSchema,
  GetDocContentSchema,
  ListDocsInFolderSchema,
  CreateDocSchema,
  ModifyDocTextSchema,
  FindAndReplaceDocSchema,
  InsertDocElementsSchema,
  InsertDocImageSchema,
  UpdateDocHeadersFootersSchema,
  BatchUpdateDocSchema,
  InspectDocStructureSchema,
  CreateTableWithDataSchema,
  DebugTableStructureSchema,
  searchDocs,
  getDocContent,
  listDocsInFolder,
  createDoc as importedCreateDoc,
  modifyDocText,
  findAndReplaceDoc,
  insertDocElements,
  insertDocImage,
  updateDocHeadersFooters,
  batchUpdateDoc,
  inspectDocStructure,
  createTableWithData,
  debugTableStructure,
} from "@/lib/toolset/google/gdocs";
import { getGoogleOAuthClient } from '@/lib/toolset/googleoauth-client';
import { logger } from '@/lib/utils/logger';
import { google } from 'googleapis';

export const docsToolsCapabilities = {
  search_docs: {
    description: "Search for Google Docs by name using Drive API",
  },
  get_doc_content: {
    description: "Retrieve content of a Google Doc or Drive file (.docx, etc.)",
  },
  list_docs_in_folder: {
    description: "List Google Docs within a specific Drive folder",
  },
  create_doc: {
    description: "Create a new Google Doc and optionally insert initial content",
  },
  modify_doc_text: {
    description: "Modify text in a Google Doc - insert/replace text and/or apply formatting",
  },
  find_and_replace_doc: {
    description: "Find and replace text throughout a Google Doc",
  },
  insert_doc_elements: {
    description: "Insert structural elements like tables, lists, or page breaks",
  },
  insert_doc_image: {
    description: "Insert an image into a Google Doc from Drive or URL",
  },
  update_doc_headers_footers: {
    description: "Update headers or footers in a Google Doc",
  },
  batch_update_doc: {
    description: "Execute multiple document operations in a single atomic batch update",
  },
  inspect_doc_structure: {
    description: "Essential tool for finding safe insertion points and understanding document structure",
  },
  create_table_with_data: {
    description: "Create a table and populate it with data in one reliable operation",
  },
  debug_table_structure: {
    description: "Essential debugging tool for table layout and cell positions",
  },
};

type SearchDocsInput = z.infer<typeof SearchDocsSchema>;
type GetDocContentInput = z.infer<typeof GetDocContentSchema>;
type ListDocsInFolderInput = z.infer<typeof ListDocsInFolderSchema>;
type CreateDocInput = z.infer<typeof CreateDocSchema>;
type ModifyDocTextInput = z.infer<typeof ModifyDocTextSchema>;
type FindAndReplaceDocInput = z.infer<typeof FindAndReplaceDocSchema>;
type InsertDocElementsInput = z.infer<typeof InsertDocElementsSchema>;
type InsertDocImageInput = z.infer<typeof InsertDocImageSchema>;
type UpdateDocHeadersFootersInput = z.infer<typeof UpdateDocHeadersFootersSchema>;
type BatchUpdateDocInput = z.infer<typeof BatchUpdateDocSchema>;
type InspectDocStructureInput = z.infer<typeof InspectDocStructureSchema>;
type CreateTableWithDataInput = z.infer<typeof CreateTableWithDataSchema>;
type DebugTableStructureInput = z.infer<typeof DebugTableStructureSchema>;

export function registerDocsTools(server: any, session: { userId: string; scopes?: string }) {
  server.tool(
    "search_docs",
    "Search for Google Docs by name using Drive API",
    SearchDocsSchema.shape,
    async (input: SearchDocsInput) => {
      return {
        content: [{ type: "text", text: await searchDocs(session.userId, input) }],
      };
    },
  );

  server.tool(
    "get_doc_content",
    "Retrieve content of a Google Doc or Drive file (.docx, etc.)",
    GetDocContentSchema.shape,
    async (input: GetDocContentInput) => {
      return {
        content: [{ type: "text", text: await getDocContent(session.userId, input) }],
      };
    },
  );

  server.tool(
    "list_docs_in_folder",
    "List Google Docs within a specific Drive folder",
    ListDocsInFolderSchema.shape,
    async (input: ListDocsInFolderInput) => {
      return {
        content: [{ type: "text", text: await listDocsInFolder(session.userId, input) }],
      };
    },
  );

  server.tool(
    "create_doc",
    "Create a new Google Doc and optionally insert initial content",
    CreateDocSchema.shape,
    async (input: CreateDocInput) => {
      return {
        content: [{ type: "text", text: await createDoc(session.userId, input) }],
      };
    },
  );

  server.tool(
    "modify_doc_text",
    "Modify text in a Google Doc - insert/replace text and/or apply formatting",
    ModifyDocTextSchema.shape,
    async (input: ModifyDocTextInput) => {
      return {
        content: [{ type: "text", text: await modifyDocText(session.userId, input) }],
      };
    },
  );

  server.tool(
    "find_and_replace_doc",
    "Find and replace text throughout a Google Doc",
    FindAndReplaceDocSchema.shape,
    async (input: FindAndReplaceDocInput) => {
      return {
        content: [{ type: "text", text: await findAndReplaceDoc(session.userId, input) }],
      };
    },
  );

  server.tool(
    "insert_doc_elements",
    "Insert structural elements like tables, lists, or page breaks",
    InsertDocElementsSchema.shape,
    async (input: InsertDocElementsInput) => {
      return {
        content: [{ type: "text", text: await insertDocElements(session.userId, input) }],
      };
    },
  );

  server.tool(
    "insert_doc_image",
    "Insert an image into a Google Doc from Drive or URL",
    InsertDocImageSchema.shape,
    async (input: InsertDocImageInput) => {
      return {
        content: [{ type: "text", text: await insertDocImage(session.userId, input) }],
      };
    },
  );

  server.tool(
    "update_doc_headers_footers",
    "Update headers or footers in a Google Doc",
    UpdateDocHeadersFootersSchema.shape,
    async (input: UpdateDocHeadersFootersInput) => {
      return {
        content: [{ type: "text", text: await updateDocHeadersFooters(session.userId, input) }],
      };
    },
  );

  server.tool(
    "batch_update_doc",
    "Execute multiple document operations in a single atomic batch update",
    BatchUpdateDocSchema.shape,
    async (input: BatchUpdateDocInput) => {
      return {
        content: [{ type: "text", text: await batchUpdateDoc(session.userId, input) }],
      };
    },
  );

  server.tool(
    "inspect_doc_structure",
    "Essential tool for finding safe insertion points and understanding document structure",
    InspectDocStructureSchema.shape,
    async (input: InspectDocStructureInput) => {
      return {
        content: [{ type: "text", text: await inspectDocStructure(session.userId, input) }],
      };
    },
  );

  server.tool(
    "create_table_with_data",
    "Create a table and populate it with data in one reliable operation",
    CreateTableWithDataSchema.shape,
    async (input: CreateTableWithDataInput) => {
      return {
        content: [{ type: "text", text: await createTableWithData(session.userId, input) }],
      };
    },
  );

  server.tool(
    "debug_table_structure",
    "Essential debugging tool for table layout and cell positions",
    DebugTableStructureSchema.shape,
    async (input: DebugTableStructureInput) => {
      return {
        content: [{ type: "text", text: await debugTableStructure(session.userId, input) }],
      };
    },
  );
}

export async function createDoc(userId: string, params: z.infer<typeof CreateDocSchema>) {
  const oauth2Client = await getGoogleOAuthClient(userId);
  const docs = google.docs({ version: 'v1', auth: oauth2Client });

  const { userGoogleEmail, title, content } = params;

  logger.info(`[createDoc] Email: '${userGoogleEmail}', Title='${title}'`);

  try {
    // Step 1: Create the document
    const createResponse = await docs.documents.create({
      requestBody: { title },
    });
    const documentId = createResponse.data.documentId;

    if (!documentId) {
      throw new Error('Failed to retrieve document ID after creation.');
    }

    logger.info(`Document created successfully for ${userGoogleEmail}. Document ID: ${documentId}`);

    // Step 2: Add content to the document using batchUpdate
    if (content) {
      const batchUpdateRequest = {
        requests: [
          {
            insertText: {
              location: { index: 1 }, // Insert at the beginning of the document
              text: content,
            },
          },
        ],
      };

      await docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: batchUpdateRequest,
      });

      logger.info(`Content added to document ${documentId}`);
    }

    return `Successfully created document '${title}' for ${userGoogleEmail}. Document ID: ${documentId}`;
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error creating document for ${userGoogleEmail}: ${error.message}`);
      throw new Error(`Failed to create document: ${error.message}`);
    } else {
      logger.error(`Error creating document for ${userGoogleEmail}: ${String(error)}`);
      throw new Error(`Failed to create document: ${String(error)}`);
    }
  }
}