/**
 * Memory functionality inspired by:
 *   https://github.com/modelcontextprotocol/servers/blob/main/src/memory/index.ts
 *
 * - This implementation uses Neo4j as a backend for storing the knowledge graph, providing transactional, scalable, and advanced query capabilities.
 * - The API surface and data model (entities, relations, observations) are similar, but this version is designed for multi-user, concurrency.
 * - Query, update, and search operations leverage Cypher and Neo4j's graph database features for performance and flexibility.
 */
import { z } from "zod";
import neo4j, { Driver, Session } from 'neo4j-driver';

// Entity and Relation interfaces
interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

interface Relation {
  from: string;
  to: string;
  relationType: string;
}

interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}

// Zod schemas for validation
export const CreateEntitiesSchema = z.object({
  userId: z.string().describe("The user ID to associate memory entities with"),
  entities: z.array(z.object({
    name: z.string().describe("The name of the entity to store in memory"),
    entityType: z.string().describe("The type of the entity to remember (e.g., person, place, concept, event)"),
    observations: z.array(z.string()).describe("An array of observation contents to remember about this entity"),
  })).describe("Array of entities to create and store in memory"),
});

export const CreateRelationsSchema = z.object({
  userId: z.string().describe("The user ID to associate memory relations with"),
  relations: z.array(z.object({
    from: z.string().describe("The name of the entity where the relationship starts"),
    to: z.string().describe("The name of the entity where the relationship ends"),
    relationType: z.string().describe("The type of relationship to remember between entities"),
  })).describe("Array of relationships to create and store in memory"),
});

export const AddObservationsSchema = z.object({
  userId: z.string().describe("The user ID to associate memory observations with"),
  observations: z.array(z.object({
    entityName: z.string().describe("The name of the entity to add more information to in memory"),
    contents: z.array(z.string()).describe("An array of new observation contents to remember about this entity"),
  })).describe("Array of observations to add to memory"),
});

export const DeleteEntitiesSchema = z.object({
  userId: z.string().describe("The user ID to delete memory entities for"),
  entityNames: z.array(z.string()).describe("An array of entity names to forget and remove from memory"),
});

export const DeleteObservationsSchema = z.object({
  userId: z.string().describe("The user ID to delete memory observations for"),
  deletions: z.array(z.object({
    entityName: z.string().describe("The name of the entity containing the observations to forget"),
    observations: z.array(z.string()).describe("An array of specific observations to forget about this entity"),
  })).describe("Array of observation deletions to remove from memory"),
});

export const DeleteRelationsSchema = z.object({
  userId: z.string().describe("The user ID to delete memory relations for"),
  relations: z.array(z.object({
    from: z.string().describe("The name of the entity where the relationship to forget starts"),
    to: z.string().describe("The name of the entity where the relationship to forget ends"),
    relationType: z.string().describe("The type of relationship to forget between entities"),
  })).describe("Array of relationships to delete and forget from memory"),
});

export const ReadGraphSchema = z.object({
  userId: z.string().describe("The user ID to read the memory knowledge graph for"),
});

export const SearchNodesSchema = z.object({
  userId: z.string().describe("The user ID to search memory for"),
  query: z.string().describe("The search query to find and recall information from memory - matches against entity names, types, and observation content"),
});

export const OpenNodesSchema = z.object({
  userId: z.string().describe("The user ID to retrieve memory nodes for"),
  names: z.array(z.string()).describe("An array of entity names to recall and retrieve from memory"),
});

// Neo4j Knowledge Graph Manager
class Neo4jKnowledgeGraphManager {
  private driver: Driver;
  private connected: boolean = false;

  constructor() {
    // Initialize Neo4j driver
    const uri = process.env.NEO4J_URI;
    const username = process.env.NEO4J_USERNAME;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !username || !password) {
      throw new Error('Neo4j connection parameters not found in environment variables');
    }

    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  }

  async connect(): Promise<void> {
    try {
      await this.driver.getServerInfo();
      this.connected = true;
      console.log('Connected to Neo4j database');
    } catch (error) {
      console.error('Failed to connect to Neo4j:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.connected = false;
    }
  }

  private async executeQuery(query: string, parameters: any = {}): Promise<any[]> {
    if (!this.connected) {
      await this.connect();
    }

    const session: Session = this.driver.session();
    try {
      const result = await session.run(query, parameters);
      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  }

  async createEntities(userId: string, entities: Entity[]): Promise<Entity[]> {
    const query = `
      UNWIND $entities AS entity
      MERGE (e:Entity:UserEntity {name: entity.name, userId: $userId})
      SET e.entityType = entity.entityType,
          e.observations = entity.observations,
          e.updatedAt = datetime()
      RETURN e.name as name, e.entityType as entityType, e.observations as observations
    `;

    const result = await this.executeQuery(query, { userId, entities });
    return result.map(record => ({
      name: record.name,
      entityType: record.entityType,
      observations: record.observations
    }));
  }

  async createRelations(userId: string, relations: Relation[]): Promise<Relation[]> {
    const query = `
      UNWIND $relations AS relation
      MATCH (from:Entity:UserEntity {name: relation.from, userId: $userId})
      MATCH (to:Entity:UserEntity {name: relation.to, userId: $userId})
      MERGE (from)-[r:UserRelation {relationType: relation.relationType, userId: $userId}]->(to)
      SET r.updatedAt = datetime()
      RETURN relation.from as from, relation.to as to, relation.relationType as relationType
    `;

    const result = await this.executeQuery(query, { userId, relations });
    return result.map(record => ({
      from: record.from,
      to: record.to,
      relationType: record.relationType
    }));
  }

  async addObservations(userId: string, observations: { entityName: string; contents: string[] }[]): Promise<{ entityName: string; addedObservations: string[] }[]> {
    const results: { entityName: string; addedObservations: string[] }[] = [];

    for (const obs of observations) {
      const query = `
        MATCH (e:Entity:UserEntity {name: $entityName, userId: $userId})
        SET e.observations = CASE 
          WHEN e.observations IS NULL THEN $newObservations
          ELSE [x IN e.observations WHERE NOT x IN $newObservations] + $newObservations
        END,
        e.updatedAt = datetime()
        RETURN e.observations as observations
      `;

      const result = await this.executeQuery(query, {
        userId,
        entityName: obs.entityName,
        newObservations: obs.contents
      });

      if (result.length > 0) {
        results.push({
          entityName: obs.entityName,
          addedObservations: obs.contents
        });
      } else {
        throw new Error(`Entity with name ${obs.entityName} not found for user ${userId}`);
      }
    }

    return results;
  }

  async deleteEntities(userId: string, entityNames: string[]): Promise<void> {
    const query = `
      MATCH (e:Entity:UserEntity {userId: $userId})
      WHERE e.name IN $entityNames
      DETACH DELETE e
    `;

    await this.executeQuery(query, { userId, entityNames });
  }

  async deleteObservations(userId: string, deletions: { entityName: string; observations: string[] }[]): Promise<void> {
    for (const deletion of deletions) {
      const query = `
        MATCH (e:Entity:UserEntity {name: $entityName, userId: $userId})
        SET e.observations = [x IN e.observations WHERE NOT x IN $observationsToDelete],
            e.updatedAt = datetime()
      `;

      await this.executeQuery(query, {
        userId,
        entityName: deletion.entityName,
        observationsToDelete: deletion.observations
      });
    }
  }

  async deleteRelations(userId: string, relations: Relation[]): Promise<void> {
    const query = `
      UNWIND $relations AS relation
      MATCH (from:Entity:UserEntity {name: relation.from, userId: $userId})
      MATCH (to:Entity:UserEntity {name: relation.to, userId: $userId})
      MATCH (from)-[r:UserRelation {relationType: relation.relationType, userId: $userId}]->(to)
      DELETE r
    `;

    await this.executeQuery(query, { userId, relations });
  }

  async readGraph(userId: string): Promise<KnowledgeGraph> {
    // Get all entities for the user
    const entitiesQuery = `
      MATCH (e:Entity:UserEntity {userId: $userId})
      RETURN e.name as name, e.entityType as entityType, e.observations as observations
    `;

    // Get all relations for the user
    const relationsQuery = `
      MATCH (from:Entity:UserEntity {userId: $userId})-[r:UserRelation {userId: $userId}]->(to:Entity:UserEntity {userId: $userId})
      RETURN from.name as from, to.name as to, r.relationType as relationType
    `;

    const [entitiesResult, relationsResult] = await Promise.all([
      this.executeQuery(entitiesQuery, { userId }),
      this.executeQuery(relationsQuery, { userId })
    ]);

    const entities: Entity[] = entitiesResult.map(record => ({
      name: record.name,
      entityType: record.entityType,
      observations: record.observations || []
    }));

    const relations: Relation[] = relationsResult.map(record => ({
      from: record.from,
      to: record.to,
      relationType: record.relationType
    }));

    return { entities, relations };
  }

  async searchNodes(userId: string, query: string): Promise<KnowledgeGraph> {
    const searchQuery = `
      MATCH (e:Entity:UserEntity {userId: $userId})
      WHERE toLower(e.name) CONTAINS toLower($query)
         OR toLower(e.entityType) CONTAINS toLower($query)
         OR ANY(obs IN e.observations WHERE toLower(obs) CONTAINS toLower($query))
      WITH collect(e.name) as entityNames
      MATCH (e:Entity:UserEntity {userId: $userId})
      WHERE e.name IN entityNames
      OPTIONAL MATCH (e)-[r:UserRelation {userId: $userId}]-(connected:Entity:UserEntity {userId: $userId})
      WHERE connected.name IN entityNames
      RETURN DISTINCT e.name as name, e.entityType as entityType, e.observations as observations
    `;

    const relationsQuery = `
      MATCH (e:Entity:UserEntity {userId: $userId})
      WHERE toLower(e.name) CONTAINS toLower($query)
         OR toLower(e.entityType) CONTAINS toLower($query)
         OR ANY(obs IN e.observations WHERE toLower(obs) CONTAINS toLower($query))
      WITH collect(e.name) as entityNames
      MATCH (from:Entity:UserEntity {userId: $userId})-[r:UserRelation {userId: $userId}]->(to:Entity:UserEntity {userId: $userId})
      WHERE from.name IN entityNames AND to.name IN entityNames
      RETURN from.name as from, to.name as to, r.relationType as relationType
    `;

    const [entitiesResult, relationsResult] = await Promise.all([
      this.executeQuery(searchQuery, { userId, query }),
      this.executeQuery(relationsQuery, { userId, query })
    ]);

    const entities: Entity[] = entitiesResult.map(record => ({
      name: record.name,
      entityType: record.entityType,
      observations: record.observations || []
    }));

    const relations: Relation[] = relationsResult.map(record => ({
      from: record.from,
      to: record.to,
      relationType: record.relationType
    }));

    return { entities, relations };
  }

  async openNodes(userId: string, names: string[]): Promise<KnowledgeGraph> {
    const entitiesQuery = `
      MATCH (e:Entity:UserEntity {userId: $userId})
      WHERE e.name IN $names
      RETURN e.name as name, e.entityType as entityType, e.observations as observations
    `;

    const relationsQuery = `
      MATCH (from:Entity:UserEntity {userId: $userId})-[r:UserRelation {userId: $userId}]->(to:Entity:UserEntity {userId: $userId})
      WHERE from.name IN $names AND to.name IN $names
      RETURN from.name as from, to.name as to, r.relationType as relationType
    `;

    const [entitiesResult, relationsResult] = await Promise.all([
      this.executeQuery(entitiesQuery, { userId, names }),
      this.executeQuery(relationsQuery, { userId, names })
    ]);

    const entities: Entity[] = entitiesResult.map(record => ({
      name: record.name,
      entityType: record.entityType,
      observations: record.observations || []
    }));

    const relations: Relation[] = relationsResult.map(record => ({
      from: record.from,
      to: record.to,
      relationType: record.relationType
    }));

    return { entities, relations };
  }
}

// Export the manager instance
export const knowledgeGraphManager = new Neo4jKnowledgeGraphManager();

// Tool implementations
export async function createEntities(userId: string, entities: Entity[]): Promise<Entity[]> {
  return knowledgeGraphManager.createEntities(userId, entities);
}

export async function createRelations(userId: string, relations: Relation[]): Promise<Relation[]> {
  return knowledgeGraphManager.createRelations(userId, relations);
}

export async function addObservations(userId: string, observations: { entityName: string; contents: string[] }[]): Promise<{ entityName: string; addedObservations: string[] }[]> {
  return knowledgeGraphManager.addObservations(userId, observations);
}

export async function deleteEntities(userId: string, entityNames: string[]): Promise<void> {
  return knowledgeGraphManager.deleteEntities(userId, entityNames);
}

export async function deleteObservations(userId: string, deletions: { entityName: string; observations: string[] }[]): Promise<void> {
  return knowledgeGraphManager.deleteObservations(userId, deletions);
}

export async function deleteRelations(userId: string, relations: Relation[]): Promise<void> {
  return knowledgeGraphManager.deleteRelations(userId, relations);
}

export async function readGraph(userId: string): Promise<KnowledgeGraph> {
  return knowledgeGraphManager.readGraph(userId);
}

export async function searchNodes(userId: string, query: string): Promise<KnowledgeGraph> {
  return knowledgeGraphManager.searchNodes(userId, query);
}

export async function openNodes(userId: string, names: string[]): Promise<KnowledgeGraph> {
  return knowledgeGraphManager.openNodes(userId, names);
}
