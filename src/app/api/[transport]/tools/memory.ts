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
    "create_entities",
    "Create multiple new entities in the knowledge graph",
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
    "create_relations",
    "Create multiple new relations between entities in the knowledge graph. Relations should be in active voice",
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
    "add_observations",
    "Add new observations to existing entities in the knowledge graph",
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
    "delete_entities",
    "Delete multiple entities and their associated relations from the knowledge graph",
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
    "delete_observations",
    "Delete specific observations from entities in the knowledge graph",
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
    "delete_relations",
    "Delete multiple relations from the knowledge graph",
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
    "read_graph",
    "Read the entire knowledge graph",
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
    "search_nodes",
    "Search for nodes in the knowledge graph based on a query",
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
    "open_nodes",
    "Open specific nodes in the knowledge graph by their names",
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
  create_entities: {
    description: "Create multiple new entities in the knowledge graph",
  },
  create_relations: {
    description: "Create multiple new relations between entities in the knowledge graph. Relations should be in active voice",
  },
  add_observations: {
    description: "Add new observations to existing entities in the knowledge graph",
  },
  delete_entities: {
    description: "Delete multiple entities and their associated relations from the knowledge graph",
  },
  delete_observations: {
    description: "Delete specific observations from entities in the knowledge graph",
  },
  delete_relations: {
    description: "Delete multiple relations from the knowledge graph",
  },
  read_graph: {
    description: "Read the entire knowledge graph",
  },
  search_nodes: {
    description: "Search for nodes in the knowledge graph based on a query",
  },
  open_nodes: {
    description: "Open specific nodes in the knowledge graph by their names",
  },
};
