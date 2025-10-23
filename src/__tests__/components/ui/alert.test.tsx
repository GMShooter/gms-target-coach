import React from 'react';
import { render, screen } from '@testing-library/react';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';

describe('Alert Components', () => {
  describe('Alert', () => {
    it('renders with default variant', () => {
      render(<Alert>Alert message</Alert>);
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toBeInTheDocument();
      expect(alertElement).toHaveClass('relative', 'w-full', 'rounded-lg', 'border', 'p-4');
    });

    it('renders with destructive variant', () => {
      render(<Alert variant="destructive">Error message</Alert>);
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toHaveClass('border-destructive/50', 'text-destructive', 'dark:border-destructive');
    });

    it('applies custom className', () => {
      render(<Alert className="custom-class">Alert message</Alert>);
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toHaveClass('custom-class');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Alert ref={ref}>Alert message</Alert>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('renders children correctly', () => {
      render(
        <Alert>
          <span>Custom content</span>
        </Alert>
      );
      expect(screen.getByText('Custom content')).toBeInTheDocument();
    });
  });

  describe('AlertTitle', () => {
    it('renders title text', () => {
      render(<AlertTitle>Alert Title</AlertTitle>);
      const titleElement = screen.getByText('Alert Title');
      expect(titleElement).toBeInTheDocument();
      expect(titleElement.tagName).toBe('H5');
      expect(titleElement).toHaveClass('mb-1', 'font-medium', 'leading-none', 'tracking-tight');
    });

    it('applies custom className', () => {
      render(<AlertTitle className="custom-title">Title</AlertTitle>);
      const titleElement = screen.getByText('Title');
      expect(titleElement).toHaveClass('custom-title');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLHeadingElement>();
      render(<AlertTitle ref={ref}>Title</AlertTitle>);
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
    });
  });

  describe('AlertDescription', () => {
    it('renders description text', () => {
      render(<AlertDescription>Alert description</AlertDescription>);
      const descriptionElement = screen.getByText('Alert description');
      expect(descriptionElement).toBeInTheDocument();
      expect(descriptionElement.tagName).toBe('DIV');
      expect(descriptionElement).toHaveClass('text-sm', '[&_p]:leading-relaxed');
    });

    it('applies custom className', () => {
      render(<AlertDescription className="custom-desc">Description</AlertDescription>);
      const descriptionElement = screen.getByText('Description');
      expect(descriptionElement).toHaveClass('custom-desc');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<AlertDescription ref={ref}>Description</AlertDescription>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Combined Alert Components', () => {
    it('renders complete alert with title and description', () => {
      render(
        <Alert>
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>This is a warning message</AlertDescription>
        </Alert>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('This is a warning message')).toBeInTheDocument();
    });

    it('renders destructive alert with title and description', () => {
      render(
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Something went wrong</AlertDescription>
        </Alert>
      );

      const alertElement = screen.getByRole('alert');
      expect(alertElement).toHaveClass('border-destructive/50', 'text-destructive');
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders alert with complex content', () => {
      render(
        <Alert>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            <span>Your changes have been saved.</span>
            <button>Dismiss</button>
          </AlertDescription>
        </Alert>
      );

      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Your changes have been saved.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
    });
  });
});