import * as middlewares from '../middlewares';
import { RootRouter } from '../routers/Root/Root.router';

const mockUse = jest.fn();
const mockListen = jest.fn((port, callback) => {
  callback();
  return { on: jest.fn() };
});

jest.mock('../middlewares');

jest.mock('express', () => ({
  ...jest.requireActual('express'),
  __esModule: true,
  default: () => ({
    use: mockUse,
    get: jest.fn(),
    post: jest.fn(),
    listen: mockListen,
  }),
}));

jest.mock('../routers/Root/Root.router');

describe('main', () => {
  beforeAll(() => {
    (RootRouter as jest.Mock).mockImplementation(() => ({
      router: 'RootRouter',
    }));

    const { Api } = require('../Api');

    new Api();
  });

  test('API should set app headers', () => {
    expect(mockUse).toHaveBeenCalledWith(middlewares.setAppHeaders);
  });

  test('API should add correct routers', () => {
    expect(mockUse).toHaveBeenCalledWith('/api', 'RootRouter');
  });

  test('should start server', () => {
    expect(mockListen).toHaveBeenCalledWith('8080', expect.any(Function));
  });
});
