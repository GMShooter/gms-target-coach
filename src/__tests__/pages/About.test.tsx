import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import About from '../../pages/About';

// Mock the Button component
jest.mock('../../components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

describe('About Component', () => {
  it('renders correctly', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    
    expect(screen.getByText('About GMShooter v2')).toBeInTheDocument();
    expect(screen.getByText('This is a clean room build of the GMShooter application, rebuilt from scratch with proper architecture and understanding of each component.')).toBeInTheDocument();
    expect(screen.getByText('Back to Home')).toBeInTheDocument();
  });

  it('has correct heading styling', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    
    const heading = screen.getByText('About GMShooter v2');
    expect(heading).toHaveClass('text-4xl', 'font-bold', 'mb-6');
  });

  it('has correct paragraph styling', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    
    const paragraph = screen.getByText('This is a clean room build of the GMShooter application, rebuilt from scratch with proper architecture and understanding of each component.');
    expect(paragraph).toHaveClass('text-lg', 'mb-8');
  });

  it('has correct container styling', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    
    const container = screen.getByText('About GMShooter v2').closest('.min-h-screen');
    expect(container).toHaveClass('min-h-screen', 'bg-background');
    
    const innerContainer = screen.getByText('About GMShooter v2').parentElement;
    expect(innerContainer).toHaveClass('container', 'mx-auto', 'p-8');
  });

  it('renders the Back to Home button', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    
    const button = screen.getByText('Back to Home');
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe('BUTTON');
  });
});