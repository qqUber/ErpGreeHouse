import { useEffect, useMemo, useState } from 'react';

export type ViewportMode = 'mobile' | 'tablet' | 'desktop';
export type ViewDensity = 'compact' | 'comfortable';

type ViewportState = {
  width: number;
  height: number;
  mode: ViewportMode;
  density: ViewDensity;
};

function detectMode(width: number): ViewportMode {
  if (width < 768) return 'mobile';
  if (width < 1200) return 'tablet';
  return 'desktop';
}

function detectDensity(width: number): ViewDensity {
  return width >= 1600 ? 'comfortable' : 'compact';
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
