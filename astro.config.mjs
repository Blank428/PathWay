import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  build: { format: 'file', inlineStylesheets: 'always', assets: 'assets' },
  vite: {
    build: { chunkSizeWarningLimit: 1400, modulePreload: false },
    // relative asset URLs inside scripts, so the site runs from any folder
    experimental: { renderBuiltUrl: (_f, { hostType }) => (hostType === 'js' ? { relative: true } : undefined) },
  },
});
