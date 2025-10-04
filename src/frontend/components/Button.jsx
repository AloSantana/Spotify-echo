/**
 * @ai-generated AWS Bedrock Claude Sonnet 4.5 (anthropic.claude-sonnet-4-20250514-v1:0)
 * @region us-east-1
 * @purpose Modern, accessible Button component with WCAG 2.1 AA compliance
 * 
 * Enhanced Button Component
 * 
 * Features:
 * - WCAG 2.1 AA compliant
 * - Full keyboard navigation
 * - ARIA attributes
 * - Loading states
 * - Icon support
 * - Multiple variants and sizes
 * - Focus management
 * - Screen reader support
 */

import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { CircularProgress } from '@mui/material';
import { generateAriaAttributes } from '../utils/accessibility.js';
import bedrockTracker from '../utils/bedrock-attribution.js';
import './Button.css';

/**
 * Enhanced Button component with accessibility features
 * 
 * @example
 * <Button 
 *   variant="primary"
 *   size="medium"
 *   onClick={handleClick}
 *   ariaLabel="Save changes"
 * >
 *   Save
 * </Button>
 */
const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
  onClick,
  onKeyDown,
  startIcon,
  endIcon,
  ariaLabel,
  ariaDescribedBy,
  ariaExpanded,
  ariaPressed,
  ariaControls,
  className = '',
  ...rest
}, ref) => {
  // Track component usage with Bedrock
  React.useEffect(() => {
    bedrockTracker.logInteraction({
      type: 'component_rendered',
      component: 'Button',
      variant,
      size,
      hasIcons: !!(startIcon || endIcon)
    });
  }, [variant, size, startIcon, endIcon]);

  // Generate ARIA attributes
  const ariaAttributes = generateAriaAttributes({
    label: ariaLabel,
    describedBy: ariaDescribedBy,
    expanded: ariaExpanded,
    pressed: ariaPressed,
    controls: ariaControls,
    disabled: disabled || loading,
    busy: loading
  });

  // Combine class names
  const buttonClasses = [
    'enhanced-button',
    `enhanced-button--${variant}`,
    `enhanced-button--${size}`,
    fullWidth && 'enhanced-button--full-width',
    disabled && 'enhanced-button--disabled',
    loading && 'enhanced-button--loading',
    className
  ].filter(Boolean).join(' ');

  // Handle click
  const handleClick = (event) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  // Handle keyboard
  const handleKeyDown = (event) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    
    // Space and Enter should trigger button
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onClick?.(event);
    }
    
    onKeyDown?.(event);
  };

  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled || loading}
      {...ariaAttributes}
      {...rest}
    >
      {loading && (
        <span className="enhanced-button__loading" aria-hidden="true">
          <CircularProgress size={size === 'small' ? 16 : size === 'large' ? 24 : 20} />
        </span>
      )}
      
      {!loading && startIcon && (
        <span className="enhanced-button__icon enhanced-button__icon--start" aria-hidden="true">
          {startIcon}
        </span>
      )}
      
      <span className="enhanced-button__text">
        {children}
      </span>
      
      {!loading && endIcon && (
        <span className="enhanced-button__icon enhanced-button__icon--end" aria-hidden="true">
          {endIcon}
        </span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

Button.propTypes = {
  /** Button content */
  children: PropTypes.node.isRequired,
  
  /** Visual variant */
  variant: PropTypes.oneOf([
    'primary',
    'secondary',
    'outlined',
    'text',
    'danger',
    'success'
  ]),
  
  /** Button size */
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  
  /** Disabled state */
  disabled: PropTypes.bool,
  
  /** Loading state */
  loading: PropTypes.bool,
  
  /** Full width button */
  fullWidth: PropTypes.bool,
  
  /** Button type */
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  
  /** Click handler */
  onClick: PropTypes.func,
  
  /** Keyboard event handler */
  onKeyDown: PropTypes.func,
  
  /** Icon at start of button */
  startIcon: PropTypes.node,
  
  /** Icon at end of button */
  endIcon: PropTypes.node,
  
  /** ARIA label for accessibility */
  ariaLabel: PropTypes.string,
  
  /** ARIA described-by ID */
  ariaDescribedBy: PropTypes.string,
  
  /** ARIA expanded state */
  ariaExpanded: PropTypes.bool,
  
  /** ARIA pressed state */
  ariaPressed: PropTypes.bool,
  
  /** ARIA controls ID */
  ariaControls: PropTypes.string,
  
  /** Additional CSS classes */
  className: PropTypes.string
};

export default Button;
