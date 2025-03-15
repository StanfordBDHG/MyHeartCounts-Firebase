//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

module.exports = {
  root: true,
  plugins: ['prettier', 'eslint-plugin-import', '@typescript-eslint', 'import'],
  parserOptions: {
    project: './tsconfig.json',
  },
  ignorePatterns: ['**/*.d.ts','**/*.js', '**/*.jsx'],
  parser: '@typescript-eslint/parser',
  extends: [
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-unnecessary-condition': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/class-literal-property-style': 'off',
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
    // false negatives
    'import/namespace': ['off'],
    'no-empty-pattern': 'off',
    // make sure to `await` inside try…catch
    '@typescript-eslint/return-await': ['error', 'in-try-catch'],
    '@typescript-eslint/no-confusing-void-expression': [
      'error',
      { ignoreArrowShorthand: true },
    ],
    // empty interfaces are fine, e.g. React component that extends other component, but with no additional props
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/array-type': [
      'warn',
      { default: 'array-simple', readonly: 'array-simple' },
    ],
    // allow unused vars prefixed with `_`
    '@typescript-eslint/no-unused-vars': 'off',
    // numbers and booleans are fine in template strings
    '@typescript-eslint/restrict-template-expressions': [
      'error',
      { allowNumber: true, allowBoolean: true },
    ],
  },
}
