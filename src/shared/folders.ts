export const FOLDERS_CHANNEL = 'folders:manage';
export const DEFAULT_EXCLUSIONS = ['.git', 'node_modules', '.venv', 'venv', 'vendor', 'dist', 'build', 'target', '.next', 'coverage', '.cache', '__pycache__', '.Trash', '.Trashes', '.Spotlight-V100', '.fseventsd'];

export interface SavedRoot { id: string; path: string; exclusions: string[] }
export interface FolderSettings { version: 1; roots: SavedRoot[] }
export interface FolderSnapshot {
  roots: (SavedRoot & { available: boolean })[];
  recoveryNotice?: string;
  selectedId?: string;
}
export type FolderRequest = { protocolVersion: 1 } & (
  { action: 'list' | 'add' }
  | { action: 'remove' | 'locate'; id: string }
  | { action: 'exclusions'; id: string; exclusions: string[] }
);

export function isExclusions(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 100 && value.every((entry) =>
    typeof entry === 'string' && entry.length > 0 && entry.length <= 255
    && entry.trim() === entry && entry !== '.' && entry !== '..'
    && !/[\\/*?[\]]/.test(entry) && !Array.from(entry).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) && new Set(value).size === value.length;
}

export function isFolderRequest(value: unknown): value is FolderRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const request = value as Record<string, unknown>;
  if (request.protocolVersion !== 1) return false;
  const keys = Object.keys(request).sort().join(',');
  if (request.action === 'list' || request.action === 'add') return keys === 'action,protocolVersion';
  if (typeof request.id !== 'string' || request.id.length === 0 || request.id.length > 100) return false;
  if (request.action === 'remove' || request.action === 'locate') return keys === 'action,id,protocolVersion';
  return request.action === 'exclusions' && keys === 'action,exclusions,id,protocolVersion' && isExclusions(request.exclusions);
}
