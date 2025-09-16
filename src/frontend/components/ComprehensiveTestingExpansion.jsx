import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  Button,
  IconButton,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  ListItemSecondaryAction,
  Divider,
  Alert,
  LinearProgress,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip,
  CircularProgress,
  Badge,
  AppBar,
  Toolbar,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  Storage as StorageIcon,
  Cloud as CloudIcon,
  Computer as ComputerIcon,
  Api as ApiIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Memory as MemoryIcon,
  NetworkCheck as NetworkIcon,
  Build as BuildIcon,
  BugReport as BugReportIcon,
  Timeline as TimelineIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';

/**
 * Comprehensive Testing Expansion Dashboard
 * Features:
 * - Automated test suite management
 * - Real-time test execution and monitoring
 * - Test coverage analysis and reporting
 * - Performance and load testing
 * - Integration and end-to-end testing
 * - Test result analytics and trending
 * - CI/CD pipeline integration
 */
const ComprehensiveTestingExpansion = () => {
  const theme = useTheme();
  
  // State management
  const [loading, setLoading] = useState(false);
  const [testSuites, setTestSuites] = useState([]);
  const [runningTests, setRunningTests] = useState(new Set());
  const [testResults, setTestResults] = useState({});
  const [coverage, setCoverage] = useState({});
  const [selectedSuite, setSelectedSuite] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Test configuration
  const [newTest, setNewTest] = useState({
    name: '',
    type: 'unit',
    description: '',
    files: [],
    environment: 'development',
    timeout: 30000,
    retries: 3
  });

  // Initialize test suites
  useEffect(() => {
    loadTestSuites();
    loadTestResults();
    loadCoverageData();
  }, []);

  // Mock test suites data
  const mockTestSuites = [
    {
      id: 'unit-tests',
      name: 'Unit Tests',
      type: 'unit',
      description: 'Component and function unit tests',
      files: ['src/**/*.test.js', 'src/**/*.spec.js'],
      totalTests: 247,
      passing: 241,
      failing: 6,
      skipped: 0,
      coverage: 87.3,
      lastRun: new Date(Date.now() - 1000 * 60 * 15),
      duration: 45.2,
      status: 'passing',
      environment: 'development'
    },
    {
      id: 'integration-tests',
      name: 'Integration Tests',
      type: 'integration',
      description: 'API and database integration tests',
      files: ['tests/integration/**/*.test.js'],
      totalTests: 89,
      passing: 85,
      failing: 3,
      skipped: 1,
      coverage: 73.8,
      lastRun: new Date(Date.now() - 1000 * 60 * 30),
      duration: 125.7,
      status: 'failing',
      environment: 'testing'
    },
    {
      id: 'e2e-tests',
      name: 'End-to-End Tests',
      type: 'e2e',
      description: 'Full user journey testing with Playwright',
      files: ['tests/e2e/**/*.spec.js'],
      totalTests: 34,
      passing: 32,
      failing: 2,
      skipped: 0,
      coverage: 68.2,
      lastRun: new Date(Date.now() - 1000 * 60 * 45),
      duration: 287.4,
      status: 'failing',
      environment: 'staging'
    },
    {
      id: 'performance-tests',
      name: 'Performance Tests',
      type: 'performance',
      description: 'Load and stress testing',
      files: ['tests/performance/**/*.js'],
      totalTests: 12,
      passing: 11,
      failing: 1,
      skipped: 0,
      coverage: 45.1,
      lastRun: new Date(Date.now() - 1000 * 60 * 60 * 2),
      duration: 456.8,
      status: 'failing',
      environment: 'production'
    },
    {
      id: 'security-tests',
      name: 'Security Tests',
      type: 'security',
      description: 'Security vulnerability scanning',
      files: ['tests/security/**/*.js'],
      totalTests: 67,
      passing: 64,
      failing: 3,
      skipped: 0,
      coverage: 82.5,
      lastRun: new Date(Date.now() - 1000 * 60 * 60 * 6),
      duration: 89.3,
      status: 'failing',
      environment: 'production'
    }
  ];

  // Load test suites
  const loadTestSuites = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTestSuites(mockTestSuites);
    } catch (error) {
      console.error('Failed to load test suites:', error);
      addNotification('Failed to load test suites', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load test results
  const loadTestResults = useCallback(async () => {
    try {
      const response = await fetch('/api/testing/results');
      if (response.ok) {
        const data = await response.json();
        setTestResults(data);
      }
    } catch (error) {
      console.error('Failed to load test results:', error);
    }
  }, []);

  // Load coverage data
  const loadCoverageData = useCallback(async () => {
    try {
      const response = await fetch('/api/testing/coverage');
      if (response.ok) {
        const data = await response.json();
        setCoverage(data);
      }
    } catch (error) {
      console.error('Failed to load coverage data:', error);
    }
  }, []);

  // Run test suite
  const runTestSuite = async (suiteId) => {
    setRunningTests(prev => new Set([...prev, suiteId]));
    addNotification(`Running ${suiteId} tests...`, 'info');
    
    try {
      const response = await fetch(`/api/testing/run/${suiteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        addNotification(`Test suite ${suiteId} completed`, 'success');
        
        // Update test suite with results
        setTestSuites(prev => prev.map(suite => 
          suite.id === suiteId 
            ? { ...suite, ...result, lastRun: new Date() }
            : suite
        ));
      } else {
        throw new Error(`Test execution failed: ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to run test suite ${suiteId}:`, error);
      addNotification(`Failed to run ${suiteId}`, 'error');
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(suiteId);
        return newSet;
      });
    }
  };

  // Stop test suite
  const stopTestSuite = async (suiteId) => {
    try {
      await fetch(`/api/testing/stop/${suiteId}`, { method: 'POST' });
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(suiteId);
        return newSet;
      });
      addNotification(`Stopped ${suiteId} tests`, 'warning');
    } catch (error) {
      console.error(`Failed to stop test suite ${suiteId}:`, error);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    for (const suite of testSuites) {
      if (!runningTests.has(suite.id)) {
        await runTestSuite(suite.id);
      }
    }
  };

  // Create new test suite
  const createTestSuite = async () => {
    try {
      const response = await fetch('/api/testing/suites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTest)
      });
      
      if (response.ok) {
        const suite = await response.json();
        setTestSuites(prev => [...prev, suite]);
        setShowCreateDialog(false);
        setNewTest({
          name: '',
          type: 'unit',
          description: '',
          files: [],
          environment: 'development',
          timeout: 30000,
          retries: 3
        });
        addNotification('Test suite created successfully', 'success');
      }
    } catch (error) {
      console.error('Failed to create test suite:', error);
      addNotification('Failed to create test suite', 'error');
    }
  };

  // Delete test suite
  const deleteTestSuite = async (suiteId) => {
    try {
      await fetch(`/api/testing/suites/${suiteId}`, { method: 'DELETE' });
      setTestSuites(prev => prev.filter(suite => suite.id !== suiteId));
      addNotification('Test suite deleted', 'success');
    } catch (error) {
      console.error('Failed to delete test suite:', error);
      addNotification('Failed to delete test suite', 'error');
    }
  };

  // Add notification
  const addNotification = (message, severity = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, severity, timestamp: new Date() }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'passing': return 'success';
      case 'failing': return 'error';
      case 'warning': return 'warning';
      default: return 'default';
    }
  };

  // Get test type icon
  const getTestTypeIcon = (type) => {
    switch (type) {
      case 'unit': return <BuildIcon />;
      case 'integration': return <ApiIcon />;
      case 'e2e': return <VisibilityIcon />;
      case 'performance': return <SpeedIcon />;
      case 'security': return <SecurityIcon />;
      default: return <AssessmentIcon />;
    }
  };

  // Calculate overall stats
  const overallStats = testSuites.reduce((acc, suite) => ({
    totalTests: acc.totalTests + suite.totalTests,
    passing: acc.passing + suite.passing,
    failing: acc.failing + suite.failing,
    skipped: acc.skipped + suite.skipped,
    coverage: acc.coverage + suite.coverage
  }), { totalTests: 0, passing: 0, failing: 0, skipped: 0, coverage: 0 });

  if (testSuites.length > 0) {
    overallStats.coverage = overallStats.coverage / testSuites.length;
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main', mb: 2 }}>
        <Toolbar>
          <AssessmentIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Testing Dashboard
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={autoRun}
                onChange={(e) => setAutoRun(e.target.checked)}
                color="default"
              />
            }
            label="Auto-run"
            sx={{ mr: 2, color: 'white' }}
          />
          
          <Button
            variant="outlined"
            color="inherit"
            onClick={runAllTests}
            disabled={runningTests.size > 0}
            sx={{ mr: 1 }}
          >
            Run All Tests
          </Button>
          
          <IconButton
            onClick={loadTestSuites}
            disabled={loading}
            color="inherit"
          >
            <RefreshIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Loading */}
      {loading && <LinearProgress />}

      {/* Notifications */}
      <Box sx={{ position: 'fixed', top: 80, right: 16, zIndex: 1000 }}>
        {notifications.map((notification) => (
          <Alert
            key={notification.id}
            severity={notification.severity}
            sx={{ mb: 1, minWidth: 300 }}
          >
            {notification.message}
          </Alert>
        ))}
      </Box>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
        {/* Overview Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Total Tests</Typography>
                </Box>
                <Typography variant="h4" color="primary">
                  {overallStats.totalTests}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Across {testSuites.length} test suites
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6">Passing</Typography>
                </Box>
                <Typography variant="h4" color="success.main">
                  {overallStats.passing}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {overallStats.totalTests > 0 
                    ? ((overallStats.passing / overallStats.totalTests) * 100).toFixed(1)
                    : 0}% success rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ErrorIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="h6">Failing</Typography>
                </Box>
                <Typography variant="h4" color="error.main">
                  {overallStats.failing}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {overallStats.totalTests > 0 
                    ? ((overallStats.failing / overallStats.totalTests) * 100).toFixed(1)
                    : 0}% failure rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TimelineIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="h6">Coverage</Typography>
                </Box>
                <Typography variant="h4" color="info.main">
                  {overallStats.coverage.toFixed(1)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={overallStats.coverage}
                  color="info"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Test Suites */}
        <Grid container spacing={3}>
          {testSuites.map((suite) => (
            <Grid item xs={12} md={6} lg={4} key={suite.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  border: runningTests.has(suite.id) ? 2 : 1,
                  borderColor: runningTests.has(suite.id) ? 'primary.main' : 'divider'
                }}
              >
                <CardContent>
                  {/* Suite Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ mr: 2, bgcolor: `${getStatusColor(suite.status)}.main` }}>
                      {getTestTypeIcon(suite.type)}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6">
                        {suite.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {suite.type} • {suite.environment}
                      </Typography>
                    </Box>
                    <Chip
                      label={suite.status}
                      color={getStatusColor(suite.status)}
                      size="small"
                    />
                  </Box>

                  {/* Running Indicator */}
                  {runningTests.has(suite.id) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      <Typography variant="body2" color="primary">
                        Running tests...
                      </Typography>
                    </Box>
                  )}

                  {/* Description */}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {suite.description}
                  </Typography>

                  {/* Test Stats */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Total Tests
                      </Typography>
                      <Typography variant="h6">
                        {suite.totalTests}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Coverage
                      </Typography>
                      <Typography variant="h6" color="info.main">
                        {suite.coverage}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Duration
                      </Typography>
                      <Typography variant="body2">
                        {suite.duration}s
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Last Run
                      </Typography>
                      <Typography variant="body2">
                        {suite.lastRun.toLocaleTimeString()}
                      </Typography>
                    </Grid>
                  </Grid>

                  {/* Test Results */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption">Test Results</Typography>
                      <Typography variant="caption">
                        {suite.passing}/{suite.totalTests}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(suite.passing / suite.totalTests) * 100}
                      color={suite.failing > 0 ? 'error' : 'success'}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption" color="success.main">
                        ✓ {suite.passing} passing
                      </Typography>
                      {suite.failing > 0 && (
                        <Typography variant="caption" color="error.main">
                          ✗ {suite.failing} failing
                        </Typography>
                      )}
                      {suite.skipped > 0 && (
                        <Typography variant="caption" color="warning.main">
                          ⚬ {suite.skipped} skipped
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>

                <CardActions>
                  {runningTests.has(suite.id) ? (
                    <Button
                      size="small"
                      onClick={() => stopTestSuite(suite.id)}
                      startIcon={<StopIcon />}
                      color="error"
                    >
                      Stop
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      onClick={() => runTestSuite(suite.id)}
                      startIcon={<PlayArrowIcon />}
                      color="primary"
                    >
                      Run Tests
                    </Button>
                  )}
                  
                  <Button
                    size="small"
                    onClick={() => setSelectedSuite(suite)}
                    startIcon={<VisibilityIcon />}
                  >
                    Details
                  </Button>

                  <IconButton
                    size="small"
                    onClick={() => deleteTestSuite(suite.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Empty State */}
        {testSuites.length === 0 && !loading && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 400,
              textAlign: 'center'
            }}
          >
            <AssessmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" color="text.secondary" gutterBottom>
              No Test Suites Found
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Create your first test suite to start monitoring your application quality
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowCreateDialog(true)}
            >
              Create Test Suite
            </Button>
          </Box>
        )}
      </Box>

      {/* Floating Action Button */}
      <SpeedDial
        ariaLabel="Test Actions"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        <SpeedDialAction
          icon={<AddIcon />}
          tooltipTitle="Create Test Suite"
          onClick={() => setShowCreateDialog(true)}
        />
        <SpeedDialAction
          icon={<PlayArrowIcon />}
          tooltipTitle="Run All Tests"
          onClick={runAllTests}
        />
        <SpeedDialAction
          icon={<SettingsIcon />}
          tooltipTitle="Settings"
          onClick={() => setShowSettingsDialog(true)}
        />
      </SpeedDial>

      {/* Create Test Suite Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Test Suite</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Test Suite Name"
            value={newTest.name}
            onChange={(e) => setNewTest(prev => ({ ...prev, name: e.target.value }))}
            margin="normal"
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Test Type</InputLabel>
            <Select
              value={newTest.type}
              label="Test Type"
              onChange={(e) => setNewTest(prev => ({ ...prev, type: e.target.value }))}
            >
              <MenuItem value="unit">Unit Tests</MenuItem>
              <MenuItem value="integration">Integration Tests</MenuItem>
              <MenuItem value="e2e">End-to-End Tests</MenuItem>
              <MenuItem value="performance">Performance Tests</MenuItem>
              <MenuItem value="security">Security Tests</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Description"
            value={newTest.description}
            onChange={(e) => setNewTest(prev => ({ ...prev, description: e.target.value }))}
            margin="normal"
            multiline
            rows={3}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Environment</InputLabel>
            <Select
              value={newTest.environment}
              label="Environment"
              onChange={(e) => setNewTest(prev => ({ ...prev, environment: e.target.value }))}
            >
              <MenuItem value="development">Development</MenuItem>
              <MenuItem value="testing">Testing</MenuItem>
              <MenuItem value="staging">Staging</MenuItem>
              <MenuItem value="production">Production</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Timeout (ms)"
            type="number"
            value={newTest.timeout}
            onChange={(e) => setNewTest(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>
            Cancel
          </Button>
          <Button onClick={createTestSuite} variant="contained">
            Create Test Suite
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Suite Details Dialog */}
      <Dialog
        open={selectedSuite !== null}
        onClose={() => setSelectedSuite(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedSuite && (
          <>
            <DialogTitle>
              {selectedSuite.name} - Test Details
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Test Information
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Type"
                        secondary={selectedSuite.type}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Environment"
                        secondary={selectedSuite.environment}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Total Tests"
                        secondary={selectedSuite.totalTests}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Last Run"
                        secondary={selectedSuite.lastRun.toLocaleString()}
                      />
                    </ListItem>
                  </List>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Test Results
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Passing Tests"
                        secondary={selectedSuite.passing}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <ErrorIcon color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Failing Tests"
                        secondary={selectedSuite.failing}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <WarningIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Skipped Tests"
                        secondary={selectedSuite.skipped}
                      />
                    </ListItem>
                  </List>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Test Files
                  </Typography>
                  <List dense>
                    {selectedSuite.files.map((file, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={file} />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedSuite(null)}>
                Close
              </Button>
              <Button
                onClick={() => runTestSuite(selectedSuite.id)}
                variant="contained"
                startIcon={<PlayArrowIcon />}
              >
                Run Tests
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ComprehensiveTestingExpansion;