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
  CardMedia,
  Button,
  Stack,
  Divider,
  Tooltip,
  CircularProgress,
  Fade,
  Slide,
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
  Snackbar
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
  FilterList
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

/**
 * Modern Chat Interface
 * Advanced conversational music search with enhanced UI and AI recommendations
 */
const ModernChatInterface = ({
  onSendMessage,
  onPlayTrack,
  onLikeTrack,
  onShareTrack,
  sessionId,
  loading = false,
  className
}) => {
  const theme = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [likedTracks, setLikedTracks] = useState(new Set());
  const [currentProvider, setCurrentProvider] = useState('gemini');
  const [quickSuggestions, setQuickSuggestions] = useState([]);
  const [contextMode, setContextMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        type: 'ai',
        content: 'Hi there! 🎵 I\'m your AI music assistant. I can help you discover new music, create playlists, and answer any music-related questions. What kind of music are you in the mood for today?',
        timestamp: new Date(),
        provider: 'system',
        suggestions: [
          'Recommend upbeat songs for working out',
          'Find calm music for studying',
          'Show me trending pop songs',
          'Create a road trip playlist'
        ]
      }]);
    }
  }, [messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sample quick suggestions
  const defaultSuggestions = [
    'Recommend songs like Blinding Lights',
    'Create a workout playlist',
    'Find relaxing instrumental music',
    'What\'s trending in electronic music?',
    'Show me songs from the 90s',
    'Find upbeat songs for cooking'
  ];

  // Handle message sending
  const handleSendMessage = useCallback(async (messageContent = inputMessage) => {
    if (!messageContent.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await onSendMessage?.(messageContent, {
        sessionId,
        contextMode,
        provider: currentProvider,
        previousMessages: messages.slice(-5) // Include context
      });

      // Simulate typing delay
      setTimeout(() => {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: response?.response || 'I apologize, but I\'m having trouble processing your request right now. Could you try rephrasing your question?',
          timestamp: new Date(),
          provider: response?.provider || currentProvider,
          recommendations: response?.recommendations || [],
          explanation: response?.explanation,
          suggestions: response?.suggestions || []
        };

        setMessages(prev => [...prev, aiMessage]);
        setIsTyping(false);

        // Update quick suggestions based on response
        if (response?.suggestions) {
          setQuickSuggestions(response.suggestions);
        }
      }, 1000 + Math.random() * 1000);

    } catch (error) {
      console.error('Chat error:', error);
      setIsTyping(false);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        provider: 'error',
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    }
  }, [inputMessage, onSendMessage, sessionId, contextMode, currentProvider, messages]);

  // Handle voice input
  const handleVoiceInput = useCallback(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSnackbar({ open: true, message: 'Listening...', severity: 'info' });
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setSnackbar({ open: true, message: 'Voice recognition error', severity: 'error' });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      setSnackbar({ open: true, message: 'Voice recognition not supported', severity: 'warning' });
    }
  }, []);

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

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion) => {
    handleSendMessage(suggestion);
  }, [handleSendMessage]);

  // Clear chat
  const handleClearChat = useCallback(() => {
    setMessages([]);
    setSnackbar({ open: true, message: 'Chat cleared', severity: 'info' });
  }, []);

  // Render track recommendation card
  const renderTrackCard = (track, index) => (
    <Card
      key={track.id || index}
      sx={{
        minWidth: 250,
        maxWidth: 300,
        mr: 2,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[6]
        }
      }}
    >
      <CardMedia
        component="img"
        height="140"
        image={track.album?.images?.[0]?.url || track.image || '/placeholder-album.jpg'}
        alt={track.name}
      />
      <CardContent sx={{ p: 2 }}>
        <Typography variant="subtitle2" noWrap gutterBottom>
          {track.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {track.artists?.[0]?.name || track.artist}
        </Typography>
        
        {/* Track features */}
        {track.audioFeatures && (
          <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
            <Chip
              icon={<Speed />}
              label={`${Math.round(track.audioFeatures.energy * 100)}%`}
              size="small"
              variant="outlined"
              color="secondary"
            />
            <Chip
              icon={<Mood />}
              label={`${Math.round(track.audioFeatures.valence * 100)}%`}
              size="small"
              variant="outlined"
              color="primary"
            />
          </Box>
        )}

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

  // Render message
  const renderMessage = (message, index) => {
    const isUser = message.type === 'user';
    const isError = message.isError;

    return (
      <Fade in key={message.id} timeout={300}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            mb: 2,
            alignItems: 'flex-start'
          }}
        >
          {!isUser && (
            <Avatar
              sx={{
                bgcolor: isError ? 'error.main' : 'primary.main',
                mr: 1,
                width: 32,
                height: 32
              }}
            >
              <SmartToy />
            </Avatar>
          )}
          
          <Paper
            sx={{
              p: 2,
              maxWidth: '70%',
              bgcolor: isUser ? 'primary.main' : isError ? 'error.main' : 'background.paper',
              color: isUser || isError ? 'white' : 'text.primary',
              borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              boxShadow: theme.shadows[2]
            }}
          >
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
            </Typography>
            
            {/* Provider badge */}
            {!isUser && message.provider && (
              <Chip
                label={message.provider}
                size="small"
                variant="outlined"
                sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.1)' }}
              />
            )}

            {/* Track recommendations */}
            {message.recommendations && message.recommendations.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>
                  🎵 Recommended tracks:
                </Typography>
                <Box sx={{ display: 'flex', overflowX: 'auto', pb: 1 }}>
                  {message.recommendations.map((track, idx) => renderTrackCard(track, idx))}
                </Box>
              </Box>
            )}

            {/* Explanation */}
            {message.explanation && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                  💡 Why these suggestions:
                </Typography>
                <Typography variant="caption">
                  {message.explanation.summary}
                </Typography>
              </Box>
            )}

            {/* Suggestions */}
            {message.suggestions && message.suggestions.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>
                  Try asking:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {message.suggestions.map((suggestion, idx) => (
                    <Chip
                      key={idx}
                      label={suggestion}
                      size="small"
                      onClick={() => handleSuggestionClick(suggestion)}
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.1)',
                        color: 'inherit',
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.2)'
                        }
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
              {message.timestamp.toLocaleTimeString()}
            </Typography>
          </Paper>

          {isUser && (
            <Avatar
              sx={{
                bgcolor: 'secondary.main',
                ml: 1,
                width: 32,
                height: 32
              }}
            >
              <Person />
            </Avatar>
          )}
        </Box>
      </Fade>
    );
  };

  return (
    <Box className={className} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '16px 16px 0 0',
          background: `linear-gradient(135deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}20)`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <SmartToy />
          </Avatar>
          <Box>
            <Typography variant="h6">AI Music Assistant</Typography>
            <Typography variant="caption" color="text.secondary">
              Powered by {currentProvider} • {contextMode ? 'Context Mode' : 'Simple Mode'}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge badgeContent={likedTracks.size} color="error">
            <IconButton>
              <Favorite />
            </IconButton>
          </Badge>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreVert />
          </IconButton>
        </Box>
      </Paper>

      {/* Settings Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => setContextMode(!contextMode)}>
          <ListItemIcon>
            <Psychology />
          </ListItemIcon>
          <ListItemText>
            {contextMode ? 'Disable' : 'Enable'} Context Mode
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={handleClearChat}>
          <ListItemIcon>
            <Clear />
          </ListItemIcon>
          <ListItemText>Clear Chat</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setShowSettings(true)}>
          <ListItemIcon>
            <Settings />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
      </Menu>

      {/* Messages Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          bgcolor: 'background.default'
        }}
      >
        {messages.map((message, index) => renderMessage(message, index))}
        
        {/* Typing indicator */}
        {isTyping && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
              <SmartToy />
            </Avatar>
            <Paper
              sx={{
                p: 2,
                borderRadius: '18px 18px 18px 4px',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                AI is thinking...
              </Typography>
            </Paper>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>

      {/* Quick Suggestions */}
      {(quickSuggestions.length > 0 || defaultSuggestions.length > 0) && !isTyping && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            💡 Quick suggestions:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {(quickSuggestions.length > 0 ? quickSuggestions : defaultSuggestions).slice(0, 4).map((suggestion, index) => (
              <Chip
                key={index}
                label={suggestion}
                size="small"
                onClick={() => handleSuggestionClick(suggestion)}
                icon={<LightbulbOutlined />}
                variant="outlined"
                sx={{
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: 'white'
                  }
                }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Input Area */}
      <Paper
        sx={{
          p: 2,
          borderRadius: '0 0 16px 16px',
          borderTop: 1,
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
          <TextField
            ref={inputRef}
            fullWidth
            multiline
            maxRows={4}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask me about music, request songs, or create playlists..."
            variant="outlined"
            size="small"
            disabled={loading || isTyping}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3
              }
            }}
          />
          
          <Tooltip title={isListening ? 'Stop listening' : 'Voice input'}>
            <IconButton
              onClick={handleVoiceInput}
              color={isListening ? 'error' : 'default'}
              disabled={loading || isTyping}
            >
              {isListening ? <MicOff /> : <Mic />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Send message">
            <IconButton
              onClick={() => handleSendMessage()}
              color="primary"
              disabled={!inputMessage.trim() || loading || isTyping}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark'
                },
                '&:disabled': {
                  bgcolor: 'action.disabled'
                }
              }}
            >
              <Send />
            </IconButton>
          </Tooltip>
        </Box>
        
        {contextMode && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Context mode enabled - I'll remember our conversation to provide better recommendations
          </Typography>
        )}
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default ModernChatInterface;