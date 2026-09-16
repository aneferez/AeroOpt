// Registers jest-dom matchers (toBeInTheDocument, toHaveTextContent, ...) on
// Vitest's `expect`, and augments the matcher types for TypeScript.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount React trees between tests so the jsdom document stays clean.
afterEach(() => {
  cleanup();
});
