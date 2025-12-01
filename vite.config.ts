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
    },
    {
      name: 'cache-bust-html',
      transformIndexHtml(html) {
        // Add timestamp query parameter to force cache invalidation
        const timestamp = Date.now();
        return html.replace(
          /<script type="module" src="([^"]+)"><\/script>/g,
          `<script type="module" src="$1?v=${timestamp}"></script>`
        );
      }
    }
  ],
  server: {
    port: 3000,
    host: true,
    strictPort: true,
    hmr: {
      overlay: true,
      clientPort: 3000
    },
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
        // Use timestamp in chunk names for automatic cache busting
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`,
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react']
        }
      }
    }
  }
});