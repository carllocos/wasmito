// @ts-check

import { globalIgnores } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import path from 'node:path';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default tseslint.config(
  globalIgnores([
    'dist/*',
    '**/libs/',
    '**/assemblyscript_examples/',
    'wasmito_tester/cli.js',
    'wasmito_tester/test_framework.ts',
  ]),
  eslint.configs.recommended,
  tseslint.configs.recommended,

  {
    extends: compat.extends('prettier'),
    plugins: {
      prettier,
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },

      ecmaVersion: 'latest',
      sourceType: 'module',
    },

    rules: {
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/return-await': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'prettier/prettier': [
        'error',
        {
          semi: true,
          singleQuote: true,
          tabWidth: 2,
          trailingComma: 'all',
          printWidth: 80,
        },
      ],
    },
  },
);
