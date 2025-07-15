const baseConfig = require('../../.eslintrc.json');
module.exports = [
  ...baseConfig,
  {
    files: ['api/**/*.ts', 'api/**/*.tsx', 'api/**/*.js', 'api/**/*.jsx'],
    rules: {},
  },
  {
    files: ['api/**/*.ts', 'api/**/*.tsx'],
    rules: {},
  },
  {
    files: ['api/**/*.js', 'api/**/*.jsx'],
    rules: {},
  },
];
