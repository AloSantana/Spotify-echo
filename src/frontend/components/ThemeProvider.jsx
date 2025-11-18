import { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { CssBaseline, useMediaQuery } from '@mui/material';
import { lightTheme, darkTheme, getTheme } from '../theme/muiTheme';

const ThemeContext = createContext();

/**
 * Custom Theme Provider with Dark/Light Mode Support
 * Provides EchoTune AI branded themes and mode switching
 * 
 * Now uses centralized theme configuration from ../theme/muiTheme.js
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const ThemeProvider = ({ children }) => {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState(() => {
    // Try to get saved theme from localStorage
    const saved = localStorage.getItem('echotune-theme');
    return saved || (prefersDark ? 'dark' : 'light');
  });

  const [customizations, setCustomizations] = useState(() => {
    const saved = localStorage.getItem('echotune-theme-customizations');
    return saved
      ? JSON.parse(saved)
      : {
          primaryColor: '#1db954',
          accentColor: '#9c27b0',
          borderRadius: 12,
          fontScale: 1,
        };
  });

  // Use centralized theme configuration
  const theme = getTheme(mode);

  useEffect(() => {
    localStorage.setItem('echotune-theme', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('echotune-theme-customizations', JSON.stringify(customizations));
  }, [customizations]);

  const toggleMode = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setThemeMode = (newMode) => {
    setMode(newMode);
  };

  const updateCustomization = (key, value) => {
    setCustomizations((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetCustomizations = () => {
    setCustomizations({
      primaryColor: '#1db954',
      accentColor: '#9c27b0',
      borderRadius: 12,
      fontScale: 1,
    });
  };

  const contextValue = {
    mode,
    theme,
    customizations,
    toggleMode,
    setThemeMode,
    updateCustomization,
    resetCustomizations,
    isDark: mode === 'dark',
    isLight: mode === 'light',
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};

/**
 * Theme Toggle Component
 * Provides a UI control for switching between light/dark modes
 */
import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { Brightness4, Brightness7, Palette, AutoMode } from '@mui/icons-material';

export const ThemeToggle = ({ showCustomization = false }) => {
  const { toggleMode, setThemeMode, isDark } = useTheme();
  const [menuAnchor, setMenuAnchor] = useState(null);

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  if (!showCustomization) {
    return (
      <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
        <IconButton onClick={toggleMode} color="inherit">
          {isDark ? <Brightness7 /> : <Brightness4 />}
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <>
      <Tooltip title="Theme settings">
        <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} color="inherit">
          <Palette />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            setThemeMode('light');
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <Brightness7 />
          </ListItemIcon>
          <ListItemText>Light Mode</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            setThemeMode('dark');
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <Brightness4 />
          </ListItemIcon>
          <ListItemText>Dark Mode</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            setThemeMode('auto');
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <AutoMode />
          </ListItemIcon>
          <ListItemText>Auto (System)</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default ThemeProvider;
