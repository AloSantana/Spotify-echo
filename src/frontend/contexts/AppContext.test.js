import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AppProvider, useAppContext } from './AppContext';
import '@testing-library/jest-dom';

// Mock component to consume the context
const TestConsumer = () => {
  const { state, dispatch } = useAppContext();
  return (
    <div>
      <span data-testid="initialized">{state.isInitialized.toString()}</span>
      <span data-testid="error">{state.globalError}</span>
      <button onClick={() => dispatch({ type: 'SET_INITIALIZED', payload: true })}>
        Initialize
      </button>
      <button onClick={() => dispatch({ type: 'SET_GLOBAL_ERROR', payload: 'Test Error' })}>
        Set Error
      </button>
    </div>
  );
};

describe('AppContext', () => {
  it('should provide initial state', () => {
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>
    );

    expect(screen.getByTestId('initialized')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toBeEmptyDOMElement();
  });

  it('should handle SET_INITIALIZED action', () => {
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>
    );

    act(() => {
      screen.getByText('Initialize').click();
    });

    expect(screen.getByTestId('initialized')).toHaveTextContent('true');
  });

  it('should handle SET_GLOBAL_ERROR action', () => {
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>
    );

    act(() => {
      screen.getByText('Set Error').click();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Test Error');
  });

  it('should throw an error if useAppContext is used outside of AppProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => render(<TestConsumer />)).toThrow(
      'useAppContext must be used within an AppProvider'
    );

    // Restore console.error
    console.error = originalError;
  });
});
