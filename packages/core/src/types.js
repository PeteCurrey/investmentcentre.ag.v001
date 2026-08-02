"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pillar = void 0;
exports.ok = ok;
exports.err = err;
var Pillar;
(function (Pillar) {
    Pillar["WORLD"] = "WORLD";
    Pillar["MARKETS"] = "MARKETS";
    Pillar["HORIZON"] = "HORIZON";
    Pillar["UNDERCURRENT"] = "UNDERCURRENT";
    Pillar["ALTERNATIVES"] = "ALTERNATIVES";
})(Pillar || (exports.Pillar = Pillar = {}));
function ok(value) {
    return { success: true, value };
}
function err(error) {
    return { success: false, error };
}
//# sourceMappingURL=types.js.map