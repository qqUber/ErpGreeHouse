import { useEffect, useMemo, useState } from 'react';

export type ViewportMode =
  | 'mobile'
  | 'tablet'
  | 'desktop'
  | 'desktop-xl'
  | 'desktop-2k'
  | 'desktop-4k';
export type ViewDensity = 'compact' | 'comfortable' | 'spacious';

type ViewportState = {
  width: number;
  height: number;
  mode: ViewportMode;
  density: ViewDensity;
};

function detectMode(width: number): ViewportMode {
  if (width < 768) return 'mobile';
  if (width < 1200) return 'tablet';
  if (width < 1920) return 'desktop';
  if (width < 2560) return 'desktop-xl';
  if (width < 3840) return 'desktop-2k';
  return 'desktop-4k';
}

function detectDensity(width: number): ViewDensity {
  if (width < 1600) return 'compact';
  if (width < 2560) return 'comfortable';
  return 'spacious';
}

function readWindowSize() {
  if (typeof window === 'undefined') {
    return { width: 1440, height: 900 };
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

export function useViewportMode(): ViewportState {
  const [size, setSize] = useState(readWindowSize);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId = 0;
    const sync = () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        setSize(readWindowSize());
      });
    };

    sync();
    window.addEventListener('resize', sync, { passive: true });
    window.addEventListener('orientationchange', sync, { passive: true });

    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, []);

  return useMemo(() => {
    const mode = detectMode(size.width);
    const density = detectDensity(size.width);
    return { ...size, mode, density };
  }, [size]);
}
