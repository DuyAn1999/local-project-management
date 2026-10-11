import { contextBridge, ipcRenderer } from 'electron';
import { APP_INFO_CHANNEL } from '../shared/contracts';
import type { DesktopAPI } from '../shared/contracts';
import { FOLDERS_CHANNEL } from '../shared/folders';

const desktop: DesktopAPI = {
  getAppInfo: (request) => ipcRenderer.invoke(APP_INFO_CHANNEL, request),
  manageFolders: (request) => ipcRenderer.invoke(FOLDERS_CHANNEL, request),
};

contextBridge.exposeInMainWorld('desktop', desktop);
