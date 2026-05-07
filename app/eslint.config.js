const angular = require('@angular-eslint/eslint-plugin');
const angularTemplate = require('@angular-eslint/eslint-plugin-template');
const angularTemplateParser = require('@angular-eslint/template-parser');
const tsParser = require('@typescript-eslint/parser');

const pacienteTsFiles = [
  'src/app/features/paciente/**/*.ts',
  'src/app/shared/components/paciente-header/**/*.ts',
  'src/app/shared/components/paciente-bottom-nav/**/*.ts',
  'src/app/shared/utils/paciente-ui.utils.ts',
];

const pacienteTemplateFiles = [
  'src/app/features/paciente/**/*.html',
  'src/app/shared/components/paciente-header/**/*.html',
  'src/app/shared/components/paciente-bottom-nav/**/*.html',
];

module.exports = [
  {
    ignores: [
      'www/**',
      'coverage/**',
    ],
  },
  {
    files: pacienteTsFiles,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.spec.json'],
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
    },
    plugins: {
      '@angular-eslint': angular,
    },
    rules: {
      '@angular-eslint/prefer-inject': 'error',
    },
  },
  {
    files: pacienteTemplateFiles,
    languageOptions: {
      parser: angularTemplateParser,
    },
    plugins: {
      '@angular-eslint/template': angularTemplate,
    },
    rules: {},
  },
];
