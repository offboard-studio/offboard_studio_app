export class AppUpdater {
  constructor() {
    const electronLog = require('electron-log');
    const { autoUpdater } = require('electron-updater');

    electronLog.transports.file.level = 'info';
    autoUpdater.logger = electronLog;
    autoUpdater.checkForUpdatesAndNotify();
  }
}
