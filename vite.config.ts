import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
const _plugins = [react()];

export default defineConfig({
  plugins: _plugins,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch'
          ],
          audio: ['@wavesurfer/react', 'meyda'],
          ffmpeg: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
        }
      }
    }
  }
});
