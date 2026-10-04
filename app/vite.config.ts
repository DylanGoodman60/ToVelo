import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import fs from 'node:fs'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

// maplibre-gl 6 spawns its worker from maplibre-gl-worker.mjs, which imports ./maplibre-gl-shared.mjs.
// Vite bundles neither, so ship both under fixed (unhashed) names, side by side.
const maplibreWorkerFiles = (): Plugin => ({
  name: 'maplibre-worker-files',
  apply: 'build',
  generateBundle() {
    const dist = path.resolve(import.meta.dirname, 'node_modules/maplibre-gl/dist')
    for (const name of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
      this.emitFile({
        type: 'asset',
        fileName: `maplibre/${name}`,
        source: fs.readFileSync(path.join(dist, name)),
      })
    }
  },
})

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: { '/api': 'http://localhost:8000' },
  },
  plugins: [
    react(),
    tailwindcss(),
    maplibreWorkerFiles(),
  ],
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
