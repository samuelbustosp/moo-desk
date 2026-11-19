"use client";

import React, { useEffect, useRef, useState } from "react";
import { MASCOT_STATES, type MascotState } from "../types";

interface MooMascotProps {
  state?: MascotState;
  size?: "xs" | "sm" | "md" | "lg";
  isBlinking?: boolean;
  reduceMotion?: boolean;
  isHidden?: boolean;
  trackMouse?: boolean;
  onClick?: () => void;
  className?: string;
}

const SIZE_MAP = {
  xs: { width: 24, height: 21 },
  sm: { width: 30, height: 26 },
  md: { width: 46, height: 40 },
  lg: { width: 68, height: 59 },
};

const MASCOT_SVG_MAP: Record<MascotState, string> = {
  idle: "/brand/mascot/moo-idle.svg",
  listening: "/brand/mascot/moo-listening.svg",
  processing: "/brand/mascot/moo-thinking.svg",
  responding: "/brand/mascot/moo-smile.svg",
  attention: "/brand/mascot/moo-surprised.svg",
  thinking: "/brand/mascot/moo-thinking.svg",
  smile: "/brand/mascot/moo-smile.svg",
  love: "/brand/mascot/moo-in-love.svg",
  wink: "/brand/mascot/moo-wink.svg",
  sleeping: "/brand/mascot/moo-sleeping.svg",
  surprised: "/brand/mascot/moo-surprised.svg",
  cool: "/brand/mascot/moo-cool.svg",
  angry: "/brand/mascot/moo-angry.svg",
  sad: "/brand/mascot/moo-sad.svg",
  music: "/brand/mascot/moo-music.svg",
  playing: "/brand/mascot/moo-playing.svg",
};

export function MooMascot({
  state = "idle",
  size = "sm",
  reduceMotion = false,
  isHidden = false,
  trackMouse = true,
  onClick,
  className = "",
}: MooMascotProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [lookOffset, setLookOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isHidden || reduceMotion || !trackMouse) {
      setLookOffset({ x: 0, y: 0 });
      return;
    }

    let rafId: number | null = null;

    const handlePointerMove = (e: PointerEvent) => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const rawDx = (e.clientX - centerX) / 280;
        const rawDy = (e.clientY - centerY) / 240;

        const clampedX = Math.max(-1, Math.min(1, rawDx));
        const clampedY = Math.max(-1, Math.min(1, rawDy));

        setLookOffset({ x: clampedX, y: clampedY });
      });
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [isHidden, reduceMotion, trackMouse]);

  if (isHidden) return null;

  const dimensions = SIZE_MAP[size];
  const meta = MASCOT_STATES[state] ?? MASCOT_STATES.idle;
  const svgSrc = MASCOT_SVG_MAP[state] ?? MASCOT_SVG_MAP.idle;

  // Seguimiento sutil del cursor (desactivado si duerme)
  const canFollowMouse = !reduceMotion && state !== "sleeping";
  const bodyShiftX = canFollowMouse ? (lookOffset.x * 2.2).toFixed(2) : "0";
  const bodyShiftY = canFollowMouse ? (lookOffset.y * 1.8).toFixed(2) : "0";
  const bodyTilt = canFollowMouse ? (lookOffset.x * 2.5).toFixed(2) : "0";

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      title={`Moo — ${meta.label}`}
      aria-label={`Moo (${meta.label})`}
      style={{
        transform: canFollowMouse
          ? `translate3d(${bodyShiftX}px, ${bodyShiftY}px, 0) rotate(${bodyTilt}deg)`
          : undefined,
      }}
      className={`relative inline-flex items-center justify-center select-none transition-transform duration-200 ease-out ${
        onClick ? "cursor-pointer active:scale-95" : ""
      } ${className}`}
    >
      <img
        src={svgSrc}
        width={dimensions.width}
        height={dimensions.height}
        alt={`Moo (${meta.label})`}
        draggable={false}
        className="pointer-events-none select-none object-contain"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
        }}
      />
    </div>
  );
}
