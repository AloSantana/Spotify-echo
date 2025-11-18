/**
 * Toast Container Component
 * 
 * Renders all active toast notifications
 * Positioned fixed at the top-right of the screen
 */

import React from 'react';
import { useToast, TOAST_ICONS, TOAST_COLORS } from '../contexts/ToastContext.jsx';

// Individual Toast Component
function Toast({ toast, onClose, onPause, onResume }) {
  const colors = TOAST_COLORS[toast.type];
  const icon = TOAST_ICONS[toast.type];

  return (
    <div
      className="toast"
      onMouseEnter={() => onPause(toast.id)}
      onMouseLeave={() => onResume(toast.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        minWidth: '300px',
        maxWidth: '500px',
        padding: '12px 16px',
        marginBottom: '10px',
        backgroundColor: colors.background,
        color: colors.text,
        borderLeft: `4px solid ${colors.border}`,
        borderRadius: '4px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        animation: 'slideIn 0.3s ease-out',
        transition: 'all 0.3s ease-out',
      }}
    >
      {/* Icon */}
      <span
        style={{
          fontSize: '20px',
          marginRight: '12px',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>

      {/* Content */}
      <div style={{ flex: 1, marginRight: '12px' }}>
        <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
          {toast.message}
        </div>
        
        {/* Optional action button */}
        {toast.action && toast.onAction && (
          <button
            onClick={() => {
              toast.onAction();
              onClose(toast.id);
            }}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: colors.text,
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '3px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            {toast.action}
          </button>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={() => onClose(toast.id)}
        style={{
          padding: '0',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          color: colors.text,
          border: 'none',
          borderRadius: '3px',
          fontSize: '18px',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'transparent';
        }}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}

// Toast Container Component
export function ToastContainer() {
  const { toasts, removeToast, pauseToast, resumeToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <>
      {/* Global styles for animations */}
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          @keyframes slideOut {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(100%);
              opacity: 0;
            }
          }
          
          .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            pointer-events: none;
          }
          
          .toast-container > * {
            pointer-events: auto;
          }
          
          /* Responsive design */
          @media (max-width: 640px) {
            .toast-container {
              left: 20px;
              right: 20px;
            }
            
            .toast {
              max-width: 100% !important;
            }
          }
        `}
      </style>

      {/* Toast container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onClose={removeToast}
            onPause={pauseToast}
            onResume={resumeToast}
          />
        ))}
      </div>
    </>
  );
}

// Export default for easy import
export default ToastContainer;
