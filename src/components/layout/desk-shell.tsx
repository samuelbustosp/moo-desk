"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ExpandedWindow } from "./expanded-window";
import { MooMascot } from "@/features/mascot/components/moo-mascot";
import { usePreferences } from "@/features/preferences";
import { useMascot } from "@/features/mascot/hooks/use-mascot";
import { MASCOT_STATES, type MascotState } from "@/features/mascot/types";
import { useConversation } from "@/features/conversation/hooks/use-conversation";
import {
  isTauriEnvironment,
  registerNativeGlobalShortcut,
  syncTauriWindowMode,
} from "@/lib/desktop-bridge";
import {
  DEFAULT_HABITS,
  DEFAULT_TASKS,
  getDefaultReminders,
  loadMooDatabase,
  saveMooDatabase,
} from "@/lib/db";
import {
  categoryToLoreKind,
  normalizeHabitCategory,
} from "@/features/mascot/components/habit-lore-art";
import type {
  CalendarReminder,
  HabitItem,
  ScheduledTask,
  SidebarSection,
  TaskFrequency,
  WindowMode,
} from "@/types";

const STATE_ORDER: MascotState[] = [
  "idle",
  "smile",
  "wink",
  "thinking",
  "love",
  "cool",
  "surprised",
  "listening",
  "sleeping",
];

interface DeskShellProps {
  initialMode?: WindowMode;
  initialSection?: SidebarSection;
}

export function DeskShell({
  initialMode,
  initialSection = "home",
}: DeskShellProps) {
  const { preferences, isHydrated } = usePreferences();

  const [windowMode, setWindowMode] = useState<WindowMode>(
    initialMode ?? "notch"
  );
  const [activeSection, setActiveSection] =
    useState<SidebarSection>(initialSection);
  const [isTauri, setIsTauri] = useState(false);

  const [tasks, setTasks] = useState<ScheduledTask[]>(DEFAULT_TASKS);
  const [habits, setHabits] = useState<HabitItem[]>(DEFAULT_HABITS);
  const [reminders, setReminders] = useState<CalendarReminder[]>(() =>
    getDefaultReminders()
  );

  const hasInitializedModeRef = useRef(false);
  const collapseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isHidden = windowMode === "hidden";
  const isExpanded = windowMode === "expanded";

  const {
    state: mascotState,
    isBlinking,
    setState: setMascotState,
    triggerTemporaryState,
    notifyActivity,
  } = useMascot({
    initialState: "idle",
    isHidden,
    reduceMotion: preferences.reduceMotion,
    sleepTimeoutMs: 22000,
  });

  const handleAgentStateSync = useCallback(
    (nextState: {
      tasks: ScheduledTask[];
      habits: HabitItem[];
      reminders: CalendarReminder[];
    }) => {
      setTasks(nextState.tasks);
      setHabits(nextState.habits);
      setReminders(nextState.reminders);
      saveMooDatabase(nextState.tasks, nextState.habits, nextState.reminders);
    },
    []
  );

  const {
    messages,
    isSimulatingReply,
    agentStatus,
    sendUserMessage,
    clearMessages,
  } = useConversation({
    onMascotStateChange: setMascotState,
    agentConfig: {
      ollamaUrl: preferences.ollamaUrl,
      ollamaModel: preferences.ollamaModel,
      geminiApiKey: preferences.geminiApiKey,
      openaiApiKey: preferences.openaiApiKey,
    },
    currentState: {
      tasks,
      habits,
      reminders,
    },
    onAgentStateSync: handleAgentStateSync,
  });

  const handleSendMessageAndNavigate = useCallback(
    (
      text: string,
      options?: {
        isVoice?: boolean;
        audioBase64?: string;
        audioMimeType?: string;
      }
    ) => {
      setActiveSection("chat");
      sendUserMessage(text, options);
    },
    [sendUserMessage]
  );

  useEffect(() => {
    setIsTauri(isTauriEnvironment());
    loadMooDatabase().then(({ data }) => {
      setTasks(data.tasks);
      setHabits(data.habits);
      setReminders(data.reminders);
    });
  }, []);

  const persistTasks = useCallback(
    (next: ScheduledTask[]) => {
      setTasks(next);
      saveMooDatabase(next, habits, reminders);
    },
    [habits, reminders]
  );

  const persistHabits = useCallback(
    (next: HabitItem[]) => {
      setHabits(next);
      saveMooDatabase(tasks, next, reminders);
    },
    [tasks, reminders]
  );

  const persistReminders = useCallback(
    (next: CalendarReminder[]) => {
      setReminders(next);
      saveMooDatabase(tasks, habits, next);
    },
    [tasks, habits]
  );

  const handleAddReminder = useCallback(
    (title: string, date: string, time: string) => {
      const item: CalendarReminder = {
        id: `r-${Date.now()}`,
        title,
        date,
        time,
        done: false,
      };
      persistReminders([...reminders, item]);
      triggerTemporaryState("wink", 2300);
    },
    [reminders, persistReminders, triggerTemporaryState]
  );

  const handleUpdateReminder = useCallback(
    (
      id: string,
      patch: Partial<Pick<CalendarReminder, "title" | "date" | "time">>
    ) => {
      const updated = reminders.map((r) =>
        r.id === id ? { ...r, ...patch } : r
      );
      persistReminders(updated);
      triggerTemporaryState("smile", 2000);
    },
    [reminders, persistReminders, triggerTemporaryState]
  );

  const handleToggleReminder = useCallback(
    (id: string) => {
      let completedNow = false;
      const updated = reminders.map((r) => {
        if (r.id !== id) return r;
        completedNow = !r.done;
        return { ...r, done: !r.done };
      });
      persistReminders(updated);
      if (completedNow) {
        triggerTemporaryState("smile", 2200);
      }
    },
    [reminders, persistReminders, triggerTemporaryState]
  );

  const handleDeleteReminder = useCallback(
    (id: string) => {
      persistReminders(reminders.filter((r) => r.id !== id));
      triggerTemporaryState("surprised", 1400);
    },
    [reminders, persistReminders, triggerTemporaryState]
  );

  const handleAddTask = useCallback(
    (title: string, frequency: TaskFrequency, time?: string) => {
      const item: ScheduledTask = {
        id: `t-${Date.now()}`,
        title,
        frequency,
        time,
        done: false,
      };
      persistTasks([item, ...tasks]);
      triggerTemporaryState("wink", 2400);
    },
    [tasks, persistTasks, triggerTemporaryState]
  );

  const handleToggleTask = useCallback(
    (id: string) => {
      let completedNow = false;
      const updated = tasks.map((t) => {
        if (t.id !== id) return t;
        completedNow = !t.done;
        return { ...t, done: !t.done };
      });
      persistTasks(updated);

      if (completedNow) {
        const remainingPending = updated.filter((t) => !t.done).length;
        if (remainingPending === 0 && updated.length > 0) {
          triggerTemporaryState("cool", 3400);
        } else {
          triggerTemporaryState(
            Math.random() > 0.45 ? "smile" : "wink",
            2500
          );
        }
      }
    },
    [tasks, persistTasks, triggerTemporaryState]
  );

  const handleDeleteTask = useCallback(
    (id: string) => {
      persistTasks(tasks.filter((t) => t.id !== id));
      triggerTemporaryState("surprised", 1400);
    },
    [tasks, persistTasks, triggerTemporaryState]
  );

  const handleUpdateTask = useCallback(
    (
      id: string,
      patch: Partial<Pick<ScheduledTask, "title" | "frequency" | "time">>
    ) => {
      const updated = tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
      persistTasks(updated);
      triggerTemporaryState("smile", 2000);
    },
    [tasks, persistTasks, triggerTemporaryState]
  );

  const handleAddHabit = useCallback(
    (name: string, category?: string) => {
      const normalizedCat = normalizeHabitCategory(category, name);
      const item: HabitItem = {
        id: `h-${Date.now()}`,
        name,
        category: normalizedCat,
        completedToday: false,
        streak: 1,
        loreKind: categoryToLoreKind(normalizedCat, name),
      };
      persistHabits([...habits, item]);
      triggerTemporaryState("wink", 2400);
    },
    [habits, persistHabits, triggerTemporaryState]
  );

  const handleUpdateHabit = useCallback(
    (id: string, patch: Partial<Pick<HabitItem, "name" | "category">>) => {
      const updated = habits.map((h) => {
        if (h.id !== id) return h;
        const nextName = patch.name ?? h.name;
        const nextCat = normalizeHabitCategory(
          patch.category ?? h.category,
          nextName
        );
        return {
          ...h,
          name: nextName,
          category: nextCat,
          loreKind: categoryToLoreKind(nextCat, nextName),
        };
      });
      persistHabits(updated);
      triggerTemporaryState("smile", 2000);
    },
    [habits, persistHabits, triggerTemporaryState]
  );

  const handleToggleHabit = useCallback(
    (id: string) => {
      let completedNow = false;
      const updated = habits.map((h) => {
        if (h.id !== id) return h;
        completedNow = !h.completedToday;
        return {
          ...h,
          completedToday: completedNow,
          streak: completedNow ? h.streak + 1 : Math.max(0, h.streak - 1),
        };
      });
      persistHabits(updated);

      if (completedNow) {
        const allDone =
          updated.length > 0 && updated.every((h) => h.completedToday);
        if (allDone) {
          triggerTemporaryState("cool", 3500);
        } else {
          triggerTemporaryState("love", 2700);
        }
      }
    },
    [habits, persistHabits, triggerTemporaryState]
  );

  const handleDeleteHabit = useCallback(
    (id: string) => {
      persistHabits(habits.filter((h) => h.id !== id));
      triggerTemporaryState("surprised", 1400);
    },
    [habits, persistHabits, triggerTemporaryState]
  );

  const handleUserTyping = useCallback(() => {
    notifyActivity();
    if (mascotState !== "listening") {
      triggerTemporaryState("thinking", 1800);
    }
  }, [mascotState, notifyActivity, triggerTemporaryState]);

  useEffect(() => {
    if (!isHydrated || hasInitializedModeRef.current) return;
    hasInitializedModeRef.current = true;
    if (initialMode) {
      setWindowMode(initialMode);
    }
  }, [isHydrated, initialMode]);

  useEffect(() => {
    if (!isHydrated) return;
    syncTauriWindowMode(windowMode);
  }, [windowMode, isHydrated]);

  useEffect(() => {
    if (!isTauriEnvironment()) return;
    let unlisten: (() => void) | undefined;

    (async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<string>("moo://window-action", (event) => {
          const action = event.payload;
          if (action === "compact" || action === "notch") {
            setWindowMode("notch");
          } else if (action === "expanded") {
            setWindowMode("expanded");
          } else if (action === "settings") {
            setActiveSection("settings");
            setWindowMode("expanded");
          } else if (action === "toggle") {
            setWindowMode((prev) => (prev === "hidden" ? "notch" : "hidden"));
          }
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const clearCollapseTimer = useCallback(() => {
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
  }, []);

  const handleMouseEnterNotch = useCallback(() => {
    clearCollapseTimer();
    notifyActivity();
    setWindowMode("expanded");
  }, [clearCollapseTimer, notifyActivity]);

  const handleSectionChange = useCallback(
    (nextSection: SidebarSection) => {
      if (activeSection === "chat" && nextSection !== "chat") {
        clearMessages();
      }
      setActiveSection(nextSection);
    },
    [activeSection, clearMessages]
  );

  const handleMouseLeaveNotch = useCallback(() => {
    clearCollapseTimer();
    collapseTimeoutRef.current = setTimeout(() => {
      setWindowMode("notch");
      clearMessages();
    }, 340);
  }, [clearCollapseTimer, clearMessages]);

  const toggleShortcutMode = useCallback(() => {
    clearCollapseTimer();
    notifyActivity();
    setWindowMode((prev) => {
      const next = prev === "expanded" ? "notch" : "expanded";
      if (next === "notch") {
        clearMessages();
      }
      return next;
    });
  }, [clearCollapseTimer, notifyActivity, clearMessages]);

  useEffect(() => {
    let cleanupNative: (() => void) | undefined;
    registerNativeGlobalShortcut(
      preferences.globalShortcut,
      toggleShortcutMode
    ).then((fn) => {
      cleanupNative = fn;
    });

    const handleBrowserShortcut = (e: KeyboardEvent) => {
      const parts = preferences.globalShortcut
        .toLowerCase()
        .split("+")
        .map((s) => s.trim());

      const needsCtrl = parts.includes("ctrl") || parts.includes("control");
      const needsAlt = parts.includes("alt");
      const needsShift = parts.includes("shift");
      const mainKey = parts.find(
        (p) => !["ctrl", "control", "alt", "shift"].includes(p)
      );

      const pressedKey = e.key === " " ? "space" : e.key.toLowerCase();
      if (
        e.ctrlKey === needsCtrl &&
        e.altKey === needsAlt &&
        e.shiftKey === needsShift &&
        mainKey === pressedKey
      ) {
        e.preventDefault();
        toggleShortcutMode();
      }
    };

    window.addEventListener("keydown", handleBrowserShortcut);
    return () => {
      window.removeEventListener("keydown", handleBrowserShortcut);
      if (cleanupNative) cleanupNative();
    };
  }, [preferences.globalShortcut, toggleShortcutMode]);

  const cycleMascotState = useCallback(() => {
    const idx = STATE_ORDER.indexOf(mascotState);
    const next = STATE_ORDER[(idx + 1) % STATE_ORDER.length];
    setMascotState(next);
  }, [mascotState, setMascotState]);

  const toggleListeningState = useCallback(() => {
    setMascotState(mascotState === "listening" ? "idle" : "listening");
  }, [mascotState, setMascotState]);

  const meta = MASCOT_STATES[mascotState] ?? MASCOT_STATES.idle;
  const dotColor =
    mascotState === "idle" ? "var(--moo-accent)" : meta.badgeColor;

  if (isHidden) {
    return null;
  }

  const morphingNotch = (
    <div
      onMouseEnter={handleMouseEnterNotch}
      onMouseLeave={handleMouseLeaveNotch}
      onClick={() => {
        if (!isExpanded) handleMouseEnterNotch();
      }}
      className="flex items-start justify-center select-none"
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

      {/* Cuerpo del Notch con animación fluida entre Plegado y Desplegado */}
      <div
        className={`relative overflow-hidden border-x border-b bg-[#060607] transition-[width,height,border-radius,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isExpanded
            ? "h-[510px] w-[780px] max-w-[95vw] rounded-b-3xl border-zinc-800/90 shadow-[0_28px_72px_rgba(0,0,0,0.92)]"
            : "h-10 w-44 cursor-pointer rounded-b-2xl border-zinc-800/80 shadow-[0_12px_32px_rgba(0,0,0,0.9)] hover:border-moo-accent/45"
        }`}
      >
        {/* Vista Plegada: Solo el logo de Moo en blanco + puntito del color de estado parpadeando */}
        <div
          aria-hidden={isExpanded}
          className={`absolute inset-0 flex items-center justify-center px-4 transition-all duration-200 ${
            isExpanded
              ? "pointer-events-none scale-90 opacity-0"
              : "scale-100 opacity-100 delay-75"
          }`}
        >
          <MooMascot
            state={mascotState}
            size="sm"
            isBlinking={isBlinking}
            reduceMotion={preferences.reduceMotion}
          />
          <span className="absolute right-4 flex h-2 w-2 items-center justify-center">
            {!preferences.reduceMotion && (
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

        {/* Vista Desplegada: Aplicación completa con Sidebar */}
        <div
          aria-hidden={!isExpanded}
          className={`h-[510px] w-[780px] max-w-[95vw] origin-top transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isExpanded
              ? "scale-100 opacity-100"
              : "pointer-events-none scale-95 opacity-0"
          }`}
        >
          <ExpandedWindow
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            mascotState={mascotState}
            isBlinking={isBlinking}
            reduceMotion={preferences.reduceMotion}
            microphoneAllowed={preferences.microphoneAllowed}
            agentStatus={agentStatus}
            messages={messages}
            isSimulatingReply={isSimulatingReply}
            tasks={tasks}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            habits={habits}
            onAddHabit={handleAddHabit}
            onUpdateHabit={handleUpdateHabit}
            onToggleHabit={handleToggleHabit}
            onDeleteHabit={handleDeleteHabit}
            reminders={reminders}
            onAddReminder={handleAddReminder}
            onUpdateReminder={handleUpdateReminder}
            onToggleReminder={handleToggleReminder}
            onDeleteReminder={handleDeleteReminder}
            onCycleMascotState={cycleMascotState}
            onToggleListening={toggleListeningState}
            onSetMascotState={setMascotState}
            onSendMessage={handleSendMessageAndNavigate}
            onClearMessages={clearMessages}
            onUserTyping={handleUserTyping}
          />
        </div>
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

  if (isTauri) {
    return (
      <main className="flex h-screen w-screen items-start justify-center overflow-hidden bg-transparent">
        {morphingNotch}
      </main>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#111214] text-zinc-100">
      <div className="fixed top-0 left-1/2 z-50 -translate-x-1/2 flex flex-col items-center">
        {morphingNotch}
      </div>
    </div>
  );
}
