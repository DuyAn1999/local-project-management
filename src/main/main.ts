import { app, BrowserWindow, dialog, ipcMain, session } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { APP_INFO_CHANNEL, isAppInfoRequest } from '../shared/contracts';
import { SCAN_CHANNEL, SCAN_UPDATE_CHANNEL } from '../shared/scanning';
import { ScanService } from './scans';
import { assertTrustedSender, handleAppInfo, isTrustedRendererUrl } from './ipc';
import { FOLDERS_CHANNEL, isFolderRequest } from '../shared/folders';
import { FolderService } from './folders';

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

  const workerFile = path.join(__dirname, 'scan-worker.cjs').replace(/app\.asar([/\\])/, 'app.asar.unpacked$1');
  const scans = new ScanService(workerFile, (update) => {
    const contents = mainWindow?.webContents;
    if (contents && !contents.isDestroyed() && isTrustedRendererUrl(contents.getURL(), rendererUrl)) contents.send(SCAN_UPDATE_CHANNEL, update);
  });
  app.on('before-quit', () => scans.dispose());

  const folders = new FolderService(path.join(app.getPath('userData'), 'settings.json'), async () => {
    if (!mainWindow) throw new Error('Open the app window to choose a folder.');
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose a project folder', buttonLabel: 'Choose folder', properties: ['openDirectory'],
    });
    return result.canceled ? undefined : result.filePaths[0];
  });
  ipcMain.handle(FOLDERS_CHANNEL, async (event, ...args: unknown[]) => {
    assertTrustedSender({
      isAppWindow: mainWindow !== null && event.sender === mainWindow.webContents,
      isMainFrame: event.senderFrame !== null && event.senderFrame === event.sender.mainFrame,
      frameUrl: event.senderFrame?.url ?? '', expectedUrl: rendererUrl,
    });
    if (args.length !== 1 || !isFolderRequest(args[0])) throw new Error('Invalid folder request');
    const snapshot = await folders.handle(args[0]);
    if (args[0].action !== 'list') scans.ensure(snapshot.roots);
    return snapshot;
  });

  ipcMain.handle(SCAN_CHANNEL, async (event, ...args: unknown[]) => {
    assertTrustedSender({
      isAppWindow: mainWindow !== null && event.sender === mainWindow.webContents,
      isMainFrame: event.senderFrame !== null && event.senderFrame === event.sender.mainFrame,
      frameUrl: event.senderFrame?.url ?? '', expectedUrl: rendererUrl,
    });
    if (args.length !== 1 || !isAppInfoRequest(args[0])) throw new Error('Invalid scan request');
    return scans.ensure((await folders.handle({ protocolVersion: 1, action: 'list' })).roots);
  });

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
