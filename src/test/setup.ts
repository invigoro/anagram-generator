// Adds DOM matchers such as toBeInTheDocument() to Vitest's expect.
import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/dom';

// Page tests load and search real word lists, which a slow machine (as in CI) takes a while over.
configure({ asyncUtilTimeout: 10_000 });
