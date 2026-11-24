import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const isStorybook = process.env.STORYBOOK === '1' || process.argv.some((argument) => argument.includes('storybook'))

function manualChunk(id: string) {
  const normalizedId = id.replaceAll('\\\\', '/')
  if (!normalizedId.includes('/node_modules/')) return undefined
  if (normalizedId.includes('/react/') || normalizedId.includes('/react-dom/')) return 'react'
  if (normalizedId.includes('/react-router-dom/')) return 'router'
  if (normalizedId.includes('/@tanstack/react-query/')) return 'query'
  if (normalizedId.includes('/lucide-react/')) return 'icons'
  if (
    normalizedId.includes('/react-hook-form/') ||
    normalizedId.includes('/@hookform/resolvers/') ||
    normalizedId.includes('/zod/')
  ) return 'forms'
  return undefined
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(isStorybook ? [] : [VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
        globIgnores: ['mockServiceWorker.js'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      manifest: {
        name: 'Fullstack Blueprint',
        short_name: 'Blueprint',
        description: 'Fullstack application workspace',
        theme_color: '#2563EB',
        background_color: '#F8FAFC',
        display: 'standalone',
        start_url: '/?source=pwa',
        scope: '/',
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
    })])
  ],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.BACKEND_PROXY_TARGET ?? "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks: manualChunk,
      },
    },
  },
})
