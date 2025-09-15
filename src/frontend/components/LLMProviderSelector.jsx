import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Psychology,
  Speed,
  TrendingUp,
  MonetizationOn,
  Refresh,
  CheckCircle,
  Error,
  Warning,
} from '@mui/icons-material';

/**
 * LLM Provider Selector Component
 * Allows users to select and configure LLM providers with real-time status
 */
const LLMProviderSelector = ({ 
  selectedProvider, 
  onProviderChange, 
  disabled = false 
}) => {
  const [providerStatus, setProviderStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Provider configuration
  const providers = {
    openai: {
      name: 'OpenAI',
      icon: '🤖',
      description: 'GPT-4o, GPT-4o-mini with function calling',
      pricing: 'From $0.00015/1K tokens',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
      features: ['Streaming', 'Function Calling', 'High Quality'],
      color: '#00a67e'
    },
    openrouter: {
      name: 'OpenRouter',
      icon: '🌐',
      description: 'Access to 50+ models including free options',
      pricing: 'Free tier available',
      models: ['llama-3.1-8b:free', 'claude-3-sonnet', 'gpt-4o'],
      features: ['Multi-Model', 'Free Options', 'Cost Effective'],
      color: '#7c3aed'
    },
    gemini: {
      name: 'Google Gemini',
      icon: '💎',
      description: 'Large context windows up to 2M tokens',
      pricing: 'From $0.000075/1K tokens',
      models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
      features: ['Large Context', 'Vision', 'Fast Response'],
      color: '#4285f4'
    }
  };

  // Fetch provider status
  const fetchProviderStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/llm/status');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setProviderStatus(data.providers || {});
    } catch (err) {
      console.error('Failed to fetch provider status:', err);
      setError('Failed to load provider status');
    } finally {
      setLoading(false);
    }
  };

  // Load provider status on mount
  useEffect(() => {
    fetchProviderStatus();
  }, []);

  // Get provider status icon
  const getStatusIcon = (providerName) => {
    const status = providerStatus[providerName];
    if (!status) return <Warning color="warning" />;
    
    if (status.available) {
      return <CheckCircle color="success" />;
    } else {
      return <Error color="error" />;
    }
  };

  // Get provider status text
  const getStatusText = (providerName) => {
    const status = providerStatus[providerName];
    if (!status) return 'Unknown';
    
    if (status.available) {
      const successRate = status.telemetry?.successRate || '0%';
      const avgLatency = status.telemetry?.averageLatency || 0;
      return `Active (${successRate} success, ${avgLatency}ms avg)`;
    } else {
      return 'Unavailable';
    }
  };

  const handleProviderChange = (event) => {
    const newProvider = event.target.value;
    onProviderChange(newProvider);
  };

  const renderProviderCard = (providerId, provider) => {
    const status = providerStatus[providerId];
    const isSelected = selectedProvider === providerId;
    
    return (
      <Card 
        key={providerId}
        variant={isSelected ? 'elevation' : 'outlined'}
        sx={{ 
          mb: 2, 
          border: isSelected ? `2px solid ${provider.color}` : undefined,
          opacity: status?.available === false ? 0.6 : 1
        }}
      >
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Box sx={{ fontSize: '2rem' }}>{provider.icon}</Box>
            </Grid>
            <Grid item xs>
              <Typography variant="h6" component="div">
                {provider.name}
                <Box component="span" sx={{ ml: 1 }}>
                  {getStatusIcon(providerId)}
                </Box>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {provider.description}
              </Typography>
              <Typography variant="caption" display="block">
                {getStatusText(providerId)}
              </Typography>
            </Grid>
            <Grid item>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Pricing
                </Typography>
                <Typography variant="body2">
                  {provider.pricing}
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Features:
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              {provider.features.map((feature, index) => (
                <Chip
                  key={index}
                  label={feature}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Models:
            </Typography>
            <Typography variant="body2">
              {provider.models.slice(0, 3).join(', ')}
              {provider.models.length > 3 && ` +${provider.models.length - 3} more`}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Psychology sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6">
          LLM Provider
        </Typography>
        <Tooltip title="Refresh provider status">
          <IconButton onClick={fetchProviderStatus} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading indicator */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {/* Dropdown selector */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Select LLM Provider</InputLabel>
        <Select
          value={selectedProvider || ''}
          onChange={handleProviderChange}
          disabled={disabled || loading}
          label="Select LLM Provider"
        >
          {Object.entries(providers).map(([id, provider]) => {
            const status = providerStatus[id];
            const available = status?.available !== false;
            
            return (
              <MenuItem 
                key={id} 
                value={id}
                disabled={!available}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Box sx={{ mr: 1 }}>{provider.icon}</Box>
                  <Box sx={{ flex: 1 }}>
                    {provider.name}
                    <Typography variant="caption" display="block" color="text.secondary">
                      {provider.description}
                    </Typography>
                  </Box>
                  {getStatusIcon(id)}
                </Box>
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      {/* Provider details cards */}
      <Typography variant="subtitle2" sx={{ mb: 2 }}>
        Available Providers
      </Typography>
      
      {Object.entries(providers).map(([id, provider]) => 
        renderProviderCard(id, provider)
      )}

      {/* Help text */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>Tip:</strong> OpenRouter offers free models, OpenAI provides the highest quality, 
          and Gemini has the largest context windows. The system will automatically fall back to 
          available providers if your primary choice is unavailable.
        </Typography>
      </Alert>
    </Box>
  );
};

export default LLMProviderSelector;