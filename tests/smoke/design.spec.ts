import { expect, test } from '@playwright/test';
import { launchDesktop } from './launch';

test('development fixtures support keyboard selection and long content at every layout', async ({ playwright }, testInfo) => {
  const desktop = await launchDesktop(playwright, false);
  const { page } = desktop;
  try {
    expect(page.url(), 'Keep npm start running before npm run test:design').toMatch(/^http:\/\/127\.0\.0\.1:5173/);
    await page.getByRole('link', { name: 'Design preview', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Development design preview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'atlas-web', exact: true })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to projects' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Scenario')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'All projects' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /^atlas-web/ })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /^billing-api/ })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'billing-api', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^billing-api/ })).toBeFocused();
    expect(await page.getByRole('button', { name: /^billing-api/ }).evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.getByText('Script details', { exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByText('tsx watch src/server.ts', { exact: true })).toBeVisible();

    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      for (const scenario of ['populated', 'empty', 'long']) {
        await page.getByLabel('Scenario').selectOption(scenario);
        for (const width of [1280, 1000, 768, 480, 320]) {
          await page.setViewportSize({ width, height: 800 });
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${scenario} ${colorScheme} ${width}: no horizontal overflow`).toBe(true);
          const overflowing = await page.locator('.project-row, .project-detail-heading, .command-info, .preview-toolbar').evaluateAll((elements) => elements.filter((element) => element.scrollWidth > element.clientWidth + 1).map((element) => element.className));
          expect(overflowing).toEqual([]);
          if (width === 1280 || width === 320) await page.screenshot({ path: testInfo.outputPath(`${scenario}-${colorScheme}-${width}.png`), fullPage: true });
        }
      }
    }
    for (const button of await page.getByRole('button', { name: /^Run / }).all()) await expect(button).toBeDisabled();
    await page.getByRole('link', { name: 'Exit design preview' }).click();
    await expect(page.getByRole('heading', { name: '0 projects' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Development design preview' })).toHaveCount(0);
  } finally { await desktop.close(); }
});
