import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Chip,
  Card,
  CardContent,
  Button,
  Stack,
  Divider,
  Tooltip,
  CircularProgress,
  Fade,
  LinearProgress,
  Fab,
  Badge,
  Switch,
  FormControlLabel,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Snackbar,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Grid,
  List,
  ListItem,
  ListItemButton,
  AppBar,
  Toolbar
} from '@mui/material';
import {
  Send,
  MusicNote,
  Person,
  SmartToy,
  Psychology,
  PlayArrow,
  Favorite,
  FavoriteBorder,
  Share,
  Add,
  MoreVert,
  VolumeUp,
  Speed,
  GraphicEq,
  Mic,
  MicOff,
  Stop,
  Refresh,
  Settings,
  LightbulbOutlined,
  AutoAwesome,
  Tune,
  Clear,
  KeyboardVoice,
  TrendingUp,
  Mood,
  Album,
  Queue,
  Shuffle,
  FilterList,
  SpeedRounded,
  ModelTraining,
  Api,
  Cloud,
  Verified,
  Error as ErrorIcon,
  CheckCircle,
  Warning,
  Close,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';

/**
 * Enhanced Modern Chat Interface with Advanced Configuration
 * Features:
 * - Real-time LLM provider switching and configuration
 * - Beautiful modern UI with Material Design 3
 * - Voice input capabilities
 * - Smart suggestions and context awareness
 * - Performance monitoring and analytics
 * - Full backend integration with settings synchronization
 */
const EnhancedModernChatInterface = ({
  onSendMessage,
  onPlayTrack,
  onLikeTrack,
  onShareTrack,
  sessionId,
  loading = false,
  className
}) => {
  const theme = useTheme();
  const { user, accessToken } = useAuth();
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [likedTracks, setLikedTracks] = useState(new Set());
  
  // Provider and configuration state
  const [providers, setProviders] = useState([]);
  const [currentProvider, setCurrentProvider] = useState('gemini');
  const [currentModel, setCurrentModel] = useState('gemini-1.5-flash');
  const [providerModels, setProviderModels] = useState({});
  const [providerStatus, setProviderStatus] = useState({});
  const [chatSettings, setChatSettings] = useState({
    temperature: 0.7,
    maxTokens: 1000,
    contextLength: 10,
    enableStreaming: true,
    enableContext: true,
    enableSuggestions: true
  });
  
  // UI state
  const [quickSuggestions, setQuickSuggestions] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [expanded, setExpanded] = useState(false);
  
  // Performance monitoring
  const [messageStats, setMessageStats] = useState({
    totalMessages: 0,
    avgResponseTime: 0,
    successRate: 100,
    lastUpdated: new Date()
  });
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);

  // Load providers and configuration on mount
  useEffect(() => {
    loadProviders();
    loadChatSettings();
    initializeQuickSuggestions();
  }, []);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        type: 'ai',
        provider: currentProvider,
        model: currentModel,
        content: '🎵 Welcome to EchoTune AI! I\'m your intelligent music companion. Ask me to discover new music, create playlists, or chat about your favorite artists. What would you like to explore today?',
        timestamp: new Date(),
        suggestions: [
          'Find me upbeat music for working out',
          'Create a chill evening playlist',
          'What\'s trending in indie rock?',
          'Recommend music based on my mood'
        ]
      }]);
    }
  }, [messages.length, currentProvider, currentModel]);

  // Load available providers from backend
  const loadProviders = async () => {
    try {
      const response = await fetch('/api/chat/providers', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
        setProviderModels(data.models || {});
        setProviderStatus(data.status || {});
        
        // Set default provider if available
        if (data.providers && data.providers.length > 0) {
          const defaultProvider = data.providers.find(p => p.isDefault) || data.providers[0];
          setCurrentProvider(defaultProvider.id);
          if (data.models[defaultProvider.id] && data.models[defaultProvider.id].length > 0) {
            setCurrentModel(data.models[defaultProvider.id][0].id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
      showNotification('Failed to load AI providers', 'error');
    }
  };

  // Load chat settings from backend
  const loadChatSettings = async () => {
    try {
      const response = await fetch('/api/simple-settings', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.chatSettings) {
          setChatSettings(prev => ({ ...prev, ...data.chatSettings }));
        }
      }
    } catch (error) {
      console.error('Failed to load chat settings:', error);
    }
  };

  // Save chat settings to backend
  const saveChatSettings = async (newSettings) => {
    try {
      const response = await fetch('/api/simple-settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chatSettings: newSettings
        })
      });
      
      if (response.ok) {
        setChatSettings(newSettings);
        showNotification('Chat settings saved successfully', 'success');
      }
    } catch (error) {
      console.error('Failed to save chat settings:', error);
      showNotification('Failed to save settings', 'error');
    }
  };

  // Initialize quick suggestions
  const initializeQuickSuggestions = () => {
    const suggestions = [
      '🎵 Discover new music for me',
      '🎸 What\'s trending in rock music?',
      '🎹 Create a jazz playlist',
      '🎤 Tell me about [artist name]',
      '🎧 Music for studying',
      '💃 Upbeat songs for dancing',
      '😌 Relaxing ambient music',
      '🏃 Workout playlist'
    ];
    setQuickSuggestions(suggestions.slice(0, 4));
  };

  // Send message with provider selection
  const handleSendMessage = async (messageText = inputMessage, provider = currentProvider, model = currentModel) => {
    if (!messageText.trim()) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    const startTime = Date.now();

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: messageText,
          provider: provider,
          model: model,
          sessionId: sessionId,
          settings: chatSettings,
          context: chatSettings.enableContext ? messages.slice(-chatSettings.contextLength) : []
        })
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        
        const aiMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          provider: provider,
          model: model,
          content: data.message || data.response,
          timestamp: new Date(),
          responseTime: responseTime,
          tracks: data.tracks || [],
          suggestions: data.suggestions || []
        };

        setMessages(prev => [...prev, aiMessage]);
        
        // Update performance stats
        setMessageStats(prev => ({
          totalMessages: prev.totalMessages + 1,
          avgResponseTime: Math.round((prev.avgResponseTime * prev.totalMessages + responseTime) / (prev.totalMessages + 1)),
          successRate: Math.round(((prev.successRate * prev.totalMessages / 100) + 1) / (prev.totalMessages + 1) * 100),
          lastUpdated: new Date()
        }));

        if (onSendMessage) {
          onSendMessage(data);
        }
      } else {
        throw new Error(`API request failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorMessage = {
        id: `error-${Date.now()}`,
        type: 'error',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      showNotification('Failed to send message', 'error');
    } finally {
      setIsTyping(false);
    }
  };

  // Handle provider change
  const handleProviderChange = async (providerId, modelId = null) => {
    setCurrentProvider(providerId);
    
    if (modelId) {
      setCurrentModel(modelId);
    } else if (providerModels[providerId] && providerModels[providerId].length > 0) {
      setCurrentModel(providerModels[providerId][0].id);
    }

    // Test provider connection
    try {
      const response = await fetch('/api/chat/providers/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: providerId,
          model: modelId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setProviderStatus(prev => ({
          ...prev,
          [providerId]: {
            status: 'healthy',
            latency: data.latency,
            lastTested: new Date()
          }
        }));
        showNotification(`Switched to ${providerId}`, 'success');
      }
    } catch (error) {
      console.error('Provider test failed:', error);
      setProviderStatus(prev => ({
        ...prev,
        [providerId]: {
          status: 'error',
          error: error.message,
          lastTested: new Date()
        }
      }));
    }

    setShowProviderMenu(false);
  };

  // Voice recognition
  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      showNotification('Voice input not supported in this browser', 'warning');
      return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(transcript);
      showNotification('Voice input captured', 'success');
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      showNotification('Voice input failed', 'error');
      setIsListening(false);
    };

    recognition.start();
  };

  // Utility functions
  const showNotification = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLikeTrack = (trackId) => {
    setLikedTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
    
    if (onLikeTrack) {
      onLikeTrack(trackId);
    }
  };

  // Get provider status icon
  const getProviderStatusIcon = (providerId) => {
    const status = providerStatus[providerId];
    if (!status) return <Warning color="warning" />;
    
    switch (status.status) {
      case 'healthy':
        return <CheckCircle color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <Warning color="warning" />;
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <Box
      className={className}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: theme.shadows[4]
      }}
    >
      {/* Enhanced Header with Provider Selection */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          color: 'text.primary'
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important' }}>
          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
            <SmartToy />
          </Avatar>
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div">
              EchoTune AI Chat
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentProvider} • {currentModel} • {messageStats.totalMessages} messages
            </Typography>
          </Box>

          {/* Provider Selection */}
          <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
            <InputLabel>Provider</InputLabel>
            <Select
              value={currentProvider}
              label="Provider"
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              {providers.map((provider) => (
                <MenuItem key={provider.id} value={provider.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getProviderStatusIcon(provider.id)}
                    {provider.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Model Selection */}
          {providerModels[currentProvider] && (
            <FormControl size="small" sx={{ minWidth: 140, mr: 2 }}>
              <InputLabel>Model</InputLabel>
              <Select
                value={currentModel}
                label="Model"
                onChange={(e) => setCurrentModel(e.target.value)}
              >
                {providerModels[currentProvider].map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Settings Button */}
          <IconButton
            onClick={() => setShowSettings(true)}
            color="inherit"
          >
            <Settings />
          </IconButton>

          {/* Expand/Collapse */}
          <IconButton
            onClick={() => setExpanded(!expanded)}
            color="inherit"
          >
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Toolbar>

        {/* Performance Stats Bar */}
        {expanded && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary">
                  Avg Response: {messageStats.avgResponseTime}ms
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary">
                  Success Rate: {messageStats.successRate}%
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary">
                  Provider Status: {providerStatus[currentProvider]?.status || 'unknown'}
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary">
                  Context: {chatSettings.enableContext ? 'On' : 'Off'}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}
      </AppBar>

      {/* Messages Area */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}
      >
        {messages.map((message) => (
          <Fade key={message.id} in={true} timeout={500}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                mb: 1
              }}
            >
              <Card
                sx={{
                  maxWidth: '70%',
                  bgcolor: message.type === 'user' 
                    ? 'primary.main' 
                    : message.type === 'error'
                    ? 'error.main'
                    : 'grey.100',
                  color: message.type === 'user' || message.type === 'error' 
                    ? 'white' 
                    : 'text.primary'
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  {/* Message Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar sx={{ width: 24, height: 24, mr: 1 }}>
                      {message.type === 'user' ? <Person /> : <SmartToy />}
                    </Avatar>
                    <Typography variant="caption" color="inherit" sx={{ opacity: 0.8 }}>
                      {message.type === 'user' ? 'You' : `AI (${message.provider || 'Unknown'})`}
                      {message.responseTime && ` • ${message.responseTime}ms`}
                    </Typography>
                  </Box>

                  {/* Message Content */}
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    {message.content}
                  </Typography>

                  {/* Track Recommendations */}
                  {message.tracks && message.tracks.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        🎵 Recommended Tracks:
                      </Typography>
                      <Stack spacing={1}>
                        {message.tracks.map((track, index) => (
                          <Card key={index} variant="outlined" sx={{ p: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <IconButton
                                size="small"
                                onClick={() => onPlayTrack && onPlayTrack(track)}
                              >
                                <PlayArrow />
                              </IconButton>
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="body2" fontWeight="bold">
                                  {track.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {track.artist}
                                </Typography>
                              </Box>
                              <IconButton
                                size="small"
                                onClick={() => handleLikeTrack(track.id)}
                              >
                                {likedTracks.has(track.id) ? <Favorite /> : <FavoriteBorder />}
                              </IconButton>
                            </Box>
                          </Card>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Quick Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="inherit" sx={{ opacity: 0.8 }}>
                        Quick suggestions:
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                        {message.suggestions.map((suggestion, index) => (
                          <Chip
                            key={index}
                            label={suggestion}
                            size="small"
                            onClick={() => handleSendMessage(suggestion)}
                            sx={{ mb: 0.5 }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Timestamp */}
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.6 }}>
                    {message.timestamp.toLocaleTimeString()}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Fade>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Card sx={{ bgcolor: 'grey.100' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 24, height: 24 }}>
                    <SmartToy />
                  </Avatar>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    AI is thinking...
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Quick Suggestions */}
      {quickSuggestions.length > 0 && messages.length <= 1 && (
        <Box sx={{ p: 2, pt: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Try these suggestions:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {quickSuggestions.map((suggestion, index) => (
              <Chip
                key={index}
                label={suggestion}
                variant="outlined"
                onClick={() => handleSendMessage(suggestion)}
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Input Area */}
      <Box sx={{ p: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            ref={inputRef}
            fullWidth
            multiline
            maxRows={4}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask me about music, artists, or request recommendations..."
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={loading || isTyping}
            variant="outlined"
            size="small"
          />
          
          <IconButton
            onClick={handleVoiceInput}
            disabled={loading || isTyping}
            color={isListening ? 'primary' : 'default'}
          >
            {isListening ? <MicOff /> : <Mic />}
          </IconButton>
          
          <IconButton
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || loading || isTyping}
            color="primary"
          >
            <Send />
          </IconButton>
        </Box>
      </Box>

      {/* Settings Dialog */}
      <Dialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Chat Configuration
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                AI Response Settings
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Temperature: {chatSettings.temperature}
                </Typography>
                <Slider
                  value={chatSettings.temperature}
                  onChange={(_, value) => setChatSettings(prev => ({ ...prev, temperature: value }))}
                  min={0}
                  max={1}
                  step={0.1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
              
              <TextField
                fullWidth
                label="Max Tokens"
                type="number"
                value={chatSettings.maxTokens}
                onChange={(e) => setChatSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Context Length (messages)"
                type="number"
                value={chatSettings.contextLength}
                onChange={(e) => setChatSettings(prev => ({ ...prev, contextLength: parseInt(e.target.value) }))}
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Feature Toggles
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={chatSettings.enableStreaming}
                    onChange={(e) => setChatSettings(prev => ({ ...prev, enableStreaming: e.target.checked }))}
                  />
                }
                label="Enable Streaming Responses"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={chatSettings.enableContext}
                    onChange={(e) => setChatSettings(prev => ({ ...prev, enableContext: e.target.checked }))}
                  />
                }
                label="Enable Conversation Context"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={chatSettings.enableSuggestions}
                    onChange={(e) => setChatSettings(prev => ({ ...prev, enableSuggestions: e.target.checked }))}
                  />
                }
                label="Enable Smart Suggestions"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              saveChatSettings(chatSettings);
              setShowSettings(false);
            }}
            variant="contained"
          >
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EnhancedModernChatInterface;