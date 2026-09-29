/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs, so the same build works at invigoro.github.io/anagram-generator/, on a
  // custom domain later, or under `vite preview`.
  base: './',
  plugins: [react()],
  test: {
    // The engine is plain TypeScript. UI tests opt into a DOM with `// @vitest-environment jsdom`.
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
});
