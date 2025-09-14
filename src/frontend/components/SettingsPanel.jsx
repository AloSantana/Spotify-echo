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
} from '@mui/icons-material';
import LLMProviderSelector from './LLMProviderSelector';

/**
 * Settings Panel Component
 * Comprehensive user settings management with real-time synchronization
 */
const SettingsPanel = ({ userId, onSettingsChange }) => {
  const [tabValue, setTabValue] = useState(0);
  const [settings, setSettings] = useState(null);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Load user settings
  const loadSettings = useCallback(async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/settings?userId=${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSettings(data.data);
      setOriginalSettings(JSON.parse(JSON.stringify(data.data)));
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Save settings
  const saveSettings = async () => {
    if (!userId || !settings) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/settings?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'If-Unmodified-Since': originalSettings?.updatedAt || '',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        if (response.status === 409) {
          const data = await response.json();
          throw new Error('Settings were modified by another process. Please refresh and try again.');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSettings(data.data);
      setOriginalSettings(JSON.parse(JSON.stringify(data.data)));
      setHasChanges(false);
      setSuccessMessage('Settings saved successfully');

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
      const response = await fetch('/api/settings/defaults');
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
                Weights must sum to 1.0.
              </Typography>

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
                    Adds variety and prevents echo chambers
                  </Typography>
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>Current total:</strong> {
                    Object.values(settings.strategyWeights || {}).reduce((sum, weight) => sum + weight, 0).toFixed(2)
                  }
                  {Math.abs(Object.values(settings.strategyWeights || {}).reduce((sum, weight) => sum + weight, 0) - 1.0) > 0.01 && 
                    ' (Warning: Should equal 1.0)'
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
                    label="Default Playlist Description"
                    value={settings.playlistDefaults?.descriptionTemplate || ''}
                    onChange={(e) => updateSettings('playlistDefaults.descriptionTemplate', e.target.value)}
                    disabled={saving}
                    multiline
                    rows={2}
                    helperText="Template for automatically generated playlist descriptions"
                  />
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