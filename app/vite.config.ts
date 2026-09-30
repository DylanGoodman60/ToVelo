import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()

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
