"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Mobile booking bar that appears once the main CTA has scrolled out of view. */
export function StickyBar({ watchId, children }: { watchId: string; children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = document.getElementById(watchId);
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [watchId]);
  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-page/90 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur-md transition duration-300 sm:hidden ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
