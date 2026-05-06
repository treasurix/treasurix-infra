"use client";

import { useEffect, useState } from "react";

export function Toast({ message, duration = 3000, onBlur }: { message: string; duration?: number; onBlur: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onBlur, 300); // Wait for fade out
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onBlur]);

  return (
    <div
      className={`fixed bottom-8 left-1/2 z-[110] -translate-x-1/2 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-ink px-6 py-3.5 text-white shadow-2xl backdrop-blur-xl dark:bg-elevated dark:text-ink">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-extreme">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-extreme tracking-tight">{message}</p>
      </div>
    </div>
  );
}
