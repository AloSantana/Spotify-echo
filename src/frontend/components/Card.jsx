/**
 * @ai-generated AWS Bedrock Claude Sonnet 4.5 (anthropic.claude-sonnet-4-20250514-v1:0)
 * @region us-east-1
 * @purpose Accessible Card component with WCAG 2.1 AA compliance
 * 
 * Enhanced Card Component
 * 
 * Features:
 * - WCAG 2.1 AA compliant
 * - Semantic HTML structure
 * - Flexible layout
 * - Interactive variants
 * - Focus management
 * - Hover states
 * - Multiple variants
 */

import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { generateAriaAttributes } from '../utils/accessibility.js';
import bedrockTracker from '../utils/bedrock-attribution.js';
import './Card.css';

/**
 * Enhanced Card component with accessibility features
 * 
 * @example
 * <Card
 *   variant="elevated"
 *   interactive
 *   onClick={handleClick}
 *   ariaLabel="Song recommendation card"
 * >
 *   <Card.Header>
 *     <h3>Amazing Song</h3>
 *   </Card.Header>
 *   <Card.Content>
 *     <p>Artist Name</p>
 *   </Card.Content>
 *   <Card.Actions>
 *     <Button>Play</Button>
 *   </Card.Actions>
 * </Card>
 */
const Card = forwardRef(({
  children,
  variant = 'elevated',
  interactive = false,
  fullWidth = false,
  onClick,
  onKeyDown,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  role,
  className = '',
  ...rest
}, ref) => {
  // Track component usage with Bedrock
  React.useEffect(() => {
    bedrockTracker.logInteraction({
      type: 'component_rendered',
      component: 'Card',
      variant,
      interactive
    });
  }, [variant, interactive]);

  // Determine if card should be interactive
  const isInteractive = interactive || onClick;

  // Generate ARIA attributes
  const ariaAttributes = generateAriaAttributes({
    label: ariaLabel,
    labelledBy: ariaLabelledBy,
    describedBy: ariaDescribedBy,
    role: role || (isInteractive ? 'button' : undefined)
  });

  // Combine class names
  const cardClasses = [
    'enhanced-card',
    `enhanced-card--${variant}`,
    isInteractive && 'enhanced-card--interactive',
    fullWidth && 'enhanced-card--full-width',
    className
  ].filter(Boolean).join(' ');

  // Handle click
  const handleClick = (event) => {
    if (isInteractive && onClick) {
      onClick(event);
    }
  };

  // Handle keyboard
  const handleKeyDown = (event) => {
    if (isInteractive) {
      // Space and Enter should trigger interactive cards
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        onClick?.(event);
      }
    }
    
    onKeyDown?.(event);
  };

  const cardProps = {
    ref,
    className: cardClasses,
    ...ariaAttributes,
    ...rest
  };

  // Add interactive props if needed
  if (isInteractive) {
    cardProps.onClick = handleClick;
    cardProps.onKeyDown = handleKeyDown;
    cardProps.tabIndex = 0;
  }

  return <div {...cardProps}>{children}</div>;
});

Card.displayName = 'Card';

/**
 * Card Header subcomponent
 */
const CardHeader = ({ children, className = '', ...rest }) => (
  <div className={`enhanced-card__header ${className}`} {...rest}>
    {children}
  </div>
);

CardHeader.displayName = 'Card.Header';

CardHeader.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

/**
 * Card Content subcomponent
 */
const CardContent = ({ children, className = '', ...rest }) => (
  <div className={`enhanced-card__content ${className}`} {...rest}>
    {children}
  </div>
);

CardContent.displayName = 'Card.Content';

CardContent.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

/**
 * Card Actions subcomponent
 */
const CardActions = ({ children, align = 'right', className = '', ...rest }) => (
  <div 
    className={`enhanced-card__actions enhanced-card__actions--${align} ${className}`}
    {...rest}
  >
    {children}
  </div>
);

CardActions.displayName = 'Card.Actions';

CardActions.propTypes = {
  children: PropTypes.node.isRequired,
  align: PropTypes.oneOf(['left', 'center', 'right', 'space-between']),
  className: PropTypes.string
};

/**
 * Card Media subcomponent
 */
const CardMedia = ({ 
  src, 
  alt, 
  aspectRatio = '16/9',
  objectFit = 'cover',
  className = '',
  ...rest 
}) => (
  <div 
    className={`enhanced-card__media ${className}`}
    style={{ aspectRatio }}
    {...rest}
  >
    <img 
      src={src} 
      alt={alt}
      style={{ objectFit }}
      loading="lazy"
    />
  </div>
);

CardMedia.displayName = 'Card.Media';

CardMedia.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  aspectRatio: PropTypes.string,
  objectFit: PropTypes.oneOf(['cover', 'contain', 'fill', 'none', 'scale-down']),
  className: PropTypes.string
};

// Attach subcomponents
Card.Header = CardHeader;
Card.Content = CardContent;
Card.Actions = CardActions;
Card.Media = CardMedia;

Card.propTypes = {
  /** Card content */
  children: PropTypes.node.isRequired,
  
  /** Visual variant */
  variant: PropTypes.oneOf(['flat', 'elevated', 'outlined']),
  
  /** Interactive card (clickable) */
  interactive: PropTypes.bool,
  
  /** Full width card */
  fullWidth: PropTypes.bool,
  
  /** Click handler */
  onClick: PropTypes.func,
  
  /** Keyboard event handler */
  onKeyDown: PropTypes.func,
  
  /** ARIA label for accessibility */
  ariaLabel: PropTypes.string,
  
  /** ARIA labelled-by ID */
  ariaLabelledBy: PropTypes.string,
  
  /** ARIA described-by ID */
  ariaDescribedBy: PropTypes.string,
  
  /** ARIA role */
  role: PropTypes.string,
  
  /** Additional CSS classes */
  className: PropTypes.string
};

export default Card;
