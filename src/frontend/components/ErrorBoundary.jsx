f;/**
 * Error Boundary Component
 * 
 * Features:
 * - Catch React errors in component tree
 * - Display fallback UI with error details
 * - Error reporting capability
 * - Recovery options for users
 * - Development vs production error display
 * 
 * @module frontend/components/ErrorBoundary
 */

import React from 'react';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
    
    // Bind methods
    this.handleReset = this.handleReset.bind(this);
    this.handleReload = this.handleReload.bind(this);
    this.handleGoHome = this.handleGoHome.bind(this);
  }

  /**
   * Update state when error is caught
   */
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  /**
   * Log error details
   */
  componentDidCatch(error, errorInfo) {
    // Log error to console
    console.error('Error caught by boundary:', error, errorInfo);

    // Update state with error info
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error to error tracking service
    this.reportError(error, errorInfo);
  }

  /**
   * Report error to tracking service
   */
  reportError(error, errorInfo) {
    try {
      // In production, send to error tracking service
      if (process.env.NODE_ENV === 'production') {
        // Example: Sentry, LogRocket, etc.
        // Sentry.captureException(error, { extra: errorInfo });
        
        // For now, just log
        console.error('Error reported:', {
          error: error.toString(),
          componentStack: errorInfo?.componentStack,
          timestamp: new Date().toISOString()
        });
      }
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  }

  /**
   * Reset error boundary state
   */
  handleReset() {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Call custom reset handler if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  /**
   * Reload the page
   */
  handleReload() {
    window.location.reload();
  }

  /**
   * Go back to home
   */
  handleGoHome() {
    window.location.href = '/';
  }

  /**
   * Render fallback UI
   */
  renderFallback() {
    const { error, errorInfo, errorCount } = this.state;
    const { fallback, showDetails = process.env.NODE_ENV === 'development' } = this.props;

    // Use custom fallback if provided
    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback({
          error,
          errorInfo,
          resetError: this.handleReset,
          errorCount
        });
      }
      return fallback;
    }

    // Default fallback UI
    return (
      <div style={styles.container}>
        <div style={styles.content}>
          {/* Error Icon */}
          <div style={styles.iconContainer}>
            <svg
              style={styles.icon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Error Message */}
          <h1 style={styles.title}>Something went wrong</h1>
          <p style={styles.message}>
            {errorCount > 1
              ? `This error has occurred ${errorCount} times. `
              : ''}
            {error?.message || 'An unexpected error occurred'}
          </p>

          {/* Error Details (Development only) */}
          {showDetails && errorInfo && (
            <details style={styles.details}>
              <summary style={styles.summary}>Error Details</summary>
              <div style={styles.detailsContent}>
                <h3 style={styles.detailsTitle}>Error Stack:</h3>
                <pre style={styles.stack}>
                  {error?.stack || 'No stack trace available'}
                </pre>
                
                <h3 style={styles.detailsTitle}>Component Stack:</h3>
                <pre style={styles.stack}>
                  {errorInfo.componentStack}
                </pre>
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div style={styles.actions}>
            <button
              onClick={this.handleReset}
              style={{ ...styles.button, ...styles.primaryButton }}
            >
              Try Again
            </button>
            
            <button
              onClick={this.handleReload}
              style={{ ...styles.button, ...styles.secondaryButton }}
            >
              Reload Page
            </button>
            
            <button
              onClick={this.handleGoHome}
              style={{ ...styles.button, ...styles.secondaryButton }}
            >
              Go Home
            </button>
          </div>

          {/* Help Text */}
          <p style={styles.helpText}>
            If the problem persists, please{' '}
            <a href="/support" style={styles.link}>
              contact support
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderFallback();
    }

    return this.props.children;
  }
}

// Styles
const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f7fafc',
    padding: '1rem'
  },
  content: {
    maxWidth: '42rem',
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    padding: '2rem',
    textAlign: 'center'
  },
  iconContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1.5rem'
  },
  icon: {
    width: '4rem',
    height: '4rem',
    color: '#f56565'
  },
  title: {
    fontSize: '1.875rem',
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: '1rem'
  },
  message: {
    fontSize: '1rem',
    color: '#718096',
    marginBottom: '1.5rem',
    lineHeight: '1.5'
  },
  details: {
    marginTop: '1.5rem',
    textAlign: 'left',
    backgroundColor: '#f7fafc',
    borderRadius: '0.375rem',
    padding: '1rem'
  },
  summary: {
    cursor: 'pointer',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '0.5rem'
  },
  detailsContent: {
    marginTop: '1rem'
  },
  detailsTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#4a5568',
    marginTop: '1rem',
    marginBottom: '0.5rem'
  },
  stack: {
    fontSize: '0.75rem',
    backgroundColor: '#2d3748',
    color: '#f7fafc',
    padding: '1rem',
    borderRadius: '0.25rem',
    overflow: 'auto',
    maxHeight: '12rem',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: '1.5rem'
  },
  button: {
    padding: '0.75rem 1.5rem',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
    outline: 'none'
  },
  primaryButton: {
    backgroundColor: '#4299e1',
    color: 'white'
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
    color: '#2d3748'
  },
  helpText: {
    marginTop: '1.5rem',
    fontSize: '0.875rem',
    color: '#718096'
  },
  link: {
    color: '#4299e1',
    textDecoration: 'underline',
    cursor: 'pointer'
  }
};

/**
 * Higher-order component to wrap components with error boundary
 * 
 * @param {React.Component} Component - Component to wrap
 * @param {Object} errorBoundaryProps - Props for ErrorBoundary
 * @returns {React.Component} - Wrapped component
 */
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

export default ErrorBoundary;
