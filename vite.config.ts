import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { chunkSplitPlugin } from 'vite-plugin-chunk-split';

// https://vitejs.dev/config/
const _plugins = [
  react(),
  chunkSplitPlugin({
    strategy: 'unbundle'
  })
];

export default defineConfig({
  plugins: _plugins,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg']
  }
});
