import { useEffect, useRef, useState, useCallback } from 'react';

/** A ref + boolean state pair indicating if an element is in view. */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverInit = { threshold: 0.15 }
) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(entry.target);
        }
      });
    }, options);
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, inView };
}

/** A debounced value useful for resize throttling. */
export function useDebounced<T>(value: T, delay = 150): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/** Window size with debounce, SSR-safe. */
export function useWindowSize(delay = 150) {
  const [size, setSize] = useState({ w: 1024, h: 768 });
  const debounced = useDebounced(
    typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight } : { w: 1024, h: 768 },
    delay
  );
  useEffect(() => {
    setSize({ w: debounced.w, h: debounced.h });
  }, [debounced]);
  return size;
}

/** rAF loop that calls a callback with a delta in ms. Pauses when the tab is hidden. */
export function useRaf(callback: (dt: number, t: number) => void, active = true) {
  const cb = useRef(callback);
  cb.current = callback;
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      cb.current(dt, now);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        start();
      }
    };
    start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [active]);
}

/** Tracks the mouse position globally, normalized -1..1 from center. */
export function useMousePos() {
  const [pos, setPos] = useState({ x: 0, y: 0, raw: { x: 0, y: 0 } });
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setPos({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
        raw: { x: e.clientX, y: e.clientY },
      });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);
  return pos;
}

/** Returns a copied state + helper, triggers a brief CSS pop. */
export function useCopyState(timeout = 1400) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    },
    [timeout]
  );
  return { copied, copy };
}

/** Random interval that fires callback at random intervals (for idle mascot animations). */
export function useRandomInterval(callback: () => void, min: number, max: number, active = true) {
  const cb = useRef(callback);
  cb.current = callback;
  useEffect(() => {
    if (!active) return;
    let id: number;
    const schedule = () => {
      const delay = min + Math.random() * (max - min);
      id = window.setTimeout(() => {
        cb.current();
        schedule();
      }, delay);
    };
    schedule();
    return () => window.clearTimeout(id);
  }, [min, max, active]);
}

/**
 * Smoothed mouse position via lerp, updated in a single rAF loop.
 * Returns a ref (no re-renders) to {x,y} normalized -1..1 from center.
 * Falls back to device orientation on mobile when available; otherwise
 * the values stay at 0 (everything centered, never dizzy).
 */
export function useMouseLerp() {
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  useEffect(() => {
    // Disable parallax only on phones (small screen + touch pointer).
    // Desktop and tablets keep full intensity — behavior unchanged.
    const isPhone = window.matchMedia('(max-width: 640px) and (pointer: coarse)').matches;
    const intensity = isPhone ? 0 : 1;

    const onMove = (e: MouseEvent) => {
      if (intensity === 0) return;
      target.current.x = ((e.clientX / window.innerWidth) * 2 - 1) * intensity;
      target.current.y = ((e.clientY / window.innerHeight) * 2 - 1) * intensity;
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      target.current.x = Math.max(-1, Math.min(1, e.gamma / 30)) * intensity;
      target.current.y = Math.max(-1, Math.min(1, (e.beta - 30) / 30)) * intensity;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('deviceorientation', onOrient, { passive: true });
    let raf = 0;
    const loop = () => {
      current.current.x += (target.current.x - current.current.x) * 0.08;
      current.current.y += (target.current.y - current.current.y) * 0.08;
      raf = requestAnimationFrame(loop);
    };
    const start = () => { raf = requestAnimationFrame(loop); };
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        start();
      }
    };
    start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('deviceorientation', onOrient);
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return current;
}

/** prefers-reduced-motion flag */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}
