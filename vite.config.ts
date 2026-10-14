import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    rollupOptions: { input: { main: path.resolve(__dirname, 'index.html'), lab: path.resolve(__dirname, 'lab.html') } },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    proxy: {
      '/lab/api': {
        target: process.env.VITE_VPS_API_URL || 'https://backing-lapping-denial.ngrok-free.dev',
        changeOrigin: true,
        secure: false,
        rewrite: (p: string) => p.replace(/^\/lab\/api/, '/lab'),
      },
      '/api': {
        target: process.env.VITE_VPS_API_URL || 'https://backing-lapping-denial.ngrok-free.dev',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
