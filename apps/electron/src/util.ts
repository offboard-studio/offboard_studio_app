import path from 'path';

export const resolveHtmlPath = (htmlFileName: string): string => {
  if (process.env.NODE_ENV === 'development') {
    const { URL } = require('url');
    const port = process.env.PORT || 3001;
    const url = new URL(`http://localhost:${port}`);

    url.pathname = htmlFileName;

    // Development modunda bağlantıyı test et
    const net = require('net');

    const client = net.createConnection({ port: port }, () => {
      client.end();
    });

    client.on('error', () => {
      console.error(
        `❌ Dev server at port ${port} is not running. Quitting Electron app.`
      );
      const { app } = require('electron');
      app.quit();
    });

    return url.href;
  }

  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
};
