import { useEffect } from 'react';
import { useAppActions } from '../contexts/AppContext';

function AppInitializer({ children }) {
  const { finishInitializing, setGlobalError } = useAppActions();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Example of an async initialization task
        const healthResponse = await fetch('/health');
        if (!healthResponse.ok) {
          const healthData = await healthResponse.json();
          throw new Error(healthData.message || 'Application health check failed');
        }
        
        // All initializations are successful
        finishInitializing();
      } catch (err) {
        console.error('App initialization error:', err);
        setGlobalError(err.message);
        finishInitializing(); // Finish initializing even on error to show the error screen
      }
    };

    initializeApp();
  }, [finishInitializing, setGlobalError]);

  return children;
}

export default AppInitializer;
