import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command }) => ({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    ...(command === 'build' ? [VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'mask-icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'OstheoApp - Gestion de cabinet',
        short_name: 'OstheoApp',
        description: 'Application de gestion pour ostéopathes',
        theme_color: '#0A84FF',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })] : [])
  ],
  server: {
    port: 5175,
    strictPort: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  },
  build: {
    target: 'esnext',
    modulePreload: {
      polyfill: false
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) {
              return 'firebase';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('chart.js') || id.includes('react-chartjs')) {
              return 'charts';
            }
            if (id.includes('framer-motion')) {
              return 'animations';
            }
            if (id.includes('crypto-js') || id.includes('browser-image-compression')) {
              return 'crypto-utils';
            }
            return 'vendor';
          }

          if (id.includes('/src/pages/admin/')) {
            return 'admin';
          }
          if (id.includes('/src/components/admin/')) {
            return 'admin-components';
          }
          if (id.includes('/src/pages/patients/')) {
            return 'patients';
          }
          if (id.includes('/src/pages/consultations/')) {
            return 'consultations';
          }
          if (id.includes('/src/pages/invoices/')) {
            return 'invoices';
          }
          if (id.includes('/src/components/modals/')) {
            return 'modals';
          }
        }
      }
    }
  }
}));