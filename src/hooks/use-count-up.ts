"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 to `end` over `duration` ms using ease-out.
 * Returns the current displayed value.
 */
export function useCountUp(end: number, duration = 600): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);
  const prevEnd = useRef(end);

  useEffect(() => {
    // If the target changes, re-animate from current value
    const from = prevEnd.current !== end ? 0 : 0;
    prevEnd.current = end;
    startRef.current = null;

    const step = (timestamp: number) => {
      startRef.current ??= timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (end - from) * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [end, duration]);

  return value;
}
