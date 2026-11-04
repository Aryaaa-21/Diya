import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
  // inotify doesn't see edits on Windows drives under WSL; poll instead.
  server: { watch: { usePolling: true, interval: 300 } },
});
