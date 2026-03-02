import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: { output: { manualChunks: { vendor: ['react','react-dom','react-router-dom'], polaris: ['@shopify/polaris'] } } },
  },
  define: { 'process.env.VITE_SHOPIFY_API_KEY': JSON.stringify(process.env.VITE_SHOPIFY_API_KEY) },
});
