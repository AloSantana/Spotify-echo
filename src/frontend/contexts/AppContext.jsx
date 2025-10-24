import React, { createContext, useContext, useState, useMemo } from 'react';

const AppStateContext = createContext();
const AppActionsContext = createContext();

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
};

export const useAppActions = () => {
  const context = useContext(AppActionsContext);
  if (!context) {
    throw new Error('useAppActions must be used within an AppProvider');
  }
  return context;
};

export const useApp = () => {
  return { ...useAppState(), ...useAppActions() };
};

export function AppProvider({ children }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [globalError, setGlobalError] = useState(null);

  const stateValue = useMemo(() => ({
    isInitializing,
    globalError,
  }), [isInitializing, globalError]);

  const actionsValue = useMemo(() => ({
    setGlobalError,
    clearGlobalError: () => setGlobalError(null),
    finishInitializing: () => setIsInitializing(false),
  }), []);

  return (
    <AppStateContext.Provider value={stateValue}>
      <AppActionsContext.Provider value={actionsValue}>
        {children}
      </AppActionsContext.Provider>
    </AppStateContext.Provider>
  );
}
