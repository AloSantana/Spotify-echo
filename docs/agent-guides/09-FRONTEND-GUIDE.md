# 09 — Frontend Guide

> **Quick Reference:** React app structure, lazy loading, key contexts, essential components,
> Material-UI theme, Socket.IO client integration, API call patterns, state management, and
> mobile responsiveness strategy.

---

## 1. Project Structure

```
src/frontend/
├── App.jsx                          # Root component, routes, providers, lazy loading
├── styles/
│   └── App.css                      # Global styles
├── components/
│   ├── AuthStatus.jsx               # Auth indicator + AuthGuard HOC
│   ├── SpotifyLoginButton.jsx       # "Connect Spotify" CTA
│   ├── ChatFirstInterface.jsx       # Full-screen chat-first layout
│   ├── EnhancedChatInterface.jsx    # Chat with streaming + history
│   ├── ChatInput.jsx                # Message input + send button
│   ├── EnhancedSpotifyWebPlayer.jsx # Now playing + controls
│   ├── AdvancedMusicControlCenter.jsx # Full transport controls
│   ├── ExplainableRecommendations.jsx # Recommendation cards
│   ├── EnhancedMusicDiscovery.jsx   # Discovery dashboard
│   ├── PlaylistBuilder.jsx          # AI playlist generation
│   ├── PlaylistsPage.jsx            # All playlists list
│   ├── EnhancedAnalyticsDashboard.jsx # Analytics charts
│   ├── InsightsDashboard.jsx        # Listening insights
│   ├── BackendConnectedSettings.jsx # Settings with API sync
│   ├── ComprehensiveSystemSettings.jsx # Full settings panel
│   ├── EnhancedProviderPanel.jsx    # LLM provider selection
│   ├── ThemeProvider.jsx            # MUI theme + toggle
│   ├── ErrorBoundary.jsx            # React error boundary
│   ├── LoadingState.jsx             # Loading skeleton/spinner
│   └── MobileResponsiveManager.jsx  # Responsive layout manager
├── contexts/
│   ├── AuthContext.jsx              # JWT + user state
│   └── LLMContext.jsx               # Active LLM provider state
├── hooks/                           # Custom React hooks
└── routes/                          # Route components
```

---

## 2. App.jsx — Root Structure

```jsx
// src/frontend/App.jsx (simplified)
import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LLMProvider } from './contexts/LLMContext';
import ThemeProvider from './components/ThemeProvider';
import AuthStatus, { AuthGuard } from './components/AuthStatus';
import SpotifyLoginButton from './components/SpotifyLoginButton';
import LoadingState from './components/LoadingState';
import { EnhancedErrorBoundary } from './components/ErrorFallback';

// ── Lazy-loaded routes (split into separate JS chunks) ──
const ChatFirstInterface = lazy(() => import('./components/ChatFirstInterface'));
const PlaylistBuilder = lazy(() => import('./components/PlaylistBuilder'));
const ExplainableRecommendations = lazy(() => import('./components/ExplainableRecommendations'));
const EnhancedAnalyticsDashboard = lazy(() => import('./components/EnhancedAnalyticsDashboard'));
const BackendConnectedSettings = lazy(() => import('./components/BackendConnectedSettings'));

// ── Prefetch map: triggers import() on hover to reduce perceived latency ──
const prefetchers = {
  chat: () => import('./components/ChatFirstInterface'),
  recommendations: () => import('./components/ExplainableRecommendations'),
  playlist: () => import('./components/PlaylistBuilder'),
  analytics: () => import('./components/EnhancedAnalyticsDashboard'),
  settings: () => import('./components/BackendConnectedSettings'),
};

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingState />;

  if (!isAuthenticated) {
    return (
      <div className="login-screen">
        <h1>EchoTune AI 🎵</h1>
        <p>AI-powered music discovery</p>
        <SpotifyLoginButton />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route
        path="/chat"
        element={
          <AuthGuard>
            <Suspense fallback={<LoadingState />}>
              <ChatFirstInterface />
            </Suspense>
          </AuthGuard>
        }
      />
      <Route
        path="/recommendations"
        element={
          <AuthGuard>
            <Suspense fallback={<LoadingState />}>
              <ExplainableRecommendations />
            </Suspense>
          </AuthGuard>
        }
      />
      <Route
        path="/playlist"
        element={
          <AuthGuard>
            <Suspense fallback={<LoadingState />}>
              <PlaylistBuilder />
            </Suspense>
          </AuthGuard>
        }
      />
      <Route
        path="/analytics"
        element={
          <AuthGuard>
            <Suspense fallback={<LoadingState />}>
              <EnhancedAnalyticsDashboard />
            </Suspense>
          </AuthGuard>
        }
      />
      <Route
        path="/settings"
        element={
          <AuthGuard>
            <Suspense fallback={<LoadingState />}>
              <BackendConnectedSettings />
            </Suspense>
          </AuthGuard>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <EnhancedErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <LLMProvider>
            <Router>
              <AuthStatus />
              <AppRoutes />
            </Router>
          </LLMProvider>
        </AuthProvider>
      </ThemeProvider>
    </EnhancedErrorBoundary>
  );
}
```

---

## 3. Key Contexts

### 3.1 AuthContext

```jsx
// src/frontend/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('echotune_token'));
  const [isLoading, setIsLoading] = useState(true);

  // Validate token on mount
  useEffect(() => {
    async function validate() {
      if (!token) { setIsLoading(false); return; }
      try {
        const res = await fetch('/api/user/settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user || { token });
        } else {
          logout(); // Token invalid — clear
        }
      } catch {
        // Network error: keep token, retry later
      } finally {
        setIsLoading(false);
      }
    }
    validate();
  }, [token]);

  const login = useCallback((newToken, userData) => {
    localStorage.setItem('echotune_token', newToken);
    setToken(newToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('echotune_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
```

### 3.2 LLMContext

```jsx
// src/frontend/contexts/LLMContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const LLMContext = createContext(null);

export function LLMProvider({ children }) {
  const { token } = useAuth();
  const [providers, setProviders] = useState([]);
  const [activeProvider, setActiveProviderState] = useState('gemini');
  const [activeModel, setActiveModel] = useState('gemini-1.5-flash');

  useEffect(() => {
    fetch('/api/llm/providers')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setProviders(data.data.providers);
          setActiveProviderState(data.data.activeProvider);
        }
      })
      .catch(() => {}); // Silent fail — use defaults
  }, []);

  const setActiveProvider = async (providerName, model) => {
    await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ llmProvider: providerName, llmModel: model }),
    });
    setActiveProviderState(providerName);
    if (model) setActiveModel(model);
  };

  return (
    <LLMContext.Provider value={{ providers, activeProvider, activeModel, setActiveProvider }}>
      {children}
    </LLMContext.Provider>
  );
}

export const useLLM = () => useContext(LLMContext);
```

---

## 4. AuthGuard Pattern

```jsx
// src/frontend/components/AuthStatus.jsx
export function AuthGuard({ children, fallback = null }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingState />;
  if (!isAuthenticated) return fallback || <Navigate to="/" replace />;
  return children;
}
```

---

## 5. Material-UI Theme Setup

```jsx
// src/frontend/components/ThemeProvider.jsx
import React, { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';

const ThemeContext = createContext(null);

const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: { main: '#1DB954' },          // Spotify green
    secondary: { main: '#535353' },
    background: {
      default: mode === 'dark' ? '#121212' : '#f5f5f5',
      paper: mode === 'dark' ? '#181818' : '#ffffff',
    },
    text: {
      primary: mode === 'dark' ? '#FFFFFF' : '#000000',
      secondary: mode === 'dark' ? '#B3B3B3' : '#666666',
    },
  },
  typography: {
    fontFamily: '"Circular", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 20 },
        containedPrimary: { backgroundColor: '#1DB954', '&:hover': { backgroundColor: '#1aa34a' } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 8, backgroundImage: 'none' },
      },
    },
  },
});

export default function ThemeProvider({ children }) {
  const [mode, setMode] = useState(localStorage.getItem('theme') || 'dark');
  const theme = useMemo(() => getTheme(mode), [mode]);

  const toggleTheme = () => {
    const newMode = mode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
    localStorage.setItem('theme', newMode);
  };

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

---

## 6. Socket.IO Client Integration

```jsx
// src/frontend/hooks/useSocket.js
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

export function useSocket() {
  const { token } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    socketRef.current = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      console.log('🔌 Socket.IO connected');
      socketRef.current.emit('subscribe_now_playing');
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [token]);

  const subscribe = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { subscribe, emit };
}

// Usage in NowPlayingWidget:
// const { subscribe } = useSocket();
// useEffect(() => subscribe('now_playing', setPlaybackState), []);
```

---

## 7. API Call Patterns

### 7.1 API Utility (Fetch Wrapper)

```javascript
// src/frontend/utils/api.js
const API_BASE = '/api';

export async function apiCall(method, path, { body, token, params } = {}) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || `HTTP ${response.status}`);
    error.code = data.code;
    error.status = response.status;
    throw error;
  }

  return data;
}

// Convenience methods
export const api = {
  get: (path, opts) => apiCall('GET', path, opts),
  post: (path, body, opts) => apiCall('POST', path, { ...opts, body }),
  patch: (path, body, opts) => apiCall('PATCH', path, { ...opts, body }),
  delete: (path, opts) => apiCall('DELETE', path, opts),
};
```

### 7.2 Using in a Component

```jsx
// Example: EnhancedChatInterface.jsx (simplified)
import React, { useState, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function EnhancedChatInterface() {
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => localStorage.getItem('chatSessionId') || crypto.randomUUID());

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const data = await api.post('/chat/message', { message: input, sessionId }, { token });
      const assistantMessage = {
        role: 'assistant',
        content: data.data.message,
        timestamp: new Date(),
        provider: data.data.provider,
        spotifyAction: data.data.spotifyAction,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: 'error', content: `Error: ${error.message}`, timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId, token]);

  return (
    <div className="chat-interface">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message message-${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {loading && <div className="typing-indicator">AI is thinking...</div>}
      </div>
      <div className="input-area">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask about music or control Spotify..."
        />
        <button onClick={sendMessage} disabled={loading}>Send</button>
      </div>
    </div>
  );
}
```

---

## 8. Essential Component Responsibilities

| Component | Path | Responsibility |
|---|---|---|
| `App.jsx` | `frontend/App.jsx` | Root: providers, router, lazy imports |
| `AuthStatus.jsx` | `components/` | Nav auth indicator; exports `AuthGuard` |
| `SpotifyLoginButton.jsx` | `components/` | OAuth initiation button |
| `ChatFirstInterface.jsx` | `components/` | Full-screen chat-first layout |
| `EnhancedChatInterface.jsx` | `components/` | Chat with history, streaming, provider badge |
| `ChatInput.jsx` | `components/` | Input field with send, voice, attachments |
| `EnhancedSpotifyWebPlayer.jsx` | `components/` | Full player: artwork, transport, progress |
| `AdvancedMusicControlCenter.jsx` | `components/` | Play/pause/skip buttons, volume, shuffle |
| `ExplainableRecommendations.jsx` | `components/` | Recommendation cards with reasons |
| `EnhancedMusicDiscovery.jsx` | `components/` | Tabbed discovery (Recs + Search + Trending) |
| `PlaylistBuilder.jsx` | `components/` | AI playlist prompt → preview → save |
| `PlaylistsPage.jsx` | `components/` | All playlists grid with edit/delete |
| `EnhancedAnalyticsDashboard.jsx` | `components/` | Listening charts + top artists/tracks |
| `InsightsDashboard.jsx` | `components/` | Summary insights + weekly patterns |
| `BackendConnectedSettings.jsx` | `components/` | Settings synced to `/api/user/settings` |
| `EnhancedProviderPanel.jsx` | `components/` | LLM provider picker + health status |
| `ThemeProvider.jsx` | `components/` | MUI theme (dark/light) + toggle |
| `ErrorBoundary.jsx` | `components/` | Catches render errors, shows fallback |
| `LoadingState.jsx` | `components/` | Skeleton/spinner for Suspense fallback |

---

## 9. Lazy Loading Pattern with Prefetchers

```jsx
// Lazy load all heavy components (code splitting)
const PlaylistBuilder = lazy(() => import('./components/PlaylistBuilder'));

// Prefetch on link hover to reduce click-to-render latency
<NavLink
  to="/playlist"
  onMouseEnter={() => import('./components/PlaylistBuilder')}
>
  Playlists
</NavLink>

// Or use the prefetchers map from App.jsx:
<Tab
  label="Playlist"
  onMouseEnter={() => prefetchers.playlist?.()}
  onClick={() => navigate('/playlist')}
/>
```

---

## 10. State Management Approach

EchoTune uses **React Context + local state** — no Redux or Zustand:

| State Type | Solution |
|---|---|
| Auth (JWT, user object) | `AuthContext` (global) |
| LLM provider selection | `LLMContext` (global) |
| Theme (dark/light) | `ThemeProvider` context |
| Playback state | Local state in player component, updated via Socket.IO |
| Chat messages | Local state in `EnhancedChatInterface` |
| Recommendations | Local state in `ExplainableRecommendations` |
| Form inputs | Local `useState` in each form component |
| Server state (API data) | Local state + `useEffect` for fetching |

> **Agent Note:** Do not introduce Redux or Zustand. The application's state complexity
> is well-served by React Context. Adding a state management library would increase bundle
> size and complexity without benefit.

---

## 11. Mobile Responsiveness

```jsx
// src/frontend/components/MobileResponsiveManager.jsx pattern
import { useMediaQuery, useTheme } from '@mui/material';

function ResponsiveLayout({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));   // < 600px
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));   // < 900px

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Sidebar: hidden on mobile, collapsible on tablet */}
      {!isMobile && (
        <Drawer
          variant={isTablet ? 'temporary' : 'permanent'}
          sx={{ width: isTablet ? 0 : 240 }}
        >
          {/* Navigation */}
        </Drawer>
      )}

      {/* Main content */}
      <Box sx={{ flex: 1, overflow: 'auto', pb: isMobile ? 10 : 0 }}>
        {children}
      </Box>

      {/* Bottom nav on mobile */}
      {isMobile && <MobileBottomNav />}

      {/* Now playing: fixed bottom on mobile, sidebar on desktop */}
      <NowPlayingWidget
        variant={isMobile ? 'compact-bottom' : 'full-sidebar'}
      />
    </Box>
  );
}
```

---

## 12. Error Boundary

```jsx
// src/frontend/components/ErrorBoundary.jsx
import React from 'react';
import { Box, Typography, Button } from '@mui/material';

export class EnhancedErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('React Error Boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5">Something went wrong 🎵</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {this.state.error?.message}
          </Typography>
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => window.location.reload()}
          >
            Reload App
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}
```

---

## 13. Vite Build for Production

```bash
# Build frontend (outputs to dist/)
npm run build

# dist/ structure after build:
dist/
├── index.html              # SPA entry point
├── assets/
│   ├── vendor-[hash].js    # React, React-DOM (chunked)
│   ├── mui-[hash].js       # Material-UI (chunked)
│   ├── charts-[hash].js    # Recharts (chunked)
│   └── [component]-[hash].js  # Lazy-loaded route chunks
└── favicon.ico
```

Express serves `dist/` in production:
```javascript
// src/routes/static.js
app.use(express.static(path.join(__dirname, '../../dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});
```

---

## Cross-References

- API endpoints called by components → `05-API-REFERENCE.md`
- Socket.IO events received → `05-API-REFERENCE.md` §11
- Auth flow that populates AuthContext → `06-SPOTIFY-INTEGRATION.md`
- LLM providers shown in LLMContext → `07-AI-LLM-INTEGRATION.md`
