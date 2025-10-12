/**
 * Sample tests for LoadingState component
 * 
 * These tests demonstrate how to test the new UI components.
 * Run with: npm test -- LoadingState.test.js
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingState from '../src/frontend/components/LoadingState';

describe('LoadingState Component', () => {
  describe('Basic Rendering', () => {
    test('renders loading state with default props', () => {
      render(<LoadingState />);
      
      const loadingElement = screen.getByTestId('loading-state');
      expect(loadingElement).toBeInTheDocument();
      expect(loadingElement).toHaveClass('loading-state--centered');
    });

    test('renders with custom message', () => {
      const message = 'Loading your playlists...';
      render(<LoadingState message={message} />);
      
      expect(screen.getByText(message)).toBeInTheDocument();
    });

    test('renders spinner by default', () => {
      render(<LoadingState />);
      
      const spinner = screen.getByRole('progressbar', { hidden: true });
      expect(spinner).toBeInTheDocument();
    });

    test('hides spinner when showSpinner is false', () => {
      render(<LoadingState showSpinner={false} message="Loading..." />);
      
      const spinner = screen.queryByRole('progressbar', { hidden: true });
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    test('renders centered variant by default', () => {
      render(<LoadingState />);
      
      const loadingElement = screen.getByTestId('loading-state');
      expect(loadingElement).toHaveClass('loading-state--centered');
    });

    test('renders inline variant', () => {
      render(<LoadingState variant="inline" />);
      
      const loadingElement = screen.getByTestId('loading-state');
      expect(loadingElement).toHaveClass('loading-state--inline');
    });

    test('renders overlay variant', () => {
      render(<LoadingState variant="overlay" />);
      
      const loadingElement = screen.getByTestId('loading-state');
      expect(loadingElement).toHaveClass('loading-state--overlay');
    });
  });

  describe('Sizes', () => {
    test('renders with small size', () => {
      render(<LoadingState size="small" />);
      
      const spinner = screen.getByRole('progressbar', { hidden: true });
      // Material-UI CircularProgress component should receive size prop
      expect(spinner).toBeInTheDocument();
    });

    test('renders with medium size (default)', () => {
      render(<LoadingState />);
      
      const spinner = screen.getByRole('progressbar', { hidden: true });
      expect(spinner).toBeInTheDocument();
    });

    test('renders with large size', () => {
      render(<LoadingState size="large" />);
      
      const spinner = screen.getByRole('progressbar', { hidden: true });
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA label for spinner', () => {
      render(<LoadingState />);
      
      const spinner = screen.getByLabelText('Loading');
      expect(spinner).toBeInTheDocument();
    });

    test('message is properly associated with loading state', () => {
      const message = 'Loading your data...';
      render(<LoadingState message={message} />);
      
      expect(screen.getByText(message)).toBeInTheDocument();
    });
  });

  describe('Custom Classes', () => {
    test('applies custom className', () => {
      render(<LoadingState className="custom-class" />);
      
      const loadingElement = screen.getByTestId('loading-state');
      expect(loadingElement).toHaveClass('custom-class');
    });

    test('preserves built-in classes when custom className is provided', () => {
      render(<LoadingState className="custom-class" variant="centered" />);
      
      const loadingElement = screen.getByTestId('loading-state');
      expect(loadingElement).toHaveClass('custom-class');
      expect(loadingElement).toHaveClass('loading-state--centered');
    });
  });
});

/**
 * Integration Tests
 */
describe('LoadingState Integration', () => {
  test('works in Suspense fallback', () => {
    const TestComponent = () => (
      <React.Suspense fallback={<LoadingState message="Loading component..." />}>
        <div>Content</div>
      </React.Suspense>
    );

    render(<TestComponent />);
    // The content should render immediately in tests since there's no actual lazy loading
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  test('can be used in conditional rendering', () => {
    const TestComponent = ({ loading }) => (
      <>
        {loading ? (
          <LoadingState message="Loading..." />
        ) : (
          <div>Content loaded</div>
        )}
      </>
    );

    const { rerender } = render(<TestComponent loading={true} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    rerender(<TestComponent loading={false} />);
    expect(screen.getByText('Content loaded')).toBeInTheDocument();
  });
});
