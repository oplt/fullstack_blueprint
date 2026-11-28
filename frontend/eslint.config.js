import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import {defineConfig, globalIgnores} from 'eslint/config'

export default defineConfig([
    globalIgnores([
        'dist', 'coverage', 'test-results', 'playwright-report', 'storybook-static',
        'public/mockServiceWorker.js', 'src/lib/generated/**', '.vitest',
    ]),
    {
        files: ['src/**/*.{ts,tsx,js,jsx}'],
        extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
        languageOptions: { ecmaVersion: 2020, globals: globals.browser },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'no-restricted-imports': ['error', {
                paths: ['styled-components', 'bootstrap', 'antd'].map(name => ({name, message: 'Use existing shadcn/Base UI components and index.css.'})),
                patterns: [{
                    group: ['@mui/*', '@material-ui/*', '@emotion/*', '@chakra-ui/*', 'styled-components/*', 'bootstrap/*', 'antd/*', '**/muiCompat', '**/styleCompat', '**/iconsCompat'],
                    message: 'Use existing shadcn/Base UI components, index.css and named Lucide icons.',
                }],
            }],
            'max-lines': ['warn', {max: 300, skipBlankLines: true, skipComments: true}],
            'complexity': ['error', 10],
            'max-depth': ['warn', 3],
            'max-params': ['warn', 5],
            'max-nested-callbacks': ['warn', 3],
        },
    },
])
