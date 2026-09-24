import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser, ...globals.node }, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { 'react-hooks': reactHooks, react },
    rules: { ...js.configs.recommended.rules, ...reactHooks.configs.recommended.rules, 'react/jsx-uses-vars': 'error', 'no-unused-vars': ['error', { varsIgnorePattern: '^(React|[A-Z_])' }] },
  },
];
