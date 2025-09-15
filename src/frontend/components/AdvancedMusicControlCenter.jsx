import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Slider,
  Typography,
  IconButton,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  LinearProgress,
  Tooltip,
  ButtonGroup,
  Switch,
  FormControlLabel,
  Divider,
  Stack
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  VolumeUp,
  VolumeDown,
  VolumeMute,
  Shuffle,
  Repeat,
  RepeatOne,
  Favorite,
  FavoriteBorder,
  QueueMusic,
  Equalizer,
  Tune,
  GraphicEq,
  MusicNote,
  Speed,
  TrendingUp,
  Psychology,
  Brightness6
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import MusicVisualizer from './MusicVisualizer';

/**
 * Advanced Music Control Center
 * Comprehensive music player with modern UI, sliders, and advanced controls
 */
const AdvancedMusicControlCenter = ({
  currentTrack = null,
  isPlaying = false,
  volume = 70,
  progress = 0,
  audioFeatures = {},
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onVolumeChange,
  onSeek,
  onToggleLike,
  onToggleShuffle,
  onToggleRepeat,
  className
}) => {
  const theme = useTheme();
  const [localVolume, setLocalVolume] = useState(volume);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off', 'all', 'one'
  const [isLiked, setIsLiked] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [equalizerValues, setEqualizerValues] = useState({
    bass: 0,
    mid: 0,
    treble: 0,
    presence: 0
  });

  // Sync volume prop with local state
  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  // Enhanced track info with fallback
  const trackInfo = useMemo(() => ({
    id: currentTrack?.id || 'no-track',
    name: currentTrack?.name || 'No track selected',
    artist: currentTrack?.artists?.[0]?.name || currentTrack?.artist || 'Unknown Artist',
    album: currentTrack?.album?.name || 'Unknown Album',
    image: currentTrack?.album?.images?.[0]?.url || currentTrack?.image || '/placeholder-album.jpg',
    duration: currentTrack?.duration_ms || 0,
    explicit: currentTrack?.explicit || false,
    popularity: currentTrack?.popularity || 0
  }), [currentTrack]);

  // Audio features with fallbacks
  const enhancedAudioFeatures = useMemo(() => ({
    energy: audioFeatures.energy || 0.5,
    valence: audioFeatures.valence || 0.5,
    danceability: audioFeatures.danceability || 0.5,
    tempo: audioFeatures.tempo || 120,
    acousticness: audioFeatures.acousticness || 0.5,
    instrumentalness: audioFeatures.instrumentalness || 0.1
  }), [audioFeatures]);

  // Enhanced control handlers
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      onPause?.();
    } else {
      onPlay?.();
    }
  }, [isPlaying, onPlay, onPause]);

  const handleVolumeChange = useCallback((event, newValue) => {
    setLocalVolume(newValue);
    onVolumeChange?.(newValue);
    if (newValue === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  }, [onVolumeChange, isMuted]);

  const handleMuteToggle = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      onVolumeChange?.(localVolume);
    } else {
      setIsMuted(true);
      onVolumeChange?.(0);
    }
  }, [isMuted, localVolume, onVolumeChange]);

  const handleProgressChange = useCallback((event, newValue) => {
    onSeek?.(newValue);
  }, [onSeek]);

  const handleShuffleToggle = useCallback(() => {
    const newShuffleState = !isShuffled;
    setIsShuffled(newShuffleState);
    onToggleShuffle?.(newShuffleState);
  }, [isShuffled, onToggleShuffle]);

  const handleRepeatToggle = useCallback(() => {
    const modes = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setRepeatMode(nextMode);
    onToggleRepeat?.(nextMode);
  }, [repeatMode, onToggleRepeat]);

  const handleLikeToggle = useCallback(() => {
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    onToggleLike?.(trackInfo.id, newLikedState);
  }, [isLiked, trackInfo.id, onToggleLike]);

  const handleEqualizerChange = useCallback((band, value) => {
    setEqualizerValues(prev => ({
      ...prev,
      [band]: value
    }));
  }, []);

  const formatTime = useCallback((milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const getVolumeIcon = () => {
    if (isMuted || localVolume === 0) return <VolumeMute />;
    if (localVolume < 50) return <VolumeDown />;
    return <VolumeUp />;
  };

  const getRepeatIcon = () => {
    if (repeatMode === 'one') return <RepeatOne />;
    return <Repeat />;
  };

  return (
    <Paper
      elevation={6}
      className={className}
      sx={{
        p: 3,
        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Header with Track Info */}
      <Grid container spacing={3} alignItems="center" sx={{ mb: 3 }}>
        <Grid item>
          <Avatar
            src={trackInfo.image}
            alt={trackInfo.album}
            sx={{
              width: 80,
              height: 80,
              boxShadow: theme.shadows[4],
              border: `2px solid ${theme.palette.primary.main}`
            }}
          >
            <MusicNote />
          </Avatar>
        </Grid>
        <Grid item xs>
          <Box>
            <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
              {trackInfo.name}
              {trackInfo.explicit && (
                <Chip
                  label="E"
                  size="small"
                  color="warning"
                  sx={{ ml: 1, fontSize: '0.7rem', height: 20 }}
                />
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {trackInfo.artist} • {trackInfo.album}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Chip
                icon={<TrendingUp />}
                label={`${trackInfo.popularity}% popular`}
                size="small"
                variant="outlined"
              />
              <Chip
                icon={<Psychology />}
                label={`${Math.round(enhancedAudioFeatures.valence * 100)}% positive`}
                size="small"
                variant="outlined"
                color="primary"
              />
            </Box>
          </Box>
        </Grid>
        <Grid item>
          <IconButton
            onClick={handleLikeToggle}
            color={isLiked ? 'error' : 'default'}
            size="large"
          >
            {isLiked ? <Favorite /> : <FavoriteBorder />}
          </IconButton>
        </Grid>
      </Grid>

      {/* Progress Bar */}
      <Box sx={{ mb: 3 }}>
        <Slider
          value={progress}
          onChange={handleProgressChange}
          max={trackInfo.duration}
          sx={{
            '& .MuiSlider-thumb': {
              width: 16,
              height: 16,
              boxShadow: theme.shadows[2]
            },
            '& .MuiSlider-track': {
              height: 6,
              borderRadius: 3
            },
            '& .MuiSlider-rail': {
              height: 6,
              borderRadius: 3,
              opacity: 0.3
            }
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {formatTime(progress)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatTime(trackInfo.duration)}
          </Typography>
        </Box>
      </Box>

      {/* Main Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 3 }}>
        <Tooltip title={isShuffled ? "Disable shuffle" : "Enable shuffle"}>
          <IconButton
            onClick={handleShuffleToggle}
            color={isShuffled ? 'primary' : 'default'}
            size="large"
          >
            <Shuffle />
          </IconButton>
        </Tooltip>

        <IconButton onClick={onPrevious} size="large">
          <SkipPrevious sx={{ fontSize: 32 }} />
        </IconButton>

        <IconButton
          onClick={handlePlayPause}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            width: 64,
            height: 64,
            '&:hover': {
              bgcolor: 'primary.dark',
              transform: 'scale(1.05)'
            },
            transition: 'all 0.2s ease'
          }}
        >
          {isPlaying ? <Pause sx={{ fontSize: 32 }} /> : <PlayArrow sx={{ fontSize: 32 }} />}
        </IconButton>

        <IconButton onClick={onNext} size="large">
          <SkipNext sx={{ fontSize: 32 }} />
        </IconButton>

        <Tooltip title={`Repeat: ${repeatMode}`}>
          <IconButton
            onClick={handleRepeatToggle}
            color={repeatMode !== 'off' ? 'primary' : 'default'}
            size="large"
          >
            {getRepeatIcon()}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Audio Features Visualization */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GraphicEq /> Audio Characteristics
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Energy</Typography>
              <LinearProgress
                variant="determinate"
                value={enhancedAudioFeatures.energy * 100}
                sx={{ mt: 1, height: 8, borderRadius: 4 }}
                color="secondary"
              />
              <Typography variant="caption">{Math.round(enhancedAudioFeatures.energy * 100)}%</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Dance</Typography>
              <LinearProgress
                variant="determinate"
                value={enhancedAudioFeatures.danceability * 100}
                sx={{ mt: 1, height: 8, borderRadius: 4 }}
                color="primary"
              />
              <Typography variant="caption">{Math.round(enhancedAudioFeatures.danceability * 100)}%</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Tempo</Typography>
              <LinearProgress
                variant="determinate"
                value={(enhancedAudioFeatures.tempo / 200) * 100}
                sx={{ mt: 1, height: 8, borderRadius: 4 }}
                color="warning"
              />
              <Typography variant="caption">{Math.round(enhancedAudioFeatures.tempo)} BPM</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Acoustic</Typography>
              <LinearProgress
                variant="determinate"
                value={enhancedAudioFeatures.acousticness * 100}
                sx={{ mt: 1, height: 8, borderRadius: 4 }}
                color="success"
              />
              <Typography variant="caption">{Math.round(enhancedAudioFeatures.acousticness * 100)}%</Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Volume and Additional Controls */}
      <Grid container spacing={3} alignItems="center">
        <Grid item xs={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={handleMuteToggle} size="small">
              {getVolumeIcon()}
            </IconButton>
            <Slider
              value={isMuted ? 0 : localVolume}
              onChange={handleVolumeChange}
              max={100}
              sx={{
                '& .MuiSlider-thumb': {
                  width: 12,
                  height: 12
                },
                '& .MuiSlider-track': {
                  height: 4
                },
                '& .MuiSlider-rail': {
                  height: 4
                }
              }}
            />
            <Typography variant="caption" sx={{ minWidth: 30 }}>
              {Math.round(isMuted ? 0 : localVolume)}%
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Tooltip title="Queue">
              <IconButton size="small">
                <QueueMusic />
              </IconButton>
            </Tooltip>
            <Tooltip title="Equalizer">
              <IconButton
                size="small"
                onClick={() => setShowEqualizer(!showEqualizer)}
                color={showEqualizer ? 'primary' : 'default'}
              >
                <Equalizer />
              </IconButton>
            </Tooltip>
          </Box>
        </Grid>
      </Grid>

      {/* Equalizer Panel */}
      {showEqualizer && (
        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            Equalizer
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(equalizerValues).map(([band, value]) => (
              <Grid item xs={3} key={band}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                    {band}
                  </Typography>
                  <Slider
                    orientation="vertical"
                    value={value}
                    onChange={(e, newValue) => handleEqualizerChange(band, newValue)}
                    min={-12}
                    max={12}
                    step={1}
                    sx={{
                      height: 60,
                      mx: 'auto',
                      '& .MuiSlider-thumb': {
                        width: 12,
                        height: 12
                      }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {value > 0 ? '+' : ''}{value}dB
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Music Visualizer */}
      <MusicVisualizer
        isPlaying={isPlaying}
        audioFeatures={enhancedAudioFeatures}
      />
    </Paper>
  );
};

export default AdvancedMusicControlCenter;