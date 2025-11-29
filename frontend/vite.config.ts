/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    tailwindcss(),
    
  ],
  // Vitest will prioritize configuration from this dedicated 'test' block
  test: {
    // 1. Specify a DOM-like environment (Crucial for component testing)
    environment: 'jsdom', 
    
    // 2. Enable 'globals' (Highly recommended for cleaner tests)
    globals: true, 
    
    // 3. Setup file for extending 'expect' (e.g., with jest-dom)
    setupFiles: './vitest.setup.ts', 
    
    // 4. Configure coverage reporting
    coverage: {
      provider: 'v8', 
      reporter: ['text', 'json', 'html'],
      // Note: You generally want to exclude the files you don't write tests for
      exclude: [
        'node_modules/',
        '**/__tests__/**',
        '**/*.config.*',
        // Add any other directories/files to exclude (e.g., custom hooks, types)
      ],
    },
  },  envDir: path.resolve(__dirname, '..'), // Look for .env files in root
} as any)
