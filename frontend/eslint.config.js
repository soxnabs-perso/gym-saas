import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { sharedConfig } from '../eslint-rules/index.mjs';

export default [
  {
    ignores: ['node_modules/**', 'dist/**'],
  },

  js.configs.recommended,

  /** House style shared with the backend: comments, line length, unused vars. */
  sharedConfig,

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      /**
       * Base no-unused-vars cannot see an identifier used only inside JSX so without this every imported component 
       * reads as unused.
       */
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'off',

      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  {
    /** Read by Node when Vite starts so it sees process rather than window. */
    files: ['vite.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
];
