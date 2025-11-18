/**
 * Material-UI Theme Configuration
 * 
 * This theme configuration aligns Material-UI with EchoTune AI's existing design tokens
 * and ensures consistency across all components while maintaining the Spotify-inspired aesthetic.
 * 
 * Design Tokens sourced from existing CSS variables in:
 * - public/index.html
 * - src/frontend/components/*.css
 */

import { createTheme } from '@mui/material/styles';

/**
 * EchoTune AI Brand Colors
 * Based on existing design system
 */
const brandColors = {
  // Primary - Spotify Green
  primary: {
    main: '#1db954',
    light: '#1ed760',
    dark: '#1aa34a',
    contrastText: '#ffffff',
  },
  
  // Secondary - Dark backgrounds
  secondary: {
    main: '#191414',
    light: '#1a1a1a',
    dark: '#121212',
    contrastText: '#ffffff',
  },
  
  // Semantic colors
  error: {
    main: '#e22134',
    light: '#e8344a',
    dark: '#c71d2f',
  },
  
  success: {
    main: '#1db954',
    light: '#1ed760',
    dark: '#1aa34a',
  },
  
  warning: {
    main: '#f39c12',
    light: '#f5ab35',
    dark: '#d68910',
  },
  
  info: {
    main: '#3498db',
    light: '#5dade2',
    dark: '#2980b9',
  },
};

/**
 * Create Material-UI theme for light mode
 */
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    ...brandColors,
    background: {
      default: '#ffffff',
      paper: '#f5f5f5',
    },
    text: {
      primary: '#121212',
      secondary: '#5e5e5e',
    },
  },
  
  typography: {
    fontFamily: '\'Inter\', -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.6,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none', // Don't uppercase buttons
      fontWeight: 500,
    },
  },
  
  shape: {
    borderRadius: 12, // From existing --border-radius
  },
  
  shadows: [
    'none',
    '0 2px 4px rgba(0, 0, 0, 0.1)',
    '0 4px 8px rgba(0, 0, 0, 0.12)',
    '0 8px 16px rgba(0, 0, 0, 0.15)',
    '0 8px 32px rgba(0, 0, 0, 0.2)', // From existing --shadow
    '0 12px 40px rgba(0, 0, 0, 0.25)',
    '0 16px 48px rgba(0, 0, 0, 0.3)',
    '0 20px 56px rgba(0, 0, 0, 0.35)',
    // Additional shadows for higher elevations
    ...Array(17).fill('0 24px 64px rgba(0, 0, 0, 0.4)'),
  ],
  
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: '1rem',
          fontWeight: 500,
          transition: 'all 0.2s ease',
        },
        contained: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          '&:hover': {
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
          },
        },
      },
    },
    
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
  },
});

/**
 * Create Material-UI theme for dark mode
 * This matches the existing dark theme used throughout the app
 */
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    ...brandColors,
    background: {
      default: '#121212', // --background-dark
      paper: '#1a1a1a',   // --background-light
    },
    text: {
      primary: '#ffffff',  // --text-primary
      secondary: '#b3b3b3', // --text-secondary
    },
  },
  
  typography: {
    fontFamily: '\'Inter\', -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.6,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  
  shape: {
    borderRadius: 12,
  },
  
  shadows: [
    'none',
    '0 2px 4px rgba(0, 0, 0, 0.3)',
    '0 4px 8px rgba(0, 0, 0, 0.35)',
    '0 8px 16px rgba(0, 0, 0, 0.4)',
    '0 8px 32px rgba(0, 0, 0, 0.4)', // From existing --shadow
    '0 12px 40px rgba(0, 0, 0, 0.45)',
    '0 16px 48px rgba(0, 0, 0, 0.5)',
    '0 20px 56px rgba(0, 0, 0, 0.55)',
    ...Array(17).fill('0 24px 64px rgba(0, 0, 0, 0.6)'),
  ],
  
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: '1rem',
          fontWeight: 500,
          transition: 'all 0.2s ease',
        },
        contained: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.4)',
          },
        },
      },
    },
    
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          backgroundColor: '#1a1a1a',
        },
      },
    },
    
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#1a1a1a',
        },
      },
    },
    
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
    
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#191414', // --secondary-color
        },
      },
    },
  },
});

/**
 * Get theme based on mode
 * @param {string} mode - 'light' or 'dark'
 * @returns {Theme} Material-UI theme object
 */
export const getTheme = (mode = 'dark') => {
  return mode === 'dark' ? darkTheme : lightTheme;
};

export default darkTheme; // Default export is dark theme (matches current app)
