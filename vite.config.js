import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  // Base path for GitHub Pages deployment (repo name)
  base: '/usmc-directives-hub/',
  root: '.',
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'lib/*', dest: 'lib' },
        { src: 'app.js', dest: '' },
        { src: 'pwa-init.js', dest: '' },
        { src: 'service-worker.js', dest: '' }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        dead_code: true,
        unused: true
      },
      mangle: true
    },
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        manualChunks: {
          // Split vendor code if needed in future
        }
      }
    },
    // Optimize asset handling
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
    cssCodeSplit: true,
    sourcemap: false // Disable sourcemaps for production
  },
  server: {
    port: 8000,
    open: true,
    cors: true
  },
  preview: {
    port: 8080,
    open: true
  },
  // Optimize dependencies
  optimizeDeps: {
    include: []
  }
});
