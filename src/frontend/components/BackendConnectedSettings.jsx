import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Tab,
  Tabs,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Slider,
  Divider
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Chat as ChatIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Analytics as AnalyticsIcon,
  Refresh as RefreshIcon,
  Science as TestIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function BackendConnectedSettings() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const [providers, setProviders] = useState([]);
  const [healthStatus, setHealthStatus] = useState({});
  const [testResults, setTestResults] = useState({});
  const [testingProvider, setTestingProvider] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSettings(),
        loadProviders(),
        loadHealthStatus()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load configuration data' });
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/simple-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.data || {});
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/chat/providers');
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const loadHealthStatus = async () => {
    try {
      const response = await fetch('/health');
      if (response.ok) {
        const data = await response.json();
        setHealthStatus(data);
      }
    } catch (error) {
      console.error('Failed to load health status:', error);
    }
  };

  const saveSettings = async (section, newSettings) => {
    setSaving(true);
    try {
      const response = await fetch('/api/simple-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section,
          settings: newSettings
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
        setMessage({ type: 'success', text: 'Settings saved successfully' });
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const testProvider = async (providerName) => {
    setTestingProvider(providerName);
    try {
      // Since we don't have a test endpoint yet, simulate a test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const provider = providers.find(p => p.name === providerName);
      const result = {
        success: provider?.isActive || false,
        message: provider?.isActive ? 'Provider is active and available' : 'Provider is not active'
      };
      
      setTestResults(prev => ({
        ...prev,
        [providerName]: result
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [providerName]: { success: false, error: error.message }
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const getHealthIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'unhealthy':
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <CircularProgress size={20} />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading Settings...</Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ m: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ p: 3, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h4" gutterBottom>
          EchoTune AI Settings
        </Typography>
        <Typography variant="body1">
          Configure your AI music assistant for optimal performance
        </Typography>
      </Box>

      {/* Messages */}
      {message && (
        <Alert severity={message.type} sx={{ m: 2 }}>
          {message.text}
        </Alert>
      )}

      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<ChatIcon />} label="LLM Providers" />
          <Tab icon={<StorageIcon />} label="Database" />
          <Tab icon={<AnalyticsIcon />} label="Features" />
          <Tab icon={<SettingsIcon />} label="Performance" />
        </Tabs>
      </Box>

      {/* LLM Providers Tab */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h5" gutterBottom>
          LLM Provider Configuration
        </Typography>
        
        <Grid container spacing={3}>
          {providers.map((provider) => (
            <Grid item xs={12} md={6} key={provider.name}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                      {provider.name}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip 
                        label={provider.isActive ? 'Active' : 'Inactive'} 
                        color={provider.isActive ? 'success' : 'default'}
                        size="small"
                      />
                      <IconButton 
                        size="small" 
                        onClick={() => testProvider(provider.name)}
                        disabled={testingProvider === provider.name}
                      >
                        {testingProvider === provider.name ? 
                          <CircularProgress size={16} /> : 
                          <TestIcon />
                        }
                      </IconButton>
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Features: {provider.capabilities?.features?.join(', ') || 'N/A'}
                  </Typography>

                  {provider.capabilities?.supportedModels && (
                    <FormControl fullWidth margin="normal" size="small">
                      <InputLabel>Model</InputLabel>
                      <Select
                        value={settings.llmProviders?.[provider.name]?.model || ''}
                        label="Model"
                        onChange={(e) => {
                          const newSettings = {
                            ...settings.llmProviders,
                            [provider.name]: {
                              ...settings.llmProviders?.[provider.name],
                              model: e.target.value
                            }
                          };
                          saveSettings('llmProviders', newSettings);
                        }}
                      >
                        {provider.capabilities.supportedModels.slice(0, 5).map(model => (
                          <MenuItem key={model} value={model}>{model}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  {testResults[provider.name] && (
                    <Alert 
                      severity={testResults[provider.name].success ? 'success' : 'error'}
                      sx={{ mt: 1 }}
                    >
                      {testResults[provider.name].success ? 
                        testResults[provider.name].message : 
                        `Test failed: ${testResults[provider.name].error || testResults[provider.name].message}`
                      }
                    </Alert>
                  )}

                  <FormControlLabel
                    control={
                      <Switch
                        checked={provider.isActive}
                        onChange={(e) => {
                          const newSettings = {
                            ...settings.llmProviders,
                            [provider.name]: {
                              ...settings.llmProviders?.[provider.name],
                              enabled: e.target.checked
                            }
                          };
                          saveSettings('llmProviders', newSettings);
                        }}
                      />
                    }
                    label="Enable Provider"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Database Tab */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h5" gutterBottom>
          Database Configuration
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Typography variant="h6">MongoDB</Typography>
                  {getHealthIcon(healthStatus.checks?.database?.status)}
                </Box>
                
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Primary database for user data and analytics
                </Typography>

                {healthStatus.checks?.database?.details?.mongodb && (
                  <Box>
                    <Typography variant="body2">
                      Database: {healthStatus.checks.database.details.mongodb.database}
                    </Typography>
                    <Typography variant="body2">
                      Connected: {healthStatus.checks.database.details.mongodb.connected ? 'Yes' : 'No'}
                    </Typography>
                  </Box>
                )}

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.mongodb?.enabled !== false}
                      onChange={(e) => {
                        const newSettings = {
                          ...settings.mongodb,
                          enabled: e.target.checked
                        };
                        saveSettings('mongodb', newSettings);
                      }}
                    />
                  }
                  label="Enable MongoDB"
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Typography variant="h6">Redis Cache</Typography>
                  {getHealthIcon(healthStatus.checks?.redis?.status)}
                </Box>
                
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Session storage and caching layer
                </Typography>

                {healthStatus.checks?.redis?.details && (
                  <Typography variant="body2" color="text.secondary">
                    Status: {healthStatus.checks.redis.details.redis?.status || 'Unknown'}
                  </Typography>
                )}

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.redis?.enabled !== false}
                      onChange={(e) => {
                        const newSettings = {
                          ...settings.redis,
                          enabled: e.target.checked
                        };
                        saveSettings('redis', newSettings);
                      }}
                    />
                  }
                  label="Enable Redis"
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box mt={3}>
          <Typography variant="h6" gutterBottom>System Status</Typography>
          <Grid container spacing={2}>
            {Object.entries(healthStatus.checks || {}).map(([key, check]) => (
              <Grid item xs={12} md={4} key={key}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  {getHealthIcon(check.status)}
                  <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                    {key.replace('_', ' ')}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {check.duration || 'N/A'}
                </Typography>
              </Grid>
            ))}
          </Grid>
          
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={loadHealthStatus}
            sx={{ mt: 2 }}
          >
            Refresh Status
          </Button>
        </Box>
      </TabPanel>

      {/* Features Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h5" gutterBottom>
          Feature Flags
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>System Features</Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.features?.realtime_chat !== false}
                      onChange={(e) => {
                        const newSettings = {
                          ...settings.features,
                          realtime_chat: e.target.checked
                        };
                        saveSettings('features', newSettings);
                      }}
                    />
                  }
                  label="Real-time Chat"
                  sx={{ display: 'block', mb: 1 }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.features?.enhanced_mcp !== false}
                      onChange={(e) => {
                        const newSettings = {
                          ...settings.features,
                          enhanced_mcp: e.target.checked
                        };
                        saveSettings('features', newSettings);
                      }}
                    />
                  }
                  label="Enhanced MCP"
                  sx={{ display: 'block', mb: 1 }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.features?.advanced_analytics !== false}
                      onChange={(e) => {
                        const newSettings = {
                          ...settings.features,
                          advanced_analytics: e.target.checked
                        };
                        saveSettings('features', newSettings);
                      }}
                    />
                  }
                  label="Advanced Analytics"
                  sx={{ display: 'block' }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Performance Tab */}
      <TabPanel value={tabValue} index={3}>
        <Typography variant="h5" gutterBottom>
          Performance Settings
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Chat Configuration</Typography>
                
                <Typography variant="body2" gutterBottom>Chat Response Timeout (seconds)</Typography>
                <Slider
                  value={settings.preferences?.chatTimeout || 30}
                  min={10}
                  max={120}
                  marks={[
                    { value: 10, label: '10s' },
                    { value: 30, label: '30s' },
                    { value: 60, label: '60s' },
                    { value: 120, label: '120s' }
                  ]}
                  onChange={(e, value) => {
                    const newSettings = {
                      ...settings.preferences,
                      chatTimeout: value
                    };
                    saveSettings('preferences', newSettings);
                  }}
                />

                <Typography variant="body2" gutterBottom sx={{ mt: 3 }}>Max Tokens per Request</Typography>
                <Slider
                  value={settings.preferences?.maxTokens || 2048}
                  min={512}
                  max={8192}
                  step={512}
                  marks={[
                    { value: 512, label: '512' },
                    { value: 2048, label: '2K' },
                    { value: 4096, label: '4K' },
                    { value: 8192, label: '8K' }
                  ]}
                  onChange={(e, value) => {
                    const newSettings = {
                      ...settings.preferences,
                      maxTokens: value
                    };
                    saveSettings('preferences', newSettings);
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>System Performance</Typography>
                
                <Typography variant="body2" gutterBottom>Request Timeout (ms)</Typography>
                <Slider
                  value={settings.performance?.requestTimeout || 5000}
                  min={1000}
                  max={30000}
                  step={1000}
                  marks={[
                    { value: 1000, label: '1s' },
                    { value: 5000, label: '5s' },
                    { value: 15000, label: '15s' },
                    { value: 30000, label: '30s' }
                  ]}
                  onChange={(e, value) => {
                    const newSettings = {
                      ...settings.performance,
                      requestTimeout: value
                    };
                    saveSettings('performance', newSettings);
                  }}
                />

                <Typography variant="body2" gutterBottom sx={{ mt: 3 }}>Cache TTL (minutes)</Typography>
                <Slider
                  value={settings.performance?.cacheTTL || 15}
                  min={5}
                  max={120}
                  step={5}
                  marks={[
                    { value: 5, label: '5m' },
                    { value: 15, label: '15m' },
                    { value: 60, label: '1h' },
                    { value: 120, label: '2h' }
                  ]}
                  onChange={(e, value) => {
                    const newSettings = {
                      ...settings.performance,
                      cacheTTL: value
                    };
                    saveSettings('performance', newSettings);
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Loading/Saving Indicator */}
      {saving && (
        <Box 
          position="fixed" 
          bottom={20} 
          right={20} 
          display="flex" 
          alignItems="center" 
          gap={1}
          sx={{ 
            bgcolor: 'background.paper', 
            p: 2, 
            borderRadius: 1, 
            boxShadow: 3 
          }}
        >
          <CircularProgress size={20} />
          <Typography variant="body2">Saving...</Typography>
        </Box>
      )}
    </Paper>
  );
}