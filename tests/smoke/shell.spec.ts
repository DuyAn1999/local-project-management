import { expect, test } from '@playwright/test';
import { launchDesktop } from './launch';

test('first use stays empty, supports keyboard entry and fits both themes', async ({ playwright }, testInfo) => {
  const packaged = testInfo.project.name === 'packaged';
  test.skip(packaged && process.platform !== 'darwin', 'Initial package target is macOS.');
  const desktop = await launchDesktop(playwright, packaged);
  const { page } = desktop;
  try {
    await expect(page.getByRole('heading', { name: 'Your projects, in one place' })).toBeVisible();
    await expect(page.getByRole('status', { name: 'Desktop connection' })).toHaveText('Desktop connection ready');
    await expect(page.getByRole('heading', { name: '0 projects' })).toBeVisible();
    for (const button of await page.getByRole('button', { name: 'Add folder', exact: true }).all()) await expect(button).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Rescan' })).toBeDisabled();
    await expect(page.getByRole('searchbox')).toBeDisabled();
    await expect(page.getByText('Save a folder now. Project scanning is coming next.')).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to projects' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    expect(await page.getByRole('main').evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');

    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      for (const width of [1280, 1000, 768, 480, 320]) {
        await page.setViewportSize({ width, height: 800 });
        await expect(page.getByRole('heading', { name: 'Your projects, in one place' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        if (width === 1280 || width === 320) await page.screenshot({ path: testInfo.outputPath(`empty-${colorScheme}-${width}.png`), fullPage: true });
      }
    }
    if (packaged) {
      await page.goto(new URL('#design-preview', page.url()).href);
      await page.reload();
      await expect(page.getByRole('heading', { name: '0 projects' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Development design preview' })).toHaveCount(0);
      await expect(page.getByText('atlas-web', { exact: true })).toHaveCount(0);
    }
  } finally { await desktop.close(); }
});
