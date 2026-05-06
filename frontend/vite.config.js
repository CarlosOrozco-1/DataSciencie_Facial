import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Needed for docker
    allowedHosts: true, // Allow external domains behind reverse proxy, peticiones de dominios externos
    port: 8501,
    watch: {
      usePolling: true // Helps with file changes under Windows WSL or Docker volumes
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    }
  }
})
