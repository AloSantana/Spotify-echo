/**
 * @ai-generated AWS Bedrock Claude Sonnet 4.5 (anthropic.claude-sonnet-4-20250514-v1:0)
 * @region us-east-1
 * @purpose Accessibility utilities for WCAG 2.1 AA compliance
 * 
 * Comprehensive accessibility utilities for EchoTune AI frontend
 * Implements WCAG 2.1 Level AA compliance standards
 * 
 * Features:
 * - ARIA attribute generators
 * - Keyboard navigation utilities
 * - Focus management
 * - Screen reader announcements
 * - Color contrast validation
 * - Accessible form helpers
 */

/**
 * Generate ARIA attributes for interactive elements
 * @param {Object} options - Configuration options
 * @returns {Object} ARIA attributes object
 */
export const generateAriaAttributes = (options = {}) => {
  const {
    role,
    label,
    labelledBy,
    describedBy,
    expanded,
    pressed,
    selected,
    controls,
    owns,
    hasPopup,
    live,
    atomic,
    relevant,
    busy,
    hidden,
    disabled,
    invalid,
    required,
    checked,
    current,
    level,
    valueNow,
    valueMin,
    valueMax,
    valueText
  } = options;

  const attrs = {};

  // Core ARIA attributes
  if (role) attrs.role = role;
  if (label) attrs['aria-label'] = label;
  if (labelledBy) attrs['aria-labelledby'] = labelledBy;
  if (describedBy) attrs['aria-describedby'] = describedBy;

  // State attributes
  if (typeof expanded === 'boolean') attrs['aria-expanded'] = expanded;
  if (typeof pressed === 'boolean') attrs['aria-pressed'] = pressed;
  if (typeof selected === 'boolean') attrs['aria-selected'] = selected;
  if (typeof hidden === 'boolean') attrs['aria-hidden'] = hidden;
  if (typeof disabled === 'boolean') attrs['aria-disabled'] = disabled;
  if (typeof invalid === 'boolean') attrs['aria-invalid'] = invalid;
  if (typeof required === 'boolean') attrs['aria-required'] = required;
  if (typeof checked === 'boolean') attrs['aria-checked'] = checked;
  if (typeof busy === 'boolean') attrs['aria-busy'] = busy;
  if (typeof atomic === 'boolean') attrs['aria-atomic'] = atomic;

  // Relationship attributes
  if (controls) attrs['aria-controls'] = controls;
  if (owns) attrs['aria-owns'] = owns;

  // Widget attributes
  if (hasPopup) attrs['aria-haspopup'] = hasPopup;
  if (current) attrs['aria-current'] = current;
  if (level) attrs['aria-level'] = level;

  // Live region attributes
  if (live) attrs['aria-live'] = live;
  if (relevant) attrs['aria-relevant'] = relevant;

  // Value attributes
  if (typeof valueNow === 'number') attrs['aria-valuenow'] = valueNow;
  if (typeof valueMin === 'number') attrs['aria-valuemin'] = valueMin;
  if (typeof valueMax === 'number') attrs['aria-valuemax'] = valueMax;
  if (valueText) attrs['aria-valuetext'] = valueText;

  return attrs;
};

/**
 * Create keyboard navigation handler
 * @param {Object} options - Navigation options
 * @returns {Function} Keyboard event handler
 */
export const createKeyboardNavigationHandler = (options = {}) => {
  const {
    onEnter,
    onSpace,
    onEscape,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    onHome,
    onEnd,
    preventDefault = true
  } = options;

  return (event) => {
    const { key, shiftKey } = event;

    const handlers = {
      'Enter': onEnter,
      ' ': onSpace,
      'Escape': onEscape,
      'ArrowUp': onArrowUp,
      'ArrowDown': onArrowDown,
      'ArrowLeft': onArrowLeft,
      'ArrowRight': onArrowRight,
      'Tab': onTab,
      'Home': onHome,
      'End': onEnd
    };

    const handler = handlers[key];
    if (handler) {
      if (preventDefault) {
        event.preventDefault();
      }
      handler(event, { shiftKey });
    }
  };
};

/**
 * Focus management utility
 */
export class FocusManager {
  constructor() {
    this.focusStack = [];
  }

  /**
   * Save current focus and move to new element
   * @param {HTMLElement} element - Element to focus
   */
  pushFocus(element) {
    if (document.activeElement) {
      this.focusStack.push(document.activeElement);
    }
    if (element && element.focus) {
      element.focus();
    }
  }

  /**
   * Restore previous focus
   */
  popFocus() {
    const element = this.focusStack.pop();
    if (element && element.focus) {
      element.focus();
    }
  }

  /**
   * Trap focus within container
   * @param {HTMLElement} container - Container element
   */
  trapFocus(container) {
    if (!container) return null;

    const focusableSelectors = [
      'a[href]',
      'area[href]',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'button:not([disabled])',
      'iframe',
      'object',
      'embed',
      '[contenteditable]',
      '[tabindex]:not([tabindex^="-"])'
    ].join(',');

    const focusableElements = container.querySelectorAll(focusableSelectors);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Focus first element
    if (firstElement) {
      firstElement.focus();
    }

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }
}

/**
 * Screen reader announcement utility
 */
export class ScreenReaderAnnouncer {
  constructor() {
    this.liveRegion = null;
    this.initialize();
  }

  /**
   * Initialize live region for announcements
   */
  initialize() {
    if (typeof document === 'undefined') return;

    // Check if live region already exists
    this.liveRegion = document.getElementById('sr-live-region');
    
    if (!this.liveRegion) {
      this.liveRegion = document.createElement('div');
      this.liveRegion.id = 'sr-live-region';
      this.liveRegion.setAttribute('role', 'status');
      this.liveRegion.setAttribute('aria-live', 'polite');
      this.liveRegion.setAttribute('aria-atomic', 'true');
      this.liveRegion.style.position = 'absolute';
      this.liveRegion.style.left = '-10000px';
      this.liveRegion.style.width = '1px';
      this.liveRegion.style.height = '1px';
      this.liveRegion.style.overflow = 'hidden';
      document.body.appendChild(this.liveRegion);
    }
  }

  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {string} priority - 'polite' or 'assertive'
   */
  announce(message, priority = 'polite') {
    if (!this.liveRegion) {
      this.initialize();
    }

    if (this.liveRegion) {
      this.liveRegion.setAttribute('aria-live', priority);
      this.liveRegion.textContent = '';
      
      // Small delay to ensure screen readers pick up the change
      setTimeout(() => {
        this.liveRegion.textContent = message;
      }, 100);
    }
  }

  /**
   * Clear live region
   */
  clear() {
    if (this.liveRegion) {
      this.liveRegion.textContent = '';
    }
  }
}

/**
 * Validate color contrast ratio
 * @param {string} foreground - Foreground color (hex)
 * @param {string} background - Background color (hex)
 * @returns {Object} Contrast information
 */
export const validateColorContrast = (foreground, background) => {
  // Convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Calculate relative luminance
  const getLuminance = (rgb) => {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
      const v = val / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const fgRgb = hexToRgb(foreground);
  const bgRgb = hexToRgb(background);

  if (!fgRgb || !bgRgb) {
    return { valid: false, error: 'Invalid color format' };
  }

  const fgLuminance = getLuminance(fgRgb);
  const bgLuminance = getLuminance(bgRgb);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  const ratio = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio: ratio.toFixed(2),
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7,
    passesAALarge: ratio >= 3,
    passesAAALarge: ratio >= 4.5
  };
};

/**
 * Create accessible form field attributes
 * @param {Object} options - Field options
 * @returns {Object} Accessible field attributes
 */
export const createAccessibleFieldAttributes = (options = {}) => {
  const {
    id,
    label,
    error,
    required,
    disabled,
    helpText,
    autoComplete,
    type = 'text'
  } = options;

  const attrs = {
    id,
    type,
    'aria-label': label,
    'aria-required': required,
    'aria-disabled': disabled,
    'aria-invalid': !!error
  };

  if (error) {
    attrs['aria-describedby'] = `${id}-error`;
  } else if (helpText) {
    attrs['aria-describedby'] = `${id}-help`;
  }

  if (autoComplete) {
    attrs.autoComplete = autoComplete;
  }

  return attrs;
};

// Export singleton instances
export const focusManager = new FocusManager();
export const screenReader = new ScreenReaderAnnouncer();

// Initialize on module load
if (typeof window !== 'undefined') {
  screenReader.initialize();
}

export default {
  generateAriaAttributes,
  createKeyboardNavigationHandler,
  FocusManager,
  ScreenReaderAnnouncer,
  validateColorContrast,
  createAccessibleFieldAttributes,
  focusManager,
  screenReader
};
