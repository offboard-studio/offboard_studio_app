export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  verbose: true,
  collectCoverage: true,
  coverageDirectory: '../../coverage/apps/renderer',
  collectCoverageFrom: [
    '**/*.{ts,tsx,jsx}',
    '!**/*.spec.{ts,tsx,jsx}',
    '!**/*.d.ts',
    '!coverage/**',
    '!types/**',
    '!mocks/**',
  ],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        babel: true,
        tsconfig: 'apps/renderer/tsconfig.spec.json',
        diagnostics: {
          ignoreCodes: [1343],
        },
        astTransformers: {
          before: [
            {
              path: 'node_modules/ts-jest-mock-import-meta', // or, alternatively, 'ts-jest-mock-import-meta' directly, without node_modules.
              options: {
                metaObjectReplacement: {
                  env: {
                    REACT_APP_NODE_API_BASE_URL: 'http://localhost:8080',
                  },
                },
              },
            },
          ],
        },
      },
    ],
    '^.+\\.mjs$': 'babel-jest',
  },
  transformIgnorePatterns: ['^.+\\.module\\.(css|sass|scss)$'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/testUtils/assetsTransformer.js',
    '@components': '<rootDir>/../../libs/components/src/index.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/testUtils/setupTests.ts'],
  coverageReporters: ['json', 'lcov', 'text', 'json-summary'],
  reporters: ['default', 'jest-ratchet'],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
};
