import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
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
