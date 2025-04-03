import { NextFunction, Request, Response } from 'express';
import { setAppHeaders } from '../AppHeaders.middleware';

describe('AppHeaders', () => {
  test('should set up correct headers and call next function', () => {
    const mockRequest = jest.fn();
    const mockSetHeader = jest.fn();
    const mockResponse = { setHeader: mockSetHeader };
    const mockNext = jest.fn();

    setAppHeaders(
      mockRequest as unknown as Request,
      mockResponse as unknown as Response,
      mockNext as NextFunction
    );

    expect(mockSetHeader).toHaveBeenCalledWith(
      'access-control-allow-origin',
      '*'
    );
    expect(mockSetHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Methods',
      'GET, POST, OPTIONS, PUT, DELETE'
    );

    expect(mockNext).toHaveBeenCalled();
  });
});
