import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup/global.ts'],
    include: ['test/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    typecheck: {
      tsconfig: 'tsconfig.test.json'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        '**/*.d.ts',
        'src/index.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': './src',
      '@enums/*': './test/setup/enums/*'
    }
  }
}); 