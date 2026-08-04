import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react') || id.includes('react-router-dom')) {
            return 'react-vendor';
          }
          if (id.includes('react-hot-toast') || id.includes('react-icons') || id.includes('recharts')) {
            return 'ui-vendor';
          }
          if (id.includes('leaflet') || id.includes('react-leaflet')) {
            return 'map-vendor';
          }
          if (id.includes('jspdf')) {
            return 'pdf-vendor';
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: false,
  }
})
