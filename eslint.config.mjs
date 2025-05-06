// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from "eslint-config-prettier/flat"

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  // Ignores formatting rules that will be handled by Prettier
  eslintConfigPrettier,
  {
    name: "globalignores",
    ignores: [
      '**/node_modules/**',
      'jest.config.js',
      'src/external/**',
      '.vscode-test-web/**',
      'dist/**',
      'out/**',
      'webpack.config.js'
    ]
  }
);