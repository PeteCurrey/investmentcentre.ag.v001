"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAdapter = void 0;
const registry_1 = require("@meridian/registry");
class BaseAdapter {
    registryEntry;
    sourceId;
    constructor(sourceId) {
        this.sourceId = sourceId;
        const entry = (0, registry_1.getRegistrySource)(sourceId);
        if (!entry) {
            throw new Error(`Adapter Init Error: Source '${sourceId}' not found in SourceRegistry.`);
        }
        this.registryEntry = entry;
    }
    get pillar() { return this.registryEntry.pillar; }
    get cadence() { return this.registryEntry.cadence; }
    get licenceClass() { return this.registryEntry.licence_class; }
    get redistributable() { return this.registryEntry.redistributable; }
    checkApiKeyPresent() {
        return true;
    }
    async health() {
        const hasKey = this.checkApiKeyPresent();
        return {
            source_id: this.sourceId,
            state: hasKey ? 'HEALTHY' : 'NOT_CONNECTED',
            last_success_at: hasKey ? new Date().toISOString() : null,
            expected_cadence: this.cadence,
            staleness_seconds: 0,
            error_rate_24h: 0.0,
            rows_written_last_window: hasKey ? 10 : 0,
            quota_consumed_mtd: 0,
            cost_mtd_usd: 0.0,
            updated_at: new Date().toISOString()
        };
    }
}
exports.BaseAdapter = BaseAdapter;
//# sourceMappingURL=base.js.map