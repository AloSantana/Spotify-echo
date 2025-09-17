import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  Chip,
  Avatar,
  LinearProgress,
  CircularProgress,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Stack,
  Divider,
  Alert,
  Button,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ScatterChart,
  Scatter
} from 'recharts';
import {
  Analytics,
  TrendingUp,
  TrendingDown,
  MusicNote,
  Person,
  Album,
  AccessTime,
  Favorite,
  PlayArrow,
  SkipNext,
  VolumeUp,
  DateRange,
  Star,
  Speed,
  Psychology,
  GraphicEq,
  Timeline,
  DonutLarge,
  BarChart as BarChartIcon,
  ShowChart,
  PieChart as PieChartIcon,
  Radar as RadarIcon,
  ScatterPlot,
  Refresh,
  Download,
  Share,
  FilterList,
  Insights
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

/**
 * Advanced Analytics Visualization Dashboard
 * Rich charts and graphs for music listening analytics
 */
const AdvancedAnalyticsVisualizationDashboard = ({
  analyticsData = {},
  timeRange = 'month',
  onTimeRangeChange,
  onExportData,
  onRefreshData,
  loading = false,
  className
}) => {
  const theme = useTheme();
  const [currentView, setCurrentView] = useState(0);
  const [chartType, setChartType] = useState('bar');
  const [showComparison, setShowComparison] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('plays');

  // Mock analytics data for demonstration
  const mockAnalyticsData = useMemo(() => ({
    overview: {
      totalTracks: 1247,
      totalPlaytime: 45620, // minutes
      topGenre: 'Electronic',
      avgSessionTime: 23,
      uniqueArtists: 324,
      favoriteTracks: 89,
      recentDiscoveries: 15,
      moodDistribution: {
        happy: 35,
        energetic: 28,
        calm: 22,
        melancholic: 15
      }
    },
    listeningHistory: [
      { date: '2024-01-01', plays: 23, duration: 87, discoveries: 3 },
      { date: '2024-01-02', plays: 31, duration: 124, discoveries: 5 },
      { date: '2024-01-03', plays: 18, duration: 72, discoveries: 1 },
      { date: '2024-01-04', plays: 42, duration: 168, discoveries: 7 },
      { date: '2024-01-05', plays: 35, duration: 142, discoveries: 4 },
      { date: '2024-01-06', plays: 28, duration: 98, discoveries: 2 },
      { date: '2024-01-07', plays: 39, duration: 156, discoveries: 6 }
    ],
    topGenres: [
      { name: 'Electronic', plays: 345, percentage: 28, color: '#8884d8' },
      { name: 'Rock', plays: 287, percentage: 23, color: '#82ca9d' },
      { name: 'Pop', plays: 234, percentage: 19, color: '#ffc658' },
      { name: 'Jazz', plays: 156, percentage: 13, color: '#ff7300' },
      { name: 'Classical', plays: 123, percentage: 10, color: '#00ff00' },
      { name: 'Hip-Hop', plays: 89, percentage: 7, color: '#ff00ff' }
    ],
    topArtists: [
      { name: 'Daft Punk', plays: 89, image: '/artist1.jpg', lastPlayed: '2024-01-07' },
      { name: 'Radiohead', plays: 76, image: '/artist2.jpg', lastPlayed: '2024-01-06' },
      { name: 'Beethoven', plays: 65, image: '/artist3.jpg', lastPlayed: '2024-01-05' },
      { name: 'The Beatles', plays: 58, image: '/artist4.jpg', lastPlayed: '2024-01-04' },
      { name: 'Miles Davis', plays: 52, image: '/artist5.jpg', lastPlayed: '2024-01-03' }
    ],
    audioFeatures: {
      energy: 0.7,
      valence: 0.6,
      danceability: 0.8,
      acousticness: 0.3,
      instrumentalness: 0.4,
      tempo: 125,
      loudness: -8.5
    },
    hourlyDistribution: [
      { hour: '00', plays: 5 }, { hour: '01', plays: 2 }, { hour: '02', plays: 1 },
      { hour: '03', plays: 1 }, { hour: '04', plays: 2 }, { hour: '05', plays: 3 },
      { hour: '06', plays: 8 }, { hour: '07', plays: 15 }, { hour: '08', plays: 25 },
      { hour: '09', plays: 32 }, { hour: '10', plays: 28 }, { hour: '11', plays: 35 },
      { hour: '12', plays: 42 }, { hour: '13', plays: 38 }, { hour: '14', plays: 45 },
      { hour: '15', plays: 52 }, { hour: '16', plays: 48 }, { hour: '17', plays: 55 },
      { hour: '18', plays: 62 }, { hour: '19', plays: 58 }, { hour: '20', plays: 65 },
      { hour: '21', plays: 72 }, { hour: '22', plays: 45 }, { hour: '23', plays: 25 }
    ],
    moodAnalysis: [
      { mood: 'Happy', count: 156, color: '#4CAF50', icon: '😊' },
      { mood: 'Energetic', count: 134, color: '#FF9800', icon: '⚡' },
      { mood: 'Calm', count: 98, color: '#2196F3', icon: '😌' },
      { mood: 'Melancholic', count: 67, color: '#9C27B0', icon: '😢' },
      { mood: 'Focused', count: 89, color: '#795548', icon: '🎯' }
    ],
    comparison: {
      currentPeriod: { plays: 1247, duration: 45620, artists: 324 },
      previousPeriod: { plays: 1156, duration: 42340, artists: 298 }
    }
  }), []);

  const data = analyticsData.overview ? analyticsData : mockAnalyticsData;

  // Calculate insights and trends
  const insights = useMemo(() => {
    if (!data.comparison) return {};
    
    const playsTrend = ((data.comparison.currentPeriod.plays - data.comparison.previousPeriod.plays) / data.comparison.previousPeriod.plays * 100).toFixed(1);
    const durationTrend = ((data.comparison.currentPeriod.duration - data.comparison.previousPeriod.duration) / data.comparison.previousPeriod.duration * 100).toFixed(1);
    const artistsTrend = ((data.comparison.currentPeriod.artists - data.comparison.previousPeriod.artists) / data.comparison.previousPeriod.artists * 100).toFixed(1);

    return {
      playsTrend: parseFloat(playsTrend),
      durationTrend: parseFloat(durationTrend),
      artistsTrend: parseFloat(artistsTrend)
    };
  }, [data]);

  // Render metric card
  const renderMetricCard = (title, value, icon, trend, color = 'primary') => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: `${color}.main` }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            {trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend > 0 ? (
                  <TrendingUp color="success" fontSize="small" />
                ) : (
                  <TrendingDown color="error" fontSize="small" />
                )}
                <Typography
                  variant="caption"
                  color={trend > 0 ? 'success.main' : 'error.main'}
                  sx={{ ml: 0.5 }}
                >
                  {Math.abs(trend)}% vs last {timeRange}
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: `${color}.main`,
              width: 56,
              height: 56
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  // Render chart based on type
  const renderChart = (chartData, type, config = {}) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.info.main,
      theme.palette.warning.main,
      theme.palette.error.main,
      theme.palette.success.main
    ];

    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.xKey || 'name'} />
              <YAxis />
              <RechartsTooltip />
              <Bar dataKey={config.yKey || 'value'} fill={colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.xKey || 'name'} />
              <YAxis />
              <RechartsTooltip />
              <Line
                type="monotone"
                dataKey={config.yKey || 'value'}
                stroke={colors[0]}
                strokeWidth={3}
                dot={{ fill: colors[0], strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.xKey || 'name'} />
              <YAxis />
              <RechartsTooltip />
              <Area
                type="monotone"
                dataKey={config.yKey || 'value'}
                stroke={colors[0]}
                fill={colors[0]}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey={config.yKey || 'value'}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey={config.xKey || 'name'} />
              <PolarRadiusAxis angle={90} domain={[0, 1]} />
              <Radar
                name="Audio Features"
                dataKey={config.yKey || 'value'}
                stroke={colors[0]}
                fill={colors[0]}
                fillOpacity={0.3}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Box className={className}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, background: `linear-gradient(135deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}20)` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Analytics color="primary" /> Music Analytics Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Deep insights into your music listening patterns and preferences
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                onChange={(e) => onTimeRangeChange?.(e.target.value)}
                label="Time Range"
              >
                <MenuItem value="week">Last Week</MenuItem>
                <MenuItem value="month">Last Month</MenuItem>
                <MenuItem value="3months">3 Months</MenuItem>
                <MenuItem value="year">Last Year</MenuItem>
              </Select>
            </FormControl>
            <Button
              startIcon={<Refresh />}
              onClick={onRefreshData}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              startIcon={<Download />}
              onClick={onExportData}
              variant="outlined"
            >
              Export
            </Button>
          </Stack>
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <>
          {/* Overview Metrics */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              {renderMetricCard(
                'Total Tracks',
                data.overview.totalTracks,
                <MusicNote />,
                insights.playsTrend,
                'primary'
              )}
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              {renderMetricCard(
                'Play Time (hours)',
                Math.round(data.overview.totalPlaytime / 60),
                <AccessTime />,
                insights.durationTrend,
                'secondary'
              )}
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              {renderMetricCard(
                'Unique Artists',
                data.overview.uniqueArtists,
                <Person />,
                insights.artistsTrend,
                'info'
              )}
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              {renderMetricCard(
                'Favorite Tracks',
                data.overview.favoriteTracks,
                <Favorite />,
                undefined,
                'error'
              )}
            </Grid>
          </Grid>

          {/* Main Analytics Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={currentView}
              onChange={(e, value) => setCurrentView(value)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab icon={<ShowChart />} label="Listening Trends" />
              <Tab icon={<PieChartIcon />} label="Genres & Artists" />
              <Tab icon={<RadarIcon />} label="Audio Features" />
              <Tab icon={<Timeline />} label="Time Analysis" />
              <Tab icon={<Psychology />} label="Mood Analysis" />
            </Tabs>
          </Paper>

          {/* Chart Area */}
          <Grid container spacing={3}>
            {/* Listening Trends */}
            {currentView === 0 && (
              <>
                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                      <Typography variant="h6">Listening Activity Over Time</Typography>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <FormControl size="small">
                          <InputLabel>Chart Type</InputLabel>
                          <Select
                            value={chartType}
                            onChange={(e) => setChartType(e.target.value)}
                            label="Chart Type"
                          >
                            <MenuItem value="bar">Bar Chart</MenuItem>
                            <MenuItem value="line">Line Chart</MenuItem>
                            <MenuItem value="area">Area Chart</MenuItem>
                          </Select>
                        </FormControl>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={showComparison}
                              onChange={(e) => setShowComparison(e.target.checked)}
                            />
                          }
                          label="Show Comparison"
                        />
                      </Stack>
                    </Box>
                    {renderChart(data.listeningHistory, chartType, { xKey: 'date', yKey: 'plays' })}
                  </Paper>
                </Grid>
              </>
            )}

            {/* Genres & Artists */}
            {currentView === 1 && (
              <>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Top Genres</Typography>
                    {renderChart(data.topGenres, 'pie', { yKey: 'plays' })}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Top Artists</Typography>
                    <Stack spacing={2}>
                      {data.topArtists.map((artist, index) => (
                        <Box key={artist.name} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="h6" color="text.secondary" sx={{ minWidth: 24 }}>
                            {index + 1}
                          </Typography>
                          <Avatar src={artist.image} alt={artist.name}>
                            <Person />
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2">{artist.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {artist.plays} plays
                            </Typography>
                          </Box>
                          <Chip
                            label={`${artist.plays}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              </>
            )}

            {/* Audio Features */}
            {currentView === 2 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>Your Audio Profile</Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      {renderChart([
                        { name: 'Energy', value: data.audioFeatures.energy },
                        { name: 'Valence', value: data.audioFeatures.valence },
                        { name: 'Danceability', value: data.audioFeatures.danceability },
                        { name: 'Acousticness', value: data.audioFeatures.acousticness },
                        { name: 'Instrumentalness', value: data.audioFeatures.instrumentalness }
                      ], 'radar')}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Stack spacing={3}>
                        {Object.entries(data.audioFeatures).map(([feature, value]) => (
                          <Box key={feature}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                {feature}
                              </Typography>
                              <Typography variant="body2" color="primary">
                                {typeof value === 'number' ? (value < 1 ? (value * 100).toFixed(0) + '%' : value.toFixed(0)) : value}
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={typeof value === 'number' ? (value < 1 ? value * 100 : Math.min(value / 200 * 100, 100)) : 0}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                        ))}
                      </Stack>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}

            {/* Time Analysis */}
            {currentView === 3 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>Listening Patterns by Hour</Typography>
                  {renderChart(data.hourlyDistribution, 'area', { xKey: 'hour', yKey: 'plays' })}
                </Paper>
              </Grid>
            )}

            {/* Mood Analysis */}
            {currentView === 4 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>Mood Distribution</Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      {renderChart(data.moodAnalysis, 'pie', { yKey: 'count' })}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Stack spacing={2}>
                        {data.moodAnalysis.map((mood) => (
                          <Card key={mood.mood} sx={{ bgcolor: mood.color + '10' }}>
                            <CardContent sx={{ py: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h4">{mood.icon}</Typography>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    {mood.mood}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {mood.count} tracks
                                  </Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={(mood.count / Math.max(...data.moodAnalysis.map(m => m.count))) * 100}
                                  sx={{
                                    width: 100,
                                    height: 8,
                                    borderRadius: 4,
                                    '& .MuiLinearProgress-bar': {
                                      backgroundColor: mood.color
                                    }
                                  }}
                                />
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}
          </Grid>

          {/* Insights Panel */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Insights color="primary" /> AI-Generated Insights
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Alert severity="info" sx={{ height: '100%' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Peak Listening Hours
                  </Typography>
                  <Typography variant="body2">
                    You're most active between 6-9 PM, perfect for discovering new music during your evening routine.
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={12} md={4}>
                <Alert severity="success" sx={{ height: '100%' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Genre Diversity
                  </Typography>
                  <Typography variant="body2">
                    Great diversity! You listen to {data.topGenres.length} different genres, showing an open musical taste.
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={12} md={4}>
                <Alert severity="warning" sx={{ height: '100%' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Discovery Opportunity
                  </Typography>
                  <Typography variant="body2">
                    Try exploring more instrumental music - it's only {Math.round(data.audioFeatures.instrumentalness * 100)}% of your library.
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default AdvancedAnalyticsVisualizationDashboard;