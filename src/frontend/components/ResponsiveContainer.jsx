import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import { useResponsive } from '../utils/useResponsive';
import './ResponsiveContainer.css';

/**
 * Responsive Container Component
 * 
 * Provides a consistent, responsive container with automatic padding and
 * layout adjustments based on screen size.
 * 
 * Features:
 * - Automatic padding adjustments for mobile/tablet/desktop
 * - Optional max-width constraints
 * - Flexible layout options (stack on mobile, grid on desktop)
 * - Consistent spacing and responsive design
 * 
 * @component
 * @example
 * // Basic usage
 * <ResponsiveContainer>
 *   <YourContent />
 * </ResponsiveContainer>
 * 
 * @example
 * // With custom max width and centered
 * <ResponsiveContainer maxWidth="lg" centered>
 *   <YourContent />
 * </ResponsiveContainer>
 * 
 * @example
 * // With grid layout that stacks on mobile
 * <ResponsiveContainer layout="grid" columns={3}>
 *   <Card1 />
 *   <Card2 />
 *   <Card3 />
 * </ResponsiveContainer>
 */
const ResponsiveContainer = ({
  children,
  maxWidth = 'xl',
  centered = false,
  layout = 'default',
  columns = 1,
  gap = 'medium',
  padding = 'default',
  className = '',
  ...props
}) => {
  const { isMobile, isTablet } = useResponsive();

  // Max width mapping
  const maxWidthMap = {
    xs: '444px',
    sm: '600px',
    md: '900px',
    lg: '1200px',
    xl: '1536px',
    full: '100%',
  };

  // Gap mapping
  const gapMap = {
    none: 0,
    small: isMobile ? '0.5rem' : '1rem',
    medium: isMobile ? '1rem' : '1.5rem',
    large: isMobile ? '1.5rem' : '2rem',
  };

  // Padding mapping
  const paddingMap = {
    none: 0,
    compact: isMobile ? '0.5rem' : '1rem',
    default: isMobile ? '1rem' : '1.5rem',
    spacious: isMobile ? '1.5rem' : '2.5rem',
  };

  // Determine grid columns based on screen size
  const getGridColumns = () => {
    if (layout !== 'grid') return 1;
    if (isMobile) return 1;
    if (isTablet) return Math.min(2, columns);
    return columns;
  };

  const containerStyles = {
    maxWidth: maxWidthMap[maxWidth] || maxWidth,
    margin: centered ? '0 auto' : undefined,
    padding: paddingMap[padding],
    width: '100%',
  };

  const layoutStyles = {
    default: {
      display: 'flex',
      flexDirection: 'column',
      gap: gapMap[gap],
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: `repeat(${getGridColumns()}, 1fr)`,
      gap: gapMap[gap],
    },
    flex: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: gapMap[gap],
      flexWrap: 'wrap',
    },
  };

  const combinedStyles = {
    ...containerStyles,
    ...layoutStyles[layout],
  };

  return (
    <Box
      className={`responsive-container responsive-container--${layout} ${className}`.trim()}
      sx={combinedStyles}
      data-layout={layout}
      data-mobile={isMobile}
      data-tablet={isTablet}
      {...props}
    >
      {children}
    </Box>
  );
};

ResponsiveContainer.propTypes = {
  /** Child components to render */
  children: PropTypes.node.isRequired,
  /** Maximum width of the container */
  maxWidth: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl', 'full']),
  /** Whether to center the container horizontally */
  centered: PropTypes.bool,
  /** Layout mode for children */
  layout: PropTypes.oneOf(['default', 'grid', 'flex']),
  /** Number of columns for grid layout (auto-adjusts for mobile/tablet) */
  columns: PropTypes.number,
  /** Gap between children */
  gap: PropTypes.oneOf(['none', 'small', 'medium', 'large']),
  /** Container padding */
  padding: PropTypes.oneOf(['none', 'compact', 'default', 'spacious']),
  /** Additional CSS class names */
  className: PropTypes.string,
};

export default ResponsiveContainer;
