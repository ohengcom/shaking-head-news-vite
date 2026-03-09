import nextVitals from 'eslint-config-next/core-web-vitals'
import globals from 'globals'

export default [
  ...nextVitals,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
      globals: {
        ...globals.browser,
        ...globals.nodeBuiltin,
        JSX: 'readonly',
        NodeJS: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'playwright-report/**',
      'public/**',
      'test-results/**',
      '*.config.js',
    ],
  },
]
