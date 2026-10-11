import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { FolderService } from '../../src/main/folders';
import { DEFAULT_EXCLUSIONS, isFolderRequest } from '../../src/shared/folders';

let directory: string;
let file: string;
let folder: string;
let chosen: string | undefined;
let service: FolderService;
const list = { protocolVersion: 1, action: 'list' } as const;
const add = { protocolVersion: 1, action: 'add' } as const;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'local-projects-folders-'));
  file = path.join(directory, 'profile', 'settings.json');
  folder = path.join(directory, 'Projects with spaces 日本語');
  await mkdir(folder);
  chosen = folder;
  service = new FolderService(file, async () => chosen);
});
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

describe('saved folders', () => {
  it('restores canonical paths, stable IDs and exclusions after restart; remove keeps disk files', async () => {
    const added = (await service.handle(add)).roots[0]!;
    expect(added).toMatchObject({ path: await realpath(folder), exclusions: DEFAULT_EXCLUSIONS, available: true });
    await service.handle({ protocolVersion: 1, action: 'exclusions', id: added.id, exclusions: ['node_modules', 'custom-cache'] });
    service = new FolderService(file, async () => chosen);
    expect((await service.handle(list)).roots[0]).toMatchObject({ id: added.id, exclusions: ['node_modules', 'custom-cache'] });
    await writeFile(path.join(folder, 'keep.txt'), 'keep me');
    expect((await service.handle({ protocolVersion: 1, action: 'remove', id: added.id })).roots).toEqual([]);
    expect(await readFile(path.join(folder, 'keep.txt'), 'utf8')).toBe('keep me');
    expect(JSON.parse(await readFile(file, 'utf8')).roots).toEqual([]);
  });

  it('deduplicates aliases and cancellation makes no settings write', async () => {
    const added = await service.handle(add);
    const content = await readFile(file, 'utf8');
    chosen = path.join(directory, 'alias'); await symlink(folder, chosen);
    expect((await service.handle(add)).roots).toEqual(added.roots);
    chosen = undefined;
    expect((await service.handle(add)).roots).toEqual(added.roots);
    expect(await readFile(file, 'utf8')).toBe(content);
  });

  it('marks a moved folder unavailable, cancels locate, then restores its ID and settings', async () => {
    const root = (await service.handle(add)).roots[0]!;
    const moved = `${folder}-moved`; await rename(folder, moved);
    expect((await service.handle(list)).roots[0]?.available).toBe(false);
    chosen = undefined;
    expect((await service.handle({ protocolVersion: 1, action: 'locate', id: root.id })).roots[0]?.path).toBe(root.path);
    chosen = moved;
    expect((await service.handle({ protocolVersion: 1, action: 'locate', id: root.id })).roots[0]).toMatchObject({ id: root.id, path: await realpath(moved), available: true, exclusions: root.exclusions });
  });

  it('rejects missing IDs, files and attempts to locate into another saved root', async () => {
    const root = (await service.handle(add)).roots[0]!;
    chosen = path.join(directory, 'second'); await mkdir(chosen);
    await service.handle(add);
    await expect(service.handle({ protocolVersion: 1, action: 'locate', id: root.id })).rejects.toThrow('already saved');
    await expect(service.handle({ protocolVersion: 1, action: 'remove', id: 'forged' })).rejects.toThrow('no longer saved');
    chosen = file;
    await expect(service.handle(add)).rejects.toThrow('unavailable');
    expect((await service.handle(list)).roots).toHaveLength(2);
  });

  it.each(['{broken', JSON.stringify({ version: 1, roots: [{ path: '/tmp' }] })])('backs up invalid settings before recovery: %s', async (content) => {
    await mkdir(path.dirname(file)); await writeFile(file, content);
    const recovered = await service.handle(list);
    expect(recovered.roots).toEqual([]);
    expect(recovered.recoveryNotice).toContain('original is preserved');
    const backup = (await readdir(path.dirname(file))).find((entry) => entry.startsWith('settings.json.invalid-'))!;
    expect(await readFile(path.join(path.dirname(file), backup), 'utf8')).toBe(content);
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ version: 1, roots: [] });
    expect((await service.handle(add)).roots).toHaveLength(1);
  });

  it('leaves newer-version settings untouched', async () => {
    await mkdir(path.dirname(file)); const content = JSON.stringify({ version: 2, roots: [] });
    await writeFile(file, content);
    await expect(service.handle(add)).rejects.toThrow('newer app');
    expect(await readFile(file, 'utf8')).toBe(content);
    expect(await readdir(path.dirname(file))).toEqual(['settings.json']);
  });

  it('keeps in-memory and on-disk settings after a failed write, then permits retry', async () => {
    const initial = await service.handle(add);
    const backup = `${file}.saved`; await rename(file, backup); await mkdir(file);
    const id = initial.roots[0]!.id;
    await expect(service.handle({ protocolVersion: 1, action: 'remove', id })).rejects.toThrow('Could not save');
    expect((await service.handle(list)).roots).toEqual(initial.roots);
    expect((await readdir(path.dirname(file))).some((entry) => entry.endsWith('.tmp'))).toBe(false);
    await rm(file, { recursive: true }); await rename(backup, file);
    expect((await service.handle({ protocolVersion: 1, action: 'remove', id })).roots).toEqual([]);
  });

  it('serializes simultaneous mutations without losing a root', async () => {
    const second = path.join(directory, 'second'); await mkdir(second);
    const choices = [folder, second];
    service = new FolderService(file, async () => choices.shift());
    await Promise.all([service.handle(add), service.handle(add)]);
    expect((await service.handle(list)).roots).toHaveLength(2);
    expect((await new FolderService(file, async () => undefined).handle(list)).roots).toHaveLength(2);
  });
});

describe('folder IPC payloads', () => {
  it.each([null, {}, { protocolVersion: 2, action: 'list' }, { ...add, path: '/tmp' }, { ...add, id: 'x' },
    { protocolVersion: 1, action: 'remove', id: '' }, { protocolVersion: 1, action: 'execute' },
    ...[['../secret'], ['a/b'], ['*'], ['.'], ['a', 'a'], ['a\n'], Array.from({ length: 101 }, (_, i) => String(i))].map((exclusions) => ({ protocolVersion: 1, action: 'exclusions', id: 'x', exclusions })),
  ])('rejects malformed or excessive requests: %j', (request) => { expect(isFolderRequest(request)).toBe(false); });
  it('allows empty exclusions and every purpose-specific operation', () => {
    for (const request of [list, add, { protocolVersion: 1, action: 'remove', id: 'x' }, { protocolVersion: 1, action: 'locate', id: 'x' }, { protocolVersion: 1, action: 'exclusions', id: 'x', exclusions: [] }]) expect(isFolderRequest(request)).toBe(true);
  });
});
