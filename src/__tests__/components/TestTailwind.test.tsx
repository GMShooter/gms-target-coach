import React from 'react';
import { render, screen } from '@testing-library/react';

import TestTailwind from '../../components/TestTailwind';

describe('TestTailwind Component', () => {
  it('renders correctly', () => {
    render(<TestTailwind />);
    
    expect(screen.getByText('Tailwind Test')).toBeInTheDocument();
    expect(screen.getByText('If you see a blue box with white text, Tailwind is working!')).toBeInTheDocument();
  });

  it('has correct CSS classes', () => {
    render(<TestTailwind />);
    
    const container = screen.getByText('Tailwind Test').parentElement;
    expect(container).toHaveClass('bg-blue-500', 'text-white', 'p-4', 'm-4', 'rounded-lg');
  });

  it('heading has correct styling', () => {
    render(<TestTailwind />);
    
    const heading = screen.getByText('Tailwind Test');
    expect(heading).toHaveClass('text-2xl', 'font-bold');
  });

  it('paragraph has correct content', () => {
    render(<TestTailwind />);
    
    const paragraph = screen.getByText('If you see a blue box with white text, Tailwind is working!');
    expect(paragraph).toBeInTheDocument();
  });
});