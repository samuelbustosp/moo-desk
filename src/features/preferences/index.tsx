"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  DEFAULT_PREFERENCES,
  type AccentTheme,
  type MooPreferences,
  type WindowPosition,
} from "@/types";

const STORAGE_KEY = "moo_desk_preferences_v1";

export const ACCENT_PALETTES: Record<
  AccentTheme,
  {
    name: string;
    primary: string;
    hover: string;
    primaryRgb: string;
    hoverRgb: string;
    description: string;
  }
> = {
  amber: {
    name: "Naranja Ámbar",
    primary: "#F59E0B",
    hover: "#FBBF24",
    primaryRgb: "245 158 11",
    hoverRgb: "251 191 36",
    description: "Cálido y distintivo",
  },
  green: {
    name: "Verde Natural",
    primary: "#8BCF9B",
    hover: "#75B88A",
    primaryRgb: "139 207 155",
    hoverRgb: "117 184 138",
    description: "Tono apagado y orgánico",
  },
  violet: {
    name: "Violeta Digital",
    primary: "#A78BFA",
    hover: "#C4B5FD",
    primaryRgb: "167 139 250",
    hoverRgb: "196 181 253",
    description: "Identidad digital serena",
  },
};

interface PreferencesContextValue {
  preferences: MooPreferences;
  isHydrated: boolean;
  updatePreference: <K extends keyof MooPreferences>(
    key: K,
    value: MooPreferences[K]
  ) => void;
  updateWindowPosition: (pos: WindowPosition) => void;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [preferences, setPreferences] =
    useState<MooPreferences>(DEFAULT_PREFERENCES);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const systemPrefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (raw) {
        const parsed = JSON.parse(raw) as Partial<MooPreferences>;
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...parsed,
          windowPosition: {
            ...DEFAULT_PREFERENCES.windowPosition,
            ...(parsed.windowPosition ?? {}),
          },
        });
      } else if (systemPrefersReducedMotion) {
        setPreferences((prev) => ({ ...prev, reduceMotion: true }));
      }
    } catch (err) {
      console.warn("[Moo] Error leyendo preferencias locales:", err);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const palette =
      ACCENT_PALETTES[preferences.accentTheme] ?? ACCENT_PALETTES.amber;
    document.documentElement.style.setProperty("--moo-accent", palette.primary);
    document.documentElement.style.setProperty(
      "--moo-accent-hover",
      palette.hover
    );
    document.documentElement.style.setProperty(
      "--moo-accent-rgb",
      palette.primaryRgb
    );
    document.documentElement.style.setProperty(
      "--moo-accent-hover-rgb",
      palette.hoverRgb
    );
    document.documentElement.dataset.reduceMotion = String(
      preferences.reduceMotion
    );

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (err) {
      console.warn("[Moo] No se pudieron persistir preferencias:", err);
    }
  }, [preferences, isHydrated]);

  const updatePreference = useCallback(
    <K extends keyof MooPreferences>(key: K, value: MooPreferences[K]) => {
      setPreferences((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const updateWindowPosition = useCallback((pos: WindowPosition) => {
    setPreferences((prev) => {
      if (!prev.rememberWindowPosition) return prev;
      return {
        ...prev,
        windowPosition: {
          x: Math.max(8, Math.round(pos.x)),
          y: Math.max(8, Math.round(pos.y)),
        },
      };
    });
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        isHydrated,
        updatePreference,
        updateWindowPosition,
        resetPreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error(
      "usePreferences debe usarse dentro de un PreferencesProvider"
    );
  }
  return ctx;
}
