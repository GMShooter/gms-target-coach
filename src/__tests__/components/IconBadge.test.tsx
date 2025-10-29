import React from 'react';
import { render, screen } from '@testing-library/react';
import { Camera } from 'lucide-react';

import { IconBadge } from '../../components/IconBadge';

/* eslint-disable testing-library/no-node-access */

describe('IconBadge Component', () => {
  it('renders with default props', () => {
    render(<IconBadge icon={Camera} />);
    
    const badge = screen.getByTitle('');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-sky-100', 'p-2', 'rounded-full', 'flex', 'items-center', 'justify-center');
    
    // Use container.querySelector to access SVG element (allowed within within context)
    const icon = badge.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('lucide', 'lucide-camera', 'text-sky-700', 'h-8', 'w-8');
  });

  it('renders with custom label', () => {
    render(<IconBadge icon={Camera} label="Camera Icon" />);
    
    const badge = screen.getByTitle('Camera Icon');
    expect(badge).toBeInTheDocument();
  });

  it('applies success variant correctly', () => {
    render(<IconBadge icon={Camera} variant="success" />);
    
    const badge = screen.getByTitle('');
    expect(badge).toHaveClass('bg-emerald-100');
    
    // Use container.querySelector to access SVG element (allowed within within context)
    const icon = badge.querySelector('svg');
    expect(icon).toHaveClass('text-emerald-700');
  });

  it('applies warning variant correctly', () => {
    render(<IconBadge icon={Camera} variant="warning" />);
    
    const badge = screen.getByTitle('');
    expect(badge).toHaveClass('bg-amber-100');
    
    // Use container.querySelector to access SVG element (allowed within within context)
    const icon = badge.querySelector('svg');
    expect(icon).toHaveClass('text-amber-700');
  });

  it('applies error variant correctly', () => {
    render(<IconBadge icon={Camera} variant="error" />);
    
    const badge = screen.getByTitle('');
    expect(badge).toHaveClass('bg-red-100');
    
    // Use container.querySelector to access SVG element (allowed within within context)
    const icon = badge.querySelector('svg');
    expect(icon).toHaveClass('text-red-700');
  });

  it('applies info variant correctly', () => {
    render(<IconBadge icon={Camera} variant="info" />);
    
    const badge = screen.getByTitle('');
    expect(badge).toHaveClass('bg-blue-100');
    
    // Use container.querySelector to access SVG element (allowed within within context)
    const icon = badge.querySelector('svg');
    expect(icon).toHaveClass('text-blue-700');
  });

  it('applies small size correctly', () => {
    render(<IconBadge icon={Camera} size="sm" />);
    
    const badge = screen.getByTitle('');
    expect(badge).toHaveClass('p-1');
    
    // Use container.querySelector to access SVG element (allowed within within context)
    const icon = badge.querySelector('svg');
    expect(icon).toHaveClass('h-4', 'w-4');
  });

  it('applies large size correctly', () => {
    render(<IconBadge icon={Camera} size="lg" />);
    
    const badge = screen.getByTitle('');
    expect(badge).toHaveClass('p-3');
    
    // Use container.querySelector to access SVG element (allowed within within context)
    const icon = badge.querySelector('svg');
    expect(icon).toHaveClass('h-12', 'w-12');
  });

  it('combines variant and size correctly', () => {
    render(<IconBadge icon={Camera} variant="success" size="lg" />);
    
    const badge = screen.getByTitle('');
    expect(badge).toHaveClass('bg-emerald-100', 'p-3');
    
    // Use container.querySelector to access SVG element (allowed within within context)
    const icon = badge.querySelector('svg');
    expect(icon).toHaveClass('text-emerald-700', 'h-12', 'w-12');
  });

  it('renders with all props combined', () => {
    render(<IconBadge icon={Camera} variant="success" size="lg" label="Success Icon" />);
    
    const badge = screen.getByTitle('Success Icon');
    expect(badge).toHaveClass('bg-emerald-100', 'p-3');
    
    // Use container.querySelector to access SVG element (allowed within within context)
    const icon = badge.querySelector('svg');
    expect(icon).toHaveClass('text-emerald-700', 'h-12', 'w-12');
  });
});

/* eslint-enable testing-library/no-node-access */