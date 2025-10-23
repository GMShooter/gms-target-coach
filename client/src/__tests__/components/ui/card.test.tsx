import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '../../../components/ui/card';

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with default props', () => {
      render(<Card>Card Content</Card>);
      
      const card = screen.getByText('Card Content');
      expect(card).toBeInTheDocument();
      expect(card.tagName).toBe('DIV');
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'text-card-foreground', 'shadow-sm');
    });

    it('renders with custom className', () => {
      render(<Card className="custom-card-class">Card Content</Card>);
      
      const card = screen.getByText('Card Content');
      expect(card).toHaveClass('custom-card-class');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Card ref={ref}>Card Content</Card>);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toBeInTheDocument();
    });

    it('renders with custom attributes', () => {
      render(<Card data-testid="test-card" role="article">Card Content</Card>);
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveAttribute('role', 'article');
    });

    it('handles click events', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(<Card onClick={handleClick}>Clickable Card</Card>);
      
      const card = screen.getByText('Clickable Card');
      await user.click(card);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('CardHeader', () => {
    it('renders with default props', () => {
      render(<CardHeader>Header Content</CardHeader>);
      
      const header = screen.getByText('Header Content');
      expect(header).toBeInTheDocument();
      expect(header.tagName).toBe('DIV');
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });

    it('renders with custom className', () => {
      render(<CardHeader className="custom-header-class">Header Content</CardHeader>);
      
      const header = screen.getByText('Header Content');
      expect(header).toHaveClass('custom-header-class');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardHeader ref={ref}>Header Content</CardHeader>);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toBeInTheDocument();
    });
  });

  describe('CardFooter', () => {
    it('renders with default props', () => {
      render(<CardFooter>Footer Content</CardFooter>);
      
      const footer = screen.getByText('Footer Content');
      expect(footer).toBeInTheDocument();
      expect(footer.tagName).toBe('DIV');
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });

    it('renders with custom className', () => {
      render(<CardFooter className="custom-footer-class">Footer Content</CardFooter>);
      
      const footer = screen.getByText('Footer Content');
      expect(footer).toHaveClass('custom-footer-class');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardFooter ref={ref}>Footer Content</CardFooter>);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toBeInTheDocument();
    });
  });

  describe('CardTitle', () => {
    it('renders with default props', () => {
      render(<CardTitle>Card Title</CardTitle>);
      
      const title = screen.getByText('Card Title');
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe('DIV');
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight');
    });

    it('renders with custom className', () => {
      render(<CardTitle className="custom-title-class">Card Title</CardTitle>);
      
      const title = screen.getByText('Card Title');
      expect(title).toHaveClass('custom-title-class');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardTitle ref={ref}>Card Title</CardTitle>);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toBeInTheDocument();
    });
  });

  describe('CardDescription', () => {
    it('renders with default props', () => {
      render(<CardDescription>Card Description</CardDescription>);
      
      const description = screen.getByText('Card Description');
      expect(description).toBeInTheDocument();
      expect(description.tagName).toBe('DIV');
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('renders with custom className', () => {
      render(<CardDescription className="custom-description-class">Card Description</CardDescription>);
      
      const description = screen.getByText('Card Description');
      expect(description).toHaveClass('custom-description-class');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardDescription ref={ref}>Card Description</CardDescription>);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toBeInTheDocument();
    });
  });

  describe('CardContent', () => {
    it('renders with default props', () => {
      render(<CardContent>Card Content</CardContent>);
      
      const content = screen.getByText('Card Content');
      expect(content).toBeInTheDocument();
      expect(content.tagName).toBe('DIV');
      expect(content).toHaveClass('p-6', 'pt-0');
    });

    it('renders with custom className', () => {
      render(<CardContent className="custom-content-class">Card Content</CardContent>);
      
      const content = screen.getByText('Card Content');
      expect(content).toHaveClass('custom-content-class');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardContent ref={ref}>Card Content</CardContent>);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toBeInTheDocument();
    });
  });

  describe('Complete Card Structure', () => {
    it('renders a complete card with all components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action Button</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Card content goes here')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
    });

    it('renders card with nested interactive elements', async () => {
      const user = userEvent.setup();
      const handleCardClick = jest.fn();
      const handleButtonClick = jest.fn((e) => {
        e.stopPropagation(); // Prevent event bubbling to card
      });

      render(
        <Card onClick={handleCardClick}>
          <CardHeader>
            <CardTitle>Interactive Card</CardTitle>
          </CardHeader>
          <CardContent>
            <button onClick={handleButtonClick}>Inner Button</button>
          </CardContent>
        </Card>
      );

      const button = screen.getByRole('button', { name: 'Inner Button' });
      await user.click(button);

      expect(handleButtonClick).toHaveBeenCalledTimes(1);
      // Card click should not be triggered when clicking inner button
      expect(handleCardClick).not.toHaveBeenCalled();
    });

    it('renders card with complex content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Complex Card</CardTitle>
            <CardDescription>
              This card contains multiple types of content including
              <strong>bold text</strong>, <em>italic text</em>, and
              <a href="#">links</a>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul>
              <li>List item 1</li>
              <li>List item 2</li>
              <li>List item 3</li>
            </ul>
            <img src="test-image.jpg" alt="Test Image" />
          </CardContent>
        </Card>
      );

      expect(screen.getByText('bold text')).toBeInTheDocument();
      expect(screen.getByText('italic text')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'links' })).toBeInTheDocument();
      expect(screen.getByText('List item 1')).toBeInTheDocument();
      expect(screen.getByAltText('Test Image')).toBeInTheDocument();
    });

    it('renders card with form elements', async () => {
      const user = userEvent.setup();
      const handleSubmit = jest.fn();

      render(
        <Card>
          <CardHeader>
            <CardTitle>Form Card</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <label htmlFor="test-input">Test Input</label>
              <input id="test-input" type="text" />
              <button type="submit">Submit</button>
            </form>
          </CardContent>
        </Card>
      );

      const input = screen.getByRole('textbox');
      const submitButton = screen.getByRole('button', { name: 'Submit' });

      await user.type(input, 'test value');
      await user.click(submitButton);

      expect(input).toHaveValue('test value');
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('renders card with proper ARIA attributes', () => {
      render(
        <Card role="article" aria-labelledby="card-title">
          <CardHeader>
            <CardTitle id="card-title">Accessible Card</CardTitle>
          </CardHeader>
          <CardContent>
            Card content with proper accessibility
          </CardContent>
        </Card>
      );

      const card = screen.getByRole('article');
      const title = screen.getByText('Accessible Card');

      expect(card).toHaveAttribute('aria-labelledby', 'card-title');
      expect(title).toHaveAttribute('id', 'card-title');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      const handleKeyDown = jest.fn();

      render(
        <Card tabIndex={0} onKeyDown={handleKeyDown}>
          <CardContent>Focusable Card</CardContent>
        </Card>
      );

      const card = screen.getByText('Focusable Card').parentElement; // Get the actual Card div
      if (card) {
        card.focus();
        await user.keyboard('{Enter}');

        expect(card).toHaveFocus();
        expect(handleKeyDown).toHaveBeenCalled();
      }
    });
  });
});