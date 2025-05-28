import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Optimized config for Tauri development
export default defineConfig({
  plugins: [react()],
  base: '/websql/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm'],
  },
  server: {
    // Faster HMR
    hmr: {
      overlay: false
    },
    // Pre-transform heavy dependencies
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx',
        './src/lib/duckdb.ts'
      ]
    }
  },
  build: {
    // Use esbuild for faster builds
    minify: 'esbuild',
    target: 'esnext'
  }
})