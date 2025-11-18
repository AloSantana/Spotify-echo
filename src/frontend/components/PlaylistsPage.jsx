/**
 * PlaylistsPage Component
 * 
 * Displays user's playlists with grid layout and empty state handling
 */

import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography, CircularProgress } from '@mui/material';
import EmptyState, { EmptyPlaylists } from './EmptyState';

const PlaylistsPage = () => {
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    // Simulate loading playlists
    const timer = setTimeout(() => {
      setPlaylists([]); // Empty for now
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

  if (playlists.length === 0) {
    return <EmptyPlaylists onCreatePlaylist={() => window.location.href = '/playlist'} />;
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Your Playlists
      </Typography>
      <Grid container spacing={3}>
        {playlists.map((playlist) => (
          <Grid item xs={12} sm={6} md={4} key={playlist.id}>
            {/* Playlist card would go here */}
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default PlaylistsPage;
