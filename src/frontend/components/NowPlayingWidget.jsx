/**
 * Now Playing Widget
 * Compact widget for displaying current Spotify playback in chat interface
 * Integrates with Spotify Integration backend
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardMedia,
  IconButton,
  Typography,
  LinearProgress,
  Chip,
  Tooltip,
  Alert,
  Collapse,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  VolumeUp,
  VolumeDown,
  Shuffle,
  Repeat,
  RepeatOne,
  Devices,
  Refresh,
  MusicNote,
} from '@mui/icons-material';

const NowPlayingWidget = ({ refreshInterval = 5000, compact = false }) => {
  const [nowPlaying, setNowPlaying] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(true);

  /**
   * Fetch current playback state from backend
   */
  const fetchNowPlaying = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/now-playing', {
        credentials: 'include',
      });

      if (response.status === 401) {
        setError('Please connect your Spotify account');
        setNowPlaying(null);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch now playing');
      }

      const data = await response.json();
      
      if (data.error) {
        setError(data.message || 'No active device');
        setNowPlaying(null);
      } else {
        setNowPlaying(data);
        setError(null);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching now playing:', err);
      setError('Failed to load playback info');
      setLoading(false);
    }
  }, []);

  /**
   * Send Spotify command
   */
  const sendCommand = useCallback(async (command) => {
    try {
      const response = await fetch('/api/chat/spotify-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ command }),
      });

      if (!response.ok) {
        throw new Error('Command failed');
      }

      // Refresh now playing after command
      setTimeout(fetchNowPlaying, 500);
    } catch (err) {
      console.error('Error sending command:', err);
      setError('Failed to execute command');
    }
  }, [fetchNowPlaying]);

  /**
   * Playback control handlers
   */
  const handlePlayPause = useCallback(() => {
    if (nowPlaying?.isPlaying) {
      sendCommand('pause');
    } else {
      sendCommand('resume');
    }
  }, [nowPlaying, sendCommand]);

  const handleSkip = useCallback(() => {
    sendCommand('skip');
  }, [sendCommand]);

  const handlePrevious = useCallback(() => {
    sendCommand('previous');
  }, [sendCommand]);

  const handleShuffle = useCallback(() => {
    const command = nowPlaying?.shuffle ? 'shuffle off' : 'shuffle on';
    sendCommand(command);
  }, [nowPlaying, sendCommand]);

  const handleRepeat = useCallback(() => {
    let command = 'repeat off';
    if (nowPlaying?.repeat === 'off') {
      command = 'repeat on';
    } else if (nowPlaying?.repeat === 'context') {
      command = 'repeat track';
    }
    sendCommand(command);
  }, [nowPlaying, sendCommand]);

  /**
   * Polling for playback updates
   */
  useEffect(() => {
    fetchNowPlaying();

    if (!isPolling) return;

    const interval = setInterval(fetchNowPlaying, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchNowPlaying, refreshInterval, isPolling]);

  /**
   * Format time (ms to mm:ss)
   */
  const formatTime = (ms) => {
    if (!ms) return '0:00';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  /**
   * Calculate progress percentage
   */
  const progressPercent = nowPlaying?.track
    ? (nowPlaying.track.progress_ms / nowPlaying.track.duration_ms) * 100
    : 0;

  /**
   * Error state
   */
  if (error && !loading) {
    return (
      <Card sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Alert 
          severity="info" 
          action={
            <IconButton size="small" onClick={fetchNowPlaying}>
              <Refresh />
            </IconButton>
          }
        >
          {error}
        </Alert>
      </Card>
    );
  }

  /**
   * Loading state
   */
  if (loading) {
    return (
      <Card sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <MusicNote color="disabled" />
          <Typography variant="body2" color="text.secondary">
            Loading playback info...
          </Typography>
        </Box>
      </Card>
    );
  }

  /**
   * No track playing
   */
  if (!nowPlaying || !nowPlaying.track) {
    return (
      <Card sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <MusicNote color="disabled" />
          <Typography variant="body2" color="text.secondary">
            Nothing playing
          </Typography>
          <IconButton size="small" onClick={fetchNowPlaying} sx={{ ml: 'auto' }}>
            <Refresh fontSize="small" />
          </IconButton>
        </Box>
      </Card>
    );
  }

  /**
   * Compact view (for chat sidebar)
   */
  if (compact) {
    return (
      <Card sx={{ p: 1.5, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Album art thumbnail */}
          {nowPlaying.track.albumArt && (
            <CardMedia
              component="img"
              sx={{ width: 48, height: 48, borderRadius: 1 }}
              image={nowPlaying.track.albumArt}
              alt={nowPlaying.track.album}
            />
          )}

          {/* Track info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap fontWeight="medium">
              {nowPlaying.track.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {nowPlaying.track.artists.join(', ')}
            </Typography>
          </Box>

          {/* Play/pause button */}
          <IconButton size="small" onClick={handlePlayPause}>
            {nowPlaying.isPlaying ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
          </IconButton>
        </Box>
      </Card>
    );
  }

  /**
   * Full view
   */
  return (
    <Card sx={{ bgcolor: 'background.paper', overflow: 'visible' }}>
      {/* Progress bar */}
      <LinearProgress 
        variant="determinate" 
        value={progressPercent} 
        sx={{ height: 4 }}
      />

      <Box sx={{ p: 2 }}>
        {/* Track info section */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          {/* Album art */}
          {nowPlaying.track.albumArt && (
            <CardMedia
              component="img"
              sx={{ 
                width: 80, 
                height: 80, 
                borderRadius: 2,
                boxShadow: 2,
              }}
              image={nowPlaying.track.albumArt}
              alt={nowPlaying.track.album}
            />
          )}

          {/* Track details */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap fontWeight="bold">
              {nowPlaying.track.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {nowPlaying.track.artists.join(', ')}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {nowPlaying.track.album}
            </Typography>

            {/* Time display */}
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {formatTime(nowPlaying.track.progress_ms)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                /
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTime(nowPlaying.track.duration_ms)}
              </Typography>
            </Box>
          </Box>

          {/* Refresh button */}
          <IconButton size="small" onClick={fetchNowPlaying}>
            <Refresh fontSize="small" />
          </IconButton>
        </Box>

        {/* Playback controls */}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mb: 2 }}>
          <Tooltip title={nowPlaying.shuffle ? 'Shuffle on' : 'Shuffle off'}>
            <IconButton 
              size="small" 
              onClick={handleShuffle}
              color={nowPlaying.shuffle ? 'primary' : 'default'}
            >
              <Shuffle fontSize="small" />
            </IconButton>
          </Tooltip>

          <IconButton onClick={handlePrevious}>
            <SkipPrevious />
          </IconButton>

          <IconButton 
            onClick={handlePlayPause}
            sx={{ 
              bgcolor: 'primary.main', 
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' },
              width: 48,
              height: 48,
            }}
          >
            {nowPlaying.isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>

          <IconButton onClick={handleSkip}>
            <SkipNext />
          </IconButton>

          <Tooltip title={
            nowPlaying.repeat === 'track' ? 'Repeat track' : 
            nowPlaying.repeat === 'context' ? 'Repeat on' : 
            'Repeat off'
          }>
            <IconButton 
              size="small" 
              onClick={handleRepeat}
              color={nowPlaying.repeat !== 'off' ? 'primary' : 'default'}
            >
              {nowPlaying.repeat === 'track' ? (
                <RepeatOne fontSize="small" />
              ) : (
                <Repeat fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Device and status info */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
          {nowPlaying.device && (
            <Chip
              icon={<Devices />}
              label={nowPlaying.device.name}
              size="small"
              variant="outlined"
            />
          )}
          {nowPlaying.device?.volume !== undefined && (
            <Chip
              icon={<VolumeUp />}
              label={`${nowPlaying.device.volume}%`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </Box>
    </Card>
  );
};

export default NowPlayingWidget;
