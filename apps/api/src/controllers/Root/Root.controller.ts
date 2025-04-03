import { Request, Response } from 'express';

export class RootController {
  public healthCheck(_req: Request, res: Response): void {
    res.send({ message: 'API running.' });
  }

  public catch(req: Request, res: Response): void {
    res.status(404).send(`URL Not found - ${req.path}`);
  }
}
