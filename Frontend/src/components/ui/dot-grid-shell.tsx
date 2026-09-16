"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DotGridShellProps {
  children: ReactNode;
  className?: string;
}

export function DotGridShell({ children, className }: DotGridShellProps) {
  const shellRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const shell = shellRef.current;
    if (!shell) return;

    const bounds = shell.getBoundingClientRect();
    shell.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
    shell.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
  };

  const resetPointer = () => {
    shellRef.current?.style.setProperty("--pointer-x", "50%");
    shellRef.current?.style.setProperty("--pointer-y", "20%");
  };

  return (
    <div
      ref={shellRef}
      className={cn("dot-grid-shell relative isolate min-h-screen overflow-hidden", className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      <div className="dot-grid-wash pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
      <div className="dot-grid-glow pointer-events-none absolute inset-0 z-10" aria-hidden="true" />
      <div className="relative z-20">{children}</div>
    </div>
  );
}
