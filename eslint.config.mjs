// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

/**
 * ESLint compartilhado do monorepo (flat config). Regras pragmáticas: foco em
 * erros reais, sem ruído que travaria o CI. Type-checking pesado fica no `tsc`.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.config.{js,mjs,ts}',
      '**/.turbo/**',
      '**/next-env.d.ts', // gerado pelo Next.js (não é código-fonte)
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
  // Frontend (React/Next): adiciona globals de browser.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
);
