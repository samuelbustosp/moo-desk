"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MASCOT_STATES, type MascotState } from "../types";

interface UseMascotOptions {
  initialState?: MascotState;
  isHidden?: boolean;
  reduceMotion?: boolean;
  sleepTimeoutMs?: number;
}

export function useMascot({
  initialState = "idle",
  isHidden = false,
  reduceMotion = false,
  sleepTimeoutMs = 180000,
}: UseMascotOptions = {}) {
  const [state, setState] = useState<MascotState>(initialState);
  const [isBlinking, setIsBlinking] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<MascotState>(state);
  stateRef.current = state;

  // Parpadeo periódico solo en estado 'idle'
  useEffect(() => {
    if (isHidden || reduceMotion || state !== "idle") {
      setIsBlinking(false);
      return;
    }

    let blinkTimer: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      setIsBlinking(true);
      blinkTimer = setTimeout(() => setIsBlinking(false), 140);
    }, 4200);

    return () => {
      clearInterval(interval);
      if (blinkTimer) clearTimeout(blinkTimer);
    };
  }, [isHidden, reduceMotion, state]);

  const clearScheduledTransition = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const triggerTemporaryState = useCallback(
    (
      nextState: MascotState,
      durationMs = 2400,
      fallback: MascotState = "idle"
    ) => {
      clearScheduledTransition();
      setState(nextState);
      timeoutRef.current = setTimeout(() => {
        setState(fallback);
      }, durationMs);
    },
    [clearScheduledTransition]
  );

  // Temporizador de inactividad: si no le das bola por un tiempo, pasa a 'sleeping'
  const resetInactivityTimer = useCallback(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }

    if (isHidden) return;

    // Si estaba durmiendo y el usuario vuelve a interactuar, se despierta sorprendido/guiñando
    if (stateRef.current === "sleeping") {
      triggerTemporaryState("surprised", 850, "idle");
    }

    sleepTimerRef.current = setTimeout(() => {
      if (stateRef.current === "idle") {
        setState("sleeping");
      }
    }, sleepTimeoutMs);
  }, [isHidden, sleepTimeoutMs, triggerTemporaryState]);

  useEffect(() => {
    if (isHidden) return;

    resetInactivityTimer();

    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    window.addEventListener("pointerdown", handleUserActivity, {
      passive: true,
    });
    window.addEventListener("keydown", handleUserActivity, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
  }, [isHidden, resetInactivityTimer]);

  useEffect(() => {
    return () => clearScheduledTransition();
  }, [clearScheduledTransition]);

  return {
    state,
    meta: MASCOT_STATES[state] ?? MASCOT_STATES.idle,
    isBlinking: !isHidden && !reduceMotion && isBlinking,
    setState: (next: MascotState) => {
      clearScheduledTransition();
      setState(next);
    },
    triggerTemporaryState,
    notifyActivity: resetInactivityTimer,
  };
}
