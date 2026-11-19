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
      {/* Curva cóncava izquierda del Notch sin borde */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        className="shrink-0 text-[#060607]/85 fill-current"
      >
        <path d="M14 0H0C7.732 0 14 6.268 14 14V0Z" />
      </svg>

      {/* Notch alargado: logo de Moo en blanco + puntito de estado parpadeando */}
      <div className="relative flex h-[30px] w-40 items-center justify-center rounded-b-xl bg-[#060607]/85 px-4 backdrop-blur-md">
        <MooMascot
          state={mascotState}
          size="xs"
          isBlinking={isBlinking}
          reduceMotion={reduceMotion}
        />

        {/* Puntito del color de estado parpadeando a la derecha del Notch */}
        <span className="absolute right-3.5 flex h-1.5 w-1.5 items-center justify-center">
          {!reduceMotion && (
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ backgroundColor: dotColor }}
            />
          )}
          <span
            className="relative inline-flex h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
        </span>
      </div>

      {/* Curva cóncava derecha del Notch sin borde */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        className="shrink-0 text-[#060607]/85 fill-current"
      >
        <path d="M0 0H14C6.268 0 0 6.268 0 14V0Z" />
      </svg>
    </div>
  );
}
