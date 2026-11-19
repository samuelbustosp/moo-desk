"use client";

import React from "react";
import { MooMascot } from "@/features/mascot/components/moo-mascot";
import { MASCOT_STATES, type MascotState } from "@/features/mascot/types";

interface CompactWindowProps {
  mascotState: MascotState;
  isBlinking: boolean;
  reduceMotion: boolean;
  onExpand: () => void;
}

export function CompactWindow({
  mascotState,
  isBlinking,
  reduceMotion,
  onExpand,
}: CompactWindowProps) {
  const meta = MASCOT_STATES[mascotState];
  const dotColor =
    mascotState === "idle" ? "var(--moo-accent)" : meta.badgeColor;

  return (
    <div
      onMouseEnter={onExpand}
      onClick={onExpand}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onExpand();
      }}
      aria-label="Moo"
      className="group relative flex items-start justify-center cursor-pointer select-none"
    >
      {/* Curva cóncava izquierda del Notch */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        className="text-[#060607] fill-current shrink-0"
      >
        <path d="M16 0H0C8.837 0 16 7.163 16 16V0Z" />
      </svg>

      {/* Notch alargado: logo de Moo en blanco + puntito de estado parpadeando */}
      <div className="relative flex h-10 w-44 items-center justify-center rounded-b-2xl border-x border-b border-zinc-800/80 bg-[#060607] px-4 shadow-[0_12px_32px_rgba(0,0,0,0.9)] transition-colors duration-300 group-hover:border-moo-accent/40">
        <MooMascot
          state={mascotState}
          size="sm"
          isBlinking={isBlinking}
          reduceMotion={reduceMotion}
        />

        {/* Puntito del color de estado parpadeando a la derecha del Notch */}
        <span className="absolute right-4 flex h-2 w-2 items-center justify-center">
          {!reduceMotion && (
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ backgroundColor: dotColor }}
            />
          )}
          <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
        </span>
      </div>

      {/* Curva cóncava derecha del Notch */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        className="text-[#060607] fill-current shrink-0"
      >
        <path d="M0 0H16C7.163 0 0 7.163 0 16V0Z" />
      </svg>
    </div>
  );
}
