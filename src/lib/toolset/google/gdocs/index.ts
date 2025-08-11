export { ValidationManager } from './managers/validation_manager';
export { TableOperationManager } from './managers/table_operation_manager';
export { HeaderFooterManager } from './managers/header_footer_manager';

export * from './docs_helpers';
export * from './docs_structure';
export * from './docs_tables';

export {
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
  createDoc,
  modifyDocText,
  findAndReplaceDoc,
  insertDocElements,
  insertDocImage,
  updateDocHeadersFooters,
  batchUpdateDoc,
  inspectDocStructure,
  createTableWithData,
  debugTableStructure,
} from "./docs_tools";