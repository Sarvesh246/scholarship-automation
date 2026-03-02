"use client";

import { ReactNode, useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [entering, setEntering] = useState(false);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setEntering(true);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntering(false));
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <div
      className={`min-w-0 w-full max-w-6xl mx-auto page-transition-wrap${entering ? " entering" : ""}`}
    >
      {children}
    </div>
  );
}
