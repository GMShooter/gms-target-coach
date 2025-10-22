import React from 'react';
import { render, screen } from '@testing-library/react';
import { Separator } from '../../../components/ui/separator';

describe('Separator Component', () => {
  describe('Horizontal Separator', () => {
    it('renders horizontal separator by default', () => {
      render(<Separator />);
      const separator = screen.getByRole('separator');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveAttribute('orientation', 'horizontal');
      expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
    });

    it('applies horizontal styles', () => {
      render(<Separator />);
      const separator = screen.getByRole('separator');
      expect(separator).toHaveClass('shrink-0', 'bg-border', 'h-[1px]', 'w-full');
    });

    it('applies custom className', () => {
      render(<Separator className="custom-separator" />);
      const separator = screen.getByRole('separator');
      expect(separator).toHaveClass('custom-separator');
    });

    it('is decorative by default', () => {
      render(<Separator />);
      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Vertical Separator', () => {
    it('renders vertical separator when orientation is vertical', () => {
      render(<Separator orientation="vertical" />);
      const separator = screen.getByRole('separator');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveAttribute('orientation', 'vertical');
      expect(separator).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('applies vertical styles', () => {
      render(<Separator orientation="vertical" />);
      const separator = screen.getByRole('separator');
      expect(separator).toHaveClass('shrink-0', 'bg-border', 'h-full', 'w-[1px]');
    });

    it('applies custom className with vertical orientation', () => {
      render(<Separator orientation="vertical" className="custom-vertical" />);
      const separator = screen.getByRole('separator');
      expect(separator).toHaveClass('custom-vertical');
    });
  });

  describe('Decorative Property', () => {
    it('is decorative when decorative prop is true', () => {
      render(<Separator decorative={true} />);
      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('aria-hidden', 'true');
    });

    it('is decorative when decorative prop is not specified (default)', () => {
      render(<Separator />);
      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('aria-hidden', 'true');
    });

    it('is not decorative when decorative prop is false', () => {
      render(<Separator decorative={false} />);
      const separator = screen.getByRole('separator');
      expect(separator).not.toHaveAttribute('aria-hidden');
    });
  });

  describe('Accessibility', () => {
    it('has proper role attribute', () => {
      render(<Separator />);
      const separator = screen.getByRole('separator');
      expect(separator).toBeInTheDocument();
    });

    it('has correct aria-orientation for horizontal', () => {
      render(<Separator orientation="horizontal" />);
      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
    });

    it('has correct aria-orientation for vertical', () => {
      render(<Separator orientation="vertical" />);
      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('has aria-hidden when decorative', () => {
      render(<Separator decorative={true} />);
      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('aria-hidden', 'true');
    });

    it('does not have aria-hidden when not decorative', () => {
      render(<Separator decorative={false} />);
      const separator = screen.getByRole('separator');
      expect(separator).not.toHaveAttribute('aria-hidden');
    });
  });

  describe('Styling Variations', () => {
    it('applies multiple custom classes', () => {
      render(<Separator className="class1 class2 class3" />);
      const separator = screen.getByRole('separator');
      expect(separator).toHaveClass('class1', 'class2', 'class3');
    });

    it('combines default classes with custom classes', () => {
      render(<Separator className="custom" />);
      const separator = screen.getByRole('separator');
      expect(separator).toHaveClass('shrink-0', 'bg-border', 'h-[1px]', 'w-full', 'custom');
    });

    it('combines vertical default classes with custom classes', () => {
      render(<Separator orientation="vertical" className="custom-vertical" />);
      const separator = screen.getByRole('separator');
      expect(separator).toHaveClass('shrink-0', 'bg-border', 'h-full', 'w-[1px]', 'custom-vertical');
    });
  });

  describe('Data Attributes', () => {
    it('supports custom data attributes', () => {
      render(<Separator data-testid="custom-separator" />);
      const separator = screen.getByTestId('custom-separator');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveAttribute('role', 'separator');
    });

    it('supports multiple data attributes', () => {
      render(
        <Separator 
          data-testid="separator-1" 
          data-section="header" 
          data-index="0" 
        />
      );
      const separator = screen.getByTestId('separator-1');
      expect(separator).toHaveAttribute('data-section', 'header');
      expect(separator).toHaveAttribute('data-index', '0');
    });
  });

  describe('Forward Ref', () => {
    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Separator ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('ref has correct element type', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Separator ref={ref} />);
      expect(ref.current?.tagName).toBe('DIV');
    });
  });

  describe('Layout Context', () => {
    it('works in flex container horizontally', () => {
      render(
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>Item 1</div>
          <Separator />
          <div>Item 2</div>
        </div>
      );
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByRole('separator')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('works in flex container vertically', () => {
      render(
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div>Item 1</div>
          <Separator orientation="vertical" />
          <div>Item 2</div>
        </div>
      );
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByRole('separator')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty className', () => {
      render(<Separator className="" />);
      const separator = screen.getByRole('separator');
      expect(separator).toHaveClass('shrink-0', 'bg-border', 'h-[1px]', 'w-full');
    });

    it('handles undefined className', () => {
      render(<Separator className={undefined} />);
      const separator = screen.getByRole('separator');
      expect(separator).toHaveClass('shrink-0', 'bg-border', 'h-[1px]', 'w-full');
    });

    it('handles explicit horizontal orientation', () => {
      render(<Separator orientation="horizontal" />);
      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('orientation', 'horizontal');
      expect(separator).toHaveClass('h-[1px]', 'w-full');
    });
  });
});