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

export function MooMascot({
  state = "idle",
  size = "sm",
  isBlinking = false,
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
  const animate = !reduceMotion;

  // Normalizar estados equivalentes hacia las animaciones de public/brand/mascot/
  const visualMode =
    state === "processing"
      ? "thinking"
      : state === "responding"
      ? "smile"
      : state === "attention"
      ? "surprised"
      : state;

  // Seguimiento sutil del mouse (desactivado mientras duerme)
  const canFollowMouse = animate && visualMode !== "sleeping";
  const eyeShiftX = canFollowMouse ? Math.round(lookOffset.x * 46) : 0;
  const eyeShiftY = canFollowMouse ? Math.round(lookOffset.y * 32) : 0;
  const bodyShiftX = canFollowMouse ? (lookOffset.x * 2.0).toFixed(2) : "0";
  const bodyShiftY = canFollowMouse ? (lookOffset.y * 1.6).toFixed(2) : "0";
  const bodyTilt = canFollowMouse ? (lookOffset.x * 2.2).toFixed(2) : "0";

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
      <svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox="-60 -60 1296 1124"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          <clipPath id="moo-glasses-clip">
            <rect x="250" y="300" width="280" height="170" rx="44" />
            <rect x="646" y="300" width="280" height="170" rx="44" />
          </clipPath>
        </defs>

        {/* Auriculares traseros (estado Escuchando) */}
        <g
          className={`transition-all duration-300 ease-out ${
            visualMode === "listening"
              ? "opacity-100 scale-100"
              : "opacity-0 scale-90 pointer-events-none"
          }`}
          style={{ transformOrigin: "588px 512px" }}
        >
          <path
            d="M 120 400 C 120 70, 1056 70, 1056 400"
            fill="none"
            stroke="#60A5FA"
            strokeWidth="56"
            strokeLinecap="round"
          />
        </g>

        {/* Silueta blanca principal de Moo */}
        <g>
          <rect x="76" y="0" width="1024" height="560" rx="192" fill="#FFFFFF" />
          <rect
            x="0"
            y="464"
            width="1176"
            height="560"
            rx="192"
            fill="#FFFFFF"
          />
        </g>

        {/* GRUPO DE ROSTRO CON SEGUIMIENTO DEL MOUSE */}
        <g
          transform={`translate(${eyeShiftX}, ${eyeShiftY})`}
          className="transition-transform duration-150 ease-out"
        >
          {/* 1. IDLE (Reposo con parpadeo centrado exacto en el lugar donde mira) */}
          <g
            className={`transition-opacity duration-300 ease-out ${
              visualMode === "idle"
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <rect
              x="274"
              y="286"
              width="226"
              height="226"
              rx="44"
              fill="#070708"
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                transform: isBlinking ? "scaleY(0.11)" : "scaleY(1)",
                transition: "transform 130ms ease-in-out",
              }}
            />
            <rect
              x="678"
              y="344"
              width="224"
              height="168"
              rx="44"
              fill="#070708"
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                transform: isBlinking ? "scaleY(0.13)" : "scaleY(1)",
                transition: "transform 130ms ease-in-out",
              }}
            />
          </g>

          {/* 2. THINKING (Pensando con ceja inclinada y mirada dubitativa) */}
          <g
            className={`transition-all duration-300 ease-out ${
              visualMode === "thinking"
                ? "opacity-100 scale-100"
                : "opacity-0 scale-95 pointer-events-none"
            }`}
            style={{ transformOrigin: "588px 400px" }}
          >
            <rect
              x="310"
              y="170"
              width="160"
              height="34"
              rx="17"
              fill="#070708"
              transform="rotate(-10 390 187)"
            />
            <rect
              x="294"
              y="250"
              width="216"
              height="216"
              rx="44"
              fill="#070708"
            />
            <rect
              x="700"
              y="290"
              width="206"
              height="136"
              rx="38"
              fill="#070708"
            />
            <rect
              x="528"
              y="530"
              width="120"
              height="26"
              rx="13"
              fill="#070708"
            />
          </g>

          {/* 3. LISTENING (Ojos atentos + boquita) */}
          <g
            className={`transition-all duration-300 ease-out ${
              visualMode === "listening"
                ? "opacity-100 scale-100"
                : "opacity-0 scale-95 pointer-events-none"
            }`}
            style={{ transformOrigin: "588px 400px" }}
          >
            <rect
              x="274"
              y="270"
              width="226"
              height="236"
              rx="52"
              fill="#070708"
            />
            <rect
              x="678"
              y="276"
              width="224"
              height="230"
              rx="52"
              fill="#070708"
            />
            <rect
              x="538"
              y="530"
              width="100"
              height="24"
              rx="12"
              fill="#070708"
            />
          </g>

          {/* 4. SMILE (Sonriendo con mejillas rosadas) */}
          <g
            className={`transition-all duration-300 ease-out ${
              visualMode === "smile"
                ? "opacity-100 scale-100"
                : "opacity-0 scale-95 pointer-events-none"
            }`}
            style={{ transformOrigin: "588px 420px" }}
          >
            <rect
              x="274"
              y="320"
              width="226"
              height="130"
              rx="42"
              fill="#070708"
              transform="rotate(-6 387 385)"
            />
            <rect
              x="678"
              y="330"
              width="224"
              height="120"
              rx="42"
              fill="#070708"
              transform="rotate(6 790 390)"
            />
            <path
              d="M 508 510 Q 588 590 668 510"
              stroke="#070708"
              strokeWidth="38"
              strokeLinecap="round"
              fill="none"
            />
            <ellipse
              cx="230"
              cy="480"
              rx="76"
              ry="42"
              fill="#FF8BA7"
              opacity="0.8"
            />
            <ellipse
              cx="946"
              cy="480"
              rx="76"
              ry="42"
              fill="#FF8BA7"
              opacity="0.8"
            />
          </g>

          {/* 5. LOVE (Ojos de corazón + sonrisa + rubor) */}
          <g
            className={`transition-all duration-300 ease-out ${
              visualMode === "love"
                ? "opacity-100 scale-100"
                : "opacity-0 scale-90 pointer-events-none"
            }`}
            style={{ transformOrigin: "588px 420px" }}
          >
            <path
              d="M 387 490 C 340 450, 270 380, 270 310 A 65 65 0 0 1 387 290 A 65 65 0 0 1 504 310 C 504 380, 434 450, 387 490 Z"
              fill="#F43F5E"
              className={animate ? "animate-pulse" : ""}
            />
            <path
              d="M 788 500 C 745 460, 678 395, 678 330 A 60 60 0 0 1 788 310 A 60 60 0 0 1 898 330 C 898 395, 831 460, 788 500 Z"
              fill="#F43F5E"
              className={animate ? "animate-pulse" : ""}
            />
            <path
              d="M 520 540 Q 588 610 656 540"
              stroke="#070708"
              strokeWidth="40"
              strokeLinecap="round"
              fill="none"
            />
            <ellipse
              cx="230"
              cy="490"
              rx="76"
              ry="42"
              fill="#FB7185"
              opacity="0.75"
            />
            <ellipse
              cx="946"
              cy="490"
              rx="76"
              ry="42"
              fill="#FB7185"
              opacity="0.75"
            />
          </g>

          {/* 6. WINK (Guiño pícaro con destello dorado) */}
          <g
            className={`transition-all duration-300 ease-out ${
              visualMode === "wink"
                ? "opacity-100 scale-100"
                : "opacity-0 scale-95 pointer-events-none"
            }`}
            style={{ transformOrigin: "588px 420px" }}
          >
            <rect
              x="274"
              y="382"
              width="226"
              height="34"
              rx="17"
              fill="#070708"
            />
            <rect
              x="678"
              y="310"
              width="224"
              height="206"
              rx="44"
              fill="#070708"
            />
            <path
              d="M 530 540 Q 610 610 690 520"
              stroke="#070708"
              strokeWidth="40"
              strokeLinecap="round"
              fill="none"
            />
            <ellipse
              cx="230"
              cy="480"
              rx="64"
              ry="36"
              fill="#FDA4AF"
              opacity="0.65"
            />
            <ellipse
              cx="946"
              cy="480"
              rx="64"
              ry="36"
              fill="#FDA4AF"
              opacity="0.65"
            />
            <polygon
              points="220,275 232,312 268,324 232,336 220,372 208,336 172,324 208,312"
              fill="#FBBF24"
            />
          </g>

          {/* 7. SLEEPING (Durmiendo plácidamente) */}
          <g
            className={`transition-all duration-500 ease-out ${
              visualMode === "sleeping"
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <rect
              x="274"
              y="380"
              width="226"
              height="28"
              rx="14"
              fill="#070708"
            />
            <rect
              x="678"
              y="380"
              width="224"
              height="28"
              rx="14"
              fill="#070708"
            />
            <rect
              x="560"
              y="530"
              width="56"
              height="24"
              rx="12"
              fill="#070708"
            />
          </g>

          {/* 8. SURPRISED (Asombrado con brillos en los ojos) */}
          <g
            className={`transition-all duration-300 ease-out ${
              visualMode === "surprised"
                ? "opacity-100 scale-100"
                : "opacity-0 scale-90 pointer-events-none"
            }`}
            style={{ transformOrigin: "588px 420px" }}
          >
            <rect
              x="264"
              y="260"
              width="246"
              height="246"
              rx="48"
              fill="#070708"
            />
            <rect
              x="668"
              y="260"
              width="244"
              height="246"
              rx="48"
              fill="#070708"
            />
            <rect
              x="300"
              y="295"
              width="60"
              height="60"
              rx="14"
              fill="#FFFFFF"
            />
            <rect
              x="704"
              y="295"
              width="60"
              height="60"
              rx="14"
              fill="#FFFFFF"
            />
            <rect
              x="538"
              y="530"
              width="100"
              height="110"
              rx="40"
              fill="#070708"
            />
          </g>

          {/* 9. COOL (Modo Pro con gafas de sol y reflejos cyber) */}
          <g
            className={`transition-all duration-300 ease-out ${
              visualMode === "cool"
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-6 pointer-events-none"
            }`}
          >
            <path
              d="M 520 540 Q 610 600 680 520"
              stroke="#070708"
              strokeWidth="40"
              strokeLinecap="round"
              fill="none"
            />
            <g fill="#070708">
              <rect x="250" y="300" width="280" height="170" rx="44" />
              <rect x="646" y="300" width="280" height="170" rx="44" />
              <rect x="520" y="340" width="136" height="36" rx="18" />
              <rect x="150" y="350" width="110" height="24" rx="12" />
              <rect x="916" y="350" width="110" height="24" rx="12" />
            </g>
            <g clipPath="url(#moo-glasses-clip)">
              <polygon
                points="340,280 430,280 320,500 230,500"
                fill="#38BDF8"
                opacity="0.65"
              />
              <polygon
                points="460,280 500,280 390,500 350,500"
                fill="#BAE6FD"
                opacity="0.85"
              />
              <polygon
                points="736,280 826,280 716,500 626,500"
                fill="#38BDF8"
                opacity="0.65"
              />
              <polygon
                points="856,280 896,280 786,500 746,500"
                fill="#BAE6FD"
                opacity="0.85"
              />
            </g>
          </g>
        </g>

        {/* ELEMENTOS EXTERIORES FLOTANTES SEGÚN EL ESTADO */}
        {/* Copas y ondas de auriculares (Listening) */}
        <g
          className={`transition-all duration-300 ease-out ${
            visualMode === "listening"
              ? "opacity-100 scale-100"
              : "opacity-0 scale-90 pointer-events-none"
          }`}
          style={{ transformOrigin: "588px 400px" }}
        >
          <rect x="24" y="280" width="96" height="220" rx="48" fill="#3B82F6" />
          <rect x="52" y="320" width="40" height="140" rx="20" fill="#93C5FD" />
          <rect
            x="1056"
            y="280"
            width="96"
            height="220"
            rx="48"
            fill="#3B82F6"
          />
          <rect
            x="1084"
            y="320"
            width="40"
            height="140"
            rx="20"
            fill="#93C5FD"
          />
          <path
            d="M -10 310 A 80 80 0 0 0 -10 470"
            fill="none"
            stroke="#60A5FA"
            strokeWidth="26"
            strokeLinecap="round"
            className={animate ? "animate-pulse" : ""}
          />
          <path
            d="M 1186 310 A 80 80 0 0 1 1186 470"
            fill="none"
            stroke="#60A5FA"
            strokeWidth="26"
            strokeLinecap="round"
            className={animate ? "animate-pulse" : ""}
          />
        </g>

        {/* Burbujas de pensamiento (Thinking) */}
        <g
          fill="#A78BFA"
          className={`transition-all duration-300 ease-out ${
            visualMode === "thinking"
              ? "opacity-100 scale-100"
              : "opacity-0 scale-75 pointer-events-none"
          }`}
          style={{ transformOrigin: "1020px 150px" }}
        >
          <circle
            cx="980"
            cy="190"
            r="34"
            className={animate ? "animate-pulse" : ""}
          />
          <circle
            cx="1065"
            cy="115"
            r="50"
            className={animate ? "animate-pulse" : ""}
          />
          <circle
            cx="1145"
            cy="35"
            r="66"
            className={animate ? "animate-pulse" : ""}
          />
        </g>

        {/* Corazoncitos flotantes (Love) */}
        <g
          className={`transition-all duration-300 ease-out ${
            visualMode === "love"
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <path
            d="M 1040 180 C 1010 150, 960 110, 960 70 A 35 35 0 0 1 1040 60 A 35 35 0 0 1 1120 70 C 1120 110, 1070 150, 1040 180 Z"
            fill="#F43F5E"
            transform="rotate(15 1040 120)"
          />
          <path
            d="M 160 210 C 140 190, 100 160, 100 130 A 25 25 0 0 1 160 120 A 25 25 0 0 1 220 130 C 220 160, 180 190, 160 210 Z"
            fill="#FB7185"
            transform="rotate(-15 160 165)"
          />
        </g>

        {/* Zzz flotantes (Sleeping) */}
        <g
          fill="#93C5FD"
          fontFamily="var(--font-geist-sans), system-ui, sans-serif"
          fontWeight="900"
          className={`transition-all duration-500 ease-out ${
            visualMode === "sleeping"
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-3 pointer-events-none"
          }`}
        >
          <text x="960" y="240" fontSize="80">
            z
          </text>
          <text x="1045" y="155" fontSize="105">
            Z
          </text>
          <text x="1125" y="55" fontSize="140">
            Z
          </text>
        </g>

        {/* Rayos de asombro (Surprised) */}
        <g
          stroke="#F59E0B"
          strokeWidth="28"
          strokeLinecap="round"
          className={`transition-all duration-300 ease-out ${
            visualMode === "surprised"
              ? "opacity-100 scale-100"
              : "opacity-0 scale-75 pointer-events-none"
          }`}
          style={{ transformOrigin: "588px 100px" }}
        >
          <line x1="160" y1="110" x2="95" y2="45" />
          <line x1="588" y1="60" x2="588" y2="-10" />
          <line x1="1016" y1="110" x2="1081" y2="45" />
        </g>
      </svg>
    </div>
  );
}
