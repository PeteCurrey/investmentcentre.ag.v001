"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
const path_1 = __importDefault(require("path"));
exports.default = (0, config_1.defineConfig)({
    resolve: {
        alias: {
            '@meridian/core': path_1.default.resolve(__dirname, 'packages/core/src/index.ts'),
            '@meridian/registry': path_1.default.resolve(__dirname, 'packages/registry/src/index.ts'),
            '@meridian/adapters': path_1.default.resolve(__dirname, 'packages/adapters/src/index.ts'),
            '@meridian/risk': path_1.default.resolve(__dirname, 'packages/risk/src/index.ts'),
            '@meridian/execute': path_1.default.resolve(__dirname, 'packages/execute/src/index.ts'),
            '@meridian/council': path_1.default.resolve(__dirname, 'packages/council/src/index.ts'),
            '@meridian/resolve': path_1.default.resolve(__dirname, 'packages/resolve/src/index.ts'),
            '@meridian/salience': path_1.default.resolve(__dirname, 'packages/salience/src/index.ts'),
            '@meridian/delta': path_1.default.resolve(__dirname, 'packages/delta/src/index.ts'),
            '@meridian/horizon': path_1.default.resolve(__dirname, 'packages/horizon/src/index.ts'),
            '@meridian/edge': path_1.default.resolve(__dirname, 'packages/edge/src/index.ts'),
            '@meridian/brief': path_1.default.resolve(__dirname, 'packages/brief/src/index.ts'),
            '@meridian/automation': path_1.default.resolve(__dirname, 'packages/automation/src/index.ts'),
            '@meridian/ui': path_1.default.resolve(__dirname, 'packages/ui/src/index.ts'),
        }
    },
    test: {
        include: ['packages/*/src/**/*.test.ts'],
        environment: 'node'
    }
});
//# sourceMappingURL=vitest.config.js.map