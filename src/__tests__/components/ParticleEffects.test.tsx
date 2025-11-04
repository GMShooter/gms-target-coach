import React from 'react';

import { render, screen } from '@testing-library/react';

import { ParticleEffects } from '../../components/ParticleEffects';

// Mock canvas element
const mockCanvasContext = {
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  closePath: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  createLinearGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
  createRadialGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  font: '',
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 100 })),
  setLineDash: jest.fn(),
  textAlign: 'center' as const,
  textBaseline: 'middle' as const,
  canvas: null,
  shadowBlur: 0,
  shadowColor: '',
};

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => mockCanvasContext),
});

// Add role attribute to canvas elements for testing
Object.defineProperty(HTMLCanvasElement.prototype, 'setAttribute', {
  value: jest.fn(function(name, value) {
    if (name === 'role') {
      this._role = value;
    }
    return this;
  }),
});

Object.defineProperty(HTMLCanvasElement.prototype, 'getAttribute', {
  value: jest.fn(function(name) {
    if (name === 'role') {
      return this._role || 'img';
    }
    return null;
  }),
});

describe('ParticleEffects Component', () => {
  it('renders without crashing', () => {
    render(<ParticleEffects trigger={null} />);
    const canvas = screen.getByRole('img') as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
  });

  it('renders canvas element', () => {
    render(<ParticleEffects trigger={null} />);
    const canvas = screen.getByRole('img') as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
  });

  it('handles shot trigger', () => {
    render(<ParticleEffects trigger="shot" x={50} y={50} score={8} />);
    const canvas = screen.getByRole('img') as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
  });

  it('handles bullseye trigger', () => {
    render(<ParticleEffects trigger="bullseye" x={100} y={100} score={10} />);
    const canvas = screen.getByRole('img') as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
  });

  it('handles analysis trigger', () => {
    render(<ParticleEffects trigger="analysis" x={75} y={75} score={9} />);
    const canvas = screen.getByRole('img') as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
  });

  it('handles custom position', () => {
    render(<ParticleEffects trigger="shot" x={200} y={150} score={7} />);
    const canvas = screen.getByRole('img') as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
  });

  it('handles custom score', () => {
    render(<ParticleEffects trigger="shot" x={50} y={50} score={5} />);
    const canvas = screen.getByRole('img') as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
  });

  it('handles default props', () => {
    render(<ParticleEffects trigger="shot" />);
    const canvas = screen.getByRole('img') as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
  });

  it('has proper styling', () => {
    render(<ParticleEffects trigger="shot" />);
    const canvas = screen.getByRole('img') as HTMLCanvasElement;
    expect(canvas).toHaveClass('absolute', 'inset-0', 'pointer-events-none', 'z-50');
  });

  it('has proper blend mode', () => {
    render(<ParticleEffects trigger="shot" />);
    const canvas = screen.getByRole('img') as HTMLCanvasElement;
    expect(canvas).toHaveStyle({ mixBlendMode: 'screen' });
  });

  it('handles cleanup on unmount', () => {
    const { unmount } = render(<ParticleEffects trigger="shot" />);
    const canvas = screen.getByRole('img') as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
    
    unmount();
    // Component should unmount without errors
  });

  it('handles multiple triggers', () => {
    const { rerender } = render(<ParticleEffects trigger="shot" />);
    let canvas = screen.getByRole('img') as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();

    rerender(<ParticleEffects trigger="bullseye" />);
    canvas = screen.getByRole('img') as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();

    rerender(<ParticleEffects trigger="analysis" />);
    canvas = screen.getByRole('img') as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
  });

  it('handles null trigger', () => {
    render(<ParticleEffects trigger={null} />);
    const canvas = screen.getByRole('img') as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
  });
});