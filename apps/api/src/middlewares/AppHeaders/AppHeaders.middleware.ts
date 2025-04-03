import { NextFunction, Request, Response } from 'express';

export const setAppHeaders = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS, PUT, DELETE'
  );
  next();
};
