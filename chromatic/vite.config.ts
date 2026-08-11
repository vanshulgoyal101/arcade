import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Relative base so the built app works when opened from the arcade hub.
export default defineConfig({
  base: './',
  // The dev entry / build template is template.html so the built document can be
  // promoted to <game>/index.html (served at the clean /<game>/ URL).
  build: {
    rollupOptions: {
      input: fileURLToPath(new URL('template.html', import.meta.url)),
    },
  },
});
