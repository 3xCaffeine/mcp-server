
import { z } from "zod";
import {
  createEntities,
  createRelations,
  addObservations,
  deleteEntities,
  deleteObservations,
  deleteRelations,
  readGraph,
  searchNodes,
  openNodes,
  CreateEntitiesSchema,
  CreateRelationsSchema,
  AddObservationsSchema,
  DeleteEntitiesSchema,
  DeleteObservationsSchema,
  DeleteRelationsSchema,
  ReadGraphSchema,
  SearchNodesSchema,
  OpenNodesSchema
} from "@/lib/toolset/memory";

// Type inference from Zod schemas
type CreateEntitiesInput = z.infer<typeof CreateEntitiesSchema>;
type CreateRelationsInput = z.infer<typeof CreateRelationsSchema>;
type AddObservationsInput = z.infer<typeof AddObservationsSchema>;
type DeleteEntitiesInput = z.infer<typeof DeleteEntitiesSchema>;
type DeleteObservationsInput = z.infer<typeof DeleteObservationsSchema>;
type DeleteRelationsInput = z.infer<typeof DeleteRelationsSchema>;
type SearchNodesInput = z.infer<typeof SearchNodesSchema>;
type OpenNodesInput = z.infer<typeof OpenNodesSchema>;

export function registerMemoryTools(server: any, session: { userId: string }) {
  // Create entities tool
  server.tool(
    "memory_create_entities",
    "Create and store multiple new entities in the user's memory knowledge graph. Use this tool when the user wants to remember, store, or memorize information about people, places, concepts, or any other entities.",
    CreateEntitiesSchema.omit({ userId: true }).shape,
    async ({ entities }: Omit<CreateEntitiesInput, 'userId'>) => {
      try {
        const result = await createEntities(session.userId, entities);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error creating entities: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        };
      }
    }
  );

  // Create relations tool
  server.tool(
    "memory_create_relations",
    "Create and store multiple new relationships between entities in the user's memory knowledge graph. Use this tool when the user wants to remember connections, associations, or relationships between people, concepts, or things. Relations should be in active voice.",
    CreateRelationsSchema.omit({ userId: true }).shape,
    async ({ relations }: Omit<CreateRelationsInput, 'userId'>) => {
      try {
        const result = await createRelations(session.userId, relations);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error creating relations: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        };
      }
    }
  );

  // Add observations tool
  server.tool(
    "memory_add_observations",
    "Add new observations, details, or information to existing entities in the user's memory knowledge graph. Use this tool when the user wants to remember additional facts, update information, or add more details about something they've already stored in memory.",
    AddObservationsSchema.omit({ userId: true }).shape,
    async ({ observations }: Omit<AddObservationsInput, 'userId'>) => {
      try {
        const result = await addObservations(session.userId, observations);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error adding observations: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        };
      }
    }
  );

  // Delete entities tool
  server.tool(
    "memory_delete_entities",
    "Delete and forget multiple entities and their associated relationships from the user's memory knowledge graph. Use this tool when the user wants to forget, remove, or delete information about specific people, places, concepts, or entities from their memory.",
    DeleteEntitiesSchema.omit({ userId: true }).shape,
    async ({ entityNames }: Omit<DeleteEntitiesInput, 'userId'>) => {
      try {
        await deleteEntities(session.userId, entityNames);
        return {
          content: [{ type: "text", text: "Entities deleted successfully" }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error deleting entities: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        };
      }
    }
  );

  // Delete observations tool
  server.tool(
    "memory_delete_observations",
    "Delete and forget specific observations, details, or information from entities in the user's memory knowledge graph. Use this tool when the user wants to remove or forget specific details about something while keeping the entity itself in memory.",
    DeleteObservationsSchema.omit({ userId: true }).shape,
    async ({ deletions }: Omit<DeleteObservationsInput, 'userId'>) => {
      try {
        await deleteObservations(session.userId, deletions);
        return {
          content: [{ type: "text", text: "Observations deleted successfully" }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error deleting observations: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        };
      }
    }
  );

  // Delete relations tool
  server.tool(
    "memory_delete_relations",
    "Delete and forget multiple relationships between entities from the user's memory knowledge graph. Use this tool when the user wants to remove or forget specific connections, associations, or relationships between people, concepts, or things in their memory.",
    DeleteRelationsSchema.omit({ userId: true }).shape,
    async ({ relations }: Omit<DeleteRelationsInput, 'userId'>) => {
      try {
        await deleteRelations(session.userId, relations);
        return {
          content: [{ type: "text", text: "Relations deleted successfully" }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error deleting relations: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        };
      }
    }
  );

  // Read graph tool
  server.tool(
    "memory_read_graph",
    "Read and retrieve the entire user's memory knowledge graph. Use this tool when the user wants to recall, review, or see everything they have stored in their memory, including all entities, relationships, and observations.",
    {},
    async () => {
      try {
        const result = await readGraph(session.userId);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error reading graph: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        };
      }
    }
  );

  // Search nodes tool
  server.tool(
    "memory_search_nodes",
    "Search and find nodes in the user's memory knowledge graph based on a query. Use this tool when the user wants to recall, find, remember, or search for specific information, entities, or concepts they have stored in their memory. Supports searching by entity names, types, and observation content.",
    SearchNodesSchema.omit({ userId: true }).shape,
    async ({ query }: Omit<SearchNodesInput, 'userId'>) => {
      try {
        const result = await searchNodes(session.userId, query);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error searching nodes: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        };
      }
    }
  );

  // Open nodes tool
  server.tool(
    "memory_open_nodes",
    "Open and retrieve specific nodes in the user's memory knowledge graph by their names. Use this tool when the user wants to recall, retrieve, or get detailed information about specific entities they have stored in their memory.",
    OpenNodesSchema.omit({ userId: true }).shape,
    async ({ names }: Omit<OpenNodesInput, 'userId'>) => {
      try {
        const result = await openNodes(session.userId, names);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error opening nodes: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        };
      }
    }
  );
}

// Export capabilities for the memory tools
export const memoryToolsCapabilities = {
  memory_create_entities: {
    description: "Create and store multiple new entities in the user's memory knowledge graph. Use this tool when the user wants to remember, store, or memorize information about people, places, concepts, or any other entities.",
  },
  memory_create_relations: {
    description: "Create and store multiple new relationships between entities in the user's memory knowledge graph. Use this tool when the user wants to remember connections, associations, or relationships between people, concepts, or things. Relations should be in active voice.",
  },
  memory_add_observations: {
    description: "Add new observations, details, or information to existing entities in the user's memory knowledge graph. Use this tool when the user wants to remember additional facts, update information, or add more details about something they've already stored in memory.",
  },
  memory_delete_entities: {
    description: "Delete and forget multiple entities and their associated relationships from the user's memory knowledge graph. Use this tool when the user wants to forget, remove, or delete information about specific people, places, concepts, or entities from their memory.",
  },
  memory_delete_observations: {
    description: "Delete and forget specific observations, details, or information from entities in the user's memory knowledge graph. Use this tool when the user wants to remove or forget specific details about something while keeping the entity itself in memory.",
  },
  memory_delete_relations: {
    description: "Delete and forget multiple relationships between entities from the user's memory knowledge graph. Use this tool when the user wants to remove or forget specific connections, associations, or relationships between people, concepts, or things in their memory.",
  },
  memory_read_graph: {
    description: "Read and retrieve the entire user's memory knowledge graph. Use this tool when the user wants to recall, review, or see everything they have stored in their memory, including all entities, relationships, and observations.",
  },
  memory_search_nodes: {
    description: "Search and find nodes in the user's memory knowledge graph based on a query. Use this tool when the user wants to recall, find, remember, or search for specific information, entities, or concepts they have stored in their memory. Supports searching by entity names, types, and observation content.",
  },
  memory_open_nodes: {
    description: "Open and retrieve specific nodes in the user's memory knowledge graph by their names. Use this tool when the user wants to recall, retrieve, or get detailed information about specific entities they have stored in their memory.",
  },
};
