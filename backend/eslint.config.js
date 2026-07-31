import js from '@eslint/js';
import globals from 'globals';
import { sharedConfig } from '../eslint-rules/index.mjs';

export default [
  {
    ignores: ['node_modules/**', 'coverage/**'],
  },

  js.configs.recommended,

  /** House style shared with the frontend: comments, line length, unused vars. */
  sharedConfig,

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      'no-console': 'off',
    },
  },

  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
  },
];
