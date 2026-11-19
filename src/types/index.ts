export type WindowMode = "notch" | "expanded" | "hidden";

export type SidebarSection =
  | "home"
  | "chat"
  | "calendar"
  | "tasks"
  | "habits"
  | "universe"
  | "settings";

export type ExpandedTab = SidebarSection;

export type AccentTheme = "amber" | "green" | "violet";

export type TaskFrequency = "daily" | "weekly" | "monthly";

export type HabitLoreKind = "plant" | "fire" | "books" | "crystal";

export interface WindowPosition {
  x: number;
  y: number;
}

export interface ScheduledTask {
  id: string;
  title: string;
  frequency: TaskFrequency;
  time?: string;
  dateLabel?: string;
  done: boolean;
}

export interface HabitItem {
  id: string;
  name: string;
  category: string;
  completedToday: boolean;
  streak: number;
  loreKind?: HabitLoreKind;
  loreLabel?: string;
}

export interface CalendarReminder {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  done: boolean;
}

export interface MooPreferences {
  accentTheme: AccentTheme;
  globalShortcut: string;
  reduceMotion: boolean;
  microphoneAllowed: boolean;
  rememberWindowPosition: boolean;
  startInCompactMode: boolean;
  expandTrigger: "click" | "hover";
  windowPosition: WindowPosition;
  lastWindowMode: "notch" | "expanded";
  ollamaUrl: string;
  ollamaModel: string;
  geminiApiKey: string;
  openaiApiKey: string;
}

export const DEFAULT_PREFERENCES: MooPreferences = {
  accentTheme: "amber",
  globalShortcut: "Ctrl+Shift+M",
  reduceMotion: false,
  microphoneAllowed: true,
  rememberWindowPosition: true,
  startInCompactMode: true,
  expandTrigger: "click",
  windowPosition: { x: 0, y: 0 },
  lastWindowMode: "notch",
  ollamaUrl: "http://127.0.0.1:11434",
  ollamaModel: "llama3.2",
  geminiApiKey: "",
  openaiApiKey: "",
};

export const WINDOW_DIMENSIONS = {
  notch: { width: 210, height: 32 },
  expanded: { width: 820, height: 520 },
  compact: { width: 210, height: 32 },
} as const;
