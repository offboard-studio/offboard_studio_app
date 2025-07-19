const baseConfig = require('../../.eslintrc.json');
module.exports = [
  ...baseConfig,
  {
    files: [
      'libs/pages/**/*.ts',
      'libs/pages/**/*.tsx',
      'libs/pages/**/*.js',
      'libs/pages/**/*.jsx',
    ],
    rules: {},
  },
  {
    files: ['libs/pages/**/*.ts', 'libs/pages/**/*.tsx'],
    rules: {},
  },
  {
    files: ['libs/pages/**/*.js', 'libs/pages/**/*.jsx'],
    rules: {},
  },
  ...compat.extends('plugin:@nx/react'),
];
