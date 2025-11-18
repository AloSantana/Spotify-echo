/**
 * EmptyState Component
 * 
 * Provides consistent empty state UI patterns across the application
 * following Material Design guidelines with EchoTune AI branding.
 * 
 * Features:
 * - Customizable icon, title, and description
 * - Optional action button
 * - Responsive design
 * - WCAG 2.1 AA compliant
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Button, Stack } from '@mui/material';
import {
  MusicNote,
  PlaylistPlay,
  Search,
  LibraryMusic,
  QueueMusic,
  Album,
  FolderOff,
  ErrorOutline,
} from '@mui/icons-material';

/**
 * Icon mapping for common empty state scenarios
 */
const ICON_MAP = {
  music: MusicNote,
  playlist: PlaylistPlay,
  playlists: QueueMusic,
  search: Search,
  library: LibraryMusic,
  album: Album,
  empty: FolderOff,
  error: ErrorOutline,
};

/**
 * EmptyState Component
 * 
 * @example
 * <EmptyState
 *   icon="playlist"
 *   title="No playlists yet"
 *   description="Create your first playlist to get started"
 *   actionLabel="Create Playlist"
 *   onAction={handleCreatePlaylist}
 * />
 */
const EmptyState = ({
  icon = 'empty',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  variant = 'default', // 'default', 'compact', 'large'
  customIcon: CustomIcon,
}) => {
  // Determine icon component
  const IconComponent = CustomIcon || ICON_MAP[icon] || FolderOff;
  
  // Size configurations based on variant
  const sizeConfig = {
    compact: {
      iconSize: '48px',
      spacing: 2,
      titleVariant: 'h6',
      descriptionVariant: 'body2',
    },
    default: {
      iconSize: '64px',
      spacing: 3,
      titleVariant: 'h5',
      descriptionVariant: 'body1',
    },
    large: {
      iconSize: '96px',
      spacing: 4,
      titleVariant: 'h4',
      descriptionVariant: 'h6',
    },
  };
  
  const config = sizeConfig[variant] || sizeConfig.default;
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: { xs: 3, sm: 4, md: 6 },
        minHeight: variant === 'compact' ? '200px' : '400px',
        width: '100%',
      }}
      role="status"
      aria-label={title}
    >
      <Stack spacing={config.spacing} alignItems="center" maxWidth="600px">
        {/* Icon */}
        <Box
          sx={{
            color: 'text.secondary',
            opacity: 0.6,
            transition: 'all 0.3s ease',
            '&:hover': {
              opacity: 0.8,
              transform: 'scale(1.05)',
            },
          }}
        >
          <IconComponent
            sx={{
              fontSize: config.iconSize,
              width: config.iconSize,
              height: config.iconSize,
            }}
          />
        </Box>
        
        {/* Title */}
        {title && (
          <Typography
            variant={config.titleVariant}
            component="h2"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
            }}
          >
            {title}
          </Typography>
        )}
        
        {/* Description */}
        {description && (
          <Typography
            variant={config.descriptionVariant}
            sx={{
              color: 'text.secondary',
              maxWidth: '500px',
              lineHeight: 1.6,
            }}
          >
            {description}
          </Typography>
        )}
        
        {/* Actions */}
        {(actionLabel || secondaryActionLabel) && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ mt: 2 }}
          >
            {actionLabel && onAction && (
              <Button
                variant="contained"
                color="primary"
                onClick={onAction}
                size={variant === 'compact' ? 'medium' : 'large'}
                sx={{
                  minWidth: { xs: '100%', sm: '160px' },
                }}
              >
                {actionLabel}
              </Button>
            )}
            
            {secondaryActionLabel && onSecondaryAction && (
              <Button
                variant="outlined"
                color="primary"
                onClick={onSecondaryAction}
                size={variant === 'compact' ? 'medium' : 'large'}
                sx={{
                  minWidth: { xs: '100%', sm: '160px' },
                }}
              >
                {secondaryActionLabel}
              </Button>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

EmptyState.propTypes = {
  /** Predefined icon key or custom icon component */
  icon: PropTypes.oneOf(Object.keys(ICON_MAP)),
  /** Custom icon component (overrides icon prop) */
  customIcon: PropTypes.elementType,
  /** Main heading text */
  title: PropTypes.string.isRequired,
  /** Descriptive text below title */
  description: PropTypes.string,
  /** Primary action button label */
  actionLabel: PropTypes.string,
  /** Primary action button handler */
  onAction: PropTypes.func,
  /** Secondary action button label */
  secondaryActionLabel: PropTypes.string,
  /** Secondary action button handler */
  onSecondaryAction: PropTypes.func,
  /** Size variant */
  variant: PropTypes.oneOf(['compact', 'default', 'large']),
};

export default EmptyState;

/**
 * Predefined empty states for common scenarios
 */
export const EmptyPlaylists = ({ onCreatePlaylist }) => (
  <EmptyState
    icon="playlists"
    title="No Playlists Yet"
    description="Create your first playlist to organize your favorite tracks and discover new music."
    actionLabel="Create Playlist"
    onAction={onCreatePlaylist}
    secondaryActionLabel="Browse Recommendations"
    onSecondaryAction={() => window.location.href = '/recommendations'}
  />
);

export const EmptySearchResults = ({ searchQuery, onClearSearch }) => (
  <EmptyState
    icon="search"
    title="No Results Found"
    description={searchQuery ? `No results found for "${searchQuery}". Try different keywords or browse our recommendations.` : 'Enter a search query to find music, playlists, and more.'}
    actionLabel={searchQuery ? 'Clear Search' : 'Browse Music'}
    onAction={onClearSearch || (() => window.location.href = '/discovery')}
    variant="compact"
  />
);

export const EmptyLibrary = ({ onDiscoverMusic }) => (
  <EmptyState
    icon="library"
    title="Your Library is Empty"
    description="Start building your music collection by discovering new tracks and creating playlists."
    actionLabel="Discover Music"
    onAction={onDiscoverMusic}
    secondaryActionLabel="Import from Spotify"
    onSecondaryAction={() => window.location.href = '/settings'}
  />
);

export const EmptyRecommendations = ({ onRefresh }) => (
  <EmptyState
    icon="music"
    title="No Recommendations Available"
    description="We're learning your music preferences. Listen to more tracks to get personalized recommendations."
    actionLabel="Refresh Recommendations"
    onAction={onRefresh}
    variant="compact"
  />
);

export const ErrorState = ({ error, onRetry }) => (
  <EmptyState
    icon="error"
    title="Oops! Something Went Wrong"
    description={error || 'We encountered an error while loading this content. Please try again.'}
    actionLabel="Try Again"
    onAction={onRetry}
    secondaryActionLabel="Go Home"
    onSecondaryAction={() => window.location.href = '/'}
    variant="compact"
  />
);
