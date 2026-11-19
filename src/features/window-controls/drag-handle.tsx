"use client";

import React from "react";
import { GripHorizontal } from "lucide-react";
import { startNativeWindowDrag } from "@/lib/desktop-bridge";

interface DragHandleProps {
  onBrowserDragStart?: (e: React.PointerEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
  className?: string;
}

export function DragHandle({
  onBrowserDragStart,
  children,
  className = "",
}: DragHandleProps) {
  const handlePointerDown = async (e: React.PointerEvent<HTMLDivElement>) => {
    // No iniciar arrastre si el clic ocurrió sobre un botón o control interactivo
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) {
      return;
    }

    const handledByTauri = await startNativeWindowDrag();
    if (!handledByTauri && onBrowserDragStart) {
      onBrowserDragStart(e);
    }
  };

  return (
    <div
      data-tauri-drag-region
      onPointerDown={handlePointerDown}
      className={`cursor-grab active:cursor-grabbing select-none ${className}`}
    >
      {children ?? (
        <GripHorizontal className="h-3.5 w-3.5 text-moo-muted/60" />
      )}
    </div>
  );
}
