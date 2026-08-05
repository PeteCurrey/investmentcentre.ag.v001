import { Entity, EntityIdentifier, EntityType, Observation, Result } from '@meridian/core';
export declare class UnionFind {
    private parent;
    find(id: string): string;
    union(idA: string, idB: string): void;
}
export declare class EntityResolver {
    private entities;
    private identifierToEntityId;
    private uf;
    private makeIdentifierKey;
    createEntity(name: string, type: EntityType, initialIdentifiers?: EntityIdentifier[]): Entity;
    attachIdentifier(entityId: string, identifier: EntityIdentifier): Result<Entity>;
    mergeEntities(entityIdA: string, entityIdB: string): string;
    resolveByIdentifier(identifier: EntityIdentifier): Entity | null;
    resolveObservation(observation: Observation): string | null;
    getAllEntities(): Entity[];
}
//# sourceMappingURL=index.d.ts.map