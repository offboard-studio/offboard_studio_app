import path from 'path';

/**
 * When in development a react server runs allowing for faster HMR
 * so we target that in development, in production we reference a static bundled
 * react app which is a HTML at the apps bundled renderer directory
 */
export const resolveHtmlPath = (htmlFileName: string): string => {
  if (process.env.NODE_ENV === 'development') {
    // TIP: using require to synchronously import modules can reduce bundle
    // size and also improve start times avoiding parsing JS when it isn't needed
    const { URL } = require('url');

    const port = process.env.PORT || 3001;
    const url = new URL(`http://localhost:${port}`);

    url.pathname = htmlFileName;

    return url.href;
  }

  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
};
