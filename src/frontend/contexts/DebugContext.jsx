import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

const DebugStateContext = createContext();
const DebugActionsContext = createContext();

export const useDebugState = () => {
  const context = useContext(DebugStateContext);
  if (!context) {
    throw new Error('useDebugState must be used within a DebugProvider');
  }
  return context;
};

export const useDebugActions = () => {
  const context = useContext(DebugActionsContext);
  if (!context) {
    throw new Error('useDebugActions must be used within a DebugProvider');
  }
  return context;
};

export function DebugProvider({ children }) {
  const [debugData, setDebugData] = useState({});
  const [isOpen, setIsOpen] = useState(false);

  const registerDebugInfo = useCallback((key, data) => {
    setDebugData(prev => ({ ...prev, [key]: data }));
  }, []);

  const stateValue = useMemo(() => ({
    debugData,
    isOpen,
  }), [debugData, isOpen]);

  const actionsValue = useMemo(() => ({
    registerDebugInfo,
    toggleDebugOverlay: () => setIsOpen(prev => !prev),
  }), [registerDebugInfo]);

  return (
    <DebugStateContext.Provider value={stateValue}>
      <DebugActionsContext.Provider value={actionsValue}>
        {children}
      </DebugActionsContext.Provider>
    </DebugStateContext.Provider>
  );
}
