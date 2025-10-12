import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import './ErrorFallback.css';

/**
 * Enhanced Error Fallback Component
 * 
 * Provides a user-friendly error display with recovery options.
 * Can be used with Error Boundaries or as a standalone error display.
 * 
 * @component
 */
class ErrorFallback extends Component {
  render() {
    const { error, errorInfo, resetError, variant = 'full' } = this.props;

    if (variant === 'inline') {
      return (
        <Alert
          severity="error"
          className="error-fallback--inline"
          icon={<ErrorOutlineIcon />}
          action={
            resetError && (
              <Button color="inherit" size="small" onClick={resetError}>
                Retry
              </Button>
            )
          }
        >
          {error?.message || 'An error occurred'}
        </Alert>
      );
    }

    return (
      <Box className="error-fallback" data-testid="error-fallback">
        <Paper className="error-fallback__container" elevation={3}>
          <ErrorOutlineIcon className="error-fallback__icon" color="error" />
          
          <Typography variant="h5" className="error-fallback__title">
            Oops! Something went wrong
          </Typography>

          <Typography variant="body1" className="error-fallback__message" color="text.secondary">
            {error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
          </Typography>

          {process.env.NODE_ENV === 'development' && errorInfo && (
            <Paper className="error-fallback__details" variant="outlined">
              <Typography variant="subtitle2" gutterBottom>
                Error Details (Development Mode)
              </Typography>
              <pre className="error-fallback__stack">
                {error?.stack}
                {errorInfo?.componentStack}
              </pre>
            </Paper>
          )}

          <Box className="error-fallback__actions">
            {resetError && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={resetError}
                className="error-fallback__button"
              >
                Try Again
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
              className="error-fallback__button"
            >
              Refresh Page
            </Button>
            <Button
              variant="text"
              onClick={() => window.location.href = '/'}
              className="error-fallback__button"
            >
              Go Home
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }
}

ErrorFallback.propTypes = {
  /** The error object */
  error: PropTypes.object,
  /** Additional error information */
  errorInfo: PropTypes.object,
  /** Function to reset the error state */
  resetError: PropTypes.func,
  /** Display variant */
  variant: PropTypes.oneOf(['full', 'inline']),
};

/**
 * Enhanced Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree and
 * displays a fallback UI.
 * 
 * @component
 * @example
 * <EnhancedErrorBoundary fallbackComponent={ErrorFallback}>
 *   <YourComponent />
 * </EnhancedErrorBoundary>
 */
export class EnhancedErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // Log to error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service (e.g., Sentry)
      console.error('Production error:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallbackComponent: FallbackComponent = ErrorFallback } = this.props;

    if (hasError) {
      return (
        <FallbackComponent
          error={error}
          errorInfo={errorInfo}
          resetError={this.resetError}
        />
      );
    }

    return children;
  }
}

EnhancedErrorBoundary.propTypes = {
  /** Child components to render */
  children: PropTypes.node.isRequired,
  /** Custom fallback component to render on error */
  fallbackComponent: PropTypes.elementType,
};

export default ErrorFallback;
