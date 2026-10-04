import { expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { AppInfoRequest } from '../../src/shared/contracts';

test('launches with an isolated renderer and a validated app-info bridge', async ({ playwright }, testInfo) => {
  const packaged = testInfo.project.name === 'packaged';
  test.skip(packaged && process.platform !== 'darwin', 'The first package target is macOS.');
  const userData = await mkdtemp(path.join(os.tmpdir(), 'local-projects-smoke-'));
  const env = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined));
  delete env.ELECTRON_RUN_AS_NODE;
  const executablePath = packaged
    ? path.resolve(`out/Local Projects-darwin-${process.arch}/Local Projects.app/Contents/MacOS/Local Projects`)
    : undefined;
  const app = await playwright._electron.launch({
    ...(executablePath ? { executablePath } : {}),
    args: [...(packaged ? [] : ['.']), `--user-data-dir=${userData}`],
    env,
    chromiumSandbox: true,
    timeout: 20_000,
  });
  const appProcess = app.process();

  try {
    const window = await app.firstWindow();
    await expect(window.getByRole('heading', { name: 'Local Projects', exact: true })).toBeVisible();
    await expect(window.getByRole('status')).toHaveText('Desktop connection ready');

    const result = await window.evaluate(async () => ({
      info: await globalThis.window.desktop.getAppInfo({ protocolVersion: 1 }),
      methods: Object.keys(globalThis.window.desktop),
      requireAvailable: 'require' in globalThis.window,
      processAvailable: 'process' in globalThis.window,
      ipcAvailable: 'ipcRenderer' in globalThis.window,
    }));
    expect(result.info).toMatchObject({ name: 'Local Projects', version: '0.1.0', platform: process.platform, packaged });
    expect(result.methods).toEqual(['getAppInfo']);
    expect(result.requireAvailable).toBe(false);
    expect(result.processAvailable).toBe(false);
    expect(result.ipcAvailable).toBe(false);

    const cdp = await window.context().newCDPSession(window);
    const isolatedContexts: number[] = [];
    cdp.on('Runtime.executionContextCreated', ({ context }) => {
      if (context.name === 'Electron Isolated Context') isolatedContexts.push(context.id);
    });
    await cdp.send('Runtime.enable');
    expect(isolatedContexts).toHaveLength(1);
    // A separate preload world proves isolation; renderer process metrics report
    // the actual OS sandbox rather than merely echoing our configuration.
    const sandboxed = await app.evaluate(({ app, BrowserWindow }) => {
      const rendererPid = BrowserWindow.getAllWindows()[0]?.webContents.getOSProcessId();
      return app.getAppMetrics().find((metric) => metric.pid === rendererPid)?.sandboxed;
    });
    expect(sandboxed).toBe(true);
    await cdp.detach();

    // Exercise the real IPC handler, not just the request-validation helper.
    for (const payload of [null, {}, { protocolVersion: 2 }, { protocolVersion: 1, path: '/tmp' }]) {
      const rejection = await window.evaluate(async (value) => {
        try {
          await globalThis.window.desktop.getAppInfo(value as AppInfoRequest);
          return 'unexpectedly accepted';
        } catch (error) {
          return String(error);
        }
      }, payload);
      expect(rejection).toContain('Invalid app info request');
    }

    // Playwright's main-process access is test-only. Forge does not bundle this file.
    // A separate webContents must be rejected even when it claims the same renderer URL.
    const appPath = await app.evaluate(({ app }) => app.getAppPath());
    const impostorResult = await app.evaluate(async ({ BrowserWindow }, preload) => {
      const original = BrowserWindow.getAllWindows()[0];
      if (!original) throw new Error('App window missing');
      const impostor = new BrowserWindow({
        show: false,
        webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, preload },
      });
      try {
        await impostor.loadURL(original.webContents.getURL());
        return await impostor.webContents.executeJavaScript(`window.desktop.getAppInfo({protocolVersion: 1}).then(() => 'unexpectedly accepted', error => String(error))`);
      } finally {
        impostor.destroy();
      }
    }, path.join(appPath, '.vite/build/preload.cjs'));
    expect(impostorResult).toContain('Untrusted IPC sender');

    if (packaged) {
      const policy = await window.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
      expect(policy).toContain("connect-src 'none'");
      expect(policy).not.toContain('unsafe-inline');
      expect(policy).not.toContain('unsafe-eval');
    }
    await window.screenshot({ path: testInfo.outputPath('desktop.png') });
  } finally {
    try {
      await app.close();
    } finally {
      await rm(userData, { recursive: true, force: true });
    }
  }
  expect(appProcess.exitCode).toBe(0);
});
