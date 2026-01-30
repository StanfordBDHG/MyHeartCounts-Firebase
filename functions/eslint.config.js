//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintPluginImport from 'eslint-plugin-import';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: ['**/*.d.ts', '**/*.js', '**/*.jsx', 'lib/**', 'node_modules/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'import': eslintPluginImport,
      'prettier': eslintPluginPrettier,
    },
    rules: {
      ...typescriptEslint.configs['strict-type-checked'].rules,
      ...typescriptEslint.configs['stylistic-type-checked'].rules,
      ...eslintPluginImport.configs.recommended.rules,
      ...eslintPluginImport.configs.typescript.rules,
      ...prettierConfig.rules,
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/class-literal-property-style': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/prefer-regexp-exec': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-misused-spread': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      'prettier/prettier': 'error',
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling']],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'never',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-empty-named-blocks': 'error',
      'import/no-mutable-exports': 'error',
      'import/no-cycle': 'error',
      'import/extensions': [
        'warn',
        'ignorePackages',
        {
          ts: 'never',
          tsx: 'never',
          js: 'never',
          jsx: 'never',
          mjs: 'never',
        },
      ],
      'import/newline-after-import': 'warn',
      'import/no-anonymous-default-export': 'warn',
      'import/no-default-export': 'error',
      'import/no-unresolved': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
          disallowTypeAnnotations: false,
        },
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
      'import/no-duplicates': [
        'error',
        {
          'prefer-inline': true,
        },
      ],
      'import/namespace': ['off'],
      'no-empty-pattern': 'off',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      '@typescript-eslint/no-confusing-void-expression': [
        'error',
        { ignoreArrowShorthand: true },
      ],
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/array-type': [
        'warn',
        { default: 'array-simple', readonly: 'array-simple' },
      ],
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
    },
  },
];
