import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { APP_INFO_CHANNEL } from '../shared/contracts';
import { handleAppInfo, isTrustedRendererUrl } from './ipc';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;

const rendererFile = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
const rendererUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL || pathToFileURL(rendererFile).href;

function createWindow(): void {
  const window = new BrowserWindow({
    title: 'Local Projects',
    width: 1000,
    height: 700,
    minWidth: 480,
    minHeight: 400,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      webviewTag: false,
    },
  });
  mainWindow = window;
  window.once('ready-to-show', () => window.show());
  window.on('closed', () => { mainWindow = null; });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedRendererUrl(url, rendererUrl)) event.preventDefault();
  });
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());

  const loading = MAIN_WINDOW_VITE_DEV_SERVER_URL
    ? window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
    : window.loadFile(rendererFile);
  void loading.catch((error: unknown) => {
    console.error('Could not load the application window:', error);
    app.exit(1);
  });
}

void app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);

  ipcMain.handle(APP_INFO_CHANNEL, (event, ...args: unknown[]) => handleAppInfo({
    isAppWindow: mainWindow !== null && event.sender === mainWindow.webContents,
    isMainFrame: event.senderFrame !== null && event.senderFrame === event.sender.mainFrame,
    frameUrl: event.senderFrame?.url ?? '',
    expectedUrl: rendererUrl,
  }, args, {
    name: 'Local Projects',
    version: app.getVersion(),
    platform: process.platform,
    packaged: app.isPackaged,
  }));

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((error: unknown) => {
  console.error('Could not start the application:', error);
  app.exit(1);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
