/**
 * @ai-generated AWS Bedrock Claude Sonnet 4.5 (anthropic.claude-sonnet-4-20250514-v1:0)
 * @region us-east-1
 * @purpose Comprehensive test suite for Button component
 * 
 * Button Component Tests
 * 
 * Test coverage:
 * - Rendering and variants
 * - Accessibility (ARIA, keyboard navigation)
 * - User interactions
 * - Loading states
 * - Disabled states
 * - Icons
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Button from '../../../src/frontend/components/Button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders with children text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Click me');
    });

    it('renders with primary variant by default', () => {
      render(<Button>Primary Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('enhanced-button--primary');
    });

    it('renders with different variants', () => {
      const variants = ['primary', 'secondary', 'outlined', 'text', 'danger', 'success'];
      
      variants.forEach(variant => {
        const { rerender } = render(<Button variant={variant}>Button</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass(`enhanced-button--${variant}`);
        rerender(<></>);
      });
    });

    it('renders with different sizes', () => {
      const sizes = ['small', 'medium', 'large'];
      
      sizes.forEach(size => {
        const { rerender } = render(<Button size={size}>Button</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass(`enhanced-button--${size}`);
        rerender(<></>);
      });
    });

    it('renders full width button', () => {
      render(<Button fullWidth>Full Width</Button>);
      expect(screen.getByRole('button')).toHaveClass('enhanced-button--full-width');
    });
  });

  describe('Accessibility', () => {
    it('has correct default type attribute', () => {
      render(<Button>Button</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('supports custom type attribute', () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('supports aria-label', () => {
      render(<Button ariaLabel="Save changes">Save</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Save changes');
    });

    it('supports aria-describedby', () => {
      render(<Button ariaDescribedBy="help-text">Button</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('supports aria-expanded', () => {
      render(<Button ariaExpanded={true}>Menu</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    });

    it('supports aria-pressed', () => {
      render(<Button ariaPressed={true}>Toggle</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('supports aria-controls', () => {
      render(<Button ariaControls="dropdown-menu">Open Menu</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-controls', 'dropdown-menu');
    });

    it('is keyboard accessible with Enter key', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Button</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('is keyboard accessible with Space key', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Button</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: ' ' });
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('User Interactions', () => {
    it('calls onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} disabled>Click me</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when loading', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} loading>Click me</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('is disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled Button</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('has aria-disabled attribute when disabled', () => {
      render(<Button disabled>Disabled Button</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('has disabled class when disabled', () => {
      render(<Button disabled>Disabled Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('enhanced-button--disabled');
    });

    it('does not respond to keyboard events when disabled', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} disabled>Button</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.keyDown(button, { key: ' ' });
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      render(<Button loading>Loading Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('enhanced-button--loading');
    });

    it('is disabled when loading', () => {
      render(<Button loading>Loading Button</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('has aria-busy attribute when loading', () => {
      render(<Button loading>Loading Button</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });

    it('does not show icons when loading', () => {
      const Icon = () => <span data-testid="icon">Icon</span>;
      render(
        <Button loading startIcon={<Icon />} endIcon={<Icon />}>
          Loading
        </Button>
      );
      
      expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('renders start icon', () => {
      const StartIcon = () => <span data-testid="start-icon">→</span>;
      render(<Button startIcon={<StartIcon />}>Button</Button>);
      
      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
    });

    it('renders end icon', () => {
      const EndIcon = () => <span data-testid="end-icon">←</span>;
      render(<Button endIcon={<EndIcon />}>Button</Button>);
      
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
    });

    it('renders both start and end icons', () => {
      const StartIcon = () => <span data-testid="start-icon">→</span>;
      const EndIcon = () => <span data-testid="end-icon">←</span>;
      render(
        <Button startIcon={<StartIcon />} endIcon={<EndIcon />}>
          Button
        </Button>
      );
      
      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
    });

    it('icons have aria-hidden attribute', () => {
      const Icon = () => <span data-testid="icon">Icon</span>;
      render(<Button startIcon={<Icon />}>Button</Button>);
      
      const iconContainer = screen.getByTestId('icon').parentElement;
      expect(iconContainer).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Custom Props', () => {
    it('forwards ref to button element', () => {
      const ref = React.createRef();
      render(<Button ref={ref}>Button</Button>);
      
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('applies custom className', () => {
      render(<Button className="custom-class">Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('forwards additional props to button element', () => {
      render(<Button data-testid="custom-button" id="my-button">Button</Button>);
      
      const button = screen.getByTestId('custom-button');
      expect(button).toHaveAttribute('id', 'my-button');
    });
  });

  describe('Event Handlers', () => {
    it('calls onKeyDown handler', () => {
      const handleKeyDown = jest.fn();
      render(<Button onKeyDown={handleKeyDown}>Button</Button>);
      
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Tab' });
      
      expect(handleKeyDown).toHaveBeenCalled();
    });

    it('prevents default on Space key', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Button</Button>);
      
      const button = screen.getByRole('button');
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      Object.defineProperty(event, 'preventDefault', {
        value: jest.fn()
      });
      
      button.dispatchEvent(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });
});
