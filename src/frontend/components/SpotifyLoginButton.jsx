import React, { useState } from 'react';
import {
  Button,
  Box,
  Typography,
  Paper,
  Avatar,
  CircularProgress,
  Alert,
  Fade,
  Card,
  CardContent,
  useTheme,
  alpha,
} from '@mui/material';
import {
  MusicNote as MusicNoteIcon,
  Login as LoginIcon,
  Security as SecurityIcon,
  VpnLock as VpnLockIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

/**
 * Modern Spotify Login Button Component
 * 
 * Features:
 * - Beautiful Material-UI design with Spotify branding
 * - Loading states and error handling
 * - Security indicators (PKCE OAuth 2.0)
 * - Responsive design for mobile and desktop
 * - Smooth animations and transitions
 */
function SpotifyLoginButton({ 
  variant = 'primary',
  size = 'large',
  showSecurityInfo = true,
  onAuthStart,
  onAuthComplete,
  onAuthError 
}) {
  const theme = useTheme();
  const { initiateSpotifyAuth, isLoading } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const handleSpotifyLogin = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      if (onAuthStart) {
        onAuthStart();
      }
      
      // Initiate OAuth flow
      await initiateSpotifyAuth();
      
      if (onAuthComplete) {
        onAuthComplete();
      }
    } catch (err) {
      console.error('Spotify login error:', err);
      setError(err.message || 'Failed to connect to Spotify');
      
      if (onAuthError) {
        onAuthError(err);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const spotifyGreen = '#1DB954';
  const spotifyBlack = '#191414';

  const buttonStyles = {
    primary: {
      background: `linear-gradient(135deg, ${spotifyGreen} 0%, ${alpha(spotifyGreen, 0.8)} 100%)`,
      color: 'white',
      '&:hover': {
        background: `linear-gradient(135deg, ${alpha(spotifyGreen, 0.9)} 0%, ${alpha(spotifyGreen, 0.7)} 100%)`,
        transform: 'translateY(-2px)',
        boxShadow: `0 8px 24px ${alpha(spotifyGreen, 0.3)}`,
      },
    },
    outlined: {
      border: `2px solid ${spotifyGreen}`,
      color: spotifyGreen,
      '&:hover': {
        backgroundColor: alpha(spotifyGreen, 0.1),
        borderColor: alpha(spotifyGreen, 0.8),
      },
    },
    dark: {
      background: `linear-gradient(135deg, ${spotifyBlack} 0%, ${alpha(spotifyBlack, 0.9)} 100%)`,
      color: 'white',
      '&:hover': {
        background: `linear-gradient(135deg, ${alpha(spotifyBlack, 0.8)} 0%, ${alpha(spotifyBlack, 0.7)} 100%)`,
      },
    },
  };

  if (variant === 'minimal') {
    return (
      <Button
        onClick={handleSpotifyLogin}
        disabled={isLoading || isConnecting}
        startIcon={
          isConnecting ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <MusicNoteIcon />
          )
        }
        sx={{
          textTransform: 'none',
          borderRadius: 2,
          px: 3,
          py: 1,
          ...buttonStyles[variant === 'outlined' ? 'outlined' : 'primary'],
        }}
      >
        {isConnecting ? 'Connecting...' : 'Connect Spotify'}
      </Button>
    );
  }

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto' }}>
      {/* Error Alert */}
      {error && (
        <Fade in={!!error}>
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        </Fade>
      )}

      {/* Main Login Card */}
      <Card
        elevation={8}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          background: theme.palette.mode === 'dark' 
            ? `linear-gradient(135deg, ${alpha(spotifyBlack, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`
            : `linear-gradient(135deg, ${alpha(spotifyGreen, 0.05)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
          border: `1px solid ${alpha(spotifyGreen, 0.2)}`,
        }}
      >
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          {/* Spotify Logo and Title */}
          <Box sx={{ mb: 3 }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                mx: 'auto',
                mb: 2,
                background: `linear-gradient(135deg, ${spotifyGreen} 0%, ${alpha(spotifyGreen, 0.8)} 100%)`,
              }}
            >
              <MusicNoteIcon sx={{ fontSize: 32, color: 'white' }} />
            </Avatar>
            
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Connect with Spotify
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Unlock personalized music recommendations powered by AI
            </Typography>
          </Box>

          {/* Features List */}
          <Box sx={{ mb: 4, textAlign: 'left' }}>
            <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
              What you'll get:
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                '🎯 AI-powered music recommendations',
                '🎵 Access to your Spotify playlists',
                '💬 Conversational music discovery',
                '📊 Detailed listening analytics',
                '🎨 Personalized playlist creation',
              ].map((feature, index) => (
                <Typography
                  key={index}
                  variant="body2"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                  }}
                >
                  {feature}
                </Typography>
              ))}
            </Box>
          </Box>

          {/* Login Button */}
          <Button
            variant="contained"
            size={size}
            onClick={handleSpotifyLogin}
            disabled={isLoading || isConnecting}
            startIcon={
              isConnecting ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <LoginIcon />
              )
            }
            sx={{
              width: '100%',
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              ...buttonStyles.primary,
            }}
          >
            {isConnecting ? 'Connecting to Spotify...' : 'Connect with Spotify'}
          </Button>

          {/* Security Information */}
          {showSecurityInfo && (
            <Fade in={showSecurityInfo}>
              <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: alpha(spotifyGreen, 0.1) }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <SecurityIcon sx={{ fontSize: 20, color: spotifyGreen, mr: 1 }} />
                  <Typography variant="body2" fontWeight="medium" color={spotifyGreen}>
                    Secure OAuth 2.0 Authentication
                  </Typography>
                </Box>
                
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  We use PKCE (Proof Key for Code Exchange) for enhanced security.
                  Your Spotify credentials are never stored on our servers.
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                  <VpnLockIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                  <Typography variant="caption" color="text.secondary">
                    End-to-end encrypted • Privacy first
                  </Typography>
                </Box>
              </Box>
            </Fade>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

/**
 * Compact Login Button for navigation bars
 */
export function CompactSpotifyLogin({ onSuccess }) {
  const { initiateSpotifyAuth } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await initiateSpotifyAuth();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="contained"
      size="small"
      onClick={handleLogin}
      disabled={loading}
      startIcon={loading ? <CircularProgress size={16} /> : <MusicNoteIcon />}
      sx={{
        background: 'linear-gradient(135deg, #1DB954 0%, #1ed760 100%)',
        color: 'white',
        textTransform: 'none',
        borderRadius: 2,
        '&:hover': {
          background: 'linear-gradient(135deg, #1ed760 0%, #1DB954 100%)',
        },
      }}
    >
      {loading ? 'Connecting...' : 'Spotify'}
    </Button>
  );
}

export default SpotifyLoginButton;