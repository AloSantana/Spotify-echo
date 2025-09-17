import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Avatar,
  Divider
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as AIIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

export default function ConnectedChatInterface() {
  const { user, accessToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [currentProvider, setCurrentProvider] = useState('gemini');
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);

  // Load providers on component mount
  useEffect(() => {
    loadProviders();
    if (user) {
      startChatSession();
    }
  }, [user]);

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/chat/providers');
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
        
        // Set the current provider to the first active one
        const activeProvider = data.providers?.find(p => p.isActive);
        if (activeProvider) {
          setCurrentProvider(activeProvider.name);
        }
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
      setError('Failed to load chat providers');
    }
  };

  const startChatSession = async () => {
    if (!user || !accessToken) return;

    try {
      const response = await fetch('/api/chat/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          provider: currentProvider,
          sessionId: sessionId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.session.sessionId);
        setMessages([{
          id: 'welcome',
          type: 'ai',
          content: '🎵 Welcome to EchoTune AI! I can help you discover music, create playlists, and answer questions about your listening habits. What would you like to explore today?',
          timestamp: new Date()
        }]);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to start chat session');
      }
    } catch (error) {
      console.error('Failed to start chat session:', error);
      setError('Failed to connect to chat service');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading || !user || !sessionId) return;

    const userMessage = {
      id: Date.now() + '-user',
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId: sessionId,
          provider: currentProvider,
          context: {
            userId: user.id,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        const aiMessage = {
          id: Date.now() + '-ai',
          type: 'ai',
          content: data.response || data.message || 'I received your message, but there was no response.',
          provider: data.provider || currentProvider,
          timestamp: new Date(),
          metadata: data.metadata
        };

        setMessages(prev => [...prev, aiMessage]);

        // Handle any recommendations or tracks in the response
        if (data.recommendations) {
          const recMessage = {
            id: Date.now() + '-rec',
            type: 'recommendations',
            content: 'Here are some music recommendations for you:',
            recommendations: data.recommendations,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, recMessage]);
        }

      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to send message');
        
        // Add error message to chat
        const errorMessage = {
          id: Date.now() + '-error',
          type: 'error',
          content: `Error: ${errorData.message || 'Failed to get response'}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setError('Failed to send message');
      
      const errorMessage = {
        id: Date.now() + '-error',
        type: 'error',
        content: 'Connection error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleProviderChange = (event) => {
    setCurrentProvider(event.target.value);
    if (sessionId) {
      // Restart session with new provider
      startChatSession();
    }
  };

  const renderMessage = (message) => {
    const isUser = message.type === 'user';
    const isError = message.type === 'error';
    const isRecommendations = message.type === 'recommendations';

    return (
      <ListItem
        key={message.id}
        sx={{
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          mb: 2
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            flexDirection: isUser ? 'row-reverse' : 'row',
            gap: 1,
            maxWidth: '80%'
          }}
        >
          <Avatar sx={{ 
            bgcolor: isUser ? 'primary.main' : isError ? 'error.main' : 'secondary.main',
            width: 32,
            height: 32
          }}>
            {isUser ? <PersonIcon /> : <AIIcon />}
          </Avatar>
          
          <Card 
            elevation={2}
            sx={{
              bgcolor: isUser ? 'primary.light' : isError ? 'error.light' : 'background.paper',
              color: isUser ? 'primary.contrastText' : 'text.primary'
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="body1" component="div">
                {message.content}
              </Typography>
              
              {message.provider && (
                <Chip 
                  label={message.provider} 
                  size="small" 
                  sx={{ mt: 1 }}
                  variant="outlined"
                />
              )}

              {isRecommendations && message.recommendations && (
                <Box sx={{ mt: 2 }}>
                  {message.recommendations.map((track, index) => (
                    <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                      <CardContent sx={{ p: 1 }}>
                        <Typography variant="body2">
                          {track.name} - {track.artist}
                        </Typography>
                        {track.preview_url && (
                          <Button size="small" sx={{ mt: 1 }}>
                            Play Preview
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {message.timestamp.toLocaleTimeString()}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </ListItem>
    );
  };

  if (!user) {
    return (
      <Paper elevation={3} sx={{ p: 3, m: 2 }}>
        <Alert severity="info">
          Please log in to use the chat interface.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ height: '600px', display: 'flex', flexDirection: 'column', m: 2 }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" justifyContent="between" alignItems="center">
          <Typography variant="h6">
            EchoTune AI Chat
          </Typography>
          
          <Box display="flex" alignItems="center" gap={1}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Provider</InputLabel>
              <Select
                value={currentProvider}
                label="Provider"
                onChange={handleProviderChange}
                disabled={loading}
              >
                {providers.map((provider) => (
                  <MenuItem key={provider.name} value={provider.name}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {provider.name}
                      </Typography>
                      {provider.isActive && (
                        <Chip label="Active" color="success" size="small" />
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <IconButton onClick={loadProviders} size="small">
              <RefreshIcon />
            </IconButton>
            
            <IconButton size="small">
              <SettingsIcon />
            </IconButton>
          </Box>
        </Box>

        {sessionId && (
          <Typography variant="caption" color="text.secondary">
            Session: {sessionId.substring(0, 8)}...
          </Typography>
        )}
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ m: 1 }}>
          {error}
          <Button 
            size="small" 
            onClick={() => setError(null)}
            sx={{ ml: 1 }}
          >
            Dismiss
          </Button>
        </Alert>
      )}

      {/* Messages */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        <List>
          {messages.map(renderMessage)}
          {loading && (
            <ListItem>
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  AI is thinking...
                </Typography>
              </Box>
            </ListItem>
          )}
        </List>
      </Box>

      {/* Input */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box display="flex" gap={1}>
          <TextField
            fullWidth
            multiline
            maxRows={3}
            placeholder="Ask about music, request recommendations, or chat about your listening habits..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading || !sessionId}
            variant="outlined"
            size="small"
          />
          <IconButton
            onClick={sendMessage}
            disabled={!inputMessage.trim() || loading || !sessionId}
            color="primary"
            sx={{ 
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' },
              '&:disabled': { bgcolor: 'action.disabled' }
            }}
          >
            {loading ? <CircularProgress size={20} /> : <SendIcon />}
          </IconButton>
        </Box>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Press Enter to send, Shift+Enter for new line
        </Typography>
      </Box>
    </Paper>
  );
}