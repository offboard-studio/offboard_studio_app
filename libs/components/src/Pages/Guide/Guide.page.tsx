import styles from './Guide.page.module.scss';

export const GuidePage = (): JSX.Element => {
  return (
    <>
      <header className={styles['header']}>
        <h1 id="header">
          Welcome to the boilerplate NX Electron Node React app guide page
        </h1>
      </header>

      <p>
        Electron has two processes the main and renderer processes, the main
        process runs using NodeJs and the renderer uses a chromium instance for
        each desktop window you open.
      </p>

      <p>
        Electron allows you to communicates between these two using
        inter-process communication (IPC) helpers.
      </p>

      <a
        target="blank"
        href="https://www.electronjs.org/docs/latest/tutorial/ipc"
      >
        https://www.electronjs.org/docs/latest/tutorial/ipc
      </a>

      <p>
        We use NX to manage and build the multiple parts of the electron desktop
        app to allow different teams to build the app if needed.
      </p>

      <p>
        An alternative to this set-up is to use the electron react boilerplate
        if using NX is deemed overkill for your team size.
      </p>

      <a
        target="blank"
        href="https://github.com/electron-react-boilerplate/electron-react-boilerplate"
      >
        https://github.com/electron-react-boilerplate/electron-react-boilerplate
      </a>
    </>
  );
};
