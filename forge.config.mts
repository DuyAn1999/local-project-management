import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';

const config: ForgeConfig = {
  packagerConfig: {
    // ASAR matches absolute filenames with matchBase; a basename also matches inside .vite.
    asar: { unpack: 'scan-worker.cjs' },
    appBundleId: 'dev.localprojects.desktop',
    executableName: 'Local Projects',
  },
  rebuildConfig: {},
  makers: [],
  plugins: [new VitePlugin({
    build: [
      { entry: 'src/main/main.ts', config: 'vite.main.config.mts', target: 'main' },
      { entry: 'src/main/scan-worker.ts', config: 'vite.main.config.mts', target: 'main' },
      { entry: 'src/preload/preload.ts', config: 'vite.preload.config.mts', target: 'preload' },
    ],
    renderer: [{ name: 'main_window', config: 'vite.renderer.config.mts' }],
  })],
};

export default config;
