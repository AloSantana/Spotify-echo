import React, { useState } from 'react';
import {
  Box,
  Avatar,
  Typography,
  Button,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  ListItemText,
  Badge,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  alpha,
  useTheme,
  Fade,
} from '@mui/material';
import {
  Person as PersonIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  MusicNote as MusicNoteIcon,
  VerifiedUser as VerifiedUserIcon,
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  ExpandMore as ExpandMoreIcon,
  FiberManualRecord as OnlineIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import SpotifyLoginButton, { CompactSpotifyLogin } from './SpotifyLoginButton';

/**
 * Authentication Status Display Component
 * 
 * Shows current authentication state:
 * - Login button when not authenticated
 * - User profile and menu when authenticated
 * - Online status indicator
 * - Quick access to user functions
 */
function AuthStatus({ variant = 'full', showLoginButton = true, onNavigate }) {
  const theme = useTheme();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
    setIsMenuOpen(true);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      handleMenuClose();
      if (onNavigate) {
        onNavigate('/');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleMenuItemClick = (action) => {
    handleMenuClose();
    if (onNavigate) {
      onNavigate(action);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar sx={{ width: 32, height: 32 }}>
          <PersonIcon />
        </Avatar>
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  // Not authenticated - show login button
  if (!isAuthenticated) {
    if (!showLoginButton) {
      return null;
    }

    if (variant === 'compact') {
      return <CompactSpotifyLogin onSuccess={() => onNavigate?.('/')} />;
    }

    if (variant === 'minimal') {
      return (
        <Button
          variant="outlined"
          size="small"
          startIcon={<MusicNoteIcon />}
          onClick={() => {/* Handle login */}}
          sx={{
            borderColor: '#1DB954',
            color: '#1DB954',
            '&:hover': {
              borderColor: '#1ed760',
              backgroundColor: alpha('#1DB954', 0.1),
            },
          }}
        >
          Login
        </Button>
      );
    }

    return <SpotifyLoginButton variant="minimal" />;
  }

  // Authenticated user display
  const displayName = user?.display_name || user?.id || 'User';
  const userImage = user?.images?.[0]?.url;
  const userCountry = user?.country;
  const userFollowers = user?.followers?.total;
  const isPremium = user?.product === 'premium';

  if (variant === 'compact') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={`Signed in as ${displayName}`}>
          <IconButton
            onClick={handleMenuOpen}
            size="small"
            sx={{
              p: 0,
              border: `2px solid ${alpha('#1DB954', 0.3)}`,
              '&:hover': {
                borderColor: '#1DB954',
              },
            }}
          >
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <OnlineIcon
                  sx={{
                    fontSize: 12,
                    color: '#4caf50',
                  }}
                />
              }
            >
              <Avatar
                src={userImage}
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: '#1DB954',
                }}
              >
                {displayName[0]?.toUpperCase()}
              </Avatar>
            </Badge>
          </IconButton>
        </Tooltip>

        <UserMenu
          anchorEl={anchorEl}
          open={isMenuOpen}
          onClose={handleMenuClose}
          user={user}
          onLogout={handleLogout}
          onMenuItemClick={handleMenuItemClick}
        />
      </Box>
    );
  }

  if (variant === 'card') {
    return (
      <Card
        elevation={2}
        sx={{
          maxWidth: 320,
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${alpha('#1DB954', 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`
            : `linear-gradient(135deg, ${alpha('#1DB954', 0.05)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
          border: `1px solid ${alpha('#1DB954', 0.2)}`,
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar
              src={userImage}
              sx={{
                width: 48,
                height: 48,
                mr: 2,
                backgroundColor: '#1DB954',
              }}
            >
              {displayName[0]?.toUpperCase()}
            </Avatar>
            
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" noWrap>
                {displayName}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <OnlineIcon sx={{ fontSize: 12, color: '#4caf50' }} />
                <Typography variant="caption" color="text.secondary">
                  Connected
                </Typography>
                {isPremium && (
                  <Chip
                    label="Premium"
                    size="small"
                    sx={{
                      fontSize: '0.7rem',
                      height: 20,
                      backgroundColor: '#1DB954',
                      color: 'white',
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* User Stats */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            {userFollowers && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {userFollowers.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Followers
                </Typography>
              </Box>
            )}
            {userCountry && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {userCountry}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Country
                </Typography>
              </Box>
            )}
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DashboardIcon />}
              onClick={() => handleMenuItemClick('/dashboard')}
              sx={{ flex: 1 }}
            >
              Dashboard
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              color="error"
            >
              Logout
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Full variant - toolbar display
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={
            <VerifiedUserIcon
              sx={{
                fontSize: 16,
                color: '#1DB954',
                backgroundColor: 'background.paper',
                borderRadius: '50%',
                p: 0.25,
              }}
            />
          }
        >
          <Avatar
            src={userImage}
            sx={{
              width: 40,
              height: 40,
              backgroundColor: '#1DB954',
            }}
          >
            {displayName[0]?.toUpperCase()}
          </Avatar>
        </Badge>

        <Box>
          <Typography variant="body2" fontWeight="medium">
            {displayName}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <OnlineIcon sx={{ fontSize: 10, color: '#4caf50' }} />
            <Typography variant="caption" color="text.secondary">
              Connected to Spotify
            </Typography>
            {isPremium && (
              <Chip
                label="Premium"
                size="small"
                sx={{
                  fontSize: '0.65rem',
                  height: 16,
                  backgroundColor: '#1DB954',
                  color: 'white',
                }}
              />
            )}
          </Box>
        </Box>
      </Box>

      <IconButton
        onClick={handleMenuOpen}
        size="small"
        sx={{ ml: 1 }}
      >
        <ExpandMoreIcon />
      </IconButton>

      <UserMenu
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
        user={user}
        onLogout={handleLogout}
        onMenuItemClick={handleMenuItemClick}
      />
    </Box>
  );
}

/**
 * User Menu Component
 */
function UserMenu({ anchorEl, open, onClose, user, onLogout, onMenuItemClick }) {
  const menuItems = [
    { icon: <DashboardIcon />, text: 'Dashboard', action: '/dashboard' },
    { icon: <AnalyticsIcon />, text: 'Analytics', action: '/analytics' },
    { icon: <MusicNoteIcon />, text: 'Playlists', action: '/playlists' },
    { icon: <SettingsIcon />, text: 'Settings', action: '/settings' },
  ];

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      PaperProps={{
        elevation: 8,
        sx: {
          overflow: 'visible',
          filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
          mt: 1.5,
          minWidth: 200,
          '&:before': {
            content: '""',
            display: 'block',
            position: 'absolute',
            top: 0,
            right: 14,
            width: 10,
            height: 10,
            bgcolor: 'background.paper',
            transform: 'translateY(-50%) rotate(45deg)',
            zIndex: 0,
          },
        },
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      {/* User Info Header */}
      <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight="bold">
          {user?.display_name || user?.id}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {user?.email || 'Spotify User'}
        </Typography>
      </Box>

      {/* Menu Items */}
      {menuItems.map((item, index) => (
        <MenuItem
          key={index}
          onClick={() => onMenuItemClick(item.action)}
          sx={{ py: 1 }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            {item.icon}
          </ListItemIcon>
          <ListItemText>{item.text}</ListItemText>
        </MenuItem>
      ))}

      <Divider />

      {/* Logout */}
      <MenuItem onClick={onLogout} sx={{ py: 1, color: 'error.main' }}>
        <ListItemIcon sx={{ minWidth: 36 }}>
          <LogoutIcon color="error" />
        </ListItemIcon>
        <ListItemText>Logout</ListItemText>
      </MenuItem>
    </Menu>
  );
}

/**
 * Authentication Guard Component
 * Wraps content that requires authentication
 */
export function AuthGuard({ children, fallback, requireAuth = true }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return fallback || <SpotifyLoginButton />;
  }

  return children;
}

export default AuthStatus;