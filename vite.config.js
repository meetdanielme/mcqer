import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [VitePWA({
    registerType: 'prompt',
    manifest: {
      name: 'MCQer · Question bank',
      short_name: 'MCQer',
      description: 'Practice course questions online or offline.',
      theme_color: '#003c69',
      background_color: '#f6f8fa',
      display: 'standalone',
      start_url: './',
      scope: './',
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // Keep the app, question index and every bank in one versioned offline snapshot.
      globPatterns: ['**/*.{html,js,css,woff,woff2,png,json,md}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      navigateFallback: 'index.html',
    },
  })],
});
