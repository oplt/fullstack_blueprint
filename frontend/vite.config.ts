import path from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const isStorybook = process.env.STORYBOOK === '1' || process.argv.some((argument) => argument.includes('storybook'))

function readCssToken(name: string) {
  const css = readFileSync(path.join(rootDir, 'src/index.css'), 'utf8')
  const value = css.match(new RegExp(`--${name}:\\s*(#[\\da-fA-F]{6});`))?.[1]
  if (!value) throw new Error(`Missing hexadecimal CSS token: --${name}`)
  return value
}

function manualChunk(id: string) {
  const normalizedId = id.replaceAll('\\\\', '/')
  if (!normalizedId.includes('/node_modules/')) return undefined
  if (
    normalizedId.includes('/@fullcalendar/') ||
    normalizedId.includes('/@full-ui/headless-calendar/')
  ) return 'calendar-runtime'
  if (
    /\/node_modules\/(?:react|react-dom)\//.test(normalizedId) ||
    /\/node_modules\/@base-ui\/(?:react|utils)\//.test(normalizedId)
  ) return 'ui-runtime'
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
  optimizeDeps: {
    include: [
      '@base-ui/react/avatar',
      '@base-ui/react/combobox',
      '@base-ui/react/dialog',
      '@base-ui/react/popover',
      '@base-ui/react/switch',
      '@base-ui/react/tooltip',
      '@base-ui/react/alert-dialog',
      '@base-ui/react/checkbox',
      '@base-ui/react/progress',
      '@fullcalendar/react',
      '@fullcalendar/react/daygrid',
      '@fullcalendar/react/interaction',
      '@fullcalendar/react/locales/fr',
      '@fullcalendar/react/locales/nl',
      '@fullcalendar/react/multimonth',
      '@fullcalendar/react/timegrid',
      '@tanstack/react-table',
    ],
  },
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
        theme_color: readCssToken('primary'),
        background_color: readCssToken('background'),
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
