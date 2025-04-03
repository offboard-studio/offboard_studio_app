import { expect, test } from '@playwright/test';
import TestElectronApp from '../utils/createTestElectronApp';

let electronApp: TestElectronApp;

test.beforeEach(async () => {
  electronApp = await new TestElectronApp().setup();
});

test.afterEach(async () => {
  await electronApp.app.close();
});

test('app starts', async () => {
  const headerText = electronApp.firstWindow.getByTestId('header');

  await expect(headerText).toHaveText('Offboard StudioApp');
});
