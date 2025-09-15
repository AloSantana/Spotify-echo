import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Button,
  TextField,
  Chip,
  Avatar,
  AvatarGroup,
  Stack,
  Divider,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Select,
  FormControl,
  InputLabel,
  Slider,
  LinearProgress,
  Fade,
  Zoom,
  Alert,
  Snackbar,
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction,
  Fab
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Favorite,
  FavoriteBorder,
  Share,
  Add,
  Remove,
  DragIndicator,
  MoreVert,
  Edit,
  Delete,
  Save,
  Download,
  Upload,
  QueueMusic,
  Shuffle,
  Repeat,
  Speed,
  Psychology,
  GraphicEq,
  MusicNote,
  Person,
  Group,
  Public,
  Lock,
  Link,
  ContentCopy,
  Send,
  AccessTime,
  Star,
  TrendingUp,
  FilterList,
  Sort,
  Search,
  Refresh,
  Settings,
  PhotoCamera,
  Image,
  Close
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Advanced Playlist Management
 * Comprehensive playlist builder with drag-and-drop, collaboration features, and modern UI
 */
const AdvancedPlaylistManagement = ({
  playlists = [],
  currentPlaylist = null,
  tracks = [],
  onCreatePlaylist,
  onUpdatePlaylist,
  onDeletePlaylist,
  onPlayTrack,
  onLikeTrack,
  onSharePlaylist,
  onCollaboratePlaylist,
  onReorderTracks,
  onAddTrack,
  onRemoveTrack,
  loading = false,
  className
}) => {
  const theme = useTheme();
  const [selectedPlaylist, setSelectedPlaylist] = useState(currentPlaylist);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', 'detailed'
  const [sortBy, setSortBy] = useState('dateAdded'); // 'dateAdded', 'name', 'artist', 'duration', 'popularity'
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'liked', 'recent', 'popular'
  const [searchQuery, setSearchQuery] = useState('');
  const [showCollabDialog, setShowCollabDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [playlistForm, setPlaylistForm] = useState({
    name: '',
    description: '',
    isPublic: false,
    collaborative: false,
    image: null
  });
  const [likedTracks, setLikedTracks] = useState(new Set());
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [anchorEl, setAnchorEl] = useState(null);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  const fileInputRef = useRef(null);

  // Mock data for demonstration
  const mockPlaylists = useMemo(() => [
    {
      id: 'playlist1',
      name: 'My Favorites',
      description: 'All my favorite tracks',
      image: '/playlist1.jpg',
      isPublic: true,
      collaborative: false,
      owner: 'You',
      collaborators: [],
      trackCount: 25,
      duration: 6720, // seconds
      lastModified: new Date('2024-01-07'),
      tags: ['favorites', 'mixed']
    },
    {
      id: 'playlist2',
      name: 'Workout Mix',
      description: 'High energy songs for workouts',
      image: '/playlist2.jpg',
      isPublic: false,
      collaborative: true,
      owner: 'You',
      collaborators: [
        { id: 'user1', name: 'John Doe', avatar: '/user1.jpg' },
        { id: 'user2', name: 'Jane Smith', avatar: '/user2.jpg' }
      ],
      trackCount: 18,
      duration: 4320,
      lastModified: new Date('2024-01-06'),
      tags: ['workout', 'high-energy']
    },
    {
      id: 'playlist3',
      name: 'Chill Vibes',
      description: 'Relaxing music for unwinding',
      image: '/playlist3.jpg',
      isPublic: true,
      collaborative: false,
      owner: 'You',
      collaborators: [],
      trackCount: 32,
      duration: 8640,
      lastModified: new Date('2024-01-05'),
      tags: ['chill', 'relaxing']
    }
  ], []);

  const mockTracks = useMemo(() => [
    {
      id: 'track1',
      name: 'Blinding Lights',
      artist: 'The Weeknd',
      album: 'After Hours',
      duration: 200040,
      image: '/track1.jpg',
      addedAt: new Date('2024-01-07'),
      addedBy: 'You',
      popularity: 95,
      audioFeatures: { energy: 0.8, valence: 0.6, danceability: 0.8 }
    },
    {
      id: 'track2',
      name: 'Watermelon Sugar',
      artist: 'Harry Styles',
      album: 'Fine Line',
      duration: 174000,
      image: '/track2.jpg',
      addedAt: new Date('2024-01-06'),
      addedBy: 'John Doe',
      popularity: 88,
      audioFeatures: { energy: 0.6, valence: 0.9, danceability: 0.7 }
    },
    {
      id: 'track3',
      name: 'Levitating',
      artist: 'Dua Lipa',
      album: 'Future Nostalgia',
      duration: 203064,
      image: '/track3.jpg',
      addedAt: new Date('2024-01-05'),
      addedBy: 'Jane Smith',
      popularity: 92,
      audioFeatures: { energy: 0.9, valence: 0.8, danceability: 0.9 }
    }
  ], []);

  const displayPlaylists = playlists.length > 0 ? playlists : mockPlaylists;
  const displayTracks = tracks.length > 0 ? tracks : mockTracks;
  const currentDisplayPlaylist = selectedPlaylist || displayPlaylists[0];

  // Handle playlist creation
  const handleCreatePlaylist = useCallback(async () => {
    try {
      const newPlaylist = {
        ...playlistForm,
        id: `playlist_${Date.now()}`,
        owner: 'You',
        collaborators: [],
        trackCount: 0,
        duration: 0,
        lastModified: new Date(),
        tags: []
      };

      await onCreatePlaylist?.(newPlaylist);
      setIsCreating(false);
      setPlaylistForm({ name: '', description: '', isPublic: false, collaborative: false, image: null });
      setSnackbar({ open: true, message: 'Playlist created successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to create playlist', severity: 'error' });
    }
  }, [playlistForm, onCreatePlaylist]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag and drop
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = displayTracks.findIndex(track => track.id === active.id);
      const newIndex = displayTracks.findIndex(track => track.id === over.id);
      
      const reorderedTracks = arrayMove(displayTracks, oldIndex, newIndex);
      onReorderTracks?.(currentDisplayPlaylist.id, reorderedTracks);
      setSnackbar({ open: true, message: 'Track order updated', severity: 'info' });
    }
  }, [displayTracks, currentDisplayPlaylist, onReorderTracks]);

  // Handle track like
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

  // Format duration
  const formatDuration = useCallback((milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Filter and sort tracks
  const filteredAndSortedTracks = useMemo(() => {
    let filtered = displayTracks;

    // Apply filters
    if (filterBy === 'liked') {
      filtered = filtered.filter(track => likedTracks.has(track.id));
    } else if (filterBy === 'recent') {
      const recent = new Date();
      recent.setDate(recent.getDate() - 7);
      filtered = filtered.filter(track => track.addedAt > recent);
    } else if (filterBy === 'popular') {
      filtered = filtered.filter(track => track.popularity > 80);
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(track =>
        track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.album.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'artist':
          return a.artist.localeCompare(b.artist);
        case 'duration':
          return b.duration - a.duration;
        case 'popularity':
          return b.popularity - a.popularity;
        case 'dateAdded':
        default:
          return new Date(b.addedAt) - new Date(a.addedAt);
      }
    });

    return filtered;
  }, [displayTracks, filterBy, searchQuery, sortBy, likedTracks]);

  // Render playlist card
  const renderPlaylistCard = (playlist) => (
    <Card
      key={playlist.id}
      sx={{
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: selectedPlaylist?.id === playlist.id ? 2 : 0,
        borderColor: 'primary.main',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8]
        }
      }}
      onClick={() => setSelectedPlaylist(playlist)}
    >
      <CardMedia
        component="img"
        height="200"
        image={playlist.image || '/placeholder-playlist.jpg'}
        alt={playlist.name}
      />
      <CardContent>
        <Typography variant="h6" noWrap gutterBottom>
          {playlist.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {playlist.description}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
          <Chip
            icon={playlist.isPublic ? <Public /> : <Lock />}
            label={playlist.isPublic ? 'Public' : 'Private'}
            size="small"
            variant="outlined"
            color={playlist.isPublic ? 'success' : 'default'}
          />
          {playlist.collaborative && (
            <Chip
              icon={<Group />}
              label="Collaborative"
              size="small"
              variant="outlined"
              color="primary"
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {playlist.trackCount} tracks • {Math.round(playlist.duration / 60)} min
          </Typography>
          {playlist.collaborators.length > 0 && (
            <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24 } }}>
              {playlist.collaborators.map((collaborator) => (
                <Avatar
                  key={collaborator.id}
                  src={collaborator.avatar}
                  alt={collaborator.name}
                  sx={{ width: 24, height: 24 }}
                />
              ))}
            </AvatarGroup>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  // Sortable track item component
  const SortableTrackItem = ({ track, index }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: track.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.8 : 1,
    };

    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        {renderTrackItem(track, index, isDragging)}
      </div>
    );
  };

  // Render track item
  const renderTrackItem = (track, index, isDragging = false) => (
    <Card
      sx={{
        mb: 1,
        bgcolor: currentlyPlaying === track.id ? 'primary.main' : 'background.paper',
        color: currentlyPlaying === track.id ? 'white' : 'text.primary',
        opacity: isDragging ? 0.8 : 1,
        transform: isDragging ? 'rotate(5deg)' : 'none',
        transition: 'all 0.2s ease'
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <DragIndicator sx={{ cursor: 'grab', color: 'text.secondary' }} />
          
          <Avatar
            src={track.image}
            alt={track.album}
            variant="rounded"
            sx={{ width: 48, height: 48 }}
          >
            <MusicNote />
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>
              {track.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {track.artist} • {track.album}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              {track.audioFeatures && (
                <>
                  <Chip
                    icon={<Speed />}
                    label={`${Math.round(track.audioFeatures.energy * 100)}%`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    icon={<Psychology />}
                    label={`${Math.round(track.audioFeatures.valence * 100)}%`}
                    size="small"
                    variant="outlined"
                  />
                </>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {formatDuration(track.duration)}
            </Typography>
            <Chip
              icon={<Star />}
              label={track.popularity}
              size="small"
              variant="outlined"
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              onClick={() => {
                setCurrentlyPlaying(currentlyPlaying === track.id ? null : track.id);
                onPlayTrack?.(track);
              }}
              size="small"
              color={currentlyPlaying === track.id ? 'inherit' : 'primary'}
            >
              {currentlyPlaying === track.id ? <Pause /> : <PlayArrow />}
            </IconButton>
            <IconButton
              onClick={() => handleLike(track.id)}
              size="small"
              color={likedTracks.has(track.id) ? 'error' : 'default'}
            >
              {likedTracks.has(track.id) ? <Favorite /> : <FavoriteBorder />}
            </IconButton>
            <IconButton size="small">
              <MoreVert />
            </IconButton>
          </Box>
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
              <QueueMusic color="primary" /> Playlist Manager
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create, organize, and collaborate on your music playlists
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setIsCreating(true)}
            size="large"
          >
            Create Playlist
          </Button>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Playlists Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 'fit-content', position: 'sticky', top: 16 }}>
            <Typography variant="h6" gutterBottom>
              Your Playlists ({displayPlaylists.length})
            </Typography>
            
            <Stack spacing={2}>
              {displayPlaylists.map(renderPlaylistCard)}
            </Stack>
          </Paper>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {currentDisplayPlaylist && (
            <Paper sx={{ p: 3 }}>
              {/* Playlist Header */}
              <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                <Avatar
                  src={currentDisplayPlaylist.image}
                  variant="rounded"
                  sx={{ width: 120, height: 120 }}
                >
                  <QueueMusic sx={{ fontSize: 48 }} />
                </Avatar>
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" gutterBottom>
                    {currentDisplayPlaylist.name}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    {currentDisplayPlaylist.description}
                  </Typography>
                  
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip
                      icon={currentDisplayPlaylist.isPublic ? <Public /> : <Lock />}
                      label={currentDisplayPlaylist.isPublic ? 'Public' : 'Private'}
                      size="small"
                      color={currentDisplayPlaylist.isPublic ? 'success' : 'default'}
                    />
                    {currentDisplayPlaylist.collaborative && (
                      <Chip
                        icon={<Group />}
                        label="Collaborative"
                        size="small"
                        color="primary"
                      />
                    )}
                    <Chip
                      label={`${currentDisplayPlaylist.trackCount} tracks`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`${Math.round(currentDisplayPlaylist.duration / 60)} minutes`}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      startIcon={<PlayArrow />}
                      variant="contained"
                      size="large"
                    >
                      Play All
                    </Button>
                    <Button
                      startIcon={<Shuffle />}
                      variant="outlined"
                    >
                      Shuffle
                    </Button>
                    <Button
                      startIcon={<Share />}
                      variant="outlined"
                      onClick={() => onSharePlaylist?.(currentDisplayPlaylist)}
                    >
                      Share
                    </Button>
                    <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                      <MoreVert />
                    </IconButton>
                  </Box>
                </Box>
              </Box>

              {/* Controls */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <TextField
                  placeholder="Search tracks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: <Search color="action" />
                  }}
                  sx={{ minWidth: 200 }}
                />
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Sort by</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    label="Sort by"
                  >
                    <MenuItem value="dateAdded">Date Added</MenuItem>
                    <MenuItem value="name">Track Name</MenuItem>
                    <MenuItem value="artist">Artist</MenuItem>
                    <MenuItem value="duration">Duration</MenuItem>
                    <MenuItem value="popularity">Popularity</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Filter</InputLabel>
                  <Select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                    label="Filter"
                  >
                    <MenuItem value="all">All Tracks</MenuItem>
                    <MenuItem value="liked">Liked Only</MenuItem>
                    <MenuItem value="recent">Recently Added</MenuItem>
                    <MenuItem value="popular">Popular</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Track List */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredAndSortedTracks.map(track => track.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredAndSortedTracks.map((track, index) => (
                    <SortableTrackItem
                      key={track.id}
                      track={track}
                      index={index}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {filteredAndSortedTracks.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No tracks match your current filters. Try adjusting your search or filter criteria.
                </Alert>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Floating Speed Dial */}
      <SpeedDial
        ariaLabel="Playlist actions"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
        open={speedDialOpen}
        onOpen={() => setSpeedDialOpen(true)}
        onClose={() => setSpeedDialOpen(false)}
      >
        <SpeedDialAction
          icon={<Add />}
          tooltipTitle="Add Track"
          onClick={() => {
            setSpeedDialOpen(false);
            // Handle add track
          }}
        />
        <SpeedDialAction
          icon={<Download />}
          tooltipTitle="Export Playlist"
          onClick={() => {
            setSpeedDialOpen(false);
            // Handle export
          }}
        />
        <SpeedDialAction
          icon={<Settings />}
          tooltipTitle="Playlist Settings"
          onClick={() => {
            setSpeedDialOpen(false);
            setShowSettingsDialog(true);
          }}
        />
      </SpeedDial>

      {/* Create Playlist Dialog */}
      <Dialog open={isCreating} onClose={() => setIsCreating(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Playlist</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Playlist Name"
              value={playlistForm.name}
              onChange={(e) => setPlaylistForm({ ...playlistForm, name: e.target.value })}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={playlistForm.description}
              onChange={(e) => setPlaylistForm({ ...playlistForm, description: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={playlistForm.isPublic}
                  onChange={(e) => setPlaylistForm({ ...playlistForm, isPublic: e.target.checked })}
                />
              }
              label="Make playlist public"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={playlistForm.collaborative}
                  onChange={(e) => setPlaylistForm({ ...playlistForm, collaborative: e.target.checked })}
                />
              }
              label="Allow collaborators"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreating(false)}>Cancel</Button>
          <Button onClick={handleCreatePlaylist} variant="contained" disabled={!playlistForm.name}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default AdvancedPlaylistManagement;