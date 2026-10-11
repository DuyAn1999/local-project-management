import { randomUUID } from 'node:crypto';
import { access, mkdir, open, readFile, realpath, rename, rm, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { DEFAULT_EXCLUSIONS, isExclusions } from '../shared/folders';
import type { FolderRequest, FolderSettings, FolderSnapshot, SavedRoot } from '../shared/folders';

function isSettings(value: unknown): value is FolderSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const settings = value as Record<string, unknown>;
  if (Object.keys(settings).sort().join(',') !== 'roots,version' || settings.version !== 1 || !Array.isArray(settings.roots) || settings.roots.length > 1000) return false;
  const ids = new Set<string>();
  const paths = new Set<string>();
  return settings.roots.every((root: unknown) => {
    if (!root || typeof root !== 'object' || Array.isArray(root)) return false;
    const entry = root as Record<string, unknown>;
    if (Object.keys(entry).sort().join(',') !== 'exclusions,id,path'
      || typeof entry.id !== 'string' || !entry.id || entry.id.length > 100
      || typeof entry.path !== 'string' || !path.isAbsolute(entry.path) || entry.path.includes('\0')
      || !isExclusions(entry.exclusions) || ids.has(entry.id) || paths.has(entry.path)) return false;
    ids.add(entry.id); paths.add(entry.path);
    return true;
  });
}

function isMissing(error: unknown): boolean { return (error as NodeJS.ErrnoException).code === 'ENOENT'; }

// Only the main process supplies paths, through the native folder picker.
export class FolderService {
  private settings: FolderSettings | undefined;
  private recoveryNotice: string | undefined;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly file: string, private readonly pickFolder: () => Promise<string | undefined>) {}

  handle(request: FolderRequest): Promise<FolderSnapshot> {
    const operation = this.queue.then(() => this.perform(request));
    this.queue = operation.catch(() => undefined);
    return operation;
  }

  private async load(): Promise<FolderSettings> {
    if (this.settings) return this.settings;
    let content: string;
    try { content = await readFile(this.file, 'utf8'); }
    catch (error) {
      if (!isMissing(error)) throw new Error('Could not read saved folders. Check access to the app settings and retry.', { cause: error });
      return this.settings = { version: 1, roots: [] };
    }
    let parsed: unknown;
    try { parsed = JSON.parse(content); } catch { /* Recover malformed JSON below. */ }
    if (parsed && typeof parsed === 'object' && 'version' in parsed
      && typeof parsed.version === 'number' && parsed.version > 1) {
      throw new Error('These settings were saved by a newer app. Update Local Projects to open them.');
    }
    if (isSettings(parsed)) return this.settings = parsed;
    const backup = `${this.file}.invalid-${randomUUID()}`;
    // Preserve invalid data before creating a fresh file; a failed backup never overwrites it.
    await rename(this.file, backup);
    const fresh: FolderSettings = { version: 1, roots: [] };
    try { await this.save(fresh); }
    catch (error) { await rename(backup, this.file); throw error; }
    this.recoveryNotice = `Saved folder settings could not be read. A fresh list was created; the original is preserved at ${backup}.`;
    return this.settings = fresh;
  }

  private async save(settings: FolderSettings): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    try {
      const file = await open(temporary, 'wx', 0o600);
      try { await file.writeFile(`${JSON.stringify(settings, null, 2)}\n`); await file.sync(); }
      finally { await file.close(); }
      await rename(temporary, this.file);
    } catch {
      throw new Error('Could not save folder settings. Your saved list has not changed. Check available storage and permissions, then retry.');
    } finally {
      // A cleanup failure must not mask the save error or report a successful rename as failed.
      await rm(temporary, { force: true }).catch(() => undefined);
    }
  }

  private async snapshot(settings: FolderSettings, selectedId?: string): Promise<FolderSnapshot> {
    const roots = await Promise.all(settings.roots.map(async (root) => {
      let available: boolean;
      try { available = (await stat(root.path)).isDirectory(); await access(root.path, constants.R_OK | constants.X_OK); }
      catch { available = false; }
      return { ...root, exclusions: [...root.exclusions], available };
    }));
    return { roots, recoveryNotice: this.recoveryNotice, selectedId };
  }

  private async perform(request: FolderRequest): Promise<FolderSnapshot> {
    const current = await this.load();
    if (request.action === 'list') return this.snapshot(current);
    const next = structuredClone(current);
    let root: SavedRoot | undefined;
    if ('id' in request) {
      root = next.roots.find((entry) => entry.id === request.id);
      if (!root) throw new Error('This folder is no longer saved. Refresh the folder list and retry.');
    }
    let selectedId: string | undefined;
    if (request.action === 'add' || request.action === 'locate') {
      const chosen = await this.pickFolder();
      if (!chosen) return this.snapshot(current);
      let canonical: string;
      try {
        canonical = await realpath(chosen);
        if (!(await stat(canonical)).isDirectory()) throw new Error('Not a directory');
        await access(canonical, constants.R_OK | constants.X_OK);
      } catch { throw new Error('That folder is unavailable or cannot be read. Choose another folder or check its permissions.'); }
      const duplicate = next.roots.find((entry) => entry.path === canonical);
      if (duplicate && duplicate.id !== root?.id) {
        if (request.action === 'locate') throw new Error('That folder is already saved. Choose a different location or remove the unavailable entry.');
        return this.snapshot(current, duplicate.id);
      }
      if (root) { root.path = canonical; selectedId = root.id; }
      else {
        if (next.roots.length >= 1000) throw new Error('The folder limit has been reached. Remove a folder before adding another.');
        const added = { id: randomUUID(), path: canonical, exclusions: [...DEFAULT_EXCLUSIONS] };
        next.roots.push(added); selectedId = added.id;
      }
    } else if (request.action === 'remove') next.roots = next.roots.filter((entry) => entry.id !== request.id);
    else if (request.action === 'exclusions' && root) root.exclusions = [...request.exclusions];
    await this.save(next);
    this.settings = next;
    return this.snapshot(next, selectedId);
  }
}
