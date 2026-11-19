import { isTauriEnvironment } from "./desktop-bridge";
import {
  categoryToLoreKind,
  normalizeHabitCategory,
} from "@/features/mascot/components/habit-lore-art";
import type { CalendarReminder, HabitItem, ScheduledTask } from "@/types";

export interface MooDatabaseSchema {
  version: number;
  updatedAt: string;
  tasks: ScheduledTask[];
  habits: HabitItem[];
  reminders: CalendarReminder[];
}

const LOCAL_DB_KEY = "moo_local_database_v1";
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000/api";

export function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const DEFAULT_TASKS: ScheduledTask[] = [
  {
    id: "t-1",
    title: "Revisión de pendientes del día",
    frequency: "daily",
    time: "09:00",
    done: false,
  },
  {
    id: "t-2",
    title: "Bloque de enfoque profundo",
    frequency: "daily",
    time: "11:30",
    done: false,
  },
  {
    id: "t-3",
    title: "Planificación de la semana",
    frequency: "weekly",
    time: "17:00",
    done: false,
  },
  {
    id: "t-4",
    title: "Balance y objetivos del mes",
    frequency: "monthly",
    time: "10:00",
    done: true,
  },
];

export const DEFAULT_HABITS: HabitItem[] = [
  {
    id: "h-1",
    name: "Tomar agua",
    category: "Hidratación",
    completedToday: true,
    streak: 6,
    loreKind: "plant",
  },
  {
    id: "h-2",
    name: "Leer",
    category: "Conocimiento",
    completedToday: false,
    streak: 4,
    loreKind: "books",
  },
  {
    id: "h-3",
    name: "Ejercicio",
    category: "Movimiento",
    completedToday: false,
    streak: 3,
    loreKind: "fire",
  },
  {
    id: "h-4",
    name: "Estudiar",
    category: "Conocimiento",
    completedToday: false,
    streak: 5,
    loreKind: "books",
  },
  {
    id: "h-5",
    name: "Correr",
    category: "Movimiento",
    completedToday: false,
    streak: 2,
    loreKind: "fire",
  },
];

export function getDefaultReminders(): CalendarReminder[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const inThreeDays = new Date(today);
  inThreeDays.setDate(today.getDate() + 3);

  return [
    {
      id: "r-1",
      title: "Entrega de avance de proyecto",
      date: formatIsoDate(today),
      time: "15:00",
      done: false,
    },
    {
      id: "r-2",
      title: "Reunión de seguimiento",
      date: formatIsoDate(tomorrow),
      time: "10:30",
      done: false,
    },
    {
      id: "r-3",
      title: "Revisión mensual con Moo",
      date: formatIsoDate(inThreeDays),
      time: "18:00",
      done: false,
    },
  ];
}

function normalizeHabits(items: HabitItem[]): HabitItem[] {
  return items.map((h) => {
    const category = normalizeHabitCategory(h.category, h.name);
    return {
      ...h,
      category,
      loreKind: categoryToLoreKind(category, h.name),
    };
  });
}

function createDefaultDb(): MooDatabaseSchema {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    tasks: DEFAULT_TASKS,
    habits: DEFAULT_HABITS,
    reminders: getDefaultReminders(),
  };
}

export async function loadMooDatabase(): Promise<{
  data: MooDatabaseSchema;
  engine: "sqlite-api" | "tauri-disk" | "browser-local";
  path: string;
}> {
  if (typeof window === "undefined") {
    return {
      data: createDefaultDb(),
      engine: "browser-local",
      path: "localStorage",
    };
  }

  const defaultReminders = getDefaultReminders();

  // 1. Intentar cargar desde el Backend SQLite local
  try {
    const res = await fetch(`${BACKEND_URL}/state`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const json = (await res.json()) as {
        tasks?: ScheduledTask[];
        habits?: HabitItem[];
        reminders?: CalendarReminder[];
      };
      const merged: MooDatabaseSchema = {
        version: 1,
        updatedAt: new Date().toISOString(),
        tasks: Array.isArray(json.tasks) ? json.tasks : DEFAULT_TASKS,
        habits: normalizeHabits(
          Array.isArray(json.habits) ? json.habits : DEFAULT_HABITS
        ),
        reminders: Array.isArray(json.reminders)
          ? json.reminders
          : defaultReminders,
      };
      window.localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(merged));
      return {
        data: merged,
        engine: "sqlite-api",
        path: "backend/moo.sqlite",
      };
    }
  } catch {
    // Fallback
  }

  // 2. Tauri Disk
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const rawJson = await invoke<string | null>("db_read");
      const dbPath = await invoke<string>("db_get_path");

      if (rawJson) {
        const parsed = JSON.parse(rawJson) as Partial<MooDatabaseSchema>;
        const merged: MooDatabaseSchema = {
          version: 1,
          updatedAt: parsed.updatedAt ?? new Date().toISOString(),
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : DEFAULT_TASKS,
          habits: normalizeHabits(
            Array.isArray(parsed.habits) ? parsed.habits : DEFAULT_HABITS
          ),
          reminders: Array.isArray(parsed.reminders)
            ? parsed.reminders
            : defaultReminders,
        };
        window.localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(merged));
        return { data: merged, engine: "tauri-disk", path: dbPath };
      }

      const initial = createDefaultDb();
      await invoke("db_write", { payload: JSON.stringify(initial, null, 2) });
      return { data: initial, engine: "tauri-disk", path: dbPath };
    } catch {
      // ignore
    }
  }

  // 3. Fallback localStorage
  try {
    const raw = window.localStorage.getItem(LOCAL_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MooDatabaseSchema>;
      return {
        data: {
          version: 1,
          updatedAt: parsed.updatedAt ?? new Date().toISOString(),
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : DEFAULT_TASKS,
          habits: normalizeHabits(
            Array.isArray(parsed.habits) ? parsed.habits : DEFAULT_HABITS
          ),
          reminders: Array.isArray(parsed.reminders)
            ? parsed.reminders
            : defaultReminders,
        },
        engine: "browser-local",
        path: "localStorage",
      };
    }
  } catch {
    // ignore
  }

  const initial = createDefaultDb();
  try {
    window.localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(initial));
  } catch {
    // ignore
  }

  return {
    data: initial,
    engine: "browser-local",
    path: "localStorage",
  };
}

export async function saveMooDatabase(
  tasks: ScheduledTask[],
  habits: HabitItem[],
  reminders?: CalendarReminder[]
): Promise<void> {
  if (typeof window === "undefined") return;

  let currentReminders = reminders;
  if (!currentReminders) {
    try {
      const raw = window.localStorage.getItem(LOCAL_DB_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<MooDatabaseSchema>;
        currentReminders = parsed.reminders;
      }
    } catch {
      // ignore
    }
  }

  const normalizedHabits = normalizeHabits(habits);
  const snapshot: MooDatabaseSchema = {
    version: 1,
    updatedAt: new Date().toISOString(),
    tasks,
    habits: normalizedHabits,
    reminders: currentReminders ?? getDefaultReminders(),
  };

  const serialized = JSON.stringify(snapshot, null, 2);

  try {
    window.localStorage.setItem(LOCAL_DB_KEY, serialized);
  } catch {
    // ignore
  }

  try {
    await fetch(`${BACKEND_URL}/state`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tasks,
        habits: normalizedHabits,
        reminders: snapshot.reminders,
      }),
    });
  } catch {
    // ignore
  }

  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("db_write", { payload: serialized });
    } catch {
      // ignore
    }
  }
}
