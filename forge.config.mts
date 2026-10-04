import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    appBundleId: 'dev.localprojects.desktop',
    executableName: 'Local Projects',
  },
  rebuildConfig: {},
  makers: [],
  plugins: [new VitePlugin({
    build: [
      { entry: 'src/main/main.ts', config: 'vite.main.config.mts', target: 'main' },
      { entry: 'src/preload/preload.ts', config: 'vite.preload.config.mts', target: 'preload' },
    ],
    renderer: [{ name: 'main_window', config: 'vite.renderer.config.mts' }],
  })],
};

export default config;
