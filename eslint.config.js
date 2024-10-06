// eslint.config.js
export default [
  {
    ignores: ['node_modules/**'],
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    env: {
      browser: true, // Enable browser globals
    },
    plugins: {
      prettier: {},
      import: {}, // Add import plugin
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      'no-undef': 'error',
    },
  },
];
