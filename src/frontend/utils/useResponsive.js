import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive design and device detection
 * 
 * Provides breakpoint detection, device type, and screen size information.
 * Updates on window resize with debouncing for performance.
 * 
 * @returns {Object} Responsive state object
 * @example
 * const { isMobile, isTablet, isDesktop, width } = useResponsive();
 * 
 * return (
 *   <div>
 *     {isMobile && <MobileView />}
 *     {isTablet && <TabletView />}
 *     {isDesktop && <DesktopView />}
 *   </div>
 * );
 */
export const useResponsive = () => {
  const [state, setState] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    orientation: 'landscape',
  });

  useEffect(() => {
    // Breakpoints matching Material-UI defaults
    const breakpoints = {
      mobile: 768,
      tablet: 1024,
    };

    const updateState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setState({
        width,
        height,
        isMobile: width < breakpoints.mobile,
        isTablet: width >= breakpoints.mobile && width < breakpoints.tablet,
        isDesktop: width >= breakpoints.tablet,
        orientation: width > height ? 'landscape' : 'portrait',
      });
    };

    // Debounce resize events for performance
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateState, 150);
    };

    // Initial update
    updateState();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return state;
};

/**
 * Hook for detecting if viewport matches a media query
 * 
 * @param {string} query - Media query string (e.g., '(max-width: 768px)')
 * @returns {boolean} Whether the query matches
 * 
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);

    // Create event listener
    const handler = (event) => setMatches(event.matches);

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      // Legacy browsers
      mediaQuery.addListener(handler);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, [query]);

  return matches;
};

/**
 * Hook for detecting touch capability
 * 
 * @returns {boolean} Whether the device supports touch
 */
export const useTouch = () => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
  }, []);

  return isTouch;
};

/**
 * Hook for viewport size
 * 
 * @returns {Object} Current viewport dimensions
 */
export const useViewport = () => {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setViewport({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return viewport;
};

export default useResponsive;
