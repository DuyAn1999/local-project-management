import type { ElectronApplication, Page, PlaywrightWorkerArgs } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export async function launchDesktop(playwright: PlaywrightWorkerArgs['playwright'], packaged: boolean, savedProfile?: string): Promise<{ app: ElectronApplication; page: Page; close: () => Promise<void> }> {
  const profile = savedProfile ?? await mkdtemp(path.join(os.tmpdir(), 'local-projects-shell-'));
  const env = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined));
  delete env.ELECTRON_RUN_AS_NODE;
  let app: ElectronApplication | undefined;
  try {
    app = await playwright._electron.launch({
      ...(packaged ? { executablePath: path.resolve(`out/Local Projects-darwin-${process.arch}/Local Projects.app/Contents/MacOS/Local Projects`) } : {}),
      args: [...(packaged ? [] : ['.']), `--user-data-dir=${profile}`],
      env, chromiumSandbox: true,
    });
    const page = await app.firstWindow();
    return { app, page, close: async () => { try { await app?.close(); } finally { if (!savedProfile) await rm(profile, { recursive: true, force: true }); } } };
  } catch (error) {
    try { await app?.close(); } finally { if (!savedProfile) await rm(profile, { recursive: true, force: true }); }
    throw error;
  }
}
