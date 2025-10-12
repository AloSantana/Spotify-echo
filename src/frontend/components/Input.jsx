/**
 * @ai-generated AWS Bedrock Claude Sonnet 4.5 (anthropic.claude-sonnet-4-20250514-v1:0)
 * @region us-east-1
 * @purpose Accessible Input component with WCAG 2.1 AA compliance
 * 
 * Enhanced Input Component
 * 
 * Features:
 * - WCAG 2.1 AA compliant
 * - Full keyboard navigation
 * - ARIA attributes
 * - Error states with accessible messaging
 * - Help text support
 * - Multiple input types
 * - Label association
 * - Character count
 * - Validation states
 */

import React, { forwardRef, useState, useId } from 'react';
import PropTypes from 'prop-types';
import { createAccessibleFieldAttributes, screenReader } from '../utils/accessibility.js';
import bedrockTracker from '../utils/bedrock-attribution.js';
import './Input.css';

/**
 * Enhanced Input component with accessibility features
 * 
 * @example
 * <Input
 *   label="Email address"
 *   type="email"
 *   required
 *   error="Please enter a valid email"
 *   helpText="We'll never share your email"
 * />
 */
const Input = forwardRef(({
  label,
  type = 'text',
  value,
  defaultValue,
  placeholder,
  disabled = false,
  required = false,
  error,
  helpText,
  autoComplete,
  maxLength,
  showCharacterCount = false,
  fullWidth = false,
  size = 'medium',
  startAdornment,
  endAdornment,
  onChange,
  onFocus,
  onBlur,
  className = '',
  ...rest
}, ref) => {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;
  
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue || '');

  // Use controlled or uncontrolled value
  const currentValue = value !== undefined ? value : internalValue;

  // Track component usage with Bedrock
  React.useEffect(() => {
    bedrockTracker.logInteraction({
      type: 'component_rendered',
      component: 'Input',
      inputType: type,
      hasError: !!error,
      required
    });
  }, [type, error, required]);

  // Generate accessible field attributes
  const fieldAttributes = createAccessibleFieldAttributes({
    id: inputId,
    label,
    error,
    required,
    disabled,
    helpText,
    autoComplete,
    type
  });

  // Handle change
  const handleChange = (event) => {
    const newValue = event.target.value;
    
    // Update internal value if uncontrolled
    if (value === undefined) {
      setInternalValue(newValue);
    }
    
    onChange?.(event);
  };

  // Handle focus
  const handleFocus = (event) => {
    setIsFocused(true);
    onFocus?.(event);
  };

  // Handle blur
  const handleBlur = (event) => {
    setIsFocused(false);
    onBlur?.(event);
    
    // Announce validation errors to screen readers
    if (error) {
      screenReader.announce(`Error: ${error}`, 'assertive');
    }
  };

  // Container classes
  const containerClasses = [
    'enhanced-input',
    `enhanced-input--${size}`,
    fullWidth && 'enhanced-input--full-width',
    isFocused && 'enhanced-input--focused',
    error && 'enhanced-input--error',
    disabled && 'enhanced-input--disabled',
    className
  ].filter(Boolean).join(' ');

  // Calculate character count
  const characterCount = currentValue?.length || 0;
  const isOverLimit = maxLength && characterCount > maxLength;

  return (
    <div className={containerClasses}>
      {/* Label */}
      {label && (
        <label htmlFor={inputId} className="enhanced-input__label">
          {label}
          {required && (
            <span className="enhanced-input__required" aria-label="required">
              {' '}*
            </span>
          )}
        </label>
      )}

      {/* Input wrapper */}
      <div className="enhanced-input__wrapper">
        {/* Start adornment */}
        {startAdornment && (
          <span className="enhanced-input__adornment enhanced-input__adornment--start" aria-hidden="true">
            {startAdornment}
          </span>
        )}

        {/* Input element */}
        <input
          ref={ref}
          type={type}
          value={currentValue}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="enhanced-input__field"
          {...fieldAttributes}
          {...rest}
        />

        {/* End adornment */}
        {endAdornment && (
          <span className="enhanced-input__adornment enhanced-input__adornment--end" aria-hidden="true">
            {endAdornment}
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div
          id={errorId}
          className="enhanced-input__error"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      {/* Help text */}
      {helpText && !error && (
        <div id={helpId} className="enhanced-input__help">
          {helpText}
        </div>
      )}

      {/* Character count */}
      {showCharacterCount && maxLength && (
        <div
          className="enhanced-input__count"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className={isOverLimit ? 'enhanced-input__count--over' : ''}>
            {characterCount} / {maxLength}
          </span>
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

Input.propTypes = {
  /** Input label */
  label: PropTypes.string,
  
  /** Input type */
  type: PropTypes.oneOf([
    'text',
    'email',
    'password',
    'tel',
    'url',
    'search',
    'number'
  ]),
  
  /** Controlled value */
  value: PropTypes.string,
  
  /** Default value for uncontrolled */
  defaultValue: PropTypes.string,
  
  /** Placeholder text */
  placeholder: PropTypes.string,
  
  /** Disabled state */
  disabled: PropTypes.bool,
  
  /** Required field */
  required: PropTypes.bool,
  
  /** Error message */
  error: PropTypes.string,
  
  /** Help text */
  helpText: PropTypes.string,
  
  /** Autocomplete attribute */
  autoComplete: PropTypes.string,
  
  /** Maximum character length */
  maxLength: PropTypes.number,
  
  /** Show character count */
  showCharacterCount: PropTypes.bool,
  
  /** Full width input */
  fullWidth: PropTypes.bool,
  
  /** Input size */
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  
  /** Start adornment (icon, text, etc.) */
  startAdornment: PropTypes.node,
  
  /** End adornment (icon, text, etc.) */
  endAdornment: PropTypes.node,
  
  /** Change handler */
  onChange: PropTypes.func,
  
  /** Focus handler */
  onFocus: PropTypes.func,
  
  /** Blur handler */
  onBlur: PropTypes.func,
  
  /** Additional CSS classes */
  className: PropTypes.string
};

export default Input;
