import React from 'react';
import PropTypes from 'prop-types';
import { CircularProgress, Box, Typography } from '@mui/material';
import './LoadingState.css';

/**
 * Reusable Loading State Component
 * 
 * Provides consistent loading indicators across the application with
 * customizable sizes, messages, and layouts.
 * 
 * @component
 * @example
 * // Basic usage
 * <LoadingState />
 * 
 * @example
 * // With custom message
 * <LoadingState message="Loading your playlists..." />
 * 
 * @example
 * // Inline variant
 * <LoadingState size="small" variant="inline" />
 */
const LoadingState = ({
  size = 'medium',
  message = 'Loading...',
  variant = 'centered',
  showSpinner = true,
  className = '',
}) => {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 60,
  };

  const containerClass = `loading-state loading-state--${variant} ${className}`.trim();

  return (
    <Box className={containerClass} data-testid="loading-state">
      {showSpinner && (
        <CircularProgress
          size={sizeMap[size]}
          className="loading-state__spinner"
          aria-label="Loading"
        />
      )}
      {message && (
        <Typography
          className="loading-state__message"
          variant={size === 'small' ? 'body2' : 'body1'}
          color="text.secondary"
        >
          {message}
        </Typography>
      )}
    </Box>
  );
};

LoadingState.propTypes = {
  /** Size of the loading spinner */
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  /** Optional message to display below the spinner */
  message: PropTypes.string,
  /** Layout variant for the loading state */
  variant: PropTypes.oneOf(['centered', 'inline', 'overlay']),
  /** Whether to show the spinner */
  showSpinner: PropTypes.bool,
  /** Additional CSS class names */
  className: PropTypes.string,
};

export default LoadingState;
