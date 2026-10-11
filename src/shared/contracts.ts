export const APP_INFO_CHANNEL = 'app:get-info';

export interface AppInfoRequest {
  protocolVersion: 1;
}

export interface AppInfo {
  name: string;
  version: string;
  platform: string;
  packaged: boolean;
}

export interface DesktopAPI {
  getAppInfo(request: AppInfoRequest): Promise<AppInfo>;
  manageFolders(request: import('./folders').FolderRequest): Promise<import('./folders').FolderSnapshot>;
}

export function isAppInfoRequest(value: unknown): value is AppInfoRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.keys(value).length === 1
    && Object.hasOwn(value, 'protocolVersion')
    && 'protocolVersion' in value
    && value.protocolVersion === 1;
}
