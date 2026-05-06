"use client";

import { useEffect, useRef } from "react";

const MQ = "(max-width: 968px)";
const MOTION = "(prefers-reduced-motion: reduce)";

/**
 * Cloak Integration Overview–style cursor: gold dot + lagging ring, larger on link/button hover.
 * Disabled on small viewports and when `prefers-reduced-motion` is set.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const ring = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);
  const activeRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia(MQ);
    const motion = window.matchMedia(MOTION);

    const setActive = () => {
      const on = !mq.matches && !motion.matches;
      activeRef.current = on;
      document.body.classList.toggle("cursor-custom-active", on);
      document.body.style.cursor = on ? "none" : "";
      const vis = on ? "block" : "none";
      if (dotRef.current) dotRef.current.style.display = vis;
      if (ringRef.current) ringRef.current.style.display = vis;
    };

    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
    };

    const tick = () => {
      if (activeRef.current && dotRef.current && ringRef.current) {
        const { x, y } = target.current;
        dotRef.current.style.left = `${x}px`;
        dotRef.current.style.top = `${y}px`;
        ring.current.x += (x - ring.current.x) * 0.12;
        ring.current.y += (y - ring.current.y) * 0.12;
        ringRef.current.style.left = `${ring.current.x}px`;
        ringRef.current.style.top = `${ring.current.y}px`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    setActive();
    mq.addEventListener("change", setActive);
    motion.addEventListener("change", setActive);
    window.addEventListener("mousemove", onMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      mq.removeEventListener("change", setActive);
      motion.removeEventListener("change", setActive);
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafRef.current);
      document.body.classList.remove("cursor-custom-active");
      document.body.style.cursor = "";
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 z-[10000] hidden h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c9a84c] transition-[width,height,background-color] duration-300 cursor-custom-dot"
        aria-hidden
      />
      <div
        ref={ringRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(201,168,76,0.4)] transition-[width,height,border-color] duration-300 cursor-custom-ring"
        aria-hidden
      />
    </>
  );
}
