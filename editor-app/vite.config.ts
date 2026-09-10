import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@fakecall/shared': path.resolve(__dirname, '../shared/src/index.ts')
    }
  },
  server: {
    port: 3002
  }
});
