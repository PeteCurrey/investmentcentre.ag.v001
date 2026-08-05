"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnbuiltAdapter = void 0;
const base_1 = require("./base");
const core_1 = require("@meridian/core");
/**
 * UnbuiltAdapter — placeholder for sources registered in WAVE_1_REGISTRY that
 * do not yet have a concrete adapter implementation.
 *
 * Returns NOT_CONNECTED from health() and a descriptive error from fetch/validate/normalise.
 * This ensures unbuilt sources are visible in the health board rather than silently absent.
 */
class UnbuiltAdapter extends base_1.BaseAdapter {
    constructor(sourceId) {
        super(sourceId);
    }
    async fetch(_window) {
        return (0, core_1.err)(new Error(`Adapter '${this.sourceId}' is not yet implemented (unbuilt in current wave). State: NOT_CONNECTED.`));
    }
    validate(_raw) {
        return (0, core_1.err)(new Error(`Adapter '${this.sourceId}' is not yet implemented.`));
    }
    normalise(_validated) {
        return (0, core_1.err)(new Error(`Adapter '${this.sourceId}' is not yet implemented.`));
    }
}
exports.UnbuiltAdapter = UnbuiltAdapter;
//# sourceMappingURL=unbuilt.js.map