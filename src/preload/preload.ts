import { contextBridge, ipcRenderer } from 'electron';
import { APP_INFO_CHANNEL } from '../shared/contracts';
import type { DesktopAPI } from '../shared/contracts';

const desktop: DesktopAPI = {
  getAppInfo: (request) => ipcRenderer.invoke(APP_INFO_CHANNEL, request),
};

contextBridge.exposeInMainWorld('desktop', desktop);
