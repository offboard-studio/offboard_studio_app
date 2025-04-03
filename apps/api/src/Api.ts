/* eslint-disable no-console */
import express from 'express';
import type { Express } from 'express';
import { IncomingMessage, ServerResponse, Server } from 'http';

import { RootRouter } from './routers';
import { ApiRouter } from './types';
import { setAppHeaders } from './middlewares';

export type ApiServer = Server<typeof IncomingMessage, typeof ServerResponse>;

/**
 * Creating a new instance of this Api class will create
 * an express app, set up its associated routes and start the app server
 */
export class Api {
  public server: ApiServer;
  private app: Express;
  private API_PORT = process.env.NODE_API_PORT || '8080';

  public constructor() {
    this.app = express();
    this.setAppHeaders(this.app);
    this.setAppRoutes(this.app);
    this.server = this.startServer(this.app);
  }

  private setAppHeaders(app: Express): void {
    app.use(setAppHeaders);
  }

  /**
   * App routes are any any routes made by the React/Electron client
   */
  private setAppRoutes(app: Express): void {
    const routes: ApiRouter[] = [new RootRouter()];

    routes.forEach((route): void => {
      app.use('/api', route.router);
    });
  }

  private startServer(app: Express): ApiServer {
    const server = app.listen(this.API_PORT, (): void => {
      console.log(`Listening at localhost - PORT: ${this.API_PORT}`);
    });

    server.on('error', console.error);

    return server;
  }
}
