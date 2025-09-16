import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Switch,
  FormControlLabel,
  Tooltip,
  Badge,
  Avatar
} from '@mui/material';
import {
  MonitorHeart as MonitorIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
  Security as SecurityIcon,
  CloudSync as CloudIcon,
  Analytics as AnalyticsIcon,
  BugReport as BugIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  Timer as TimerIcon,
  Storage as DatabaseIcon,
  Api as ApiIcon,
  People as UsersIcon,
  MusicNote as MusicIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

export default function RealTimeSystemMonitoring() {
  const [systemHealth, setSystemHealth] = useState({});
  const [metrics, setMetrics] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [apiMetrics, setApiMetrics] = useState({});
  const [userActivity, setUserActivity] = useState({});
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    loadInitialData();
    
    if (isRealTimeEnabled) {
      const interval = setInterval(updateRealTimeData, 2000);
      return () => clearInterval(interval);
    }
  }, [isRealTimeEnabled]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSystemHealth(),
        loadMetrics(),
        loadAlerts(),
        loadPerformanceData(),
        loadApiMetrics(),
        loadUserActivity()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRealTimeData = async () => {
    try {
      await Promise.all([
        loadSystemHealth(),
        loadMetrics(),
        loadAlerts()
      ]);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error updating real-time data:', error);
    }
  };

  const loadSystemHealth = async () => {
    try {
      const response = await fetch('/health');
      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data);
      }
    } catch (error) {
      console.error('Failed to load system health:', error);
    }
  };

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/metrics/realtime');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/monitoring/alerts');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const loadPerformanceData = async () => {
    try {
      const response = await fetch('/api/metrics/performance-history');
      if (response.ok) {
        const data = await response.json();
        setPerformance(data.history || []);
      }
    } catch (error) {
      console.error('Failed to load performance data:', error);
    }
  };

  const loadApiMetrics = async () => {
    try {
      const response = await fetch('/api/metrics/api');
      if (response.ok) {
        const data = await response.json();
        setApiMetrics(data);
      }
    } catch (error) {
      console.error('Failed to load API metrics:', error);
    }
  };

  const loadUserActivity = async () => {
    try {
      const response = await fetch('/api/analytics/user-activity');
      if (response.ok) {
        const data = await response.json();
        setUserActivity(data);
      }
    } catch (error) {
      console.error('Failed to load user activity:', error);
    }
  };

  const getHealthIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'connected':
      case 'operational':
        return <CheckIcon sx={{ color: 'success.main' }} />;
      case 'warning':
      case 'degraded':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      case 'error':
      case 'failed':
      case 'down':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      default:
        return <InfoIcon sx={{ color: 'info.main' }} />;
    }
  };

  const getAlertColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const formatUptime = (ms) => {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <MonitorIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4" component="h2">
          Real-Time System Monitoring
        </Typography>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isRealTimeEnabled}
                onChange={(e) => setIsRealTimeEnabled(e.target.checked)}
              />
            }
            label="Real-time updates"
          />
          <Chip 
            label={`Last updated: ${lastUpdated.toLocaleTimeString()}`}
            size="small"
            variant="outlined"
          />
          <IconButton onClick={loadInitialData}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* System Status Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SpeedIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">CPU Usage</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {metrics.cpu || 0}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={metrics.cpu || 0}
                color={metrics.cpu > 80 ? 'error' : metrics.cpu > 60 ? 'warning' : 'primary'}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MemoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Memory</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {metrics.memory?.percentage || 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatBytes(metrics.memory?.used || 0)} / {formatBytes(metrics.memory?.total || 0)}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={metrics.memory?.percentage || 0}
                color={metrics.memory?.percentage > 80 ? 'error' : metrics.memory?.percentage > 60 ? 'warning' : 'primary'}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NetworkIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Network</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {metrics.network?.latency || 0}ms
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ↑ {formatBytes(metrics.network?.upload || 0)}/s ↓ {formatBytes(metrics.network?.download || 0)}/s
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TimerIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Uptime</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {formatUptime(metrics.uptime || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                System operational
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Badge badgeContent={alerts.length} color="error">
                <NotificationsIcon sx={{ mr: 1 }} />
              </Badge>
              <Typography variant="h6">Active Alerts</Typography>
            </Box>
            <List>
              {alerts.slice(0, 5).map((alert, index) => (
                <ListItem key={index} divider>
                  <ListItemIcon>
                    {getHealthIcon(alert.severity)}
                  </ListItemIcon>
                  <ListItemText
                    primary={alert.title}
                    secondary={`${alert.description} - ${new Date(alert.timestamp).toLocaleString()}`}
                  />
                  <Chip 
                    label={alert.severity}
                    color={getAlertColor(alert.severity)}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* System Components Health */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Components
              </Typography>
              <List>
                {Object.entries(systemHealth).map(([component, status]) => (
                  <ListItem key={component}>
                    <ListItemIcon>
                      {getHealthIcon(status.status || status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={component.toUpperCase()}
                      secondary={status.message || status.description || 'Operational'}
                    />
                    <Chip 
                      label={status.status || status}
                      color={status.status === 'healthy' || status === 'healthy' ? 'success' : 'error'}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* API Performance */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                API Performance
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Total Requests: {apiMetrics.totalRequests || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Success Rate: {apiMetrics.successRate || 0}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Response Time: {apiMetrics.averageResponseTime || 0}ms
                </Typography>
              </Box>
              {apiMetrics.endpoints && (
                <Box>
                  {Object.entries(apiMetrics.endpoints).slice(0, 5).map(([endpoint, data]) => (
                    <Box key={endpoint} sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        {endpoint}: {data.averageTime}ms
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min((data.averageTime / 1000) * 100, 100)}
                        sx={{ height: 4 }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Trends (Last 24 Hours)
              </Typography>
              {performance.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <RechartsTooltip />
                    <Area 
                      type="monotone" 
                      dataKey="cpu" 
                      stackId="1" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      name="CPU %"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="memory" 
                      stackId="1" 
                      stroke="#82ca9d" 
                      fill="#82ca9d" 
                      name="Memory %"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="responseTime" 
                      stackId="1" 
                      stroke="#ffc658" 
                      fill="#ffc658" 
                      name="Response Time (ms)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* User Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <UsersIcon sx={{ mr: 1 }} />
                <Typography variant="h6">User Activity</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="h4">{userActivity.activeUsers || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">Active Users</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h4">{userActivity.totalSessions || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Sessions</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h4">{userActivity.avgSessionDuration || 0}m</Typography>
                  <Typography variant="body2" color="text.secondary">Avg Session Duration</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h4">{userActivity.songsPlayed || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">Songs Played Today</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Database Stats */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DatabaseIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Database Statistics</Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Listening History"
                    secondary={`${metrics.database?.listeningHistory || 0} records`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="User Settings"
                    secondary={`${metrics.database?.userSettings || 0} records`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Analytics Events"
                    secondary={`${metrics.database?.analyticsEvents || 0} records`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Cache Hit Rate"
                    secondary={`${metrics.database?.cacheHitRate || 0}%`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
}