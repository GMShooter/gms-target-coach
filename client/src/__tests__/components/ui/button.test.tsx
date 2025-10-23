import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../../components/ui/button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: 'Click me' });
      
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground', 'hover:bg-primary/90');
    });

    it('renders with custom className', () => {
      render(<Button className="custom-class">Click me</Button>);
      const button = screen.getByRole('button', { name: 'Click me' });
      
      expect(button).toHaveClass('custom-class');
    });

    it('renders children correctly', () => {
      render(
        <Button>
          <span data-testid="child-element">Child content</span>
        </Button>
      );
      
      expect(screen.getByTestId('child-element')).toBeInTheDocument();
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Click me</Button>);
      
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current).toBe(screen.getByRole('button', { name: 'Click me' }));
    });
  });

  describe('Variants', () => {
    it('renders default variant', () => {
      render(<Button variant="default">Default</Button>);
      const button = screen.getByRole('button', { name: 'Default' });
      
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground', 'hover:bg-primary/90');
    });

    it('renders destructive variant', () => {
      render(<Button variant="destructive">Destructive</Button>);
      const button = screen.getByRole('button', { name: 'Destructive' });
      
      expect(button).toHaveClass('bg-destructive', 'text-destructive-foreground', 'hover:bg-destructive/90');
    });

    it('renders outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button', { name: 'Outline' });
      
      expect(button).toHaveClass('border', 'border-input', 'bg-background', 'hover:bg-accent', 'hover:text-accent-foreground');
    });

    it('renders secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button', { name: 'Secondary' });
      
      expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground', 'hover:bg-secondary/80');
    });

    it('renders ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button', { name: 'Ghost' });
      
      expect(button).toHaveClass('hover:bg-accent', 'hover:text-accent-foreground');
    });

    it('renders link variant', () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole('button', { name: 'Link' });
      
      expect(button).toHaveClass('text-primary', 'underline-offset-4', 'hover:underline');
    });
  });

  describe('Sizes', () => {
    it('renders default size', () => {
      render(<Button size="default">Default</Button>);
      const button = screen.getByRole('button', { name: 'Default' });
      
      expect(button).toHaveClass('h-10', 'px-4', 'py-2');
    });

    it('renders small size', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button', { name: 'Small' });
      
      expect(button).toHaveClass('h-9', 'rounded-md', 'px-3');
    });

    it('renders large size', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button', { name: 'Large' });
      
      expect(button).toHaveClass('h-11', 'rounded-md', 'px-8');
    });

    it('renders icon size', () => {
      render(<Button size="icon">Icon</Button>);
      const button = screen.getByRole('button', { name: 'Icon' });
      
      expect(button).toHaveClass('h-10', 'w-10');
    });
  });

  describe('Interactions', () => {
    it('handles click events', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button', { name: 'Click me' });
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles multiple clicks', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button', { name: 'Click me' });
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    it('can be disabled', () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      
      const button = screen.getByRole('button', { name: 'Disabled' });
      expect(button).toBeDisabled();
      
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('applies disabled styles when disabled', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button', { name: 'Disabled' });
      
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
    });
  });

  describe('Props', () => {
    it('passes through HTML button attributes', () => {
      render(
        <Button 
          type="submit" 
          disabled={false}
          aria-label="Submit form"
          data-testid="test-button"
        >
          Submit
        </Button>
      );
      
      const button = screen.getByTestId('test-button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('aria-label', 'Submit form');
      expect(button).not.toBeDisabled();
    });

    it('handles form submission', () => {
      const handleSubmit = jest.fn((e) => e.preventDefault());
      render(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit</Button>
        </form>
      );
      
      const button = screen.getByRole('button', { name: 'Submit' });
      fireEvent.click(button);
      
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe('asChild prop', () => {
    it('renders as child component when asChild is true', () => {
      render(
        <Button asChild>
          <a href="https://example.com">Link Button</a>
        </Button>
      );
      
      const link = screen.getByRole('link', { name: 'Link Button' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveClass('bg-primary', 'text-primary-foreground', 'hover:bg-primary/90');
    });

    it('applies button styles to child element', () => {
      render(
        <Button asChild>
          <div role="button">Div Button</div>
        </Button>
      );
      
      const divButton = screen.getByRole('button', { name: 'Div Button' });
      expect(divButton).toHaveClass('bg-primary', 'text-primary-foreground', 'hover:bg-primary/90');
    });
  });

  describe('Accessibility', () => {
    it('has proper button role by default', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('supports ARIA attributes', () => {
      render(
        <Button 
          aria-describedby="button-description"
          aria-expanded={false}
        >
          Click me
        </Button>
      );
      
      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toHaveAttribute('aria-describedby', 'button-description');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('supports keyboard navigation', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button', { name: 'Click me' });
      
      // Test Enter key
      await user.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      // Test Space key
      handleClick.mockClear();
      button.focus();
      await user.keyboard('{ }');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('can be focused', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: 'Click me' });
      
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('renders with empty children', () => {
      render(<Button></Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toBeEmptyDOMElement();
    });

    it('renders with complex children', () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      );
      
      expect(screen.getByText('Icon')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });

    it('handles undefined onClick gracefully', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: 'Click me' });
      
      expect(() => fireEvent.click(button)).not.toThrow();
    });
  });
});