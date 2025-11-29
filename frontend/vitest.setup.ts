import '@testing-library/jest-dom'; 
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react'; // or '@testing-library/vue'

// Extend Vitest's expect with jest-dom matchers
// The import '@testing-library/jest-dom' does this automatically

// Runs cleanup after each test file to unmount React components and clean the DOM
afterEach(() => {
  cleanup(); 
});