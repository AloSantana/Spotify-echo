/**
 * AdminMCPPanel.jsx - Phase 8: Optional In-App MCP Integration (Admin)
 * Secure admin panel for MCP server management and monitoring
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';

const AdminMCPPanel = () => {
  const [tabValue, setTabValue] = useState(0);
  const [mcpStatus, setMcpStatus] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [securityScan, setSecurityScan] = useState(null);
  const [performanceBaseline, setPerformanceBaseline] = useState(null);
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Check if admin panel is enabled
  const isAdminEnabled = process.env.REACT_APP_ENABLE_ADMIN_MCP_PANEL === 'true';

  const fetchData = async () => {
    if (!isAdminEnabled) {
      setError('Admin MCP panel is disabled. Set REACT_APP_ENABLE_ADMIN_MCP_PANEL=true to enable.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [statusRes, cacheRes, securityRes, perfRes, logsRes] = await Promise.allSettled([
        fetch('/api/admin/mcp/status'),
        fetch('/api/admin/mcp/cache/stats'),
        fetch('/api/admin/mcp/security/scan'),
        fetch('/api/admin/mcp/performance/baseline'),
        fetch('/api/admin/mcp/logs?lines=50&level=info')
      ]);

      // Process status
      if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
        const statusData = await statusRes.value.json();
        setMcpStatus(statusData.data);
      }

      // Process cache stats
      if (cacheRes.status === 'fulfilled' && cacheRes.value.ok) {
        const cacheData = await cacheRes.value.json();
        setCacheStats(cacheData.data);
      }

      // Process security scan
      if (securityRes.status === 'fulfilled' && securityRes.value.ok) {
        const securityData = await securityRes.value.json();
        setSecurityScan(securityData.data);
      }

      // Process performance baseline
      if (perfRes.status === 'fulfilled' && perfRes.value.ok) {
        const perfData = await perfRes.value.json();
        setPerformanceBaseline(perfData.data);
      }

      // Process logs
      if (logsRes.status === 'fulfilled' && logsRes.value.ok) {
        const logsData = await logsRes.value.json();
        setLogs(logsData.data);
      }

      setLastRefresh(new Date().toISOString());
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
      setError('Failed to load admin data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [isAdminEnabled]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'active':
        return 'success';
      case 'unhealthy':
      case 'error':
        return 'error';
      case 'unreachable':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isAdminEnabled) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Admin MCP panel is disabled. Contact your administrator to enable admin features.
        </Alert>
      </Box>
    );
  }

  if (loading && !mcpStatus) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading admin panel...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Admin MCP Panel
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {lastRefresh && (
            <Typography variant="body2" color="text.secondary">
              Last refresh: {new Date(lastRefresh).toLocaleTimeString()}
            </Typography>
          )}
          <Tooltip title="Refresh data">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="MCP Status" />
          <Tab label="Cache Stats" />
          <Tab label="Security" />
          <Tab label="Performance" />
          <Tab label="Logs" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Box>
          <Typography variant="h5" gutterBottom>
            MCP Server Status
          </Typography>
          
          {mcpStatus && (
            <>
              {/* System Health Overview */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    System Health
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <Typography variant="body2" color="text.secondary">Memory Usage</Typography>
                      <Typography variant="body1">
                        {formatBytes(mcpStatus.systemHealth.memoryUsage.heapUsed)} / {formatBytes(mcpStatus.systemHealth.memoryUsage.heapTotal)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="body2" color="text.secondary">Uptime</Typography>
                      <Typography variant="body1">
                        {Math.floor(mcpStatus.systemHealth.uptime / 3600)}h {Math.floor((mcpStatus.systemHealth.uptime % 3600) / 60)}m
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="body2" color="text.secondary">Node.js Version</Typography>
                      <Typography variant="body1">{mcpStatus.systemHealth.nodeVersion}</Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="body2" color="text.secondary">Platform</Typography>
                      <Typography variant="body1">{mcpStatus.systemHealth.platform}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* MCP Servers Table */}
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Server</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Port</TableCell>
                      <TableCell>Last Check</TableCell>
                      <TableCell>Response Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(mcpStatus.servers).map(([name, server]) => (
                      <TableRow key={name}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {name.charAt(0).toUpperCase() + name.slice(1)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={server.status} 
                            color={getStatusColor(server.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{server.port}</TableCell>
                        <TableCell>
                          {new Date(server.lastCheck).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>{server.responseTime || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Last Validation */}
              {mcpStatus.lastValidation && (
                <Accordion sx={{ mt: 3 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Last Validation Report</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <pre style={{ fontSize: '0.875rem', overflow: 'auto' }}>
                      {JSON.stringify(mcpStatus.lastValidation, null, 2)}
                    </pre>
                  </AccordionDetails>
                </Accordion>
              )}
            </>
          )}
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Cache Statistics
          </Typography>
          
          {cacheStats && (
            <Grid container spacing={3}>
              {/* Redis Cache */}
              {cacheStats.redis && (
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <StorageIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">Redis Cache</Typography>
                        <Chip 
                          label={cacheStats.redis.status} 
                          color={getStatusColor(cacheStats.redis.status)}
                          size="small"
                          sx={{ ml: 2 }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Connection: {cacheStats.redis.connected ? 'Active' : 'Inactive'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* NodeCache */}
              {cacheStats.nodeCache && (
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <StorageIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">Node Cache</Typography>
                        <Chip 
                          label={cacheStats.nodeCache.status} 
                          color={getStatusColor(cacheStats.nodeCache.status)}
                          size="small"
                          sx={{ ml: 2 }}
                        />
                      </Box>
                      <Typography variant="body2">
                        Keys: {cacheStats.nodeCache.keys}
                      </Typography>
                      <Typography variant="body2">
                        Hits: {cacheStats.nodeCache.stats?.hits || 0}
                      </Typography>
                      <Typography variant="body2">
                        Misses: {cacheStats.nodeCache.stats?.misses || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Insights Cache */}
              {cacheStats.insights && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Insights Cache</Typography>
                      <pre style={{ fontSize: '0.875rem', overflow: 'auto' }}>
                        {JSON.stringify(cacheStats.insights, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </Box>
      )}

      {tabValue === 2 && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Security Scan Results
          </Typography>
          
          {securityScan && (
            <Grid container spacing={3}>
              {/* Security Overview */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <SecurityIcon sx={{ mr: 1 }} />
                      <Typography variant="h6">Security Overview</Typography>
                    </Box>
                    
                    {securityScan.lastScan ? (
                      <Typography variant="body2">
                        Last scan: {new Date(securityScan.lastScan.timestamp || securityScan.timestamp).toLocaleString()}
                      </Typography>
                    ) : (
                      <Alert severity="info">No security scan data available</Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Vulnerabilities */}
              {securityScan.vulnerabilities && securityScan.vulnerabilities.length > 0 && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Vulnerabilities Found</Typography>
                      {securityScan.vulnerabilities.map((vuln, index) => (
                        <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                          {vuln.description || vuln.message || JSON.stringify(vuln)}
                        </Alert>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Recommendations */}
              {securityScan.recommendations && securityScan.recommendations.length > 0 && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Security Recommendations</Typography>
                      {securityScan.recommendations.map((rec, index) => (
                        <Alert key={index} severity="info" sx={{ mb: 1 }}>
                          {rec.description || rec.message || JSON.stringify(rec)}
                        </Alert>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </Box>
      )}

      {tabValue === 3 && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Performance Baseline
          </Typography>
          
          {performanceBaseline && (
            <Grid container spacing={3}>
              {/* Current Performance */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <SpeedIcon sx={{ mr: 1 }} />
                      <Typography variant="h6">Current Performance</Typography>
                    </Box>
                    
                    <Typography variant="body2" gutterBottom>Memory Usage:</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      RSS: {formatBytes(performanceBaseline.current.memory.rss)}
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      Heap Used: {formatBytes(performanceBaseline.current.memory.heapUsed)}
                    </Typography>
                    
                    <Typography variant="body2" gutterBottom>System Uptime:</Typography>
                    <Typography variant="body1">
                      {Math.floor(performanceBaseline.current.uptime / 3600)}h {Math.floor((performanceBaseline.current.uptime % 3600) / 60)}m
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Drift Analysis */}
              {performanceBaseline.drift && (
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Performance Drift</Typography>
                      
                      <Typography variant="body2" gutterBottom>Memory Drift:</Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        RSS: {performanceBaseline.drift.memoryDrift.rss}
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        Heap Used: {performanceBaseline.drift.memoryDrift.heapUsed}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        Calculated: {new Date(performanceBaseline.drift.calculated).toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Baseline Data */}
              {performanceBaseline.baseline && (
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="h6">Baseline Data</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <pre style={{ fontSize: '0.875rem', overflow: 'auto' }}>
                        {JSON.stringify(performanceBaseline.baseline, null, 2)}
                      </pre>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              )}
            </Grid>
          )}
        </Box>
      )}

      {tabValue === 4 && (
        <Box>
          <Typography variant="h5" gutterBottom>
            System Logs
          </Typography>
          
          {logs && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <VisibilityIcon sx={{ mr: 1 }} />
                      <Typography variant="h6">Recent Logs</Typography>
                      <Typography variant="body2" sx={{ ml: 2 }}>
                        ({logs.totalLines} entries, level: {logs.level})
                      </Typography>
                    </Box>
                    
                    {logs.logs.map((logSource, index) => (
                      <Accordion key={index}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="subtitle1">
                            {logSource.source} ({logSource.entries.length} entries)
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                            {logSource.entries.slice(-20).map((entry, entryIndex) => (
                              <Box key={entryIndex} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                                  {entry.timestamp && `[${new Date(entry.timestamp).toLocaleTimeString()}] `}
                                  {entry.level && `${entry.level.toUpperCase()} `}
                                  {entry.message || JSON.stringify(entry, null, 2)}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
};

export default AdminMCPPanel;