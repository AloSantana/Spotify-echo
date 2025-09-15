import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Chip,
  Button,
  TextField,
  Autocomplete,
  Tabs,
  Tab,
  Avatar,
  Stack,
  Rating,
  Tooltip,
  Fab,
  Badge,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Psychology,
  MoodBad,
  Mood,
  EmojiEmotions,
  SentimentVeryDissatisfied,
  SentimentDissatisfied,
  SentimentNeutral,
  SentimentSatisfied,
  SentimentVerySatisfied,
  Tune,
  PlayArrow,
  Favorite,
  FavoriteBorder,
  Share,
  Add,
  Remove,
  AutoFixHigh,
  Explore,
  TrendingUp,
  Shuffle,
  FilterList,
  Search,
  ExpandMore,
  Speed,
  VolumeUp,
  GraphicEq,
  MusicNote,
  Album,
  Person,
  DateRange,
  Star,
  Refresh
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

/**
 * Enhanced Music Discovery Dashboard
 * Interactive discovery interface with mood sliders, genre exploration, and AI recommendations
 */
const EnhancedMusicDiscoveryDashboard = ({
  onDiscoverMusic,
  onPlayTrack,
  onLikeTrack,
  onShareTrack,
  loading = false,
  className
}) => {
  const theme = useTheme();
  const [currentTab, setCurrentTab] = useState(0);
  const [discoveryMode, setDiscoveryMode] = useState('mood'); // 'mood', 'genre', 'activity', 'advanced'

  // Mood and preference sliders
  const [moodSettings, setMoodSettings] = useState({
    energy: 50,
    valence: 50, // positivity
    danceability: 50,
    acousticness: 30,
    instrumentalness: 20,
    tempo: 50
  });

  // Genre and style preferences
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [timeRange, setTimeRange] = useState('medium_term'); // 'short_term', 'medium_term', 'long_term'
  const [explicitContent, setExplicitContent] = useState(true);
  const [popularityRange, setPopularityRange] = useState([20, 80]);

  // Discovery results
  const [discoveredTracks, setDiscoveredTracks] = useState([]);
  const [likedTracks, setLikedTracks] = useState(new Set());
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Available options
  const availableGenres = [
    'acoustic', 'afrobeat', 'alt-rock', 'alternative', 'ambient', 'ancient',
    'blues', 'bossanova', 'brazil', 'breakbeat', 'british', 'chill', 'classical',
    'club', 'country', 'dance', 'dancehall', 'deep-house', 'disco', 'drum-and-bass',
    'dub', 'dubstep', 'electronic', 'folk', 'funk', 'garage', 'gospel', 'groove',
    'grunge', 'hip-hop', 'house', 'indie', 'jazz', 'latin', 'lofi', 'metal',
    'pop', 'punk', 'r-n-b', 'reggae', 'rock', 'soul', 'techno', 'trance'
  ];

  const activityMoods = [
    { label: 'Working Out', icon: '💪', settings: { energy: 85, tempo: 75, danceability: 80 } },
    { label: 'Relaxing', icon: '😌', settings: { energy: 25, acousticness: 70, valence: 60 } },
    { label: 'Studying', icon: '📚', settings: { instrumentalness: 80, energy: 30, acousticness: 60 } },
    { label: 'Party', icon: '🎉', settings: { energy: 90, danceability: 85, valence: 80 } },
    { label: 'Driving', icon: '🚗', settings: { energy: 65, tempo: 60, valence: 70 } },
    { label: 'Sleeping', icon: '😴', settings: { energy: 10, acousticness: 90, tempo: 20 } },
    { label: 'Cooking', icon: '👨‍🍳', settings: { energy: 55, valence: 75, danceability: 60 } },
    { label: 'Creative Work', icon: '🎨', settings: { instrumentalness: 50, energy: 45, valence: 55 } }
  ];

  // Handle mood slider changes
  const handleMoodChange = useCallback((setting, value) => {
    setMoodSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  }, []);

  // Handle activity mood selection
  const handleActivityMoodSelect = useCallback((activitySettings) => {
    setMoodSettings(prev => ({
      ...prev,
      ...activitySettings
    }));
  }, []);

  // Handle discovery
  const handleDiscover = useCallback(async () => {
    setIsDiscovering(true);
    try {
      const discoveryParams = {
        mode: discoveryMode,
        moodSettings,
        genres: selectedGenres,
        artists: selectedArtists,
        timeRange,
        explicitContent,
        popularityRange,
        limit: 20
      };

      const results = await onDiscoverMusic?.(discoveryParams);
      setDiscoveredTracks(results || []);
    } catch (error) {
      console.error('Discovery error:', error);
    } finally {
      setIsDiscovering(false);
    }
  }, [discoveryMode, moodSettings, selectedGenres, selectedArtists, timeRange, explicitContent, popularityRange, onDiscoverMusic]);

  // Auto-discover when settings change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (discoveryMode !== 'advanced') {
        handleDiscover();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [moodSettings, selectedGenres, discoveryMode, handleDiscover]);

  // Handle track interactions
  const handleLike = useCallback((trackId) => {
    const newLikedTracks = new Set(likedTracks);
    if (newLikedTracks.has(trackId)) {
      newLikedTracks.delete(trackId);
    } else {
      newLikedTracks.add(trackId);
    }
    setLikedTracks(newLikedTracks);
    onLikeTrack?.(trackId, newLikedTracks.has(trackId));
  }, [likedTracks, onLikeTrack]);

  // Mood emoji mapping
  const getMoodEmoji = (value) => {
    if (value < 20) return <SentimentVeryDissatisfied color="error" />;
    if (value < 40) return <SentimentDissatisfied color="warning" />;
    if (value < 60) return <SentimentNeutral color="info" />;
    if (value < 80) return <SentimentSatisfied color="success" />;
    return <SentimentVerySatisfied color="success" />;
  };

  // Render mood control slider
  const renderMoodSlider = (label, key, icon, color = 'primary', min = 0, max = 100) => (
    <Box key={key} sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        {icon}
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          {label}
        </Typography>
        <Chip
          label={`${moodSettings[key]}%`}
          size="small"
          color={color}
          variant="outlined"
        />
      </Box>
      <Slider
        value={moodSettings[key]}
        onChange={(e, value) => handleMoodChange(key, value)}
        min={min}
        max={max}
        step={5}
        marks={[
          { value: min, label: min },
          { value: max / 2, label: max / 2 },
          { value: max, label: max }
        ]}
        sx={{
          '& .MuiSlider-track': {
            background: `linear-gradient(90deg, ${theme.palette[color].light}, ${theme.palette[color].main})`
          },
          '& .MuiSlider-thumb': {
            width: 20,
            height: 20,
            '&:hover': {
              boxShadow: `0 0 0 8px ${theme.palette[color].main}20`
            }
          }
        }}
      />
    </Box>
  );

  // Render track card
  const renderTrackCard = (track, index) => (
    <Card
      key={track.id || index}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8]
        }
      }}
    >
      <CardMedia
        component="img"
        height="200"
        image={track.album?.images?.[0]?.url || '/placeholder-album.jpg'}
        alt={track.name}
        sx={{ objectFit: 'cover' }}
      />
      <CardContent sx={{ flex: 1, p: 2 }}>
        <Typography variant="subtitle2" noWrap gutterBottom>
          {track.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {track.artists?.[0]?.name || track.artist}
        </Typography>
        
        {/* Track features */}
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Chip
              icon={<Star />}
              label={`${track.popularity || 50}%`}
              size="small"
              variant="outlined"
            />
            {track.explicit && (
              <Chip label="E" size="small" color="warning" />
            )}
          </Stack>
          
          {/* Audio features preview */}
          {track.audioFeatures && (
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Tooltip title={`Energy: ${Math.round(track.audioFeatures.energy * 100)}%`}>
                  <Chip
                    icon={<Speed />}
                    label={Math.round(track.audioFeatures.energy * 100)}
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                </Tooltip>
                <Tooltip title={`Mood: ${Math.round(track.audioFeatures.valence * 100)}%`}>
                  <Chip
                    icon={getMoodEmoji(track.audioFeatures.valence * 100)}
                    label={Math.round(track.audioFeatures.valence * 100)}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Tooltip>
              </Box>
            </Box>
          )}
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <IconButton
            onClick={() => onPlayTrack?.(track)}
            color="primary"
            size="small"
          >
            <PlayArrow />
          </IconButton>
          <IconButton
            onClick={() => handleLike(track.id)}
            color={likedTracks.has(track.id) ? 'error' : 'default'}
            size="small"
          >
            {likedTracks.has(track.id) ? <Favorite /> : <FavoriteBorder />}
          </IconButton>
          <IconButton
            onClick={() => onShareTrack?.(track)}
            size="small"
          >
            <Share />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box className={className}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, background: `linear-gradient(135deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}20)` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Explore color="primary" /> Music Discovery Lab
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Find your perfect music using AI-powered discovery with mood analysis and genre exploration
            </Typography>
          </Box>
          <Fab
            color="primary"
            onClick={handleDiscover}
            disabled={isDiscovering}
            sx={{ ml: 2 }}
          >
            {isDiscovering ? <CircularProgress size={24} /> : <AutoFixHigh />}
          </Fab>
        </Box>
      </Paper>

      {/* Discovery Mode Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(e, value) => {
            setCurrentTab(value);
            const modes = ['mood', 'genre', 'activity', 'advanced'];
            setDiscoveryMode(modes[value]);
          }}
          variant="fullWidth"
        >
          <Tab icon={<Psychology />} label="Mood Discovery" />
          <Tab icon={<MusicNote />} label="Genre Explorer" />
          <Tab icon={<Explore />} label="Activity Based" />
          <Tab icon={<Tune />} label="Advanced" />
        </Tabs>
      </Paper>

      <Grid container spacing={3}>
        {/* Control Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 'fit-content', position: 'sticky', top: 16 }}>
            {/* Mood Discovery */}
            {discoveryMode === 'mood' && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Psychology color="primary" /> Mood Controls
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Adjust the sliders to match your desired mood and musical characteristics
                </Typography>

                {renderMoodSlider('Energy Level', 'energy', <Speed color="secondary" />, 'secondary')}
                {renderMoodSlider('Positivity', 'valence', getMoodEmoji(moodSettings.valence), 'primary')}
                {renderMoodSlider('Danceability', 'danceability', <GraphicEq color="info" />, 'info')}
                {renderMoodSlider('Acoustic Feel', 'acousticness', <VolumeUp color="warning" />, 'warning')}
                {renderMoodSlider('Instrumental', 'instrumentalness', <Album color="success" />, 'success')}
                {renderMoodSlider('Tempo Preference', 'tempo', <Speed color="error" />, 'error')}

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => setMoodSettings({
                    energy: 50, valence: 50, danceability: 50,
                    acousticness: 30, instrumentalness: 20, tempo: 50
                  })}
                  sx={{ mt: 2 }}
                >
                  Reset to Default
                </Button>
              </Box>
            )}

            {/* Genre Explorer */}
            {discoveryMode === 'genre' && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MusicNote color="primary" /> Genre Selection
                </Typography>
                <Autocomplete
                  multiple
                  options={availableGenres}
                  value={selectedGenres}
                  onChange={(e, value) => setSelectedGenres(value)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        {...getTagProps({ index })}
                        key={option}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select genres..."
                      variant="outlined"
                    />
                  )}
                  sx={{ mb: 3 }}
                />

                <Typography variant="subtitle2" gutterBottom>
                  Popularity Range
                </Typography>
                <Slider
                  value={popularityRange}
                  onChange={(e, value) => setPopularityRange(value)}
                  valueLabelDisplay="auto"
                  min={0}
                  max={100}
                  marks={[
                    { value: 0, label: 'Underground' },
                    { value: 50, label: 'Balanced' },
                    { value: 100, label: 'Mainstream' }
                  ]}
                  sx={{ mb: 3 }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={explicitContent}
                      onChange={(e) => setExplicitContent(e.target.checked)}
                    />
                  }
                  label="Include explicit content"
                />
              </Box>
            )}

            {/* Activity Based */}
            {discoveryMode === 'activity' && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Explore color="primary" /> Activity Moods
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Choose an activity to automatically set the perfect mood parameters
                </Typography>

                <Grid container spacing={2}>
                  {activityMoods.map((activity, index) => (
                    <Grid item xs={6} key={index}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'scale(1.05)',
                            boxShadow: theme.shadows[4]
                          }
                        }}
                        onClick={() => handleActivityMoodSelect(activity.settings)}
                      >
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h4" sx={{ mb: 1 }}>
                            {activity.icon}
                          </Typography>
                          <Typography variant="caption">
                            {activity.label}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Advanced */}
            {discoveryMode === 'advanced' && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Tune color="primary" /> Advanced Settings
                </Typography>
                
                <Accordion sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>Audio Features</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {renderMoodSlider('Energy', 'energy', <Speed />, 'primary')}
                    {renderMoodSlider('Valence', 'valence', <Psychology />, 'secondary')}
                    {renderMoodSlider('Danceability', 'danceability', <GraphicEq />, 'info')}
                  </AccordionDetails>
                </Accordion>

                <Accordion sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>Genres & Artists</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Autocomplete
                      multiple
                      options={availableGenres}
                      value={selectedGenres}
                      onChange={(e, value) => setSelectedGenres(value)}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="Genres..." />
                      )}
                      sx={{ mb: 2 }}
                    />
                  </AccordionDetails>
                </Accordion>

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Search />}
                  onClick={handleDiscover}
                  disabled={isDiscovering}
                >
                  {isDiscovering ? 'Discovering...' : 'Discover Music'}
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Results Panel */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">
                Discovered Tracks {discoveredTracks.length > 0 && `(${discoveredTracks.length})`}
              </Typography>
              <Badge badgeContent={likedTracks.size} color="error">
                <IconButton color="error">
                  <Favorite />
                </IconButton>
              </Badge>
            </Box>

            {loading || isDiscovering ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={60} />
              </Box>
            ) : discoveredTracks.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Adjust your preferences above and click discover to find your perfect music!
              </Alert>
            ) : (
              <Grid container spacing={3}>
                {discoveredTracks.map((track, index) => (
                  <Grid item xs={12} sm={6} md={4} key={track.id || index}>
                    {renderTrackCard(track, index)}
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EnhancedMusicDiscoveryDashboard;