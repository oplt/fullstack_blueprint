import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import {defineConfig, globalIgnores} from 'eslint/config'

export default defineConfig([
    globalIgnores([
        'dist',
        'coverage',
        'test-results',
        'playwright-report',
        'storybook-static',
        'public/mockServiceWorker.js',
        '.vitest',
    ]),
    {
        files: ["src/**/*.{ts,tsx,js,jsx}"],
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
            "max-lines": [
                "warn",
                {
                    max: 300,
                    skipBlankLines: true,
                    skipComments: true
                }
            ],
            "complexity": ["error", 10],
            "max-depth": ["warn", 3],
            "max-params": ["warn", 5],
            "max-nested-callbacks": ["warn", 3],
        },
    },
])
