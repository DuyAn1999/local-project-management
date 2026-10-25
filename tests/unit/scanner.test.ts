import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MAX_MANIFEST_BYTES, scanRoots } from '../../src/main/scanner';
import type { ScannerBatch } from '../../src/main/scanner';
import { DEFAULT_EXCLUSIONS } from '../../src/shared/folders';
import type { DiscoveredProject } from '../../src/shared/scanning';

let directory: string;
let root: string;
beforeEach(async () => {
  directory = await realpath(await mkdtemp(path.join(os.tmpdir(), 'local-projects-scan-')));
  root = path.join(directory, 'Projects 日本語'); await mkdir(root);
});
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
async function manifest(relative: string, data: unknown = {}) {
  const location = path.join(root, relative); await mkdir(location, { recursive: true });
  await writeFile(path.join(location, 'package.json'), JSON.stringify(data)); return location;
}
async function scan(exclusions = DEFAULT_EXCLUSIONS) {
  const batches: ScannerBatch[] = [];
  await scanRoots([{ id: 'root', path: root, exclusions }], (batch) => batches.push(structuredClone(batch)));
  const projects = new Map<string, DiscoveredProject>();
  for (const batch of batches) for (const project of batch.projects) projects.set(project.id, project);
  return { projects: [...projects.values()], batches, final: batches.at(-1)! };
}

it('discovers the root and nested projects, without executing scripts or inferring languages from a manifest', async () => {
  await manifest('', { name: '@local/root', scripts: { prepare: 'touch executed', start: 'echo unsafe' } });
  await manifest('packages/child', { name: 'child' });
  await writeFile(path.join(root, 'packages/child', 'index.ts'), 'throw new Error("do not execute")');
  await writeFile(path.join(root, 'pyproject.toml'), '[project]');
  await mkdir(path.join(root, '.git'));
  const result = await scan();
  expect(result.projects.map((project) => project.name).sort()).toEqual(['@local/root', 'child']);
  expect(result.projects.find((project) => project.path === root)).toMatchObject({ ecosystem: 'Node', languages: [], evidence: ['package.json'] });
  expect(result.projects.find((project) => project.name === 'child')).toMatchObject({ languages: ['TypeScript'], evidence: ['package.json', 'index.ts'] });
  expect(result.final.progress).toMatchObject({ projects: 2, directories: 3 });
  expect((await scan()).projects.map((project) => project.id).sort()).toEqual(result.projects.map((project) => project.id).sort());
});

it('honors every default exclusion, custom names and an explicitly empty exclusion list', async () => {
  for (const name of [...DEFAULT_EXCLUSIONS, 'custom']) await manifest(`${name}/hidden`, { name });
  expect((await scan([...DEFAULT_EXCLUSIONS, 'custom'])).projects).toHaveLength(0);
  expect((await scan()).projects.map((project) => project.name)).toEqual(['custom']);
  expect((await scan([])).projects).toHaveLength(DEFAULT_EXCLUSIONS.length + 1);
});

it('skips directory loops, out-of-root symlinks, and symlink manifests', async () => {
  await manifest('real', { name: 'real' });
  const outside = path.join(directory, 'outside'); await mkdir(outside); await writeFile(path.join(outside, 'package.json'), '{}');
  await symlink(root, path.join(root, 'loop'));
  await symlink(outside, path.join(root, 'outside'));
  await mkdir(path.join(root, 'linked-manifest'));
  await symlink(path.join(outside, 'package.json'), path.join(root, 'linked-manifest/package.json'));
  const result = await scan();
  expect(result.projects.map((project) => project.name)).toEqual(['real']);
  expect(result.final.progress.skipped).toBe(3);
});

it('continues after malformed, non-object and oversized manifests, preserving path-specific warnings', async () => {
  for (const name of ['broken', 'oversized', 'array', 'good']) await manifest(name);
  await writeFile(path.join(root, 'broken/package.json'), '{bad');
  await writeFile(path.join(root, 'oversized/package.json'), ' '.repeat(MAX_MANIFEST_BYTES + 1));
  await writeFile(path.join(root, 'array/package.json'), '[]');
  const result = await scan();
  expect(result.projects.map((project) => project.name)).toEqual(['good']);
  expect(result.final.issueCount).toBe(3);
  expect(result.final.issues.find((issue) => issue.path.includes('/oversized/'))?.message).toContain('1 MiB');
});

it('emits incremental bounded batches and counts, deduplicating overlapping roots', async () => {
  for (let index = 0; index < 125; index++) await manifest(`project-${index}`, { name: `project-${index}` });
  const batches: ScannerBatch[] = [];
  await scanRoots([{ id: 'all', path: root, exclusions: [] }, { id: 'child', path: path.join(root, 'project-0'), exclusions: [] }], (batch) => batches.push(structuredClone(batch)));
  const records = new Map(batches.flatMap((batch) => batch.projects).map((project) => [project.id, project]));
  expect(records.size).toBe(125);
  expect(batches.filter((batch) => batch.projects.length).length).toBeGreaterThan(2);
  expect(batches.every((batch) => batch.projects.length <= 50)).toBe(true);
  expect([...records.values()].find((project) => project.name === 'project-0')?.rootIds).toEqual(['all', 'child']);
  expect(batches.at(-1)?.progress).toMatchObject({ projects: 125, directories: 127 });
});

it('does not attribute a nested project or generated source language to its parent', async () => {
  await manifest(''); await manifest('child'); await manifest('dist');
  await writeFile(path.join(root, 'child/index.js'), ''); await writeFile(path.join(root, 'dist/index.ts'), '');
  const result = await scan();
  expect(result.projects.find((project) => project.path === root)?.languages).toEqual([]);
  expect(result.projects.find((project) => project.path.endsWith('/child'))?.languages).toEqual(['JavaScript']);
});
