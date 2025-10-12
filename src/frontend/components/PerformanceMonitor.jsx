import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Paper, Typography, Chip, LinearProgress, IconButton, Collapse } from '@mui/material';
import { ExpandMore, ExpandLess, Speed, Memory, Timer } from '@mui/icons-material';
import { useWebVitals, useMemoryMonitor } from '../utils/usePerformanceMonitor';
import './PerformanceMonitor.css';

/**
 * Performance Monitor Component
 * 
 * Displays real-time performance metrics including Web Vitals,
 * memory usage, and component render times.
 * 
 * Only shown in development mode by default.
 * 
 * @component
 * @example
 * <PerformanceMonitor position="bottom-right" />
 */
const PerformanceMonitor = ({
  position = 'bottom-right',
  showInProduction = false,
  collapsed = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  const vitals = useWebVitals();
  const memory = useMemoryMonitor();

  // Don't render in production unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && !showInProduction) {
    return null;
  }

  /**
   * Get color based on metric value and thresholds
   */
  const getMetricColor = (metric, value) => {
    const thresholds = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      fcp: { good: 1800, poor: 3000 },
      ttfb: { good: 800, poor: 1800 },
    };

    if (!value || !thresholds[metric]) return 'default';

    const { good, poor } = thresholds[metric];

    if (value <= good) return 'success';
    if (value <= poor) return 'warning';
    return 'error';
  };

  /**
   * Format metric value for display
   */
  const formatMetric = (value, unit = 'ms') => {
    if (value === null || value === undefined) return '—';
    return `${Math.round(value)}${unit}`;
  };

  /**
   * Get memory usage color
   */
  const getMemoryColor = (percentage) => {
    if (percentage < 50) return 'success';
    if (percentage < 75) return 'warning';
    return 'error';
  };

  const positionClass = `performance-monitor--${position}`;

  return (
    <Paper
      className={`performance-monitor ${positionClass} ${isExpanded ? 'expanded' : 'collapsed'}`}
      elevation={4}
      data-testid="performance-monitor"
    >
      <Box className="performance-monitor__header">
        <Box className="performance-monitor__title">
          <Speed fontSize="small" />
          <Typography variant="subtitle2">Performance</Typography>
        </Box>
        <IconButton
          size="small"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={isExpanded}>
        <Box className="performance-monitor__content">
          {/* Web Vitals Section */}
          <Box className="performance-monitor__section">
            <Box className="performance-monitor__section-header">
              <Timer fontSize="small" />
              <Typography variant="caption">Web Vitals</Typography>
            </Box>

            <Box className="performance-monitor__metrics">
              <Box className="performance-monitor__metric">
                <Typography variant="caption" color="text.secondary">
                  LCP
                </Typography>
                <Chip
                  label={formatMetric(vitals.lcp)}
                  size="small"
                  color={getMetricColor('lcp', vitals.lcp)}
                  variant="outlined"
                />
              </Box>

              <Box className="performance-monitor__metric">
                <Typography variant="caption" color="text.secondary">
                  FID
                </Typography>
                <Chip
                  label={formatMetric(vitals.fid)}
                  size="small"
                  color={getMetricColor('fid', vitals.fid)}
                  variant="outlined"
                />
              </Box>

              <Box className="performance-monitor__metric">
                <Typography variant="caption" color="text.secondary">
                  CLS
                </Typography>
                <Chip
                  label={formatMetric(vitals.cls, '')}
                  size="small"
                  color={getMetricColor('cls', vitals.cls)}
                  variant="outlined"
                />
              </Box>

              <Box className="performance-monitor__metric">
                <Typography variant="caption" color="text.secondary">
                  FCP
                </Typography>
                <Chip
                  label={formatMetric(vitals.fcp)}
                  size="small"
                  color={getMetricColor('fcp', vitals.fcp)}
                  variant="outlined"
                />
              </Box>

              <Box className="performance-monitor__metric">
                <Typography variant="caption" color="text.secondary">
                  TTFB
                </Typography>
                <Chip
                  label={formatMetric(vitals.ttfb)}
                  size="small"
                  color={getMetricColor('ttfb', vitals.ttfb)}
                  variant="outlined"
                />
              </Box>
            </Box>
          </Box>

          {/* Memory Usage Section */}
          {memory && (
            <Box className="performance-monitor__section">
              <Box className="performance-monitor__section-header">
                <Memory fontSize="small" />
                <Typography variant="caption">Memory Usage</Typography>
              </Box>

              <Box className="performance-monitor__memory">
                <Box className="performance-monitor__memory-info">
                  <Typography variant="caption" color="text.secondary">
                    {Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB /{' '}
                    {Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB
                  </Typography>
                  <Typography variant="caption" fontWeight="bold">
                    {memory.usedPercentage}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={parseFloat(memory.usedPercentage)}
                  color={getMemoryColor(parseFloat(memory.usedPercentage))}
                  className="performance-monitor__memory-bar"
                />
              </Box>
            </Box>
          )}

          {/* Legend */}
          <Box className="performance-monitor__legend">
            <Typography variant="caption" color="text.secondary">
              🟢 Good | 🟡 Needs Improvement | 🔴 Poor
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

PerformanceMonitor.propTypes = {
  /** Position of the monitor */
  position: PropTypes.oneOf(['top-left', 'top-right', 'bottom-left', 'bottom-right']),
  /** Whether to show in production */
  showInProduction: PropTypes.bool,
  /** Whether to start collapsed */
  collapsed: PropTypes.bool,
};

export default PerformanceMonitor;
