import { useState, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';

export function useResponsive() {
  const devMobilePreview = useEditorStore((s) => s.devMobilePreview);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = devMobilePreview || windowWidth < 768;
  const isTablet = !devMobilePreview && windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = !devMobilePreview && windowWidth >= 1024;

  return {
    isMobile,
    isTablet,
    isDesktop,
    devMobilePreview,
    windowWidth,
  };
}
