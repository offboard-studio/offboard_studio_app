import path from 'path';
import { exec } from 'child_process';
import util from 'node:util';
import os from 'os';
import fs from 'fs';

import { app } from 'electron';

const execPromise = util.promisify(exec);

const getBoardAPI = () => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'board_api/api');
  }

  return path.join(__dirname, '../../../board_api/api');
};

const setupVenv = async () => {
  const boardAPIPath = getBoardAPI();
  const venvDir = path.join(boardAPIPath, 'venv');
  const venvPath =
    (os.platform() === 'win32')
      ? path.join(venvDir, 'Scripts', 'python')
      : path.join(venvDir, 'bin', 'python');

  if (fs.existsSync(venvPath)) {
    console.log('Sanal ortam zaten mevcut.');
    return;
  }

  console.log(`Sanal ortam oluşturuluyor: ${venvDir}`);

  try {
    await execPromise(`python -m venv ${venvDir}`);

    console.log('Bağımlılıklar yükleniyor...');
    console.log('pip güncelleniyor...');
    await execPromise(`${venvPath} -m pip install --upgrade pip`);

    const requirementsPath = path.join(boardAPIPath, 'requirements.txt');
    if (fs.existsSync(requirementsPath)) {
      console.log('Bağımlılıklar yükleniyor...');
      await execPromise(`${venvPath} -m pip install -r ${requirementsPath}`);
    } else {
      console.warn('requirements.txt bulunamadı, bağımlılıklar yüklenemedi.');
    }

    console.log('Sanal ortam başarıyla kuruldu.');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Sanal ortam oluşturulurken hata oluştu:', error.message);
    } else {
      console.error('Sanal ortam oluşturulurken bilinmeyen bir hata oluştu:', error);
    }
    throw error;
  }
};

/**
 * Run a database migration via the API
 */
export const migrateDatabase = async () => {
  try {
    // await setupVenv();
    const venvDir = path.join(getBoardAPI(), 'venv');
    const venvPath =
      os.platform() === 'win32'
        ? path.join(venvDir, 'Scripts', 'python')
        : path.join(venvDir, 'bin', 'python');

    if (!fs.existsSync(venvPath)) {
      throw new Error(
        `Sanal ortam bulunamadı: ${venvPath}. Lütfen "python -m venv venv" komutunu çalıştır.`
      );
    }

    const command = `cd ${getBoardAPI()} && ${venvPath} manage.py migrate`;

    const { stdout, stderr } = await execPromise(command);
    console.log(stdout);

    if (stderr) {
      console.error('Migration stderr:', stderr);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error during migration:', error.message, error.stack);
    } else {
      console.error('Unknown error during migration:', error);
    }
  }
};
