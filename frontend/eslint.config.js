import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'coverage',
    'test-results',
    'playwright-report',
    'storybook-static',
    'public/mockServiceWorker.js',
    '.vitest',
    // Compatibility adapters are intentionally permissive while the legacy
    // feature pages finish moving to the native shared component primitives.
    'src/components/ui/*Compat.tsx',
    'src/components/ui/styleCompat.ts',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Existing feature adapters still expose a few structurally dynamic API
      // payloads while their screens are incrementally typed.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])
