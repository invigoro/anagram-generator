/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs, so the same build works at sator.invigoro.me, at
  // invigoro.github.io/anagram-generator/, or under `vite preview`.
  base: './',
  plugins: [react()],
  // The phrase search's worker loads word lists as it needs them, which takes a module worker.
  worker: { format: 'es' },
  test: {
    // The engine is plain TypeScript. UI tests opt into a DOM with `// @vitest-environment jsdom`.
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
});
