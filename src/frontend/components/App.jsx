import { useState, useEffect, Profiler, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { UserPreferencesProvider } from '../contexts/UserPreferencesContext';
import { SocketProvider } from './realtime/SocketContext';
import { SpotifyPlayerProvider } from './player/SpotifyPlayerContext';
import Header from './layout/Header';
import SkeletonLoader from './SkeletonLoader';

const Dashboard = lazy(() => import('../routes/Dashboard'));
const PlaylistManager = lazy(() => import('../routes/PlaylistsPage'));
const UserProfile = lazy(() => import('../routes/UserProfile'));
const Settings = lazy(() => import('../routes/Settings'));
const AuthCallback = lazy(() => import('../routes/AuthCallback'));
const SongsPage = lazy(() => import('../routes/SongsPage'));
const LandingPage = lazy(() => import('../routes/LandingPage'));
const EnhancedAdvancedSettings = lazy(() => import('../routes/EnhancedAdvancedSettings'));
const EnhancedSpotifyChatInterface = lazy(() => import('../routes/EnhancedSpotifyChatInterface'));
const ChatInterface = lazy(() => import('./chat/ChatInterface'));

import './App.css';
import { ToastProvider } from '../contexts/ToastContext';
import { DatabaseProvider } from '../contexts/DatabaseContext';
import { GlobalLoadingProvider } from './GlobalLoadingIndicator';
import ErrorBoundary from './ErrorBoundary';
import ToastContainer from './ToastContainer';
import { onRenderCallback } from '../lib/performance-profiler';

/**
 * Main EchoTune AI Application Component
 *
 * Provides context providers for:
 * - Authentication (Spotify OAuth)
 * - Real-time communication (Socket.IO)
 * - Music player (Spotify Web Player SDK)
 *
 * Handles routing for different application views
 */
function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize application
    const initializeApp = async () => {
      try {
        // Check authentication status
        const _authStatus = localStorage.getItem('echotune_user');

        // Initialize health check
        const healthResponse = await fetch('/health');
        const healthData = await healthResponse.json();

        if (healthData.status === 'error') {
          throw new Error('Application health check failed');
        }

        setIsLoading(false);
      } catch (err) {
        console.error('App initialization error:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <h2>🎵 Initializing EchoTune AI...</h2>
        <p>Setting up your personalized music experience</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>⚠️ Application Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>🔄 Retry</button>
      </div>
    );
  }

  return (
    <Router>
      <Profiler id="App" onRender={onRenderCallback}>
        <AuthProvider>
          <UserPreferencesProvider>
            <ToastProvider>
              <GlobalLoadingProvider>
                <DatabaseProvider>
                  <SocketProvider>
                    <SpotifyPlayerProvider>
                      <ErrorBoundary>
                        <div className="app">
                          <Header />
                          <ToastContainer />
                          <main className="main-content">
                            <Suspense fallback={<SkeletonLoader />}>
                              <Routes>
                                <Route path="/" element={<LandingPage />} />
                                <Route path="/chat" element={<EnhancedSpotifyChatInterface />} />
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/playlists" element={<PlaylistManager />} />
                                <Route path="/profile" element={<UserProfile />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/settings/advanced" element={<EnhancedAdvancedSettings />} />
                                <Route path="/chat/basic" element={<ChatInterface />} />
                                <Route path="/callback" element={<AuthCallback />} />
                                <Route path="/songs" element={<SongsPage />} />
                              </Routes>
                            </Suspense>
                          </main>
                        </div>
                      </ErrorBoundary>
                    </SpotifyPlayerProvider>
                  </SocketProvider>
                </DatabaseProvider>
              </GlobalLoadingProvider>
            </ToastProvider>
          </UserPreferencesProvider>
        </AuthProvider>
      </Profiler>
    </Router>
  );
}

export default App;
