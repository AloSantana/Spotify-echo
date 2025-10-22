/**
 * Spotify Demo Component
 * 
 * Sample component demonstrating the use of:
 * - useSpotify hook for Spotify operations
 * - useDatabase hook for database operations
 * - useToast for notifications
 * - Error boundary integration
 * - Loading states
 */

import React, { useState, useEffect } from 'react';
import { useSpotify } from '../lib/hooks/useSpotify.js';
import { useDatabase } from '../contexts/DatabaseContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';

export function SpotifyDemo() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState(null);
  
  // Use our custom hooks
  const { 
    searchTracks, 
    getTopTracks, 
    getUserProfile,
    loading: spotifyLoading,
    error: spotifyError 
  } = useSpotify();
  
  const { 
    saveListeningHistory,
    getRecommendations,
    isLoading: dbLoading,
    getError: getDbError
  } = useDatabase();
  
  const { 
    success: toastSuccess, 
    error: toastError, 
    info: toastInfo,
    showApiError 
  } = useToast();

  // Search state
  const [searchResults, setSearchResults] = useState([]);
  const [topTracks, setTopTracks] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  
  // Loading states
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingTopTracks, setIsLoadingTopTracks] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Load user profile on mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  // Handle any Spotify errors
  useEffect(() => {
    if (spotifyError) {
      showApiError(spotifyError, 'Spotify operation failed');
    }
  }, [spotifyError, showApiError]);

  // Load user profile
  const loadUserProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const profile = await getUserProfile();
      if (profile) {
        setUserProfile(profile);
        toastSuccess(`Welcome back, ${profile.display_name || 'User'}!`);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      toastError('Failed to load user profile');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toastInfo('Please enter a search query');
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchTracks(searchQuery, 10);
      if (results && results.length > 0) {
        setSearchResults(results);
        toastSuccess(`Found ${results.length} tracks`);
      } else {
        setSearchResults([]);
        toastInfo('No tracks found');
      }
    } catch (error) {
      console.error('Search failed:', error);
      toastError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Load top tracks
  const loadTopTracks = async () => {
    setIsLoadingTopTracks(true);
    try {
      const tracks = await getTopTracks(5);
      if (tracks && tracks.length > 0) {
        setTopTracks(tracks);
        toastSuccess(`Loaded your top ${tracks.length} tracks`);
      } else {
        setTopTracks([]);
        toastInfo('No top tracks available');
      }
    } catch (error) {
      console.error('Failed to load top tracks:', error);
      toastError('Failed to load top tracks');
    } finally {
      setIsLoadingTopTracks(false);
    }
  };

  // Save track to history
  const saveToHistory = async (track) => {
    try {
      const historyData = {
        trackId: track.id,
        trackName: track.name,
        artistName: track.artists?.[0]?.name || 'Unknown Artist',
        albumName: track.album?.name || 'Unknown Album',
        playedAt: new Date().toISOString(),
        duration: track.duration_ms,
      };

      const result = await saveListeningHistory(historyData);
      
      if (result.success) {
        toastSuccess(`Saved "${track.name}" to your listening history`);
        setSelectedTrack(track);
      } else {
        toastError('Failed to save to history');
      }
    } catch (error) {
      console.error('Failed to save history:', error);
      showApiError(error, 'Failed to save listening history');
    }
  };

  // Get recommendations based on selected track
  const getTrackRecommendations = async () => {
    if (!selectedTrack) {
      toastInfo('Please select a track first');
      return;
    }

    try {
      const userId = userProfile?.id || 'demo-user';
      const result = await getRecommendations(userId, {
        seedTrackId: selectedTrack.id,
        limit: 5
      });

      if (result.success && result.data) {
        toastSuccess(`Found ${result.data.length || 0} recommendations`, {
          action: 'View',
          onAction: () => console.log('View recommendations:', result.data)
        });
      } else {
        toastInfo('No recommendations available');
      }
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      showApiError(error, 'Failed to get recommendations');
    }
  };

  // Render loading skeleton
  const renderSkeleton = (count = 3) => {
    return Array.from({ length: count }).map((_, index) => (
      <div key={index} className="skeleton-item" style={{
        padding: '12px',
        marginBottom: '8px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'loading 1.5s infinite',
        borderRadius: '4px',
        height: '60px'
      }} />
    ));
  };

  return (
    <div className="spotify-demo" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <style>
        {`
          @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          
          .track-item {
            padding: 12px;
            margin-bottom: 8px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          
          .track-item:hover {
            background-color: #f5f5f5;
          }
          
          .track-item.selected {
            background-color: #e8f4fd;
            border-color: #2196f3;
          }
          
          .button {
            padding: 8px 16px;
            margin: 4px;
            border: 1px solid #2196f3;
            background-color: #2196f3;
            color: white;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          
          .button:hover:not(:disabled) {
            background-color: #1976d2;
          }
          
          .button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .button.secondary {
            background-color: white;
            color: #2196f3;
          }
          
          .button.secondary:hover:not(:disabled) {
            background-color: #f5f5f5;
          }
        `}
      </style>

      <h2>Spotify Integration Demo</h2>
      
      {/* User Profile Section */}
      <div className="profile-section" style={{ marginBottom: '24px' }}>
        <h3>User Profile</h3>
        {isLoadingProfile ? (
          <div>Loading profile...</div>
        ) : userProfile ? (
          <div>
            <p>Welcome, <strong>{userProfile.display_name || userProfile.id}</strong></p>
            <p>Email: {userProfile.email || 'Not available'}</p>
          </div>
        ) : (
          <div>
            <p>Not logged in</p>
            <button className="button" onClick={loadUserProfile}>
              Load Profile
            </button>
          </div>
        )}
      </div>

      {/* Search Section */}
      <div className="search-section" style={{ marginBottom: '24px' }}>
        <h3>Search Tracks</h3>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for tracks..."
            style={{
              flex: 1,
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
          <button 
            type="submit" 
            className="button" 
            disabled={isSearching || spotifyLoading}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Search Results */}
        {isSearching ? (
          renderSkeleton(3)
        ) : searchResults.length > 0 ? (
          <div style={{ marginTop: '16px' }}>
            <h4>Search Results:</h4>
            {searchResults.map((track) => (
              <div
                key={track.id}
                className={`track-item ${selectedTrack?.id === track.id ? 'selected' : ''}`}
                onClick={() => saveToHistory(track)}
              >
                <div><strong>{track.name}</strong></div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {track.artists?.[0]?.name || 'Unknown Artist'} • {track.album?.name || 'Unknown Album'}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Top Tracks Section */}
      <div className="top-tracks-section" style={{ marginBottom: '24px' }}>
        <h3>Your Top Tracks</h3>
        <button 
          className="button secondary" 
          onClick={loadTopTracks}
          disabled={isLoadingTopTracks || spotifyLoading}
        >
          {isLoadingTopTracks ? 'Loading...' : 'Load Top Tracks'}
        </button>

        {isLoadingTopTracks ? (
          renderSkeleton(5)
        ) : topTracks.length > 0 ? (
          <div style={{ marginTop: '16px' }}>
            {topTracks.map((track) => (
              <div
                key={track.id}
                className={`track-item ${selectedTrack?.id === track.id ? 'selected' : ''}`}
                onClick={() => saveToHistory(track)}
              >
                <div><strong>{track.name}</strong></div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {track.artists?.[0]?.name || 'Unknown Artist'} • {track.album?.name || 'Unknown Album'}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Selected Track Actions */}
      {selectedTrack && (
        <div className="selected-track-section" style={{ 
          padding: '16px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '4px',
          marginBottom: '24px'
        }}>
          <h3>Selected Track</h3>
          <p><strong>{selectedTrack.name}</strong></p>
          <p style={{ fontSize: '14px', color: '#666' }}>
            {selectedTrack.artists?.[0]?.name} • {selectedTrack.album?.name}
          </p>
          <div style={{ marginTop: '12px' }}>
            <button 
              className="button" 
              onClick={getTrackRecommendations}
              disabled={dbLoading('getRecommendations')}
            >
              Get Recommendations
            </button>
            <button 
              className="button secondary" 
              onClick={() => {
                setSelectedTrack(null);
                toastInfo('Track deselected');
              }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Database Error Display */}
      {getDbError('getRecommendations') && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          marginTop: '16px'
        }}>
          <strong>Database Error:</strong> {getDbError('getRecommendations').message}
        </div>
      )}
    </div>
  );
}

export default SpotifyDemo;
