import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import net from 'net';

function backendGuard() {
  let backendUp = false;
  let upgradeHandlers = [];

  function checkBackend(next) {
    if (backendUp) { next(); return; }
    const sock = new net.Socket();
    sock.setTimeout(500);
    sock.on('connect', () => { sock.destroy(); backendUp = true; next(); });
    sock.on('error', () => { sock.destroy(); next(new Error('Backend not ready')); });
    sock.on('timeout', () => { sock.destroy(); next(new Error('Backend not ready')); });
    sock.connect(3001, 'localhost');
  }

  return {
    name: 'backend-guard',
    configureServer(server) {
      upgradeHandlers = server.httpServer.listeners('upgrade');
      server.httpServer.removeAllListeners('upgrade');

      server.httpServer.on('upgrade', (req, socket, head) => {
        if (req.url?.startsWith('/api') || req.url?.startsWith('/socket.io')) {
          checkBackend((err) => {
            if (err) { socket.end(); return; }
            for (const h of upgradeHandlers) h.call(server.httpServer, req, socket, head);
          });
        } else {
          for (const h of upgradeHandlers) h.call(server.httpServer, req, socket, head);
        }
      });

      server.middlewares.use((req, res, next) => {
        if (req.url.startsWith('/api') || req.url.startsWith('/socket.io')) {
          checkBackend((err) => {
            if (err) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'Backend not ready' }));
              return;
            }
            next();
          });
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/[^/]+\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloudinary-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'One in a Million',
        short_name: 'OneInAMillion',
        description: 'Order the best burgers in town — customize, track, enjoy.',
        theme_color: '#B08850',
        background_color: '#0A0604',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['food', 'shopping'],
        icons: [
          { src: '/pwa-192x192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: '/pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      devOptions: { enabled: false },
    }),
    backendGuard(),
  ],

  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },

  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/](react|react-dom|react-router-dom)[\\/]/.test(id)) return 'vendor-react';
          if (/[\\/](@reduxjs\/toolkit|react-redux)[\\/]/.test(id)) return 'vendor-redux';
          if (id.includes('framer-motion')) return 'vendor-framer';
          if (/[\\/](three|@react-three)[\\/]/.test(id)) return 'vendor-three';
          if (/[\\/](gsap|@gsap)[\\/]/.test(id)) return 'vendor-gsap';
          if (id.includes('@tanstack/react-query')) return 'vendor-query';
        },
      },
    },
  },
});
