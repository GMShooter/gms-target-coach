import React from 'react';
import { render, screen } from '@testing-library/react';

import '@testing-library/jest-dom';
import App from '../../App';
// Mock CSS import
jest.mock('../../App.css', () => ({}));

test('renders GMShoot app', () => {
  render(<App />);
  // Should show loading screen initially while checking auth
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});
