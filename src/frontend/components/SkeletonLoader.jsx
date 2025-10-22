/**
 * Skeleton Loader Component
 * 
 * Provides loading placeholders with shimmer animation
 * Can be configured for different content types
 */

import React from 'react';

// Base skeleton component
export function Skeleton({ 
  width = '100%', 
  height = '20px', 
  borderRadius = '4px',
  className = '',
  style = {},
  variant = 'default' // 'default', 'text', 'circular', 'rectangular'
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'text':
        return {
          height: height || '16px',
          borderRadius: '3px',
          marginBottom: '4px',
        };
      case 'circular':
        return {
          borderRadius: '50%',
          width: width || '40px',
          height: height || '40px',
        };
      case 'rectangular':
        return {
          borderRadius: '8px',
        };
      default:
        return {};
    }
  };

  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-loading 1.5s infinite',
        ...getVariantStyles(),
        ...style,
      }}
    />
  );
}

// Text skeleton (multiple lines)
export function SkeletonText({ lines = 3, spacing = 8, lastLineWidth = '70%' }) {
  return (
    <div className="skeleton-text">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? lastLineWidth : '100%'}
          style={{ marginBottom: index < lines - 1 ? `${spacing}px` : 0 }}
        />
      ))}
    </div>
  );
}

// Card skeleton
export function SkeletonCard({ 
  showAvatar = true, 
  showActions = false,
  imageHeight = '200px' 
}) {
  return (
    <div className="skeleton-card" style={{
      padding: '16px',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: '#fff',
    }}>
      {/* Header with avatar */}
      {showAvatar && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <Skeleton variant="circular" width="40px" height="40px" />
          <div style={{ marginLeft: '12px', flex: 1 }}>
            <Skeleton width="150px" height="16px" style={{ marginBottom: '4px' }} />
            <Skeleton width="100px" height="14px" />
          </div>
        </div>
      )}
      
      {/* Image placeholder */}
      {imageHeight && (
        <Skeleton 
          variant="rectangular" 
          height={imageHeight} 
          style={{ marginBottom: '16px' }} 
        />
      )}
      
      {/* Content */}
      <SkeletonText lines={3} />
      
      {/* Actions */}
      {showActions && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <Skeleton width="80px" height="32px" borderRadius="4px" />
          <Skeleton width="80px" height="32px" borderRadius="4px" />
        </div>
      )}
    </div>
  );
}

// List skeleton
export function SkeletonList({ 
  items = 5, 
  showIcon = false,
  showSecondaryText = true 
}) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: items }).map((_, index) => (
        <div 
          key={index} 
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: index < items - 1 ? '1px solid #f0f0f0' : 'none',
          }}
        >
          {showIcon && (
            <Skeleton 
              variant="circular" 
              width="32px" 
              height="32px" 
              style={{ marginRight: '12px' }} 
            />
          )}
          <div style={{ flex: 1 }}>
            <Skeleton width="60%" height="16px" style={{ marginBottom: '4px' }} />
            {showSecondaryText && (
              <Skeleton width="40%" height="14px" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Table skeleton
export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div className="skeleton-table">
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '16px',
        padding: '12px',
        borderBottom: '2px solid #e0e0e0',
      }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} height="16px" width="80%" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: '16px',
            padding: '12px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              height="14px" 
              width={colIndex === 0 ? '90%' : '70%'} 
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Track/Music item skeleton
export function SkeletonTrack() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
    }}>
      {/* Album art */}
      <Skeleton 
        variant="rectangular" 
        width="48px" 
        height="48px" 
        borderRadius="4px"
        style={{ marginRight: '12px' }}
      />
      
      {/* Track info */}
      <div style={{ flex: 1 }}>
        <Skeleton width="60%" height="16px" style={{ marginBottom: '4px' }} />
        <Skeleton width="40%" height="14px" />
      </div>
      
      {/* Duration */}
      <Skeleton width="40px" height="14px" />
    </div>
  );
}

// Form skeleton
export function SkeletonForm({ fields = 4, showButtons = true }) {
  return (
    <div className="skeleton-form">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} style={{ marginBottom: '20px' }}>
          <Skeleton width="100px" height="14px" style={{ marginBottom: '8px' }} />
          <Skeleton height="40px" borderRadius="4px" />
        </div>
      ))}
      
      {showButtons && (
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <Skeleton width="100px" height="36px" borderRadius="4px" />
          <Skeleton width="100px" height="36px" borderRadius="4px" />
        </div>
      )}
    </div>
  );
}

// Container with CSS animation
export function SkeletonContainer({ children }) {
  return (
    <>
      <style>
        {`
          @keyframes skeleton-loading {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
          
          .skeleton-container {
            width: 100%;
          }
          
          /* Responsive skeleton adjustments */
          @media (max-width: 640px) {
            .skeleton-card {
              padding: 12px !important;
            }
            
            .skeleton-list > div {
              padding: 8px 0 !important;
            }
          }
        `}
      </style>
      <div className="skeleton-container">
        {children}
      </div>
    </>
  );
}

// Export all skeleton components
export default {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonList,
  SkeletonTable,
  SkeletonTrack,
  SkeletonForm,
  SkeletonContainer,
};
