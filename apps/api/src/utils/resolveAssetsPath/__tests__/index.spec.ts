import path from 'path';

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => 'mock/path/test'),
  },
}));

jest.mock('fs-extra', () => ({ ensureDirSync: jest.fn() }));

describe('resolveAssetsPath', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  test('should return correct path when in production on darwin platform', () => {
    process.env = { ...OLD_ENV, NODE_ENV: 'production', HOME: 'homeDir' };

    Object.defineProperty(process, 'platform', {
      value: 'darwin',
    });

    const { resolveAssetsPath } = require('../resolveAssetsPath');

    const resolvedPath = resolveAssetsPath('test-prod');

    expect(resolvedPath).toEqual(
      'mock/path/test/nx-electron-node-react-boilerplate/assets/test-prod'
    );
  });

  test('should return correct path when in production on windows platform', () => {
    process.env = { ...OLD_ENV, NODE_ENV: 'production', APPDATA: 'appData' };

    Object.defineProperty(process, 'platform', {
      value: 'win32',
    });

    const { resolveAssetsPath } = require('../resolveAssetsPath');

    const resolvedPath = resolveAssetsPath('test-prod');

    expect(resolvedPath).toEqual(
      'mock/path/test/nx-electron-node-react-boilerplate/assets/test-prod'
    );
  });

  test('should return correct path when in production on linux platform', () => {
    process.env = { ...OLD_ENV, NODE_ENV: 'production', HOME: 'homeDir' };

    Object.defineProperty(process, 'platform', {
      value: 'linux',
    });

    const { resolveAssetsPath } = require('../resolveAssetsPath');

    const resolvedPath = resolveAssetsPath('test-prod');

    expect(resolvedPath).toEqual(
      'mock/path/test/nx-electron-node-react-boilerplate/assets/test-prod'
    );
  });

  test('should return correct path when in production on unknown platform', () => {
    process.env = { ...OLD_ENV, NODE_ENV: 'production', HOME: 'foo' };

    Object.defineProperty(process, 'platform', {
      value: 'notRealPlatform',
    });

    const { resolveAssetsPath } = require('../resolveAssetsPath');

    const resolvedPath = resolveAssetsPath('test-prod');

    expect(resolvedPath).toEqual(
      'mock/path/test/nx-electron-node-react-boilerplate/assets/test-prod'
    );
  });

  test('should return correct path when in production on mac platform and no HOME env var set', () => {
    process.env = { ...OLD_ENV, NODE_ENV: 'production', HOME: undefined };

    Object.defineProperty(process, 'platform', {
      value: 'darwin',
    });

    const { resolveAssetsPath } = require('../resolveAssetsPath');

    const resolvedPath = resolveAssetsPath('test-prod');

    expect(resolvedPath).toEqual(
      'mock/path/test/nx-electron-node-react-boilerplate/assets/test-prod'
    );
  });

  test('should return correct path when NOT in production', () => {
    const { resolveAssetsPath } = require('../resolveAssetsPath');

    const resolvedPath = resolveAssetsPath('test-dev');

    const expected = path.join(
      __dirname,
      '../../../../apps/api/src/assets/test-dev'
    );

    expect(resolvedPath).toEqual(expected);
  });

  test('should return correct path when no filepath given', () => {
    const { resolveAssetsPath } = require('../resolveAssetsPath');

    const resolvedPath = resolveAssetsPath();

    const expected = path.join(__dirname, '../../../../apps/api/src/assets/');

    expect(resolvedPath).toEqual(expected);
  });
});
