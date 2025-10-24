import React from 'react';
import { useDebugState, useDebugActions } from '../contexts/DebugContext';
import { useAppState } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useDatabase } from '../contexts/DatabaseContext';
import { useLLM } from '../contexts/LLMContext';
import { useUserPreferencesState } from '../contexts/UserPreferencesContext';

const DebugOverlay = () => {
  const { isOpen, debugData } = useDebugState();
  const { toggleDebugOverlay, registerDebugInfo } = useDebugActions();

  // Register context states for debugging
  React.useEffect(() => {
    registerDebugInfo('app', useAppState());
    registerDebugInfo('auth', useAuth());
    registerDebugInfo('database', useDatabase());
    registerDebugInfo('llm', useLLM());
    registerDebugInfo('preferences', useUserPreferencesState());
  }, [registerDebugInfo]);

  if (!isOpen) {
    return (
      <button onClick={toggleDebugOverlay} className="debug-toggle-button">
        🐞
      </button>
    );
  }

  return (
    <div className="debug-overlay">
      <div className="debug-header">
        <h3>🐞 Debug Overlay</h3>
        <button onClick={toggleDebugOverlay}>Close</button>
      </div>
      <div className="debug-content">
        {Object.entries(debugData).map(([key, value]) => (
          <div key={key} className="debug-section">
            <h4>{key}</h4>
            <pre>{JSON.stringify(value, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DebugOverlay;
