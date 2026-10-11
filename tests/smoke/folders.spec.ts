import { expect, test } from '@playwright/test';
import type { ElectronApplication } from '@playwright/test';
import { mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { launchDesktop } from './launch';
import type { FolderRequest } from '../../src/shared/folders';

// Stub only the OS picker. The UI, preload, validated IPC, filesystem and restart are real.
async function choose(app: ElectronApplication, folder?: string) {
  await app.evaluate(({ dialog }, chosen) => {
    dialog.showOpenDialog = async (...args: unknown[]) => {
      const options = args[1] as { properties: string[]; title: string };
      if (options.properties.join(',') !== 'openDirectory' || !options.title) throw new Error('Expected native directory picker');
      return { canceled: !chosen, filePaths: chosen ? [chosen] : [] };
    };
  }, folder);
}

test('saved folders survive restart, handle cancellation and recover moved paths without deleting files', async ({ playwright }, testInfo) => {
  test.setTimeout(60_000);
  const directory = await mkdtemp(path.join(os.tmpdir(), 'local-projects-flow-'));
  const profile = path.join(directory, 'profile');
  const folder = path.join(directory, 'Projects with spaces 日本語');
  const moved = `${folder}-moved`;
  await mkdir(folder); await writeFile(path.join(folder, 'keep.txt'), 'keep me');
  let desktop = await launchDesktop(playwright, testInfo.project.name === 'packaged', profile);
  try {
    let { app, page } = desktop;
    const add = () => page.getByRole('button', { name: 'Add folder', exact: true }).first();
    await expect(add()).toBeEnabled();
    await choose(app);
    await add().click();
    await expect(page.getByRole('heading', { name: 'Your projects, in one place' })).toBeVisible();
    await expect(add()).toBeEnabled();
    await expect(readFile(path.join(profile, 'settings.json'))).rejects.toThrow();

    await choose(app, folder); await add().click();
    await expect(page.getByRole('heading', { name: 'Projects with spaces 日本語', exact: true })).toBeVisible();
    await expect(page.getByText('Ready for project discovery', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rescan' })).toBeDisabled();
    const settingsFile = path.join(profile, 'settings.json');
    const saved = JSON.parse(await readFile(settingsFile, 'utf8'));
    expect(saved.roots[0].path).toBe(await realpath(folder));
    const alias = path.join(directory, 'alias'); await symlink(folder, alias);
    await choose(app, alias); await add().click();
    await expect(add()).toBeEnabled();
    expect(JSON.parse(await readFile(settingsFile, 'utf8')).roots).toHaveLength(1);

    await page.getByLabel('Scan exclusions', { exact: true }).fill('node_modules\ncustom-cache');
    await page.getByRole('button', { name: 'Save exclusions' }).click();
    await expect(page.getByRole('status', { name: 'Folder status' })).toContainText('Scan exclusions saved');
    await desktop.close();
    desktop = await launchDesktop(playwright, testInfo.project.name === 'packaged', profile);
    ({ app, page } = desktop);
    await expect(page.getByLabel('Scan exclusions', { exact: true })).toHaveValue('node_modules\ncustom-cache');
    expect(JSON.parse(await readFile(settingsFile, 'utf8')).roots[0].id).toBe(saved.roots[0].id);

    for (const payload of [null, { protocolVersion: 1, action: 'add', path: folder }, { protocolVersion: 1, action: 'exclusions', id: saved.roots[0].id, exclusions: ['../bad'] }]) {
      const rejection = await page.evaluate(async (value) => {
        try { await window.desktop.manageFolders(value as FolderRequest); return 'accepted'; } catch (error) { return String(error); }
      }, payload);
      expect(rejection).toContain('Invalid folder request');
    }
    await rename(folder, moved);
    await page.getByRole('button', { name: 'Check availability' }).click();
    await expect(page.getByRole('heading', { name: 'This folder is no longer available.' })).toBeVisible();
    await choose(app); await page.getByRole('button', { name: 'Locate folder' }).click();
    await expect(page.getByRole('button', { name: 'Locate folder' })).toBeEnabled();
    expect(JSON.parse(await readFile(settingsFile, 'utf8')).roots[0].path).toBe(saved.roots[0].path);
    await choose(app, moved); await page.getByRole('button', { name: 'Locate folder' }).click();
    await expect(page.getByText('Ready for project discovery', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Scan exclusions', { exact: true })).toHaveValue('node_modules\ncustom-cache');

    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      for (const width of [1280, 1000, 768, 480, 320]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        if (width === 1280 || width === 320) await page.screenshot({ path: testInfo.outputPath(`folders-${colorScheme}-${width}.png`), fullPage: true });
      }
    }
    await page.getByRole('button', { name: 'Remove folder', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your projects, in one place' })).toBeVisible();
    await expect(add()).toBeFocused();
    expect(await readFile(path.join(moved, 'keep.txt'), 'utf8')).toBe('keep me');
    expect(JSON.parse(await readFile(settingsFile, 'utf8')).roots).toEqual([]);
  } finally { await desktop.close(); await rm(directory, { recursive: true, force: true }); }
});

test('corrupt settings show recovery and preserve the original', async ({ playwright }, testInfo) => {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'local-projects-recovery-'));
  await writeFile(path.join(profile, 'settings.json'), '{broken');
  const desktop = await launchDesktop(playwright, testInfo.project.name === 'packaged', profile);
  try {
    await expect(desktop.page.getByRole('alert')).toContainText('original is preserved');
    await expect(desktop.page.getByRole('button', { name: 'Add folder', exact: true }).first()).toBeEnabled();
    const backup = (await readdir(profile)).find((entry) => entry.startsWith('settings.json.invalid-'))!;
    expect(await readFile(path.join(profile, backup), 'utf8')).toBe('{broken');
  } finally { await desktop.close(); await rm(profile, { recursive: true, force: true }); }
});
