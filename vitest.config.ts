import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx', 'worker/**/__tests__/**/*.test.ts'],
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
