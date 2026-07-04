import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@kb': path.resolve(__dirname, '../../knowledge-base'),
    },
  },
  server: {
    port: 5174,
    strictPort: false,
    fs: {
      allow: ['..', '../..'],
    },
  },
});
