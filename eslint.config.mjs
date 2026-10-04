import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/**', '.vite/**', 'out/**', 'test-results/**', 'playwright-report/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}', 'src/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['electron', 'node:*'], message: 'Native APIs belong in main/preload; use the typed bridge.' },
          { group: ['**/main/**', '**/preload/**'], message: 'Renderer/shared code must not import privileged implementation.' },
        ],
      }],
    },
  },
);
