import { useEffect } from 'react';

const useStorageSync = (key, setState) => {
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key) {
        try {
          const newValue = e.newValue ? JSON.parse(e.newValue) : null;
          setState(newValue);
        } catch (error) {
          console.error('Error parsing stored value:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, setState]);
};

export default useStorageSync;
