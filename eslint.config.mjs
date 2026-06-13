import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist', '**/node_modules', '**/.nx', '**/coverage', '**/bin', '**/obj'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
  {
    // Node scripts (build/release tooling) — make the Node globals available so
    // `process`/`console` etc. aren't flagged as undefined.
    files: ['tools/**/*.{mjs,js}', '*.config.{mjs,js}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        setTimeout: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
  },
);
