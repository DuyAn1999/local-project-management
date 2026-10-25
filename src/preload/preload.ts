import { contextBridge, ipcRenderer } from 'electron';
import { APP_INFO_CHANNEL } from '../shared/contracts';
import type { DesktopAPI } from '../shared/contracts';
import { FOLDERS_CHANNEL } from '../shared/folders';
import { SCAN_CHANNEL, SCAN_UPDATE_CHANNEL } from '../shared/scanning';
import type { ScanUpdate } from '../shared/scanning';

const desktop: DesktopAPI = {
  getAppInfo: (request) => ipcRenderer.invoke(APP_INFO_CHANNEL, request),
  manageFolders: (request) => ipcRenderer.invoke(FOLDERS_CHANNEL, request),
  scanProjects: (request) => ipcRenderer.invoke(SCAN_CHANNEL, request),
  onScanUpdate: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, update: ScanUpdate) => listener(update);
    ipcRenderer.on(SCAN_UPDATE_CHANNEL, handler);
    return () => { ipcRenderer.removeListener(SCAN_UPDATE_CHANNEL, handler); };
  },
};

contextBridge.exposeInMainWorld('desktop', desktop);
