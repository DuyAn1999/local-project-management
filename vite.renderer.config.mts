import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { contentSecurityPolicy } from './build/content-security-policy.mts';

export default defineConfig(({ command }) => ({
  base: './',
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  plugins: [
    react(),
    {
      name: 'local-projects-csp',
      transformIndexHtml: {
        order: 'pre',
        handler: (html) => html.replace('__APP_CSP__', contentSecurityPolicy(command === 'serve')),
      },
    },
  ],
}));
