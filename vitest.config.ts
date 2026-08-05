import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'apps/terminal/src'),
      '@meridian/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@meridian/registry': path.resolve(__dirname, 'packages/registry/src/index.ts'),
      '@meridian/adapters': path.resolve(__dirname, 'packages/adapters/src/index.ts'),
      '@meridian/risk': path.resolve(__dirname, 'packages/risk/src/index.ts'),
      '@meridian/execute': path.resolve(__dirname, 'packages/execute/src/index.ts'),
      '@meridian/council': path.resolve(__dirname, 'packages/council/src/index.ts'),
      '@meridian/resolve': path.resolve(__dirname, 'packages/resolve/src/index.ts'),
      '@meridian/salience': path.resolve(__dirname, 'packages/salience/src/index.ts'),
      '@meridian/delta': path.resolve(__dirname, 'packages/delta/src/index.ts'),
      '@meridian/horizon': path.resolve(__dirname, 'packages/horizon/src/index.ts'),
      '@meridian/edge': path.resolve(__dirname, 'packages/edge/src/index.ts'),
      '@meridian/brief': path.resolve(__dirname, 'packages/brief/src/index.ts'),
      '@meridian/automation': path.resolve(__dirname, 'packages/automation/src/index.ts'),
      '@meridian/signals': path.resolve(__dirname, 'packages/signals/src/index.ts'),
      '@meridian/ui': path.resolve(__dirname, 'packages/ui/src/index.ts'),
    }
  },
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['apps/terminal/src/test/setup.ts'],
    server: {
      deps: {
        inline: [/@meridian\//]
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['apps/terminal/src/app/api/**/*.ts'],
    }
  }
});
