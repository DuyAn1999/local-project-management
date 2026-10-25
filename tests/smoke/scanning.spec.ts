import { expect, test } from '@playwright/test';
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { AppInfoRequest } from '../../src/shared/contracts';
import type { ScanUpdate } from '../../src/shared/scanning';
import { launchDesktop } from './launch';

test('discovers real Node projects through the worker and keeps execution disabled', async ({ playwright }, testInfo) => {
  const directory = await realpath(await mkdtemp(path.join(os.tmpdir(), 'local-projects-discovery-')));
  const root = path.join(directory, 'Workspace 日本語');
  const profile = path.join(directory, 'profile');
  const entries = ['', 'nested/typed', 'nested/plain', 'node_modules/hidden', 'dist/hidden', 'custom-cache'];
  for (const relative of entries) {
    const folder = path.join(root, relative); await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, 'package.json'), JSON.stringify({ name: relative || 'workspace-root', scripts: { postinstall: 'touch executed', start: 'touch executed' } }));
  }
  await writeFile(path.join(root, 'nested/typed/index.ts'), 'throw new Error("never execute")');
  await writeFile(path.join(root, 'nested/plain/index.js'), 'throw new Error("never execute")');
  await writeFile(path.join(root, 'pyproject.toml'), '[project]');
  await symlink(root, path.join(root, 'loop'));
  let desktop = await launchDesktop(playwright, testInfo.project.name === 'packaged', profile);
  try {
    let { page } = desktop;
    const updates: ScanUpdate[] = [];
    await page.exposeFunction('recordScanUpdate', (update: ScanUpdate) => { updates.push(update); });
    await page.evaluate(() => {
      window.desktop.onScanUpdate((update) => { void (window as unknown as { recordScanUpdate: (value: ScanUpdate) => Promise<void> }).recordScanUpdate(update); });
    });
    await desktop.app.evaluate(({ dialog }, folder) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] });
    }, root);
    await page.getByRole('button', { name: 'Add folder', exact: true }).first().click();
    await expect(page.getByRole('status', { name: 'Scan progress' })).toContainText('Scan complete');
    await expect(page.getByRole('heading', { name: '4 projects', exact: true })).toBeVisible();
    expect(updates.some((update) => update.status === 'scanning' && update.projects.length > 0)).toBe(true);
    const snapshot = await page.evaluate(() => window.desktop.scanProjects({ protocolVersion: 1 }));
    expect(snapshot.projects.map((project) => project.name).sort()).toEqual(['custom-cache', 'nested/plain', 'nested/typed', 'workspace-root']);
    expect(snapshot.projects.find((project) => project.name === 'workspace-root')?.languages).toEqual([]);
    expect(snapshot.projects.find((project) => project.name === 'nested/typed')?.languages).toEqual(['TypeScript']);
    expect(snapshot.progress.skipped).toBe(3);

    for (const value of [null, {}, { protocolVersion: 1, path: directory }, { protocolVersion: 1, rootIds: ['forged'] }]) {
      expect(await page.evaluate(async (payload) => {
        try { await window.desktop.scanProjects(payload as AppInfoRequest); return 'accepted'; } catch (error) { return String(error); }
      }, value)).toContain('Invalid scan request');
    }
    await page.getByRole('button', { name: /^nested\/typed/ }).click();
    await expect(page.getByRole('heading', { name: 'nested/typed', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeDisabled();
    await page.getByText('Detected files', { exact: true }).click();
    await expect(page.getByText('index.ts', { exact: true })).toBeVisible();
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      for (const width of [1280, 768, 320]) {
        await page.setViewportSize({ width, height: 800 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        if (width !== 768) await page.screenshot({ path: testInfo.outputPath(`discovery-${colorScheme}-${width}.png`), fullPage: true });
      }
    }
    await page.locator('.saved-folder').click();
    await page.getByLabel('Scan exclusions', { exact: true }).fill('node_modules\ndist\ncustom-cache');
    await page.getByRole('button', { name: 'Save exclusions' }).click();
    await expect(page.getByRole('heading', { name: '3 projects', exact: true })).toBeVisible();
    await expect(page.getByRole('status', { name: 'Scan progress' })).toContainText('Scan complete');
    await desktop.close();
    desktop = await launchDesktop(playwright, testInfo.project.name === 'packaged', profile);
    page = desktop.page;
    await expect(page.getByRole('heading', { name: '3 projects', exact: true })).toBeVisible();
    await expect(page.getByRole('status', { name: 'Scan progress' })).toContainText('Scan complete');
    await expect(readFile(path.join(root, 'executed'))).rejects.toThrow();
    await page.getByRole('button', { name: 'Remove folder', exact: true }).click();
    await expect(page.getByRole('heading', { name: '0 projects', exact: true })).toBeVisible();
  } finally { await desktop.close(); await rm(directory, { recursive: true, force: true }); }
});
