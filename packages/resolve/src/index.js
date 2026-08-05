"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityResolver = exports.UnionFind = void 0;
const core_1 = require("@meridian/core");
class UnionFind {
    parent = new Map();
    find(id) {
        if (!this.parent.has(id)) {
            this.parent.set(id, id);
            return id;
        }
        const currParent = this.parent.get(id);
        if (currParent === id) {
            return id;
        }
        const root = this.find(currParent);
        this.parent.set(id, root);
        return root;
    }
    union(idA, idB) {
        const rootA = this.find(idA);
        const rootB = this.find(idB);
        if (rootA !== rootB) {
            this.parent.set(rootA, rootB);
        }
    }
}
exports.UnionFind = UnionFind;
class EntityResolver {
    entities = new Map();
    identifierToEntityId = new Map();
    uf = new UnionFind();
    makeIdentifierKey(id) {
        return `${id.type}:${id.value.toUpperCase()}`;
    }
    createEntity(name, type, initialIdentifiers = []) {
        const entityId = `ent_${type.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const now = new Date().toISOString();
        const entity = {
            id: entityId,
            name,
            type,
            identifiers: [],
            created_at: now,
            updated_at: now
        };
        this.entities.set(entityId, entity);
        for (const id of initialIdentifiers) {
            this.attachIdentifier(entityId, id);
        }
        return entity;
    }
    attachIdentifier(entityId, identifier) {
        const entity = this.entities.get(entityId);
        if (!entity) {
            return (0, core_1.err)(new Error(`Entity resolution failed: Entity with ID '${entityId}' not found.`));
        }
        const key = this.makeIdentifierKey(identifier);
        const existingEntityId = this.identifierToEntityId.get(key);
        if (existingEntityId && existingEntityId !== entityId) {
            // Merge entities using UnionFind
            const canonicalId = this.mergeEntities(entityId, existingEntityId);
            const mergedEntity = this.entities.get(canonicalId);
            return (0, core_1.ok)(mergedEntity);
        }
        this.identifierToEntityId.set(key, entityId);
        if (!entity.identifiers.some(i => i.type === identifier.type && i.value === identifier.value)) {
            entity.identifiers.push(identifier);
            entity.updated_at = new Date().toISOString();
        }
        return (0, core_1.ok)(entity);
    }
    mergeEntities(entityIdA, entityIdB) {
        const rootA = this.uf.find(entityIdA);
        const rootB = this.uf.find(entityIdB);
        if (rootA === rootB)
            return rootA;
        this.uf.union(rootA, rootB);
        const canonicalId = this.uf.find(rootA);
        const secondaryId = canonicalId === rootA ? rootB : rootA;
        const primaryEntity = this.entities.get(canonicalId);
        const secondaryEntity = this.entities.get(secondaryId);
        if (secondaryEntity) {
            for (const id of secondaryEntity.identifiers) {
                if (!primaryEntity.identifiers.some(i => i.type === id.type && i.value === id.value)) {
                    primaryEntity.identifiers.push(id);
                }
                const key = this.makeIdentifierKey(id);
                this.identifierToEntityId.set(key, canonicalId);
            }
            this.entities.delete(secondaryId);
        }
        primaryEntity.updated_at = new Date().toISOString();
        return canonicalId;
    }
    resolveByIdentifier(identifier) {
        const key = this.makeIdentifierKey(identifier);
        const entityId = this.identifierToEntityId.get(key);
        if (!entityId)
            return null;
        const canonicalId = this.uf.find(entityId);
        return this.entities.get(canonicalId) || null;
    }
    resolveObservation(observation) {
        if (observation.entity_id) {
            return this.uf.find(observation.entity_id);
        }
        // Attempt lookup based on metric hints
        const metricParts = observation.metric.split('.');
        const symbolHint = metricParts[metricParts.length - 1];
        if (symbolHint) {
            const match = this.resolveByIdentifier({
                type: 'TICKER',
                value: symbolHint.toUpperCase(),
                source: observation.source_id,
                confidence: 90
            });
            if (match)
                return match.id;
        }
        return null;
    }
    getAllEntities() {
        return Array.from(this.entities.values());
    }
}
exports.EntityResolver = EntityResolver;
//# sourceMappingURL=index.js.map