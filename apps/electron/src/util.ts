import path from 'path';

export const resolveHtmlPath = (htmlFileName: string): string => {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 3001;
    // Using 127.0.0.1 is more reliable than localhost (avoids IPv6 delays/refusals)
    return `http://127.0.0.1:${port}/`;
  }

  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
};
