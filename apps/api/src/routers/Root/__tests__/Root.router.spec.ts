import * as controllers from '../../../controllers';

const getSpy = jest.fn();
const postSpy = jest.fn();

jest.doMock('express', () => {
  return {
    Router() {
      return {
        get: getSpy,
        post: postSpy,
      };
    },
  };
});

describe('RootRouter', () => {
  test('router http operations should be called with correct endpoints and controllers', () => {
    const { RootRouter } = require('../Root.router');
    new RootRouter();

    expect(getSpy).toHaveBeenCalledWith(
      '/',
      controllers.RootController.prototype.healthCheck
    );

    expect(getSpy).toHaveBeenCalledWith(
      '*',
      controllers.RootController.prototype.catch
    );
  });
});
