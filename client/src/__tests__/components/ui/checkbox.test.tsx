import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from '../../../components/ui/checkbox';

describe('Checkbox Component', () => {
  it('renders checkbox correctly', () => {
    render(<Checkbox />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('type', 'checkbox');
  });

  it('applies default classes', () => {
    render(<Checkbox />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveClass(
      'peer',
      'h-4',
      'w-4',
      'shrink-0',
      'rounded-sm',
      'border',
      'border-primary',
      'ring-offset-background',
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed',
      'disabled:opacity-50',
      'data-[state=checked]:bg-primary',
      'data-[state=checked]:text-primary-foreground'
    );
  });

  it('applies custom className', () => {
    render(<Checkbox className="custom-checkbox" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveClass('custom-checkbox');
  });

  it('can be checked and unchecked', async () => {
    const user = userEvent.setup();
    render(<Checkbox />);
    
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    
    await user.click(checkbox);
    expect(checkbox.checked).toBe(true);
    
    await user.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it('can be controlled component', () => {
    const handleChange = jest.fn();
    render(<Checkbox checked={true} onCheckedChange={handleChange} />);
    
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('calls onCheckedChange when clicked', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();
    render(<Checkbox onCheckedChange={handleChange} />);
    
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('does not call onCheckedChange when disabled', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();
    render(<Checkbox disabled onCheckedChange={handleChange} />);
    
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('applies disabled styles when disabled', () => {
    render(<Checkbox disabled />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    expect(checkbox).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
  });

  it('has checked state styling when checked', () => {
    render(<Checkbox checked={true} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });

  it('has unchecked state styling when unchecked', () => {
    render(<Checkbox checked={false} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'unchecked');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Checkbox ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('supports keyboard interaction', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();
    render(<Checkbox onCheckedChange={handleChange} />);
    
    const checkbox = screen.getByRole('checkbox');
    checkbox.focus();
    
    await user.keyboard('{Enter}');
    expect(handleChange).toHaveBeenCalledWith(true);
    
    await user.keyboard('{Enter}');
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('supports space key interaction', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();
    render(<Checkbox onCheckedChange={handleChange} />);
    
    const checkbox = screen.getByRole('checkbox');
    checkbox.focus();
    
    await user.keyboard(' ');
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('renders with data attributes', () => {
    render(<Checkbox data-testid="custom-checkbox" />);
    const checkbox = screen.getByTestId('custom-checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('handles indeterminate state', () => {
    render(<Checkbox checked="indeterminate" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'indeterminate');
  });

  it('applies aria attributes', () => {
    render(<Checkbox aria-label="Accept terms" aria-required="true" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-label', 'Accept terms');
    expect(checkbox).toHaveAttribute('aria-required', 'true');
  });

  it('works with form submission', async () => {
    const handleSubmit = jest.fn();
    const user = userEvent.setup();
    
    render(
      <form onSubmit={handleSubmit}>
        <Checkbox name="terms" value="accepted" />
        <button type="submit">Submit</button>
      </form>
    );

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    await user.click(submitButton);
    
    // Note: This test might need adjustment based on how the checkbox integrates with forms
    expect(handleSubmit).toHaveBeenCalled();
  });
});