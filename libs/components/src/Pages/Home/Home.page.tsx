import styles from './Home.page.module.scss';
import { openNewWindow, PageRoutePaths } from '../../Utils';

export const HomePage = (): JSX.Element => {
  return (
    <>
      <header className={styles['header']}>
        <h1 data-testid="header">Offboard StudioApp</h1>
      </header>
      <p>Welcome to the boilerplate NX Electron Node React app</p>

      <button
        onClick={() =>
          openNewWindow({
            url: `#${PageRoutePaths.GUIDE}`,
            windowKey: 'new-window-key',
          })
        }
      >
        Open guide page.
      </button>
    </>
  );
};
