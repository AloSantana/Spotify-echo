import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  Chip,
  Alert,
  Button,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  Avatar,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  AppBar,
  Toolbar,
  Tab,
  Tabs,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
  Security as SecurityIcon,
  Api as ApiIcon,
  People as PeopleIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CloudQueue as CloudIcon,
  Computer as ComputerIcon,
  Storage as DatabaseIcon,
  Router as RouterIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';

/**
 * Advanced Performance Monitoring Dashboard
 * Features:
 * - Real-time system metrics monitoring
 * - API performance analytics
 * - Database performance tracking
 * - User activity insights
 * - Resource utilization charts
 * - Alert management system
 * - Export and sharing capabilities
 */
const AdvancedPerformanceMonitoring = () => {
  const theme = useTheme();
  
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // Performance data
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: { usage: 45, cores: 4, load: [0.8, 1.2, 0.9] },
    memory: { used: 2.1, total: 8.0, percentage: 26 },
    disk: { used: 120, total: 500, percentage: 24 },
    network: { in: 1.2, out: 0.8, connections: 156 }
  });
  
  const [apiMetrics, setApiMetrics] = useState({
    endpoints: [
      { path: '/api/chat', requests: 1247, avgTime: 245, errors: 12, successRate: 99.0 },
      { path: '/api/spotify', requests: 856, avgTime: 189, errors: 8, successRate: 99.1 },
      { path: '/api/recommendations', requests: 432, avgTime: 567, errors: 5, successRate: 98.8 },
      { path: '/health', requests: 2341, avgTime: 23, errors: 0, successRate: 100.0 }
    ],
    totalRequests: 4876,
    totalErrors: 25,
    averageResponseTime: 256,
    p95ResponseTime: 890,
    p99ResponseTime: 1250
  });
  
  const [databaseMetrics, setDatabaseMetrics] = useState({
    mongodb: {
      connections: 25,
      operations: 1456,
      avgQueryTime: 12.5,
      cacheHitRate: 94.2,
      status: 'healthy'
    },
    redis: {
      connections: 45,
      operations: 8923,
      avgQueryTime: 1.2,
      cacheHitRate: 98.7,
      status: 'healthy'
    }
  });
  
  const [userMetrics, setUserMetrics] = useState({
    activeUsers: 127,
    newUsers: 23,
    sessions: 89,
    avgSessionDuration: 15.6,
    bounceRate: 23.1,
    topPages: [
      { page: '/chat', visits: 456, avgTime: '3:24' },
      { page: '/playlists', visits: 234, avgTime: '2:15' },
      { page: '/discover', visits: 189, avgTime: '4:02' }
    ]
  });
  
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'warning', message: 'High API response time detected', timestamp: new Date(), resolved: false },
    { id: 2, type: 'info', message: 'New deployment completed successfully', timestamp: new Date(), resolved: true },
    { id: 3, type: 'error', message: 'Database connection timeout', timestamp: new Date(), resolved: false }
  ]);

  // Load performance data
  const loadPerformanceData = useCallback(async () => {
    setLoading(true);
    try {
      // Load system metrics
      const systemResponse = await fetch('/api/performance/system');
      if (systemResponse.ok) {
        const systemData = await systemResponse.json();
        setSystemMetrics(systemData);
      }

      // Load API metrics
      const apiResponse = await fetch('/api/performance/api');
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        setApiMetrics(apiData);
      }

      // Load database metrics
      const dbResponse = await fetch('/api/performance/database');
      if (dbResponse.ok) {
        const dbData = await dbResponse.json();
        setDatabaseMetrics(dbData);
      }

      // Load user metrics
      const userResponse = await fetch('/api/analytics/users');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserMetrics(userData);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    loadPerformanceData();
    
    if (autoRefresh) {
      const interval = setInterval(loadPerformanceData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, loadPerformanceData]);

  // Utility functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const exportData = () => {
    const data = {
      systemMetrics,
      apiMetrics,
      databaseMetrics,
      userMetrics,
      exportTime: new Date()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main', mb: 2 }}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Performance Monitoring Dashboard
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                color="default"
              />
            }
            label="Auto-refresh"
            sx={{ mr: 2, color: 'white' }}
          />
          
          <Typography variant="caption" sx={{ mr: 2, color: 'white', opacity: 0.8 }}>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Typography>
          
          <IconButton
            onClick={loadPerformanceData}
            disabled={loading}
            color="inherit"
          >
            <RefreshIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Loading Bar */}
      {loading && <LinearProgress />}

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mb: 3 }}
        >
          <Tab label="System Overview" />
          <Tab label="API Performance" />
          <Tab label="Database Metrics" />
          <Tab label="User Analytics" />
          <Tab label="Alerts & Logs" />
        </Tabs>

        {/* System Overview Tab */}
        {activeTab === 0 && (
          <Grid container spacing={3}>
            {/* System Metrics Cards */}
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ComputerIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">CPU Usage</Typography>
                  </Box>
                  <Typography variant="h4" color="primary">
                    {systemMetrics.cpu.usage}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={systemMetrics.cpu.usage}
                    sx={{ mt: 1, mb: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {systemMetrics.cpu.cores} cores, Load: {systemMetrics.cpu.load.join(', ')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <MemoryIcon color="secondary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Memory</Typography>
                  </Box>
                  <Typography variant="h4" color="secondary">
                    {systemMetrics.memory.percentage}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={systemMetrics.memory.percentage}
                    color="secondary"
                    sx={{ mt: 1, mb: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {systemMetrics.memory.used}GB / {systemMetrics.memory.total}GB
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <StorageIcon color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h6">Disk Space</Typography>
                  </Box>
                  <Typography variant="h4" color="warning.main">
                    {systemMetrics.disk.percentage}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={systemMetrics.disk.percentage}
                    color="warning"
                    sx={{ mt: 1, mb: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {systemMetrics.disk.used}GB / {systemMetrics.disk.total}GB
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <NetworkIcon color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6">Network</Typography>
                  </Box>
                  <Typography variant="h4" color="info.main">
                    {systemMetrics.network.connections}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    ↓ {systemMetrics.network.in} MB/s
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ↑ {systemMetrics.network.out} MB/s
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Performance Chart */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    System Performance Trends
                  </Typography>
                  <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Performance chart visualization will be available with chart.js integration
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* API Performance Tab */}
        {activeTab === 1 && (
          <Grid container spacing={3}>
            {/* API Summary Cards */}
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ApiIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Total Requests</Typography>
                  </Box>
                  <Typography variant="h4" color="primary">
                    {apiMetrics.totalRequests.toLocaleString()}
                  </Typography>
                  <Chip
                    label={`${apiMetrics.totalErrors} errors`}
                    color={apiMetrics.totalErrors > 0 ? 'error' : 'success'}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <SpeedIcon color="secondary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Avg Response</Typography>
                  </Box>
                  <Typography variant="h4" color="secondary">
                    {apiMetrics.averageResponseTime}ms
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    P95: {apiMetrics.p95ResponseTime}ms
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6">Success Rate</Typography>
                  </Box>
                  <Typography variant="h4" color="success.main">
                    {((apiMetrics.totalRequests - apiMetrics.totalErrors) / apiMetrics.totalRequests * 100).toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(apiMetrics.totalRequests - apiMetrics.totalErrors) / apiMetrics.totalRequests * 100}
                    color="success"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TrendingUpIcon color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6">P99 Response</Typography>
                  </Box>
                  <Typography variant="h4" color="info.main">
                    {apiMetrics.p99ResponseTime}ms
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    99th percentile
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* API Endpoints Table */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    API Endpoint Performance
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Endpoint</TableCell>
                          <TableCell align="right">Requests</TableCell>
                          <TableCell align="right">Avg Time (ms)</TableCell>
                          <TableCell align="right">Errors</TableCell>
                          <TableCell align="right">Success Rate</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {apiMetrics.endpoints.map((endpoint, index) => (
                          <TableRow key={index}>
                            <TableCell>{endpoint.path}</TableCell>
                            <TableCell align="right">{endpoint.requests.toLocaleString()}</TableCell>
                            <TableCell align="right">
                              <Chip
                                label={endpoint.avgTime}
                                color={endpoint.avgTime > 500 ? 'error' : endpoint.avgTime > 200 ? 'warning' : 'success'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">{endpoint.errors}</TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {endpoint.successRate}%
                                {endpoint.successRate >= 99 ? (
                                  <CheckCircleIcon color="success" fontSize="small" />
                                ) : endpoint.successRate >= 95 ? (
                                  <WarningIcon color="warning" fontSize="small" />
                                ) : (
                                  <ErrorIcon color="error" fontSize="small" />
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Response Time Chart */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Response Time Distribution
                  </Typography>
                  <Box sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Chart visualization placeholder
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Database Metrics Tab */}
        {activeTab === 2 && (
          <Grid container spacing={3}>
            {/* Database Status Cards */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justify: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <DatabaseIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">MongoDB</Typography>
                    </Box>
                    <Chip
                      label={databaseMetrics.mongodb.status}
                      color={getStatusColor(databaseMetrics.mongodb.status)}
                      size="small"
                    />
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Connections
                      </Typography>
                      <Typography variant="h6">
                        {databaseMetrics.mongodb.connections}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Operations
                      </Typography>
                      <Typography variant="h6">
                        {databaseMetrics.mongodb.operations.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Avg Query Time
                      </Typography>
                      <Typography variant="h6">
                        {databaseMetrics.mongodb.avgQueryTime}ms
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Cache Hit Rate
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {databaseMetrics.mongodb.cacheHitRate}%
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justify: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <RouterIcon color="secondary" sx={{ mr: 1 }} />
                      <Typography variant="h6">Redis</Typography>
                    </Box>
                    <Chip
                      label={databaseMetrics.redis.status}
                      color={getStatusColor(databaseMetrics.redis.status)}
                      size="small"
                    />
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Connections
                      </Typography>
                      <Typography variant="h6">
                        {databaseMetrics.redis.connections}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Operations
                      </Typography>
                      <Typography variant="h6">
                        {databaseMetrics.redis.operations.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Avg Query Time
                      </Typography>
                      <Typography variant="h6">
                        {databaseMetrics.redis.avgQueryTime}ms
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Cache Hit Rate
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {databaseMetrics.redis.cacheHitRate}%
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Database Performance Chart */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Database Performance Overview
                  </Typography>
                  <Box sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Database performance chart will be available with chart.js integration
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* User Analytics Tab */}
        {activeTab === 3 && (
          <Grid container spacing={3}>
            {/* User Metrics Cards */}
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PeopleIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Active Users</Typography>
                  </Box>
                  <Typography variant="h4" color="primary">
                    {userMetrics.activeUsers}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TrendingUpIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
                    <Typography variant="caption" color="success.main">
                      +{userMetrics.newUsers} new today
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <VisibilityIcon color="secondary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Sessions</Typography>
                  </Box>
                  <Typography variant="h4" color="secondary">
                    {userMetrics.sessions}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Avg duration: {userMetrics.avgSessionDuration}min
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TrendingDownIcon color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h6">Bounce Rate</Typography>
                  </Box>
                  <Typography variant="h4" color="warning.main">
                    {userMetrics.bounceRate}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={userMetrics.bounceRate}
                    color="warning"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6">Engagement</Typography>
                  </Box>
                  <Typography variant="h4" color="success.main">
                    {(100 - userMetrics.bounceRate).toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    User engagement rate
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Top Pages */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Most Popular Pages
                  </Typography>
                  <List>
                    {userMetrics.topPages.map((page, index) => (
                      <ListItem key={index} divider>
                        <ListItemIcon>
                          <Badge badgeContent={index + 1} color="primary">
                            <VisibilityIcon />
                          </Badge>
                        </ListItemIcon>
                        <ListItemText
                          primary={page.page}
                          secondary={`${page.visits} visits • Avg time: ${page.avgTime}`}
                        />
                        <Typography variant="h6" color="primary">
                          {page.visits}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Alerts & Logs Tab */}
        {activeTab === 4 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Alerts
                  </Typography>
                  <List>
                    {alerts.map((alert) => (
                      <ListItem key={alert.id} divider>
                        <ListItemIcon>
                          {alert.type === 'error' ? (
                            <ErrorIcon color="error" />
                          ) : alert.type === 'warning' ? (
                            <WarningIcon color="warning" />
                          ) : (
                            <CheckCircleIcon color="info" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={alert.message}
                          secondary={alert.timestamp.toLocaleString()}
                        />
                        <Chip
                          label={alert.resolved ? 'Resolved' : 'Active'}
                          color={alert.resolved ? 'success' : 'error'}
                          size="small"
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Floating Action Button for Export */}
      <SpeedDial
        ariaLabel="Export Options"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        <SpeedDialAction
          icon={<DownloadIcon />}
          tooltipTitle="Export Data"
          onClick={exportData}
        />
        <SpeedDialAction
          icon={<ShareIcon />}
          tooltipTitle="Share Report"
          onClick={() => {/* Implement share functionality */}}
        />
        <SpeedDialAction
          icon={<PrintIcon />}
          tooltipTitle="Print Report"
          onClick={() => window.print()}
        />
      </SpeedDial>
    </Box>
  );
};

export default AdvancedPerformanceMonitoring;