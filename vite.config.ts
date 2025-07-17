import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg'],
    include: ['react', 'react-dom', 'lucide-react']
  },
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-components': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-slot'
          ],
          'audio-processing': ['@wavesurfer/react', 'wavesurfer.js', 'meyda'],
          'ffmpeg-core': ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
          utils: ['clsx', 'tailwind-merge', 'class-variance-authority'],
          icons: ['lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
