import { useState, useEffect } from 'react';

/**
 * Hook to detect whether the current device/viewport should use the mobile layout.
 * Checks both viewport dimensions and mobile user-agent/touch characteristics.
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const checkIsMobile = (): boolean => {
    if (typeof window === 'undefined') return false;

    // 1. Mobile phone User-Agent detection (iPhone, iPod, Android phone)
    const isMobileUA = /iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    // 2. Viewport width check
    const isNarrowViewport = window.innerWidth <= breakpoint;

    // 3. Landscape phone detection: on modern iPhones/phones in landscape, width is ~844-932px,
    // but screen height is very short (<= 500px)
    const isLandscapePhone = isMobileUA && window.innerHeight <= 500;

    return isNarrowViewport || isLandscapePhone;
  };

  const [isMobile, setIsMobile] = useState<boolean>(checkIsMobile);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkIsMobile());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [breakpoint]);

  return isMobile;
}

export default useIsMobile;

