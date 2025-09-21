/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Vite + React heading', () => {
  render(<App />);
  const headingElement = screen.getByText(/Vite \+ React/i);
  expect(headingElement).toBeInTheDocument();
});