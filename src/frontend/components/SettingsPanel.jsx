import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tab,
  Tabs,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Slider,
  FormGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  IconButton,
  Snackbar,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Settings,
  Psychology,
  Security,
  Tune,
  Save,
  Refresh,
  ExpandMore,
  PlaylistPlay,
  Assessment,
  RestorePageOutlined,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import LLMProviderSelector from './LLMProviderSelector';

/**
 * Settings Panel Component
 * Phase 3 User Settings with optimistic concurrency, weight normalization, and provider override
 */
const SettingsPanel = ({ userId, onSettingsChange }) => {
  const [tabValue, setTabValue] = useState(0);
  const [settings, setSettings] = useState(null);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [providerStatus, setProviderStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [weightSum, setWeightSum] = useState(1.0);
  const [normalizedWeights, setNormalizedWeights] = useState(null);

  // Load user settings
  const loadSettings = useCallback(async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load user settings and provider status in parallel
      const [settingsResponse, statusResponse] = await Promise.all([
        fetch('/api/user-settings', {
          headers: { 'x-user-id': userId }
        }),
        fetch('/api/user-settings/providers/status')
      ]);

      if (!settingsResponse.ok) {
        throw new Error(`Settings API error: ${settingsResponse.status} ${settingsResponse.statusText}`);
      }

      if (!statusResponse.ok) {
        throw new Error(`Provider status error: ${statusResponse.status} ${statusResponse.statusText}`);
      }

      const [settingsData, statusData] = await Promise.all([
        settingsResponse.json(),
        statusResponse.json()
      ]);

      setSettings(settingsData.data);
      setOriginalSettings(JSON.parse(JSON.stringify(settingsData.data)));
      setProviderStatus(statusData.data);
      setHasChanges(false);
      updateWeightCalculations(settingsData.data.strategyWeights);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Helper to calculate weight normalization
  const updateWeightCalculations = (weights) => {
    if (!weights) return;
    
    const { collaborative = 0, content = 0, semantic = 0, diversity = 0 } = weights;
    const baseSum = collaborative + content + semantic;
    setWeightSum(baseSum + diversity);
    
    // Show normalized preview
    if (baseSum > 0) {
      const factor = 1.0 / baseSum;
      setNormalizedWeights({
        collaborative: Math.round(collaborative * factor * 1000000) / 1000000,
        content: Math.round(content * factor * 1000000) / 1000000,
        semantic: Math.round(semantic * factor * 1000000) / 1000000,
        diversity: diversity
      });
    } else {
      setNormalizedWeights({
        collaborative: 0.333333,
        content: 0.333333,
        semantic: 0.333334,
        diversity: diversity
      });
    }
  };

  // Save settings
  const saveSettings = async () => {
    if (!userId || !settings) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/user-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'If-Unmodified-Since': originalSettings?.updatedAt || '',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 409 && errorData.error === 'VERSION_CONFLICT') {
          setError(
            `Settings were modified by another session. ` +
            `Server version: ${errorData.serverVersion}. ` +
            `Please refresh to see the latest changes.`
          );
          return;
        }
        
        if (response.status === 400) {
          setError(`Validation error: ${errorData.message}`);
          return;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSettings(data.data);
      setOriginalSettings(JSON.parse(JSON.stringify(data.data)));
      setHasChanges(false);
      setSuccessMessage('Settings saved successfully');
      updateWeightCalculations(data.data.strategyWeights);

      // Notify parent component
      if (onSettingsChange) {
        onSettingsChange(data.data);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const resetToDefaults = async () => {
    try {
      const response = await fetch('/api/user-settings/defaults');
      if (!response.ok) {
        throw new Error('Failed to load default settings');
      }

      const data = await response.json();
      setSettings({ ...data.data, userId });
      setHasChanges(true);
    } catch (err) {
      console.error('Failed to reset to defaults:', err);
      setError('Failed to reset to defaults');
    }
  };

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Check for changes
  useEffect(() => {
    if (settings && originalSettings) {
      const hasChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings);
      setHasChanges(hasChanged);
    }
  }, [settings, originalSettings]);

  // Update settings helper
  const updateSettings = (path, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      
      // Update weight calculations if strategy weights changed
      if (path.startsWith('strategyWeights.')) {
        updateWeightCalculations(newSettings.strategyWeights);
      }
      
      return newSettings;
    });
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!settings) {
    return (
      <Alert severity="error">
        Failed to load settings. Please refresh the page.
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Settings sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Settings
        </Typography>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Tooltip title="Reset to defaults">
            <IconButton onClick={resetToDefaults} disabled={saving}>
              <RestorePageOutlined />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh settings">
            <IconButton onClick={loadSettings} disabled={saving}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={saveSettings}
            disabled={!hasChanges || saving}
            sx={{ ml: 1 }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Unsaved changes warning */}
      {hasChanges && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You have unsaved changes. Don't forget to save them!
        </Alert>
      )}

      {/* Tabs */}
      <Card sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<Psychology />} label="AI Provider" />
          <Tab icon={<Tune />} label="Recommendations" />
          <Tab icon={<Security />} label="Privacy" />
          <Tab icon={<PlaylistPlay />} label="Playlists" />
          <Tab icon={<Assessment />} label="Preferences" />
        </Tabs>
      </Card>

      {/* Tab Panels */}
      <Card>
        <CardContent>
          {/* AI Provider Tab */}
          {tabValue === 0 && (
            <Box>
              {/* Provider Status */}
              {providerStatus && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Provider Status
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.values(providerStatus.providers).map(provider => (
                      <Grid item xs={12} md={4} key={provider.id}>
                        <Paper sx={{ p: 2, border: 1, borderColor: provider.available ? 'success.main' : 'error.main' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            {provider.available ? 
                              <CheckCircle sx={{ color: 'success.main', mr: 1 }} /> :
                              <ErrorIcon sx={{ color: 'error.main', mr: 1 }} />
                            }
                            <Typography variant="subtitle1">
                              {provider.name}
                            </Typography>
                            {provider.default && (
                              <Chip size="small" label="Default" sx={{ ml: 1 }} />
                            )}
                          </Box>
                          {!provider.available && provider.reasonUnavailable && (
                            <Typography variant="caption" color="error">
                              {provider.reasonUnavailable}
                            </Typography>
                          )}
                          {provider.available && (
                            <Typography variant="caption" color="text.secondary">
                              Models: {provider.models.slice(0, 2).join(', ')}
                              {provider.models.length > 2 && ` +${provider.models.length - 2} more`}
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* Provider Override */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Provider Override
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Override Provider (Optional)</InputLabel>
                  <Select
                    value={settings.providerOverride || ''}
                    onChange={(e) => updateSettings('providerOverride', e.target.value || null)}
                    disabled={saving}
                  >
                    <MenuItem value="">
                      <em>Use automatic selection</em>
                    </MenuItem>
                    {providerStatus?.providers && Object.values(providerStatus.providers)
                      .filter(p => p.available)
                      .map(provider => (
                        <MenuItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </MenuItem>
                      ))
                    }
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Override the automatic provider selection with a specific choice
                </Typography>
              </Box>

              <LLMProviderSelector
                selectedProvider={settings.llmProvider}
                onProviderChange={(provider) => updateSettings('llmProvider', provider)}
                disabled={saving}
              />
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" sx={{ mb: 2 }}>
                Model Configuration
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Default Model"
                    value={settings.llmModel || ''}
                    onChange={(e) => updateSettings('llmModel', e.target.value)}
                    disabled={saving}
                    helperText="Override the default model for your selected provider"
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Recommendations Tab */}
          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Recommendation Strategy Weights
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Adjust how much influence each strategy has on your recommendations.
                The first three weights will be automatically normalized to sum to 1.0.
              </Typography>

              {/* Weight normalization preview */}
              {normalizedWeights && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Normalized weights preview:</strong><br />
                    Collaborative: {normalizedWeights.collaborative.toFixed(6)}, 
                    Content: {normalizedWeights.content.toFixed(6)}, 
                    Semantic: {normalizedWeights.semantic.toFixed(6)}<br />
                    Diversity: {normalizedWeights.diversity.toFixed(6)} (not normalized)
                  </Typography>
                </Alert>
              )}

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Collaborative Filtering
                  </Typography>
                  <Box sx={{ px: 2 }}>
                    <Slider
                      value={settings.strategyWeights?.collaborative || 0.3}
                      onChange={(e, value) => updateSettings('strategyWeights.collaborative', value)}
                      min={0}
                      max={1}
                      step={0.05}
                      marks
                      valueLabelDisplay="auto"
                      disabled={saving}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Based on similar users' listening patterns
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Content-Based Analysis
                  </Typography>
                  <Box sx={{ px: 2 }}>
                    <Slider
                      value={settings.strategyWeights?.content || 0.3}
                      onChange={(e, value) => updateSettings('strategyWeights.content', value)}
                      min={0}
                      max={1}
                      step={0.05}
                      marks
                      valueLabelDisplay="auto"
                      disabled={saving}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Based on audio features and metadata
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Semantic Similarity
                  </Typography>
                  <Box sx={{ px: 2 }}>
                    <Slider
                      value={settings.strategyWeights?.semantic || 0.3}
                      onChange={(e, value) => updateSettings('strategyWeights.semantic', value)}
                      min={0}
                      max={1}
                      step={0.05}
                      marks
                      valueLabelDisplay="auto"
                      disabled={saving}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Based on embedding vectors and AI analysis
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Diversity Boost
                  </Typography>
                  <Box sx={{ px: 2 }}>
                    <Slider
                      value={settings.strategyWeights?.diversity || 0.1}
                      onChange={(e, value) => updateSettings('strategyWeights.diversity', value)}
                      min={0}
                      max={1}
                      step={0.05}
                      marks
                      valueLabelDisplay="auto"
                      disabled={saving}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Adds variety and prevents echo chambers (not normalized)
                  </Typography>
                </Grid>
              </Grid>

              <Alert 
                severity={Math.abs(weightSum - 1.0) > 0.01 ? "warning" : "success"} 
                sx={{ mt: 3 }}
              >
                <Typography variant="body2">
                  <strong>Current total:</strong> {weightSum.toFixed(3)}
                  {Math.abs(weightSum - 1.0) > 0.01 ? 
                    ' (Weights will be automatically normalized on save)' :
                    ' ✓ Weights are balanced'
                  }
                </Typography>
              </Alert>
            </Box>
          )}

          {/* Privacy Tab */}
          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Privacy & Data Settings
              </Typography>

              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.privacy?.storeHistory || false}
                      onChange={(e) => updateSettings('privacy.storeHistory', e.target.checked)}
                      disabled={saving}
                    />
                  }
                  label="Store Conversation History"
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                  Save your chat conversations for better personalization
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.privacy?.shareAnalytics || false}
                      onChange={(e) => updateSettings('privacy.shareAnalytics', e.target.checked)}
                      disabled={saving}
                    />
                  }
                  label="Share Anonymous Analytics"
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                  Help improve EchoTune by sharing anonymous usage data
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.privacy?.enableTelemetry || false}
                      onChange={(e) => updateSettings('privacy.enableTelemetry', e.target.checked)}
                      disabled={saving}
                    />
                  }
                  label="Enable Performance Telemetry"
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 4 }}>
                  Allow collection of performance metrics for optimization
                </Typography>
              </FormGroup>
            </Box>
          )}

          {/* Playlists Tab */}
          {tabValue === 3 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Playlist Automation Settings
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.playlistDefaults?.public || false}
                        onChange={(e) => updateSettings('playlistDefaults.public', e.target.checked)}
                        disabled={saving}
                      />
                    }
                    label="Make playlists public by default"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.playlistDefaults?.autoSync || false}
                        onChange={(e) => updateSettings('playlistDefaults.autoSync', e.target.checked)}
                        disabled={saving}
                      />
                    }
                    label="Auto-sync with Spotify"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Default Playlist Description Template"
                    value={settings.playlistDefaults?.descriptionTemplate || ''}
                    onChange={(e) => updateSettings('playlistDefaults.descriptionTemplate', e.target.value)}
                    disabled={saving}
                    multiline
                    rows={3}
                    helperText="Template for playlist descriptions. Use {{genre}}, {{date}}, {{mood}} tokens. Max 500 characters."
                    inputProps={{ maxLength: 500 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Available tokens: {{genre}}, {{date}}, {{mood}}, {{artist}}, {{decade}}, {{energy}}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Preferences Tab */}
          {tabValue === 4 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3 }}>
                General Preferences
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Max Recommendations
                  </Typography>
                  <Box sx={{ px: 2 }}>
                    <Slider
                      value={settings.preferences?.maxRecommendations || 20}
                      onChange={(e, value) => updateSettings('preferences.maxRecommendations', value)}
                      min={5}
                      max={50}
                      step={5}
                      marks
                      valueLabelDisplay="auto"
                      disabled={saving}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.preferences?.enableExplanations || false}
                          onChange={(e) => updateSettings('preferences.enableExplanations', e.target.checked)}
                          disabled={saving}
                        />
                      }
                      label="Show recommendation explanations"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.preferences?.autoRefresh || false}
                          onChange={(e) => updateSettings('preferences.autoRefresh', e.target.checked)}
                          disabled={saving}
                        />
                      }
                      label="Auto-refresh recommendations"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.preferences?.compactMode || false}
                          onChange={(e) => updateSettings('preferences.compactMode', e.target.checked)}
                          disabled={saving}
                        />
                      }
                      label="Compact UI mode"
                    />
                  </FormGroup>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Success snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage('')}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsPanel;