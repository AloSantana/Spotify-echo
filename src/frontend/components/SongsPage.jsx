/**
 * SongsPage Component
 * 
 * Displays user's song library with search and filtering
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import EmptyState, { EmptyLibrary } from './EmptyState';

const SongsPage = () => {
  const [loading, setLoading] = useState(true);
  const [songs, setSongs] = useState([]);

  useEffect(() => {
    // Simulate loading songs
    const timer = setTimeout(() => {
      setSongs([]); // Empty for now
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (songs.length === 0) {
    return <EmptyLibrary onDiscoverMusic={() => window.location.href = '/discovery'} />;
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Your Songs
      </Typography>
      {/* Song list would go here */}
    </Box>
  );
};

export default SongsPage;
