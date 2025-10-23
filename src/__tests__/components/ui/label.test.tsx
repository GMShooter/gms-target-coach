import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Label } from '../../../components/ui/label';

describe('Label Component', () => {
  it('renders with default props', () => {
    render(<Label>Test Label</Label>);
    
    const label = screen.getByText('Test Label');
    expect(label).toBeInTheDocument();
    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveClass('text-sm', 'font-medium', 'leading-none');
  });

  it('renders with custom className', () => {
    render(<Label className="custom-class">Test Label</Label>);
    
    const label = screen.getByText('Test Label');
    expect(label).toHaveClass('custom-class');
  });

  it('renders with htmlFor attribute', () => {
    render(<Label htmlFor="test-input">Test Label</Label>);
    
    const label = screen.getByText('Test Label');
    expect(label).toHaveAttribute('for', 'test-input');
  });

  it('renders with id attribute', () => {
    render(<Label id="test-label">Test Label</Label>);
    
    const label = screen.getByText('Test Label');
    expect(label).toHaveAttribute('id', 'test-label');
  });

  it('renders with form attribute', () => {
    render(<Label form="test-form">Test Label</Label>);
    
    const label = screen.getByText('Test Label');
    expect(label).toHaveAttribute('form', 'test-form');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLLabelElement>();
    render(<Label ref={ref}>Test Label</Label>);
    
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
    expect(ref.current).toBeInTheDocument();
  });

  it('handles click event', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(<Label onClick={handleClick}>Test Label</Label>);
    
    const label = screen.getByText('Test Label');
    await user.click(label);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('handles children as ReactNode', () => {
    render(
      <Label>
        <span>Complex</span>
        <strong>Label</strong>
        <em>Content</em>
      </Label>
    );
    
    expect(screen.getByText('Complex')).toBeInTheDocument();
    expect(screen.getByText('Label')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders with aria attributes', () => {
    render(
      <Label
        aria-label="Custom aria label"
        aria-describedby="label-description"
        aria-required="true"
      >
        Test Label
      </Label>
    );
    
    const label = screen.getByText('Test Label');
    expect(label).toHaveAttribute('aria-label', 'Custom aria label');
    expect(label).toHaveAttribute('aria-describedby', 'label-description');
    expect(label).toHaveAttribute('aria-required', 'true');
  });

  it('renders with data attributes', () => {
    render(<Label data-testid="test-label" data-value="label-value">Test Label</Label>);
    
    const label = screen.getByText('Test Label');
    expect(label).toHaveAttribute('data-testid', 'test-label');
    expect(label).toHaveAttribute('data-value', 'label-value');
  });

  it('renders with disabled state', () => {
    render(<Label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Test Label</Label>);
    
    const label = screen.getByText('Test Label');
    expect(label).toHaveClass('peer-disabled:cursor-not-allowed', 'peer-disabled:opacity-70');
  });

  it('associates with input correctly', () => {
    render(
      <div>
        <Label htmlFor="test-input">Test Input Label</Label>
        <input id="test-input" type="text" />
      </div>
    );
    
    const label = screen.getByText('Test Input Label');
    const input = screen.getByRole('textbox');
    
    // Clicking the label should focus the input
    expect(label).toHaveAttribute('for', 'test-input');
    expect(input).toHaveAttribute('id', 'test-input');
  });

  it('handles click on associated input', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Label htmlFor="clickable-input">Clickable Label</Label>
        <input id="clickable-input" type="text" />
      </div>
    );
    
    const label = screen.getByText('Clickable Label');
    const input = screen.getByRole('textbox');
    
    await user.click(label);
    
    expect(input).toHaveFocus();
  });

  it('renders with inline styles', () => {
    render(<Label style={{ color: 'red', fontSize: '16px' }}>Styled Label</Label>);
    
    const label = screen.getByText('Styled Label');
    expect(label).toHaveStyle({ color: 'red', fontSize: '16px' });
  });

  it('renders with title attribute', () => {
    render(<Label title="This is a tooltip">Hoverable Label</Label>);
    
    const label = screen.getByText('Hoverable Label');
    expect(label).toHaveAttribute('title', 'This is a tooltip');
  });

  it('renders with tabIndex', () => {
    render(<Label tabIndex={0}>Focusable Label</Label>);
    
    const label = screen.getByText('Focusable Label');
    expect(label).toHaveAttribute('tabIndex', '0');
  });

  it('renders with custom HTML attributes', () => {
    render(<Label data-custom="custom-value" role="presentation">Custom Label</Label>);
    
    const label = screen.getByText('Custom Label');
    expect(label).toHaveAttribute('data-custom', 'custom-value');
    expect(label).toHaveAttribute('role', 'presentation');
  });

  it('handles keyboard events', async () => {
    const user = userEvent.setup();
    const handleKeyDown = jest.fn();
    render(
      <Label
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >Keyboard Label</Label>
    );
    
    const label = screen.getByText('Keyboard Label');
    await user.click(label); // First focus the label
    await user.keyboard('{Enter}');
    
    expect(handleKeyDown).toHaveBeenCalled();
  });

  it('renders with different text content types', () => {
    const { rerender } = render(<Label>String Label</Label>);
    expect(screen.getByText('String Label')).toBeInTheDocument();

    rerender(<Label>{123}</Label>);
    expect(screen.getByText('123')).toBeInTheDocument();

    rerender(<Label>{null}</Label>);
    // Should render without crashing
  });

  it('applies peer disabled styles correctly', () => {
    render(
      <div className="peer-disabled:opacity-50">
        <Label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Peer Label</Label>
      </div>
    );
    
    const label = screen.getByText('Peer Label');
    expect(label).toHaveClass('peer-disabled:cursor-not-allowed', 'peer-disabled:opacity-70');
  });
});