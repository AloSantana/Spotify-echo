import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Chip,
  Button,
  Stack,
  CircularProgress,
  Fade,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Alert,
  Snackbar,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Divider,
  Badge
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  MusicNote,
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  VolumeUp,
  Devices,
  Settings,
  Psychology,
  AutoAwesome,
  Refresh
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';

/**
 * Chat-First Interface
 * Primary interface for EchoTune AI with full AI provider integration and Spotify control
 */
const ChatFirstInterface = ({ sessionId: propSessionId, className }) => {
  const theme = useTheme();
  
  // State
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(propSessionId || `session_${Date.now()}`);
  
  // AI Provider state
  const [providers, setProviders] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [selectedModel, setSelectedModel] = useState('');
  const [providerStatus, setProviderStatus] = useState({});
  
  // Now Playing state
  const [nowPlaying, setNowPlaying] = useState(null);
  const [devices, setDevices] = useState([]);
  
  // UI state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load AI providers and models on mount
  useEffect(() => {
    loadProviders();
    loadProviderStatus();
    initializeSession();
    loadNowPlaying();
  }, []);

  // Initialize chat session
  const initializeSession = async () => {
    try {
      const response = await axios.post('/api/chat/start', {
        sessionId,
        provider: selectedProvider,
        model: selectedModel
      });
      
      if (response.data.success) {
        setSessionId(response.data.session.id || sessionId);
        
        // Add welcome message
        setMessages([{
          id: 'welcome',
          type: 'ai',
          content: 'Welcome to EchoTune AI! I can help you discover music, control playback, create playlists, and more. What would you like to explore today?',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
      showSnackbar('Failed to initialize chat session', 'error');
    }
  };

  // Load available AI providers
  const loadProviders = async () => {
    try {
      const response = await axios.get('/api/llm-providers/models');
      if (response.data.models) {
        // Group models by provider
        const providerMap = {};
        response.data.models.forEach(model => {
          if (!providerMap[model.providerId]) {
            providerMap[model.providerId] = [];
          }
          providerMap[model.providerId].push(model);
        });
        
        setProviders(Object.keys(providerMap));
        setModels(response.data.models);
        
        // Set default model if not set
        if (!selectedModel && response.data.models.length > 0) {
          const defaultModel = response.data.models.find(m => 
            m.providerId === selectedProvider && m.available
          );
          if (defaultModel) {
            setSelectedModel(defaultModel.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
      showSnackbar('Failed to load AI providers', 'warning');
    }
  };

  // Load provider status
  const loadProviderStatus = async () => {
    try {
      const response = await axios.get('/api/llm-providers/status');
      if (response.data.providers) {
        setProviderStatus(response.data.providers);
      }
    } catch (error) {
      console.error('Failed to load provider status:', error);
    }
  };

  // Load now playing
  const loadNowPlaying = async () => {
    try {
      const response = await axios.get('/api/spotify/current-track');
      if (response.data.item) {
        setNowPlaying(response.data);
      }
    } catch (error) {
      // Silently fail - user may not be playing anything
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/chat/message', {
        sessionId,
        message: inputMessage,
        provider: selectedProvider,
        model: selectedModel
      });

      const aiMessage = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        content: response.data.response,
        recommendations: response.data.recommendations,
        spotifyAction: response.data.spotifyAction,
        intent: response.data.intent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // If Spotify action occurred, refresh now playing
      if (response.data.spotifyAction) {
        setTimeout(() => loadNowPlaying(), 1000);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        id: `error_${Date.now()}`,
        type: 'error',
        content: error.response?.data?.message || 'Failed to send message. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      showSnackbar('Failed to send message', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle provider change
  const handleProviderChange = async (event) => {
    const newProvider = event.target.value;
    setSelectedProvider(newProvider);
    
    // Find a default model for this provider
    const providerModels = models.filter(m => m.providerId === newProvider && m.available);
    if (providerModels.length > 0) {
      setSelectedModel(providerModels[0].id);
    }

    // Switch provider via API
    try {
      await axios.post('/api/llm-providers/switch', {
        provider: newProvider,
        model: providerModels[0]?.id
      });
      showSnackbar(`Switched to ${newProvider}`, 'success');
    } catch (error) {
      console.error('Failed to switch provider:', error);
      showSnackbar('Failed to switch provider', 'warning');
    }
  };

  // Handle model change
  const handleModelChange = (event) => {
    setSelectedModel(event.target.value);
  };

  // Spotify playback controls
  const handlePlayPause = async () => {
    try {
      if (nowPlaying?.is_playing) {
        await axios.post('/api/spotify/pause');
        showSnackbar('Paused', 'info');
      } else {
        await axios.post('/api/spotify/play');
        showSnackbar('Playing', 'info');
      }
      setTimeout(() => loadNowPlaying(), 500);
    } catch (error) {
      console.error('Playback control error:', error);
      showSnackbar('Playback control failed', 'error');
    }
  };

  const handleNext = async () => {
    try {
      await axios.post('/api/spotify/next');
      setTimeout(() => loadNowPlaying(), 500);
    } catch (error) {
      console.error('Next track error:', error);
      showSnackbar('Failed to skip track', 'error');
    }
  };

  const handlePrevious = async () => {
    try {
      await axios.post('/api/spotify/previous');
      setTimeout(() => loadNowPlaying(), 500);
    } catch (error) {
      console.error('Previous track error:', error);
      showSnackbar('Failed to go to previous track', 'error');
    }
  };

  // Show snackbar
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Get models for selected provider
  const availableModels = useMemo(() => {
    return models.filter(m => m.providerId === selectedProvider && m.available);
  }, [models, selectedProvider]);

  // Get provider display info
  const getProviderInfo = (providerId) => {
    const status = providerStatus[providerId];
    if (!status) return { name: providerId, available: false };
    return {
      name: status.name || providerId,
      available: status.available || false,
      status: status.status
    };
  };

  return (
    <Box className={className} sx={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100vh' }}>
      {/* Header with model selection */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 2, 
          borderRadius: 0, 
          borderBottom: 1, 
          borderColor: 'divider',
          backgroundColor: theme.palette.mode === 'dark' ? 'background.paper' : 'background.default'
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                <SmartToy />
              </Avatar>
              <Box>
                <Typography variant="h6" component="div">
                  EchoTune AI Chat
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  AI-powered music discovery & control
                </Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-end">
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Provider</InputLabel>
                <Select
                  value={selectedProvider}
                  label="Provider"
                  onChange={handleProviderChange}
                  disabled={isLoading}
                >
                  {providers.map(providerId => {
                    const info = getProviderInfo(providerId);
                    return (
                      <MenuItem key={providerId} value={providerId} disabled={!info.available}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography>{info.name}</Typography>
                          {info.available && (
                            <Badge color="success" variant="dot" />
                          )}
                        </Stack>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
              
              {availableModels.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Model</InputLabel>
                  <Select
                    value={selectedModel}
                    label="Model"
                    onChange={handleModelChange}
                    disabled={isLoading}
                  >
                    {availableModels.map(model => (
                      <MenuItem key={model.id} value={model.id}>
                        <Tooltip title={`${model.qualityTier} quality, ${model.latencyTier} speed`}>
                          <Typography variant="body2">{model.name}</Typography>
                        </Tooltip>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              <Tooltip title="Refresh provider status">
                <IconButton onClick={loadProviderStatus} size="small">
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Main content area with chat and now playing */}
      <Grid container sx={{ flex: 1, overflow: 'hidden' }}>
        {/* Chat messages */}
        <Grid item xs={12} md={nowPlaying ? 8 : 12} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 3,
              backgroundColor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50'
            }}
          >
            <Stack spacing={2}>
              {messages.map((message) => (
                <Fade key={message.id} in timeout={300}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                      alignItems: 'flex-start'
                    }}
                  >
                    {message.type !== 'user' && (
                      <Avatar
                        sx={{
                          bgcolor: message.type === 'error' ? 'error.main' : 'primary.main',
                          mr: 1
                        }}
                      >
                        {message.type === 'error' ? '!' : <Psychology />}
                      </Avatar>
                    )}
                    
                    <Paper
                      elevation={1}
                      sx={{
                        p: 2,
                        maxWidth: '70%',
                        backgroundColor: message.type === 'user' 
                          ? theme.palette.primary.main
                          : message.type === 'error'
                          ? theme.palette.error.dark
                          : theme.palette.background.paper,
                        color: message.type === 'user' || message.type === 'error'
                          ? theme.palette.primary.contrastText
                          : 'text.primary'
                      }}
                    >
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </Typography>
                      
                      {message.recommendations && message.recommendations.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Recommended Tracks:
                          </Typography>
                          <Stack spacing={1}>
                            {message.recommendations.slice(0, 3).map((track, idx) => (
                              <Card key={idx} variant="outlined">
                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <MusicNote fontSize="small" />
                                    <Typography variant="body2">
                                      {track.name} - {track.artist}
                                    </Typography>
                                  </Stack>
                                </CardContent>
                              </Card>
                            ))}
                          </Stack>
                        </Box>
                      )}
                      
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {message.timestamp.toLocaleTimeString()}
                      </Typography>
                    </Paper>
                    
                    {message.type === 'user' && (
                      <Avatar sx={{ bgcolor: 'secondary.main', ml: 1 }}>
                        <Person />
                      </Avatar>
                    )}
                  </Box>
                </Fade>
              ))}
              
              {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 1 }}>
                    <Psychology />
                  </Avatar>
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" sx={{ ml: 2, display: 'inline' }}>
                      Thinking...
                    </Typography>
                  </Paper>
                </Box>
              )}
              
              <div ref={messagesEndRef} />
            </Stack>
          </Box>

          {/* Message input */}
          <Paper
            elevation={3}
            sx={{
              p: 2,
              borderRadius: 0,
              borderTop: 1,
              borderColor: 'divider'
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                ref={inputRef}
                fullWidth
                multiline
                maxRows={4}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask about music, control playback, or create a playlist..."
                disabled={isLoading}
                variant="outlined"
              />
              <IconButton
                color="primary"
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                size="large"
              >
                <Send />
              </IconButton>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip
                icon={<AutoAwesome />}
                label="Suggest examples"
                size="small"
                variant="outlined"
                onClick={() => setInputMessage("What are some popular energetic rock songs?")}
              />
              <Chip
                icon={<MusicNote />}
                label="Create playlist"
                size="small"
                variant="outlined"
                onClick={() => setInputMessage("Create a 30-minute workout playlist")}
              />
            </Stack>
          </Paper>
        </Grid>

        {/* Now Playing sidebar */}
        {nowPlaying && (
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <Paper
              elevation={2}
              sx={{
                height: '100%',
                borderRadius: 0,
                borderLeft: 1,
                borderColor: 'divider',
                p: 3,
                overflowY: 'auto'
              }}
            >
              <Typography variant="h6" gutterBottom>
                Now Playing
              </Typography>
              
              {nowPlaying.item && (
                <Card>
                  {nowPlaying.item.album?.images?.[0]?.url && (
                    <CardMedia
                      component="img"
                      height="200"
                      image={nowPlaying.item.album.images[0].url}
                      alt={nowPlaying.item.name}
                    />
                  )}
                  <CardContent>
                    <Typography variant="h6" noWrap>
                      {nowPlaying.item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {nowPlaying.item.artists?.map(a => a.name).join(', ')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {nowPlaying.item.album?.name}
                    </Typography>
                  </CardContent>
                </Card>
              )}
              
              <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                <Tooltip title="Previous">
                  <IconButton onClick={handlePrevious}>
                    <SkipPrevious />
                  </IconButton>
                </Tooltip>
                <Tooltip title={nowPlaying.is_playing ? "Pause" : "Play"}>
                  <IconButton onClick={handlePlayPause} color="primary" size="large">
                    {nowPlaying.is_playing ? <Pause /> : <PlayArrow />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Next">
                  <IconButton onClick={handleNext}>
                    <SkipNext />
                  </IconButton>
                </Tooltip>
              </Stack>
              
              <Divider sx={{ my: 2 }} />
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Devices />}
                onClick={() => showSnackbar('Device management coming soon', 'info')}
              >
                Devices
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ChatFirstInterface;
