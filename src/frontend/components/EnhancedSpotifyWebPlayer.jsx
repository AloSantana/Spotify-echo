import React, { useState, useEffect, useRef } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  IconButton,
  Slider,
  LinearProgress,
  Card,
  CardContent,
  CardMedia,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
  Fab
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  SkipNext as NextIcon,
  SkipPrevious as PrevIcon,
  VolumeUp as VolumeIcon,
  VolumeOff as MuteIcon,
  Shuffle as ShuffleIcon,
  Repeat as RepeatIcon,
  RepeatOne as RepeatOneIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  QueueMusic as QueueIcon,
  Devices as DevicesIcon,
  MusicNote as MusicIcon,
  Album as AlbumIcon,
  Person as ArtistIcon,
  Equalizer as EqualizerIcon,
  MicExternalOn as MicIcon,
  GraphicEq as GraphicEqIcon,
  Settings as SettingsIcon,
  CloudSync as SyncIcon,
  Lyrics as LyricsIcon
} from '@mui/icons-material';

export default function EnhancedSpotifyWebPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playbackState, setPlaybackState] = useState({
    position: 0,
    duration: 0,
    volume: 50,
    shuffleState: false,
    repeatMode: 0 // 0: off, 1: all, 2: track
  });
  const [devices, setDevices] = useState([]);
  const [activeDevice, setActiveDevice] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [audioFeatures, setAudioFeatures] = useState(null);
  const [lyrics, setLyrics] = useState(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [deviceMenuAnchor, setDeviceMenuAnchor] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const playerRef = useRef(null);

  useEffect(() => {
    initializeSpotifyPlayer();
    loadUserProfile();
    loadDevices();
    
    // Poll for playback state updates
    const interval = setInterval(updatePlaybackState, 1000);
    return () => clearInterval(interval);
  }, []);

  const initializeSpotifyPlayer = async () => {
    try {
      setLoading(true);
      
      // Check if Spotify Web Playback SDK is loaded
      if (!window.Spotify) {
        // Load Spotify Web Playback SDK
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.head.appendChild(script);
        
        return new Promise((resolve) => {
          window.onSpotifyWebPlaybackSDKReady = () => {
            createSpotifyPlayer();
            resolve();
          };
        });
      } else {
        createSpotifyPlayer();
      }
    } catch (error) {
      console.error('Failed to initialize Spotify player:', error);
      setError('Failed to initialize Spotify Web Player');
    } finally {
      setLoading(false);
    }
  };

  const createSpotifyPlayer = async () => {
    try {
      // Get access token from backend
      const tokenResponse = await fetch('/api/spotify/token');
      if (!tokenResponse.ok) {
        throw new Error('Failed to get Spotify access token');
      }
      
      const { access_token } = await tokenResponse.json();
      
      const player = new window.Spotify.Player({
        name: 'EchoTune AI Web Player',
        getOAuthToken: (cb) => { cb(access_token); },
        volume: 0.5
      });

      // Ready
      player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        setPlayerReady(true);
        setActiveDevice({ id: device_id, name: 'EchoTune AI Web Player', type: 'Computer' });
      });

      // Not Ready
      player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
        setPlayerReady(false);
      });

      // Player state changed
      player.addListener('player_state_changed', (state) => {
        if (state) {
          updatePlayerState(state);
        }
      });

      // Connect to the player
      const connected = await player.connect();
      setIsConnected(connected);
      playerRef.current = player;

    } catch (error) {
      console.error('Failed to create Spotify player:', error);
      setError('Failed to connect to Spotify');
    }
  };

  const updatePlayerState = (state) => {
    const {
      current_track,
      position,
      duration,
      paused,
      shuffle,
      repeat_mode
    } = state;

    setCurrentTrack(current_track);
    setIsPlaying(!paused);
    setPlaybackState(prev => ({
      ...prev,
      position,
      duration,
      shuffleState: shuffle,
      repeatMode: repeat_mode
    }));

    // Load audio features and lyrics for new track
    if (current_track && current_track.id) {
      loadAudioFeatures(current_track.id);
      loadLyrics(current_track.artists[0].name, current_track.name);
    }
  };

  const updatePlaybackState = async () => {
    if (!playerRef.current) return;

    try {
      const state = await playerRef.current.getCurrentState();
      if (state) {
        updatePlayerState(state);
      }
    } catch (error) {
      console.error('Failed to update playback state:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      const response = await fetch('/api/spotify/profile');
      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const loadDevices = async () => {
    try {
      const response = await fetch('/api/spotify/devices');
      if (response.ok) {
        const { devices } = await response.json();
        setDevices(devices);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const loadAudioFeatures = async (trackId) => {
    try {
      const response = await fetch(`/api/spotify/audio-features/${trackId}`);
      if (response.ok) {
        const features = await response.json();
        setAudioFeatures(features);
      }
    } catch (error) {
      console.error('Failed to load audio features:', error);
    }
  };

  const loadLyrics = async (artist, track) => {
    try {
      const response = await fetch(`/api/lyrics?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`);
      if (response.ok) {
        const lyricsData = await response.json();
        setLyrics(lyricsData.lyrics);
      }
    } catch (error) {
      console.error('Failed to load lyrics:', error);
    }
  };

  const togglePlayback = async () => {
    if (!playerRef.current) return;

    try {
      await playerRef.current.togglePlay();
    } catch (error) {
      console.error('Failed to toggle playback:', error);
    }
  };

  const nextTrack = async () => {
    if (!playerRef.current) return;

    try {
      await playerRef.current.nextTrack();
    } catch (error) {
      console.error('Failed to skip to next track:', error);
    }
  };

  const previousTrack = async () => {
    if (!playerRef.current) return;

    try {
      await playerRef.current.previousTrack();
    } catch (error) {
      console.error('Failed to skip to previous track:', error);
    }
  };

  const setVolume = async (volume) => {
    if (!playerRef.current) return;

    try {
      await playerRef.current.setVolume(volume / 100);
      setPlaybackState(prev => ({ ...prev, volume }));
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  };

  const seek = async (position) => {
    if (!playerRef.current) return;

    try {
      await playerRef.current.seek(position * 1000); // Convert to milliseconds
    } catch (error) {
      console.error('Failed to seek:', error);
    }
  };

  const toggleShuffle = async () => {
    try {
      const response = await fetch('/api/spotify/shuffle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: !playbackState.shuffleState })
      });

      if (response.ok) {
        setPlaybackState(prev => ({ ...prev, shuffleState: !prev.shuffleState }));
      }
    } catch (error) {
      console.error('Failed to toggle shuffle:', error);
    }
  };

  const toggleRepeat = async () => {
    const modes = ['off', 'context', 'track'];
    const nextMode = (playbackState.repeatMode + 1) % 3;
    
    try {
      const response = await fetch('/api/spotify/repeat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: modes[nextMode] })
      });

      if (response.ok) {
        setPlaybackState(prev => ({ ...prev, repeatMode: nextMode }));
      }
    } catch (error) {
      console.error('Failed to toggle repeat:', error);
    }
  };

  const transferPlayback = async (deviceId) => {
    try {
      const response = await fetch('/api/spotify/transfer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_ids: [deviceId] })
      });

      if (response.ok) {
        const device = devices.find(d => d.id === deviceId);
        setActiveDevice(device);
        setDeviceMenuAnchor(null);
      }
    } catch (error) {
      console.error('Failed to transfer playback:', error);
    }
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getRepeatIcon = () => {
    switch (playbackState.repeatMode) {
      case 1: return <RepeatIcon color="primary" />;
      case 2: return <RepeatOneIcon color="primary" />;
      default: return <RepeatIcon />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Initializing Spotify Web Player...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
        <Button onClick={initializeSpotifyPlayer} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <MusicIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4" component="h2">
          Spotify Web Player
        </Typography>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip 
            label={isConnected ? 'Connected' : 'Disconnected'} 
            color={isConnected ? 'success' : 'error'}
            size="small"
          />
          {userProfile && (
            <Chip 
              avatar={<Avatar src={userProfile.images?.[0]?.url} />}
              label={userProfile.display_name}
              variant="outlined"
              size="small"
            />
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Player */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              {currentTrack ? (
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <CardMedia
                      component="img"
                      image={currentTrack.album.images[0]?.url || '/placeholder-album.png'}
                      alt={currentTrack.album.name}
                      sx={{ width: '100%', borderRadius: 1 }}
                    />
                  </Grid>
                  <Grid item xs={9}>
                    <Typography variant="h6" noWrap>
                      {currentTrack.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {currentTrack.artists.map(artist => artist.name).join(', ')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {currentTrack.album.name}
                    </Typography>
                    
                    {/* Audio Features */}
                    {audioFeatures && (
                      <Box sx={{ mt: 2 }}>
                        <Grid container spacing={1}>
                          <Grid item xs={4}>
                            <Typography variant="caption">Energy</Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={audioFeatures.energy * 100}
                              sx={{ height: 4 }}
                            />
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption">Danceability</Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={audioFeatures.danceability * 100}
                              sx={{ height: 4 }}
                            />
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption">Valence</Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={audioFeatures.valence * 100}
                              sx={{ height: 4 }}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <AlbumIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No track currently playing
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Start playing music to see it here
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Transport Controls */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" sx={{ minWidth: 40 }}>
                  {formatTime(playbackState.position)}
                </Typography>
                <Slider
                  value={playbackState.position / 1000}
                  max={playbackState.duration / 1000}
                  onChange={(_, value) => seek(value)}
                  sx={{ mx: 2 }}
                />
                <Typography variant="body2" sx={{ minWidth: 40 }}>
                  {formatTime(playbackState.duration)}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <IconButton onClick={toggleShuffle} color={playbackState.shuffleState ? 'primary' : 'default'}>
                  <ShuffleIcon />
                </IconButton>
                
                <IconButton onClick={previousTrack}>
                  <PrevIcon />
                </IconButton>
                
                <Fab
                  color="primary"
                  onClick={togglePlayback}
                  sx={{ mx: 2 }}
                >
                  {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </Fab>
                
                <IconButton onClick={nextTrack}>
                  <NextIcon />
                </IconButton>
                
                <IconButton onClick={toggleRepeat}>
                  {getRepeatIcon()}
                </IconButton>
              </Box>

              {/* Volume Control */}
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <IconButton onClick={() => setVolume(playbackState.volume === 0 ? 50 : 0)}>
                  {playbackState.volume === 0 ? <MuteIcon /> : <VolumeIcon />}
                </IconButton>
                <Slider
                  value={playbackState.volume}
                  onChange={(_, value) => setVolume(value)}
                  sx={{ mx: 2 }}
                />
                <Typography variant="body2" sx={{ minWidth: 30 }}>
                  {playbackState.volume}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Device Selector */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DevicesIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Active Device</Typography>
                <IconButton 
                  size="small" 
                  sx={{ ml: 'auto' }}
                  onClick={(e) => setDeviceMenuAnchor(e.currentTarget)}
                >
                  <SettingsIcon />
                </IconButton>
              </Box>
              
              {activeDevice && (
                <Chip 
                  label={`${activeDevice.name} (${activeDevice.type})`}
                  color="primary"
                  size="small"
                />
              )}
              
              <Menu
                anchorEl={deviceMenuAnchor}
                open={Boolean(deviceMenuAnchor)}
                onClose={() => setDeviceMenuAnchor(null)}
              >
                {devices.map((device) => (
                  <MenuItem 
                    key={device.id}
                    onClick={() => transferPlayback(device.id)}
                    selected={device.id === activeDevice?.id}
                  >
                    {device.name} ({device.type})
                  </MenuItem>
                ))}
              </Menu>
            </CardContent>
          </Card>

          {/* Lyrics */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LyricsIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Lyrics</Typography>
                <Switch 
                  checked={showLyrics}
                  onChange={(e) => setShowLyrics(e.target.checked)}
                  size="small"
                  sx={{ ml: 'auto' }}
                />
              </Box>
              
              {showLyrics && lyrics && (
                <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                  <Typography variant="body2" style={{ whiteSpace: 'pre-line' }}>
                    {lyrics}
                  </Typography>
                </Box>
              )}
              
              {showLyrics && !lyrics && currentTrack && (
                <Typography variant="body2" color="text.secondary">
                  Lyrics not available for this track
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Player Features */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Player Features
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar><EqualizerIcon /></Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Audio Visualization" 
                    secondary="Real-time audio features"
                  />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar><SyncIcon /></Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Cross-Device Sync" 
                    secondary="Seamless playback transfer"
                  />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar><GraphicEqIcon /></Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Smart Recommendations" 
                    secondary="AI-powered music discovery"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
}