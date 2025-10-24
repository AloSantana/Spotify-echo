import { Profiler, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider, useAppState } from '../contexts/AppContext';
import { DebugProvider } from '../contexts/DebugContext';
import AppInitializer from './AppInitializer';
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
import DebugOverlay from './DebugOverlay';
import { onRenderCallback } from '../lib/performance-profiler';

function AppContent() {
  const { isInitializing, globalError } = useAppState();

  if (isInitializing) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <h2>🎵 Initializing EchoTune AI...</h2>
        <p>Setting up your personalized music experience</p>
      </div>
    );
  }

  if (globalError) {
    return (
      <div className="error-screen">
        <h2>⚠️ Application Error</h2>
        <p>{globalError}</p>
        <button onClick={() => window.location.reload()}>🔄 Retry</button>
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      <ToastContainer />
      {process.env.NODE_ENV === 'development' && <DebugOverlay />}
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
  );
}

function App() {
  return (
    <Router>
      <Profiler id="App" onRender={onRenderCallback}>
        <ErrorBoundary>
          <AppProvider>
            <DebugProvider>
              <AppInitializer>
                <AuthProvider>
                <UserPreferencesProvider>
                  <ToastProvider>
                    <GlobalLoadingProvider>
                      <DatabaseProvider>
                        <SocketProvider>
                          <SpotifyPlayerProvider>
                            <AppContent />
                          </SpotifyPlayerProvider>
                        </SocketProvider>
                      </DatabaseProvider>
                    </GlobalLoadingProvider>
                  </ToastProvider>
                </UserPreferencesProvider>
                </AuthProvider>
              </AppInitializer>
            </DebugProvider>
          </AppProvider>
        </ErrorBoundary>
      </Profiler>
    </Router>
  );
}

export default App;
