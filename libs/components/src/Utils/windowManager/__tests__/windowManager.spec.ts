import { closeWindow, openNewWindow } from '../windowManager';

describe('windowManager', () => {
  test('openWindow should call electron IPC Renderer when electronAPI exists', () => {
    const mockedElectronAPI = {
      ipcRenderer: {
        openNewWindow: jest.fn(),
      },
    };

    Object.defineProperty(window, 'electronAPI', {
      value: mockedElectronAPI,
    });

    openNewWindow({
      url: 'https://test-url.com',
      windowKey: 'test-key',
    });

    expect(mockedElectronAPI.ipcRenderer.openNewWindow).toHaveBeenCalledWith(
      'https://test-url.com',
      'test-key'
    );
  });

  test('close should call close window', () => {
    const windowCloseSpy = jest.spyOn(window, 'close');

    windowCloseSpy.mockImplementation(() => null);

    closeWindow();

    expect(window.close).toHaveBeenCalled();

    windowCloseSpy.mockRestore();
  });
});
