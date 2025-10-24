import { createContext, useContext, useMemo } from 'react';
import useLocalStorage from '../lib/hooks/useLocalStorage';

const UserPreferencesStateContext = createContext();
const UserPreferencesActionsContext = createContext();

export const useUserPreferencesState = () => {
  const context = useContext(UserPreferencesStateContext);
  if (!context) {
    throw new Error('useUserPreferencesState must be used within a UserPreferencesProvider');
  }
  return context;
};

export const useUserPreferencesActions = () => {
  const context = useContext(UserPreferencesActionsContext);
  if (!context) {
    throw new Error('useUserPreferencesActions must be used within a UserPreferencesProvider');
  }
  return context;
};

export const useUserPreferences = () => {
  return { ...useUserPreferencesState(), ...useUserPreferencesActions() };
};

export function UserPreferencesProvider({ children }) {
  const [theme, setTheme] = useLocalStorage('echotune_theme', 'dark');
  const [layout, setLayout] = useLocalStorage('echotune_layout', 'compact');

  const stateValue = useMemo(() => ({
    theme,
    layout,
  }), [theme, layout]);

  const actionsValue = useMemo(() => ({
    setTheme,
    setLayout,
  }), [setTheme, setLayout]);

  return (
    <UserPreferencesStateContext.Provider value={stateValue}>
      <UserPreferencesActionsContext.Provider value={actionsValue}>
        {children}
      </UserPreferencesActionsContext.Provider>
    </UserPreferencesStateContext.Provider>
  );
}
