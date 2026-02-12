import React, { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

type ParallaxTiltProps = {
  children: React.ReactNode;
  maxTilt?: number;
  className?: string;
};

export default function ParallaxTilt({ children, maxTilt = 6, className }: ParallaxTiltProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const frame = useRef<number | null>(null);

  const reset = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      reset();
    }
  }, [reduceMotion, reset]);

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current || reduceMotion) return;
      const rect = ref.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const tiltX = Math.max(-maxTilt, Math.min(maxTilt, -y * maxTilt * 2));
      const tiltY = Math.max(-maxTilt, Math.min(maxTilt, x * maxTilt * 2));
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        if (!ref.current) return;
        ref.current.style.transform = `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      });
    },
    [maxTilt, reduceMotion]
  );

  const onLeave = useCallback(() => {
    if (reduceMotion) return;
    reset();
  }, [reduceMotion, reset]);

  return (
    <div ref={ref} className={className} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}
