import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-sw',
      writeBundle() {
        try {
          copyFileSync('public/sw.js', 'dist/sw.js');
          copyFileSync('public/manifest.json', 'dist/manifest.json');
          console.log('✅ Copied sw.js and manifest.json to dist');
        } catch (err) {
          console.error('Failed to copy files:', err);
        }
      }
    }
  ],
  server: {
    port: 3000,
    host: true,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react']
        }
      }
    }
  }
});