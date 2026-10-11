import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/smoke',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  projects: [
    { name: 'development', testIgnore: '**/design.spec.ts' },
    { name: 'packaged', testIgnore: '**/design.spec.ts' },
    { name: 'design', testMatch: '**/design.spec.ts' },
  ],
});
