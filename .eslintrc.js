module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['react', 'react-hooks', '@typescript-eslint', 'react-native'],
  settings: { react: { version: 'detect' } },
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'react-native/no-raw-text': 'off',
    // Empty catch blocks are intentional throughout (graceful degradation when
    // session storage is unavailable or a best-effort server call fails)
    'no-empty': ['error', { allowEmptyCatch: true }],
  },
  env: {
    'react-native/react-native': true,
    es2022: true,
  },
  overrides: [
    {
      // Test files don't need display names — React DevTools isn't the target
      files: ['src/__tests__/**/*.{ts,tsx}'],
      rules: {
        'react/display-name': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};
