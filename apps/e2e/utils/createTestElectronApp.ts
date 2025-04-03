import {
  ElectronApplication,
  Page,
  _electron as electron,
} from '@playwright/test';
import { E2E_FOO } from '../playwright.config';

class TestElectronApp {
  app!: ElectronApplication;
  firstWindow!: Page;

  async setup(): Promise<TestElectronApp> {
    try {
      console.log('DEMO OF PLAYWRIGHT CONFIG FOO - ', E2E_FOO);

      const electronApp: ElectronApplication = await electron.launch({
        args: ['./release/build/electron/main.js'],
        env: { ...process.env, E2E: 'true' },
      });

      console.log('Electron App launched!');

      const appPath = await electronApp.evaluate(async ({ app }) => {
        // This runs in the main Electron process, parameter here is always
        // the result of the require('electron') in the main app script.
        return app.getAppPath();
      });

      console.log('App path created: ', appPath);

      electronApp.on('window', async (page) => {
        // capture errors
        page.on('pageerror', (error) => {
          console.error('PAGE_ERROR: ', error);
        });

        // capture console messages
        page.on('console', (msg) => {
          console.log(msg.text());
        });
      });

      this.app = electronApp;
      this.firstWindow = await this.app.firstWindow();

      return this;
    } catch (error) {
      console.error('Error launching playwright electron app: ', error);
      return this;
    }
  }
}

export default TestElectronApp;
