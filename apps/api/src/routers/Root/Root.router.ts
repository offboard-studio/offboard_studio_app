import { Router } from 'express';
import { RootController } from '../../controllers';
import { ApiRouter } from '../../types/ApiRouter';

export class RootRouter implements ApiRouter {
  public router = Router();
  private rootController = new RootController();

  public constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get('/', this.rootController.healthCheck);

    this.router.get('*', this.rootController.catch);
  }
}
