import path from 'path';
import { app } from 'electron';

const getFileProdAssetsPath = (filePath: string): string => {
  const appDataDir = app.getPath('appData');
  // TODO: UPDATE TO MATCH package.json build.publish.repo option
  const appDataAssetsDir = path.join(
    appDataDir,
    'nx-electron-node-react-boilerplate/assets'
  );
  const fileProdAssetsPath = path.join(appDataAssetsDir, filePath);

  return fileProdAssetsPath;
};

/**
 * Resolves assets path for production and development
 *
 * baseDevPath should resolve to the ./apps/api/assets directory
 * for local development as files are un-minified in local dev
 */
export const resolveAssetsPath = (filePath = ''): string => {
  if (process.env.E2E === 'true') {
    return path.join(__dirname, `../../../apps/api/src/assets/${filePath}`);
  }

  if (process.env.NODE_ENV === 'production') {
    return getFileProdAssetsPath(filePath);
  }

  return path.join(__dirname, `../../../apps/api/src/assets/${filePath}`);
};
