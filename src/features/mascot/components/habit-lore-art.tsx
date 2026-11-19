"use client";

import React from "react";
import type { HabitLoreKind } from "@/types";

export type HabitCategory =
  | "Hidratación"
  | "Movimiento"
  | "Conocimiento"
  | "Equilibrio";

export const HABIT_CATEGORIES: {
  value: HabitCategory;
  label: string;
  loreKind: HabitLoreKind;
  achievementTitle: string;
}[] = [
  {
    value: "Hidratación",
    label: "Hidratación",
    loreKind: "plant",
    achievementTitle: "El Bonsái de Moo",
  },
  {
    value: "Movimiento",
    label: "Movimiento y Físico",
    loreKind: "fire",
    achievementTitle: "La Fogata de Energía",
  },
  {
    value: "Conocimiento",
    label: "Conocimiento y Foco",
    loreKind: "books",
    achievementTitle: "La Torre de Sabiduría",
  },
  {
    value: "Equilibrio",
    label: "Equilibrio y Bienestar",
    loreKind: "crystal",
    achievementTitle: "El Cristal de Equilibrio",
  },
];

export function normalizeHabitCategory(
  category?: string,
  name = ""
): HabitCategory {
  const catLower = (category || "").toLowerCase();
  const nameLower = name.toLowerCase();

  if (
    catLower.includes("hidrat") ||
    nameLower.includes("agua") ||
    nameLower.includes("hidrat")
  ) {
    return "Hidratación";
  }

  if (
    catLower.includes("movimiento") ||
    catLower.includes("físico") ||
    catLower.includes("fisico") ||
    nameLower.includes("correr") ||
    nameLower.includes("ejercicio") ||
    nameLower.includes("entrena") ||
    nameLower.includes("caminar") ||
    nameLower.includes("gym")
  ) {
    return "Movimiento";
  }

  if (
    catLower.includes("conocimiento") ||
    catLower.includes("foco") ||
    nameLower.includes("leer") ||
    nameLower.includes("estudi") ||
    nameLower.includes("aprender") ||
    nameLower.includes("libro")
  ) {
    return "Conocimiento";
  }

  return "Equilibrio";
}

export function categoryToLoreKind(
  category?: string,
  name = ""
): HabitLoreKind {
  const norm = normalizeHabitCategory(category, name);
  switch (norm) {
    case "Hidratación":
      return "plant";
    case "Movimiento":
      return "fire";
    case "Conocimiento":
      return "books";
    case "Equilibrio":
    default:
      return "crystal";
  }
}

export function inferLoreKind(
  name: string,
  current?: HabitLoreKind,
  category?: string
): HabitLoreKind {
  if (category) {
    return categoryToLoreKind(category, name);
  }
  if (current) return current;
  return categoryToLoreKind(undefined, name);
}

export function getLoreNarrative(
  kind: HabitLoreKind,
  completedToday: boolean,
  streak: number
): { title: string; status: string; actionLabel: string } {
  switch (kind) {
    case "plant":
      return {
        title: "El Bonsái de Moo",
        status: completedToday
          ? streak >= 5
            ? "Regado hoy · En plena floración"
            : "Regado hoy · Creciendo con fuerza"
          : "Sediento · Cumple un hábito de Hidratación para regarlo",
        actionLabel: completedToday ? "Planta regada" : "Pendiente hoy",
      };
    case "fire":
      return {
        title: "La Fogata de Energía",
        status: completedToday
          ? "Llama encendida al máximo hoy"
          : "Brasas tibias · Cumple un hábito de Movimiento para avivarla",
        actionLabel: completedToday ? "Llama viva" : "Pendiente hoy",
      };
    case "books":
      return {
        title: "La Torre de Sabiduría",
        status: completedToday
          ? `${Math.max(1, streak)} tomos iluminados en el estudio`
          : "En espera · Cumple un hábito de Conocimiento para sumar un tomo",
        actionLabel: completedToday ? "Tomo sumado" : "Pendiente hoy",
      };
    case "crystal":
    default:
      return {
        title: "El Cristal de Equilibrio",
        status: completedToday
          ? "Resonando en armonía hoy"
          : "En reposo · Cumple un hábito de Equilibrio para activarlo",
        actionLabel: completedToday ? "En armonía" : "Pendiente hoy",
      };
  }
}

interface HabitLoreArtProps {
  kind: HabitLoreKind;
  completedToday: boolean;
  streak: number;
  size?: "sm" | "md" | "lg" | "xl";
}

const ART_SIZES = {
  sm: 40,
  md: 56,
  lg: 80,
  xl: 108,
};

export function HabitLoreArt({
  kind,
  completedToday,
  streak,
  size = "xl",
}: HabitLoreArtProps) {
  const px = ART_SIZES[size];
  const stage = streak >= 5 ? 3 : streak >= 2 ? 2 : 1;

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 ${
        completedToday
          ? "border-moo-accent/45 bg-moo-accent/10 shadow-[0_0_28px_-6px_var(--moo-accent)]"
          : "border-zinc-800 bg-zinc-950/90"
      }`}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox="0 0 64 64"
        width={px - 10}
        height={px - 10}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 1. PLANTA DE MOO (Hidratación) */}
        {kind === "plant" && (
          <g>
            {completedToday && (
              <g fill="#38BDF8" className="animate-pulse">
                <circle cx="19" cy="14" r="2.3" />
                <circle cx="45" cy="11" r="2.1" />
                <circle cx="32" cy="6.5" r="1.9" />
              </g>
            )}

            <rect
              x="30"
              y={stage === 3 ? "17" : stage === 2 ? "22" : "27"}
              width="4"
              height={stage === 3 ? "25" : stage === 2 ? "20" : "15"}
              rx="2"
              fill={completedToday ? "#34D399" : "#059669"}
            />

            <path
              d="M30 34 C19 34, 15 25, 23 23 C28 22, 30 28, 30 34 Z"
              fill={completedToday ? "#34D399" : "#10B981"}
            />
            <path
              d="M34 31 C45 31, 49 22, 41 20 C36 19, 34 25, 34 31 Z"
              fill={completedToday ? "#6EE7B7" : "#059669"}
            />

            {stage >= 2 && (
              <>
                <path
                  d="M30 25 C20 24, 18 16, 24 15 C28 14, 30 19, 30 25 Z"
                  fill="#6EE7B7"
                />
                <path
                  d="M34 23 C44 22, 46 14, 40 13 C36 12, 34 17, 34 23 Z"
                  fill="#34D399"
                />
              </>
            )}

            {(stage >= 3 || completedToday) && (
              <g>
                <circle cx="32" cy="14.5" r="6" fill="#F59E0B" />
                <circle cx="32" cy="14.5" r="2.6" fill="#FEF08A" />
              </g>
            )}

            <rect
              x="17"
              y="40"
              width="30"
              height="6"
              rx="3"
              fill="#D97706"
            />
            <path
              d="M20 46 H44 L41 58 C40.6 59.2 39.5 60 38.2 60 H25.8 C24.5 60 23.4 59.2 23 58 L20 46 Z"
              fill="#B45309"
            />
            <rect x="25.5" y="49.5" width="4.2" height="4.2" rx="1" fill="#09090B" />
            <rect x="34.5" y="50.5" width="4.2" height="3.2" rx="1" fill="#09090B" />
          </g>
        )}

        {/* 2. FOGATA DE ENERGÍA (Movimiento) */}
        {kind === "fire" && (
          <g>
            {completedToday && (
              <g fill="#FBBF24" className="animate-pulse">
                <circle cx="19" cy="15" r="2.2" />
                <circle cx="44" cy="13" r="2" />
                <circle cx="32" cy="7.5" r="2.4" />
              </g>
            )}

            <path
              d="M32 11 C43 21, 47 31, 44 41 C42 47, 36.5 50, 32 50 C27.5 50, 22 47, 20 41 C17 31, 21 21, 32 11 Z"
              fill={completedToday ? "#F97316" : "#7C2D12"}
            />
            <path
              d="M32 19 C39 26, 42 33, 39.5 41 C38 45, 34.5 47, 32 47 C29.5 47, 26 45, 24.5 41 C22 33, 25 26, 32 19 Z"
              fill={completedToday ? "#F59E0B" : "#B45309"}
            />
            <path
              d="M32 28 C35.5 32.5, 37 37, 36 42 C35 44.5, 33.4 46, 32 46 C30.6 46, 29 44.5, 28 42 C27 37, 28.5 32.5, 32 28 Z"
              fill={completedToday ? "#FEF08A" : "#F59E0B"}
            />

            <rect
              x="15"
              y="48"
              width="34"
              height="6.5"
              rx="3"
              fill="#52525B"
              transform="rotate(-8 32 51)"
            />
            <rect
              x="15"
              y="48"
              width="34"
              height="6.5"
              rx="3"
              fill="#3F3F46"
              transform="rotate(8 32 51)"
            />
          </g>
        )}

        {/* 3. TORRE DE SABIDURÍA (Conocimiento) */}
        {kind === "books" && (
          <g>
            {completedToday && (
              <polygon
                points="32,7 34.8,13.5 41.5,16 34.8,18.5 32,25 29.2,18.5 22.5,16 29.2,13.5"
                fill="#FBBF24"
                className="animate-pulse"
              />
            )}

            {stage >= 2 && (
              <g>
                <rect
                  x="16"
                  y="26.5"
                  width="32"
                  height="8.5"
                  rx="2.5"
                  fill={completedToday ? "#A78BFA" : "#52525B"}
                />
                <rect
                  x="19.5"
                  y="29.2"
                  width="25"
                  height="3"
                  rx="1"
                  fill="#FAFAFA"
                  opacity="0.88"
                />
              </g>
            )}

            <rect
              x="13"
              y="36"
              width="38"
              height="9"
              rx="2.5"
              fill={completedToday ? "#38BDF8" : "#3F3F46"}
            />
            <rect
              x="17"
              y="39"
              width="30"
              height="3"
              rx="1"
              fill="#FAFAFA"
              opacity="0.88"
            />

            <rect
              x="10.5"
              y="46"
              width="43"
              height="10.5"
              rx="3"
              fill={completedToday ? "#F59E0B" : "#27272A"}
            />
            <rect
              x="15"
              y="49.5"
              width="34"
              height="3.2"
              rx="1"
              fill="#FAFAFA"
              opacity="0.88"
            />
            <rect
              x="39"
              y="46"
              width="3.8"
              height="13.5"
              rx="1"
              fill="#F43F5E"
            />
          </g>
        )}

        {/* 4. CRISTAL DE EQUILIBRIO (Equilibrio y Bienestar) */}
        {kind === "crystal" && (
          <g>
            {completedToday && (
              <circle
                cx="32"
                cy="32"
                r="23"
                stroke="#A78BFA"
                strokeWidth="1.6"
                strokeDasharray="4 4"
                className="animate-spin"
                style={{ animationDuration: "12s" }}
              />
            )}
            <polygon
              points="32,9 48,28 32,55 16,28"
              fill={completedToday ? "#A78BFA" : "#52525B"}
            />
            <polygon
              points="32,9 48,28 32,34.5"
              fill={completedToday ? "#C4B5FD" : "#71717A"}
            />
            <polygon
              points="32,9 16,28 32,34.5"
              fill={completedToday ? "#DDD6FE" : "#A1A1AA"}
            />
          </g>
        )}
      </svg>
    </div>
  );
}
