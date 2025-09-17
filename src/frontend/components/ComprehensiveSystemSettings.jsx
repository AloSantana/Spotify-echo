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
  Divider,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Badge
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
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  CloudSync as CloudIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Dns as DnsIcon,
  VpnKey as VpnKeyIcon,
  MusicNote as MusicIcon,
  Psychology as PsychologyIcon,
  Api as ApiIcon,
  MonitorHeart as MonitorIcon,
  Dashboard as DashboardIcon,
  DataUsage as DataIcon
} from '@mui/icons-material';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`comprehensive-tabpanel-${index}`}
      aria-labelledby={`comprehensive-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ComprehensiveSystemSettings() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemData, setSystemData] = useState({
    settings: {},
    providers: [],
    health: {},
    performance: {},
    databases: [],
    mcpServers: [],
    spotifyConfig: {},
    analytics: {}
  });
  const [expandedSections, setExpandedSections] = useState({});
  const [testResults, setTestResults] = useState({});
  const [realTimeData, setRealTimeData] = useState({});
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadSystemData();
    // Set up real-time data polling
    const interval = setInterval(loadRealTimeData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemData = async () => {
    setLoading(true);
    try {
      const [
        settingsRes,
        providersRes,
        healthRes,
        performanceRes,
        spotifyRes
      ] = await Promise.all([
        fetch('/api/simple-settings').catch(() => ({ ok: false })),
        fetch('/api/chat/providers').catch(() => ({ ok: false })),
        fetch('/health').catch(() => ({ ok: false })),
        fetch('/api/performance/summary').catch(() => ({ ok: false })),
        fetch('/api/spotify/config').catch(() => ({ ok: false }))
      ]);

      const newData = { ...systemData };

      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        newData.settings = settings.data || {};
      }

      if (providersRes.ok) {
        const providers = await providersRes.json();
        newData.providers = providers.providers || [];
      }

      if (healthRes.ok) {
        const health = await healthRes.json();
        newData.health = health;
      }

      if (performanceRes.ok) {
        const performance = await performanceRes.json();
        newData.performance = performance;
      }

      if (spotifyRes.ok) {
        const spotify = await spotifyRes.json();
        newData.spotifyConfig = spotify;
      }

      setSystemData(newData);
    } catch (error) {
      console.error('Error loading system data:', error);
      setMessage({ type: 'error', text: 'Failed to load system configuration' });
    } finally {
      setLoading(false);
    }
  };

  const loadRealTimeData = async () => {
    try {
      const [healthRes, metricsRes] = await Promise.all([
        fetch('/health').catch(() => ({ ok: false })),
        fetch('/api/metrics/realtime').catch(() => ({ ok: false }))
      ]);

      const newRealTimeData = {};

      if (healthRes.ok) {
        const health = await healthRes.json();
        newRealTimeData.health = health;
      }

      if (metricsRes.ok) {
        const metrics = await metricsRes.json();
        newRealTimeData.metrics = metrics;
      }

      setRealTimeData(newRealTimeData);
    } catch (error) {
      console.error('Error loading real-time data:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSectionToggle = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const saveConfiguration = async (section, config) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/config/${section}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `${section} configuration saved successfully` });
        loadSystemData();
      } else {
        throw new Error(`Failed to save ${section} configuration`);
      }
    } catch (error) {
      console.error('Save error:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const testComponent = async (component, endpoint) => {
    setTestResults(prev => ({ ...prev, [component]: 'testing' }));
    try {
      const response = await fetch(endpoint);
      const result = response.ok ? 'success' : 'error';
      setTestResults(prev => ({ ...prev, [component]: result }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, [component]: 'error' }));
    }
  };

  const getHealthIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'success':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      case 'warning':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      case 'error':
      case 'failed':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      default:
        return <CircularProgress size={20} />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading comprehensive system settings...</Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <DashboardIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4" component="h2">
          Comprehensive System Configuration
        </Typography>
        <Box sx={{ ml: 'auto' }}>
          <IconButton onClick={loadSystemData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 2 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab icon={<PsychologyIcon />} label="AI/LLM Providers" />
          <Tab icon={<MusicIcon />} label="Spotify Integration" />
          <Tab icon={<StorageIcon />} label="Database Systems" />
          <Tab icon={<MonitorIcon />} label="System Health" />
          <Tab icon={<SpeedIcon />} label="Performance" />
          <Tab icon={<CodeIcon />} label="MCP Servers" />
          <Tab icon={<SecurityIcon />} label="Security & Auth" />
          <Tab icon={<DataIcon />} label="Analytics" />
        </Tabs>
      </Box>

      {/* AI/LLM Providers Tab */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h6" gutterBottom>
          AI/LLM Provider Configuration
        </Typography>
        
        <Grid container spacing={3}>
          {systemData.providers.map((provider, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {getHealthIcon(provider.status)}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      {provider.name}
                    </Typography>
                    <Chip 
                      label={provider.status} 
                      color={provider.status === 'connected' ? 'success' : 'error'}
                      size="small" 
                      sx={{ ml: 'auto' }}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Model: {provider.model || 'Default'}
                  </Typography>
                  
                  {provider.performance && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        Avg Latency: {provider.performance.averageLatency}ms
                      </Typography>
                      <Typography variant="body2">
                        Success Rate: {provider.performance.successRate}%
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={provider.performance.successRate} 
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  )}
                  
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => testComponent(provider.id, `/api/chat/test/${provider.id}`)}
                      disabled={testResults[provider.id] === 'testing'}
                    >
                      {testResults[provider.id] === 'testing' ? 'Testing...' : 'Test'}
                    </Button>
                    <Button size="small" variant="text">
                      Configure
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Spotify Integration Tab */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          Spotify Web API Integration
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  OAuth Configuration
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <TextField
                    label="Client ID"
                    value={systemData.spotifyConfig.clientId || ''}
                    disabled
                    size="small"
                  />
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <TextField
                    label="Redirect URI"
                    value={systemData.spotifyConfig.redirectUri || ''}
                    disabled
                    size="small"
                  />
                </FormControl>
                <FormControlLabel
                  control={<Switch checked={systemData.spotifyConfig.enabled || false} />}
                  label="Enable Spotify Integration"
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Web Player Settings
                </Typography>
                <FormControlLabel
                  control={<Switch checked={systemData.spotifyConfig.webPlayer || false} />}
                  label="Enable Web Player"
                />
                <FormControlLabel
                  control={<Switch checked={systemData.spotifyConfig.autoPlay || false} />}
                  label="Auto Play"
                />
                <Typography gutterBottom sx={{ mt: 2 }}>
                  Audio Quality
                </Typography>
                <Slider
                  value={systemData.spotifyConfig.audioQuality || 1}
                  min={0}
                  max={1}
                  step={0.1}
                  marks={[
                    { value: 0, label: 'Normal' },
                    { value: 0.5, label: 'High' },
                    { value: 1, label: 'Very High' }
                  ]}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Database Systems Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" gutterBottom>
          Database Configuration & Management
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <StorageIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">MongoDB</Typography>
                  {getHealthIcon(systemData.health.mongodb)}
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Primary database for user data and analytics
                </Typography>
                <Button variant="outlined" size="small" sx={{ mt: 1 }}>
                  View Collections
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <MemoryIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Redis Cache</Typography>
                  {getHealthIcon(systemData.health.redis)}
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Session storage and caching layer
                </Typography>
                <Button variant="outlined" size="small" sx={{ mt: 1 }}>
                  View Cache Stats
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <DnsIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">SQLite</Typography>
                  {getHealthIcon(systemData.health.sqlite)}
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Local development database
                </Typography>
                <Button variant="outlined" size="small" sx={{ mt: 1 }}>
                  View Schema
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* System Health Tab */}
      <TabPanel value={tabValue} index={3}>
        <Typography variant="h6" gutterBottom>
          Real-time System Health Monitoring
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Status
                </Typography>
                <List>
                  {Object.entries(systemData.health).map(([key, value]) => (
                    <ListItem key={key}>
                      <ListItemIcon>
                        {getHealthIcon(value.status || value)}
                      </ListItemIcon>
                      <ListItemText 
                        primary={key.toUpperCase()} 
                        secondary={value.message || (typeof value === 'string' ? value : 'OK')}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Real-time Metrics
                </Typography>
                {realTimeData.metrics && (
                  <Box>
                    <Typography variant="body2">
                      CPU Usage: {realTimeData.metrics.cpu || '0'}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={realTimeData.metrics.cpu || 0} 
                      sx={{ my: 1 }}
                    />
                    <Typography variant="body2">
                      Memory Usage: {realTimeData.metrics.memory || '0'}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={realTimeData.metrics.memory || 0} 
                      sx={{ my: 1 }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Performance Tab */}
      <TabPanel value={tabValue} index={4}>
        <Typography variant="h6" gutterBottom>
          Performance Monitoring & Optimization
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  API Response Times
                </Typography>
                {systemData.performance.endpoints && (
                  <Box>
                    {Object.entries(systemData.performance.endpoints).map(([endpoint, data]) => (
                      <Box key={endpoint} sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          {endpoint}: {data.averageTime}ms (P95: {data.p95}ms)
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min((data.averageTime / 1000) * 100, 100)} 
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* MCP Servers Tab */}
      <TabPanel value={tabValue} index={5}>
        <Typography variant="h6" gutterBottom>
          MCP Server Management
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          Model Context Protocol servers provide enhanced AI capabilities and automation.
        </Alert>
        
        <Grid container spacing={3}>
          {[
            { name: 'Package Management', status: 'running', port: 3010 },
            { name: 'Code Sandbox', status: 'running', port: 3011 },
            { name: 'Analytics Server', status: 'running', port: 3012 },
            { name: 'Testing Automation', status: 'stopped', port: 3013 }
          ].map((server, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CodeIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">{server.name}</Typography>
                    <Chip 
                      label={server.status} 
                      color={server.status === 'running' ? 'success' : 'error'}
                      size="small" 
                      sx={{ ml: 'auto' }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Port: {server.port}
                  </Typography>
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined">
                      {server.status === 'running' ? 'Stop' : 'Start'}
                    </Button>
                    <Button size="small" variant="text">
                      View Logs
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Security & Auth Tab */}
      <TabPanel value={tabValue} index={6}>
        <Typography variant="h6" gutterBottom>
          Security & Authentication Configuration
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  JWT Configuration
                </Typography>
                <FormControlLabel
                  control={<Switch checked={systemData.settings.jwtEnabled || true} />}
                  label="Enable JWT Authentication"
                />
                <TextField
                  fullWidth
                  label="Token Expiry (hours)"
                  type="number"
                  value={systemData.settings.jwtExpiry || 24}
                  size="small"
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Rate Limiting
                </Typography>
                <FormControlLabel
                  control={<Switch checked={systemData.settings.rateLimitEnabled || true} />}
                  label="Enable Rate Limiting"
                />
                <TextField
                  fullWidth
                  label="Requests per minute"
                  type="number"
                  value={systemData.settings.rateLimit || 100}
                  size="small"
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Analytics Tab */}
      <TabPanel value={tabValue} index={7}>
        <Typography variant="h6" gutterBottom>
          Analytics & Telemetry Configuration
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Data Collection Settings
                </Typography>
                <FormControlLabel
                  control={<Switch checked={systemData.settings.analyticsEnabled || true} />}
                  label="Enable Analytics Collection"
                />
                <FormControlLabel
                  control={<Switch checked={systemData.settings.performanceTracking || true} />}
                  label="Performance Tracking"
                />
                <FormControlLabel
                  control={<Switch checked={systemData.settings.errorReporting || true} />}
                  label="Error Reporting"
                />
                <FormControlLabel
                  control={<Switch checked={systemData.settings.userBehaviorTracking || false} />}
                  label="User Behavior Tracking (Privacy Sensitive)"
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Save Button */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={() => saveConfiguration('all', systemData)}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} /> : <SettingsIcon />}
        >
          {saving ? 'Saving Configuration...' : 'Save All Changes'}
        </Button>
      </Box>
    </Paper>
  );
}