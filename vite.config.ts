import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/@firebase/firestore/') || id.includes('/firebase/firestore/')) return 'vendor-firestore';
            if (id.includes('/@firebase/auth/') || id.includes('/firebase/auth/')) return 'vendor-auth';
            if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'vendor-firebase-core';
            if (id.includes('/xlsx/')) return 'vendor-xlsx';
            if (id.includes('/konva/') || id.includes('/react-konva/')) return 'vendor-canvas';
            if (id.includes('/recharts/') || id.includes('/d3-')) return 'vendor-charts';
            if (id.includes('/framer-motion/') || id.includes('/motion/')) return 'vendor-motion';
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react';
            return undefined;
          },
        },
      },
    },
  };
});
