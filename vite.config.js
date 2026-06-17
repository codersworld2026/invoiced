import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Single-page app. Hash routing is used internally (e.g. #view/<id> for public
// share links), so no special server rewrite config is required.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
