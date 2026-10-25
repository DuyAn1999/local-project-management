import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ScanService } from '../../src/main/scans';
import type { ScanUpdate } from '../../src/shared/scanning';
import { mergeScanUpdate } from '../../src/renderer/hooks/useScan';

const directories: string[] = [];
const services: ScanService[] = [];
afterEach(async () => { for (const service of services) service.dispose(); for (const directory of directories) await rm(directory, { recursive: true, force: true }); });

it('reports unexpected worker exit and coalesces identical scan requests', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'scan-worker-test-')); directories.push(directory);
  const file = path.join(directory, 'exit.cjs'); await writeFile(file, 'process.exit(0)');
  const updates: ScanUpdate[] = [];
  const service = new ScanService(file, (update) => updates.push(update)); services.push(service);
  const roots = [{ id: 'root', path: directory, exclusions: [] }];
  const first = service.ensure(roots);
  expect(service.ensure(roots).scanId).toBe(first.scanId);
  await expect.poll(() => service.snapshot().status).toBe('failed');
  expect(updates.at(-1)?.error).toContain('unexpectedly');
});

it('invalidates a running worker when roots change and ignores its eventual exit', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'scan-worker-test-')); directories.push(directory);
  const file = path.join(directory, 'wait.cjs'); await writeFile(file, 'setTimeout(() => process.exit(1), 100)');
  const service = new ScanService(file, () => undefined); services.push(service);
  const first = service.ensure([{ id: 'root', path: directory, exclusions: [] }]);
  const empty = service.ensure([]);
  expect(empty.scanId).not.toBe(first.scanId);
  await new Promise((resolve) => setTimeout(resolve, 150));
  expect(service.snapshot()).toMatchObject({ scanId: empty.scanId, status: 'idle', projects: [] });
});

it('merges progressive updates without stale events replacing a newer scan', () => {
  const initial: ScanUpdate = { scanId: 'a', revision: 1, status: 'scanning', projects: [], progress: { directories: 0, projects: 0, skipped: 0 }, issues: [], issueCount: 0 };
  const project = { id: 'project', path: '/fixture', name: 'fixture', rootIds: ['root'], ecosystem: 'Node' as const, languages: [], evidence: ['package.json'] };
  const first = mergeScanUpdate(initial, { ...initial, revision: 2, projects: [project] });
  expect(mergeScanUpdate(first, { ...initial, revision: 3, status: 'complete' }).projects).toEqual([project]);
  const replaced = mergeScanUpdate(first, { ...initial, revision: 4, scanId: 'b' });
  expect(replaced.projects).toEqual([]);
  expect(mergeScanUpdate(replaced, first)).toEqual(replaced);
});
