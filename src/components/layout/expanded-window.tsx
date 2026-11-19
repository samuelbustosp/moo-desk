"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  Bot,
  Calendar as CalendarIcon,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  GraduationCap,
  Home,
  ListTodo,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  Pencil,
  Plus,
  SendHorizontal,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Trophy,
} from "lucide-react";
import { MooMascot } from "@/features/mascot/components/moo-mascot";
import {
  HABIT_CATEGORIES,
  HabitLoreArt,
  normalizeHabitCategory,
  type HabitCategory,
} from "@/features/mascot/components/habit-lore-art";
import { MASCOT_STATES, type MascotState } from "@/features/mascot/types";
import { SettingsPanel } from "@/features/preferences/settings-panel";
import { useVoiceRecorder } from "@/features/conversation/hooks/use-voice-recorder";
import {
  Badge,
  Button,
  Card,
  DatePickerPopover,
  Input,
  ModalDialog,
  SelectPopover,
  TimePickerPopover,
} from "@/components/ui/primitives";
import { formatIsoDate } from "@/lib/db";
import type { ConversationMessage } from "@/features/conversation/types";
import type { AgentStatus } from "@/types/agent-contract";
import type {
  CalendarReminder,
  HabitItem,
  HabitLoreKind,
  ScheduledTask,
  SidebarSection,
  TaskFrequency,
} from "@/types";

interface ExpandedWindowProps {
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
  mascotState: MascotState;
  isBlinking: boolean;
  reduceMotion: boolean;
  microphoneAllowed?: boolean;
  agentStatus?: AgentStatus;
  messages: ConversationMessage[];
  isSimulatingReply: boolean;
  tasks: ScheduledTask[];
  onAddTask: (title: string, frequency: TaskFrequency, time?: string) => void;
  onUpdateTask: (
    id: string,
    patch: Partial<Pick<ScheduledTask, "title" | "frequency" | "time">>
  ) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  habits: HabitItem[];
  onAddHabit: (name: string, category?: string) => void;
  onUpdateHabit: (
    id: string,
    patch: Partial<Pick<HabitItem, "name" | "category">>
  ) => void;
  onToggleHabit: (id: string) => void;
  onDeleteHabit: (id: string) => void;
  reminders: CalendarReminder[];
  onAddReminder: (title: string, date: string, time: string) => void;
  onUpdateReminder: (
    id: string,
    patch: Partial<Pick<CalendarReminder, "title" | "date" | "time">>
  ) => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
  onCycleMascotState: () => void;
  onToggleListening: () => void;
  onSetMascotState?: (state: MascotState) => void;
  onSendMessage: (
    text: string,
    options?: {
      isVoice?: boolean;
      audioBase64?: string;
      audioMimeType?: string;
    }
  ) => void;
  onClearMessages?: () => void;
  onUserTyping?: () => void;
}

const NAV_ITEMS: {
  id: SidebarSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "home", label: "Inicio", icon: Home },
  { id: "calendar", label: "Calendario", icon: CalendarIcon },
  { id: "tasks", label: "Tareas", icon: CalendarCheck },
  { id: "habits", label: "Hábitos", icon: Flame },
  { id: "universe", label: "Logros", icon: Trophy },
  { id: "settings", label: "Ajustes", icon: Settings },
];

const FREQUENCY_LABELS: Record<TaskFrequency, string> = {
  daily: "Diaria",
  weekly: "Semanal",
  monthly: "Mensual",
};

const QUICK_HABIT_PRESETS: {
  name: string;
  category: HabitCategory;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { name: "Tomar agua", category: "Hidratación", icon: Droplets },
  { name: "Correr", category: "Movimiento", icon: Footprints },
  { name: "Ejercicio", category: "Movimiento", icon: Dumbbell },
  { name: "Leer", category: "Conocimiento", icon: BookOpen },
  { name: "Estudiar", category: "Conocimiento", icon: GraduationCap },
];

const UNIVERSE_ACHIEVEMENTS: {
  kind: HabitLoreKind;
  category: HabitCategory;
  title: string;
  shortDesc: string;
}[] = [
  {
    kind: "plant",
    category: "Hidratación",
    title: "El Bonsái de Moo",
    shortDesc: "Crece y florece con tus hábitos de Hidratación.",
  },
  {
    kind: "fire",
    category: "Movimiento",
    title: "La Fogata de Energía",
    shortDesc: "Se aviva con tus hábitos de Movimiento y Físico.",
  },
  {
    kind: "books",
    category: "Conocimiento",
    title: "La Torre de Sabiduría",
    shortDesc: "Suma tomos iluminados con Conocimiento y Foco.",
  },
  {
    kind: "crystal",
    category: "Equilibrio",
    title: "El Cristal de Equilibrio",
    shortDesc: "Mantiene la armonía con tus hábitos de Bienestar.",
  },
];

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function ExpandedWindow({
  activeSection,
  onSectionChange,
  mascotState,
  isBlinking,
  reduceMotion,
  microphoneAllowed = true,
  agentStatus,
  messages,
  isSimulatingReply,
  tasks,
  onAddTask,
  onUpdateTask,
  onToggleTask,
  onDeleteTask,
  habits,
  onAddHabit,
  onUpdateHabit,
  onToggleHabit,
  onDeleteHabit,
  reminders,
  onAddReminder,
  onUpdateReminder,
  onToggleReminder,
  onDeleteReminder,
  onCycleMascotState,
  onToggleListening,
  onSetMascotState,
  onSendMessage,
  onClearMessages,
  onUserTyping,
}: ExpandedWindowProps) {
  const meta = MASCOT_STATES[mascotState] ?? MASCOT_STATES.idle;
  const statusColor =
    mascotState === "idle" ? "var(--moo-accent)" : meta.badgeColor;

  const todayIso = useMemo(() => formatIsoDate(new Date()), []);

  const [messageInput, setMessageInput] = useState("");
  const [taskFilter, setTaskFilter] = useState<TaskFrequency | "all">("all");
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeSection === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeSection, messages.length, isSimulatingReply]);

  const {
    isRecording,
    isTranscribingAudio,
    transcribingStatus,
    permissionState,
    interimTranscript,
    errorMessage: voiceError,
    toggleRecording,
  } = useVoiceRecorder({
    microphoneAllowed,
    onInterimTranscript: (liveText) => {
      setMessageInput(liveText);
    },
    onTranscribingStateChange: (transcribing) => {
      if (transcribing) {
        onSectionChange("chat");
        onSetMascotState?.("thinking");
      }
    },
    onCaptureComplete: ({ transcript, audioBase64, audioMimeType }) => {
      const textToSend = transcript.trim() || messageInput.trim();
      if (textToSend) {
        onSendMessage(textToSend, {
          isVoice: true,
          audioBase64,
          audioMimeType,
        });
        setMessageInput("");
      } else {
        onSetMascotState?.("idle");
      }
    },
    onError: () => {
      onSetMascotState?.("surprised");
    },
  });

  const isListening = isRecording || mascotState === "listening";

  const handleMicButtonClick = async () => {
    if (!microphoneAllowed) {
      onToggleListening();
      return;
    }
    const started = await toggleRecording();
    if (started) {
      onSetMascotState?.("listening");
    } else {
      onSetMascotState?.("thinking");
    }
  };

  // Estado del Calendario
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDateIso, setSelectedDateIso] = useState<string>(todayIso);

  // Modal de Recordatorio de Calendario (Crear / Editar)
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(
    null
  );
  const [modalReminderTitle, setModalReminderTitle] = useState("");
  const [modalReminderDate, setModalReminderDate] = useState(todayIso);
  const [modalReminderTime, setModalReminderTime] = useState("10:00");

  // Modal de Tarea (Crear / Editar)
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [modalTaskTitle, setModalTaskTitle] = useState("");
  const [modalTaskFreq, setModalTaskFreq] = useState<TaskFrequency>("daily");
  const [modalTaskTime, setModalTaskTime] = useState("09:00");

  // Modal de Hábito (Crear / Editar)
  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [modalHabitName, setModalHabitName] = useState("");
  const [modalHabitCategory, setModalHabitCategory] =
    useState<HabitCategory>("Hidratación");

  const handleMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    onSendMessage(messageInput.trim());
    setMessageInput("");
  };

  // Funciones Modal de Recordatorio
  const openCreateReminderModal = (forDate = selectedDateIso) => {
    setEditingReminderId(null);
    setModalReminderTitle("");
    setModalReminderDate(forDate);
    setModalReminderTime("10:00");
    setReminderModalOpen(true);
  };

  const openEditReminderModal = (rem: CalendarReminder) => {
    setEditingReminderId(rem.id);
    setModalReminderTitle(rem.title);
    setModalReminderDate(rem.date);
    setModalReminderTime(rem.time);
    setReminderModalOpen(true);
  };

  const handleReminderModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalReminderTitle.trim()) return;
    if (editingReminderId) {
      onUpdateReminder(editingReminderId, {
        title: modalReminderTitle.trim(),
        date: modalReminderDate,
        time: modalReminderTime,
      });
    } else {
      onAddReminder(
        modalReminderTitle.trim(),
        modalReminderDate,
        modalReminderTime
      );
    }
    setSelectedDateIso(modalReminderDate);
    setReminderModalOpen(false);
  };

  // Funciones Modal de Tarea
  const openCreateTaskModal = () => {
    setEditingTaskId(null);
    setModalTaskTitle("");
    setModalTaskFreq("daily");
    setModalTaskTime("09:00");
    setTaskModalOpen(true);
  };

  const openEditTaskModal = (task: ScheduledTask) => {
    setEditingTaskId(task.id);
    setModalTaskTitle(task.title);
    setModalTaskFreq(task.frequency);
    setModalTaskTime(task.time || "09:00");
    setTaskModalOpen(true);
  };

  const handleTaskModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTaskTitle.trim()) return;
    if (editingTaskId) {
      onUpdateTask(editingTaskId, {
        title: modalTaskTitle.trim(),
        frequency: modalTaskFreq,
        time: modalTaskTime,
      });
    } else {
      onAddTask(modalTaskTitle.trim(), modalTaskFreq, modalTaskTime);
    }
    setTaskModalOpen(false);
  };

  // Funciones Modal de Hábito
  const openCreateHabitModal = () => {
    setEditingHabitId(null);
    setModalHabitName("");
    setModalHabitCategory("Equilibrio");
    setHabitModalOpen(true);
  };

  const openEditHabitModal = (habit: HabitItem) => {
    setEditingHabitId(habit.id);
    setModalHabitName(habit.name);
    setModalHabitCategory(normalizeHabitCategory(habit.category, habit.name));
    setHabitModalOpen(true);
  };

  const handleHabitModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalHabitName.trim()) return;
    if (editingHabitId) {
      onUpdateHabit(editingHabitId, {
        name: modalHabitName.trim(),
        category: modalHabitCategory,
      });
    } else {
      onAddHabit(modalHabitName.trim(), modalHabitCategory);
    }
    setHabitModalOpen(false);
  };

  // Generación de días del mes para el Calendario
  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Lunes = 0 ... Domingo = 6
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: {
      iso: string | null;
      dayNumber: number | null;
    }[] = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push({ iso: null, dayNumber: null });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(month + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      cells.push({
        iso: `${year}-${mStr}-${dStr}`,
        dayNumber: d,
      });
    }

    return cells;
  }, [calendarMonth]);

  const remindersByDate = useMemo(() => {
    const map: Record<string, CalendarReminder[]> = {};
    for (const r of reminders) {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    }
    return map;
  }, [reminders]);

  const selectedDateReminders = useMemo(() => {
    return [...(remindersByDate[selectedDateIso] ?? [])].sort((a, b) =>
      a.time.localeCompare(b.time)
    );
  }, [remindersByDate, selectedDateIso]);

  const filteredTasks =
    taskFilter === "all"
      ? tasks
      : tasks.filter((t) => t.frequency === taskFilter);

  const pendingTasks = tasks.filter((t) => !t.done);
  const completedTasksCount = tasks.length - pendingTasks.length;
  const completedHabitsCount = habits.filter((h) => h.completedToday).length;
  const nextScheduledTask = pendingTasks.find((t) => Boolean(t.time));
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);

  const selectedCategoryMeta =
    HABIT_CATEGORIES.find((c) => c.value === modalHabitCategory) ??
    HABIT_CATEGORIES[3];

  const formatReadableDate = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return iso;
    return `${d} de ${MONTH_NAMES[m - 1]?.toLowerCase() ?? ""}`;
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#09090b] text-zinc-100">
      {/* SIDEBAR */}
      <aside className="flex w-[196px] shrink-0 flex-col justify-between border-r border-zinc-800/80 bg-[#060607] p-4">
        <div className="space-y-5">
          {/* Identidad: Logo blanco + Moo en fuente Momo Trust Display + Estado */}
          <div className="flex items-center gap-3.5 px-1.5 pt-1">
            <MooMascot
              state={mascotState}
              size="md"
              isBlinking={isBlinking}
              reduceMotion={reduceMotion}
              onClick={onCycleMascotState}
            />
            <div className="min-w-0">
              <div className="font-display text-2xl tracking-tight text-white leading-none">
                Moo
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <span className="relative flex h-2 w-2 items-center justify-center">
                  {!reduceMotion && (
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                      style={{ backgroundColor: statusColor }}
                    />
                  )}
                  <span
                    className="relative inline-flex h-2 w-2 rounded-full"
                    style={{ backgroundColor: statusColor }}
                  />
                </span>
                <span className="truncate">{meta.label}</span>
              </div>
            </div>
          </div>

          {/* Navegación */}
          <nav aria-label="Navegación" className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSectionChange(item.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-all duration-200 ${
                    active
                      ? "bg-moo-accent text-zinc-950 font-semibold shadow-[0_0_22px_-5px_var(--moo-accent)]"
                      : "font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer del Sidebar: Versión de Moo */}
        <div className="flex items-center justify-between border-t border-zinc-800/60 px-1.5 pt-3 text-[11px] text-zinc-500">
          <span className="font-display text-xs text-zinc-400">Moo</span>
          <span className="rounded-md border border-moo-accent/25 bg-moo-accent/10 px-1.5 py-0.5 font-mono text-[10px] text-moo-accent">
            v0.1.0
          </span>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#09090b]">
        {/* SECCIÓN 1: INICIO */}
        {activeSection === "home" && (
          <div className="flex flex-1 flex-col overflow-y-auto p-6 space-y-4 moo-scrollbar">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Hola
                </h1>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Tu resumen y actividad de hoy.
                </p>
              </div>
              <Badge
                variant="accent"
                className="font-mono text-[11px] px-2.5 py-0.5"
              >
                {new Date().toLocaleDateString("es-AR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </Badge>
            </div>

            {/* Barra de mensajes y botón de micrófono con transcripción y Sandbox */}
            <div className="space-y-2">
              <form
                onSubmit={handleMessageSubmit}
                className="flex items-center gap-2"
              >
                <Input
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    onUserTyping?.();
                  }}
                  disabled={isTranscribingAudio}
                  placeholder={
                    isTranscribingAudio
                      ? transcribingStatus || "Transcribiendo tu audio..."
                      : isRecording
                      ? interimTranscript
                        ? `Transcribiendo: "${interimTranscript}"...`
                        : "Escuchando micrófono... habla y pulsa detener"
                      : "Habla con el micrófono o escribe: 'Recuérdame reunión mañana a las 10:00'..."
                  }
                  className={`h-10 bg-zinc-900/90 border-zinc-800 focus-visible:border-moo-accent ${
                    isRecording || isTranscribingAudio
                      ? "border-moo-accent/70 ring-1 ring-moo-accent/30"
                      : ""
                  }`}
                />
                <Button
                  type="button"
                  variant={isRecording ? "primary" : "secondary"}
                  size="icon"
                  disabled={isTranscribingAudio}
                  onClick={handleMicButtonClick}
                  title={
                    !microphoneAllowed
                      ? "Micrófono desactivado en Ajustes"
                      : isRecording
                      ? "Detener grabación y ejecutar"
                      : permissionState === "denied"
                      ? "Permiso de micrófono denegado"
                      : "Hablar por micrófono"
                  }
                  className={`h-10 w-10 shrink-0 ${
                    isRecording ? "animate-pulse" : ""
                  }`}
                >
                  {!microphoneAllowed || permissionState === "denied" ? (
                    <MicOff className="h-4 w-4 text-red-400" />
                  ) : isRecording ? (
                    <Square className="h-3.5 w-3.5 fill-zinc-950 text-zinc-950" />
                  ) : (
                    <Mic className="h-4 w-4 text-moo-accent" />
                  )}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="icon"
                  disabled={!messageInput.trim() || isSimulatingReply}
                  title="Enviar comando a Moo"
                  className="h-10 w-10 shrink-0"
                >
                  <SendHorizontal className="h-4 w-4" />
                </Button>
              </form>

              {voiceError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-red-400" />
                  <span>{voiceError}</span>
                </div>
              )}
            </div>

            {/* Pequeñas Cards de Resumen */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="border-zinc-800/90 bg-zinc-900/60 p-3 hover:border-moo-accent/40">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Hábitos hoy</span>
                  <Flame className="h-3.5 w-3.5 text-moo-accent" />
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="font-mono text-lg font-bold text-white">
                    {completedHabitsCount}/{habits.length}
                  </span>
                  <span className="font-mono text-[10px] text-moo-accent">
                    racha {bestStreak}d
                  </span>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-moo-accent transition-all duration-300"
                    style={{
                      width: `${
                        habits.length > 0
                          ? Math.round(
                              (completedHabitsCount / habits.length) * 100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </Card>

              <Card className="border-zinc-800/90 bg-zinc-900/60 p-3 hover:border-moo-accent/40">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Pendientes</span>
                  <ListTodo className="h-3.5 w-3.5 text-moo-accent" />
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="font-mono text-lg font-bold text-white">
                    {pendingTasks.length}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    de {tasks.length} tareas
                  </span>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-moo-accent transition-all duration-300"
                    style={{
                      width: `${
                        tasks.length > 0
                          ? Math.round(
                              (completedTasksCount / tasks.length) * 100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </Card>

              <Card className="border-zinc-800/90 bg-zinc-900/60 p-3 hover:border-moo-accent/40">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Próxima alarma</span>
                  <Clock className="h-3.5 w-3.5 text-moo-accent" />
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-moo-accent">
                  {nextScheduledTask?.time ?? "--:--"}
                </div>
                <div className="mt-0.5 truncate text-[10px] text-zinc-400">
                  {nextScheduledTask?.title ?? "Todo al día"}
                </div>
              </Card>
            </div>

            {/* Listas de Hoy: Programado + Hábitos */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Card className="p-3.5 flex flex-col justify-between space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Bell className="h-3.5 w-3.5 text-moo-accent" />
                    Programado
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={openCreateTaskModal}
                      className="text-[11px] font-medium text-moo-accent hover:underline"
                    >
                      + Nueva
                    </button>
                    <button
                      type="button"
                      onClick={() => onSectionChange("tasks")}
                      className="text-[11px] text-zinc-400 hover:text-white"
                    >
                      Ver todo
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {tasks.slice(0, 3).map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-800/70 bg-zinc-950/60 px-3 py-2 text-left transition hover:border-moo-accent/50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors ${
                            task.done
                              ? "border-moo-accent bg-moo-accent text-zinc-950"
                              : "border-zinc-700"
                          }`}
                        >
                          {task.done && (
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          )}
                        </span>
                        <span
                          className={`truncate text-xs ${
                            task.done
                              ? "line-through text-zinc-500"
                              : "text-zinc-200"
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>
                      {task.time && (
                        <span className="font-mono text-[10px] text-moo-accent shrink-0">
                          {task.time}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="p-3.5 flex flex-col justify-between space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Flame className="h-3.5 w-3.5 text-moo-accent" />
                    Hábitos de hoy
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={openCreateHabitModal}
                      className="text-[11px] font-medium text-moo-accent hover:underline"
                    >
                      + Nuevo
                    </button>
                    <button
                      type="button"
                      onClick={() => onSectionChange("habits")}
                      className="text-[11px] text-zinc-400 hover:text-white"
                    >
                      Ver todo
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {habits.slice(0, 3).map((habit) => (
                    <button
                      key={habit.id}
                      type="button"
                      onClick={() => onToggleHabit(habit.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-800/70 bg-zinc-950/60 px-3 py-2 text-left transition hover:border-moo-accent/50"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors ${
                            habit.completedToday
                              ? "border-moo-accent bg-moo-accent text-zinc-950"
                              : "border-zinc-700"
                          }`}
                        >
                          {habit.completedToday && (
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          )}
                        </span>
                        <span
                          className={`text-xs ${
                            habit.completedToday
                              ? "text-zinc-400 line-through"
                              : "text-zinc-200"
                          }`}
                        >
                          {habit.name}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-moo-accent">
                        {habit.streak}d
                      </span>
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* SECCIÓN 1.B: MENSAJES (Solo se abre al enviar un mensaje o audio; NO está en el Sidebar y NO se guarda) */}
        {activeSection === "chat" && (
          <div className="flex flex-1 flex-col overflow-hidden p-6">
            {/* Cabecera de la sección oculta de Mensajes */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3.5">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onSectionChange("home")}
                  title="Volver a Inicio"
                >
                  <ChevronLeft className="h-3.5 w-3.5 text-moo-accent" />
                </Button>
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-white">
                    Conversación con <span className="font-display font-light">Moo</span>
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    Tu audio se transcribe como mensaje para que veas qué
                    entendió Moo.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onClearMessages?.()}
                    title="Limpiar mensajes de la pantalla"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Limpiar</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Lista de mensajes en memoria */}
            <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-3 moo-scrollbar">
              {messages.length === 0 &&
              !isSimulatingReply &&
              !isTranscribingAudio ? (
                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-950/40 p-6 text-center">
                  <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-moo-accent/30 bg-moo-accent/10 text-moo-accent">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-semibold text-white">
                    Sin mensajes activos
                  </p>
                  <p className="mt-1 max-w-sm text-[11px] text-zinc-400 leading-relaxed">
                    Habla por el micrófono o escribe abajo. Lo que digas por voz
                    aparecerá transcripto como un mensaje tuyo antes de que Moo
                    actúe.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.role === "user";
                  const hasBlockedOnly =
                    msg.blockedActions &&
                    msg.blockedActions.length > 0 &&
                    (!msg.executedActions || msg.executedActions.length === 0);

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${
                        isUser ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      {!isUser && (
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-moo-accent">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}

                      <div
                        className={`flex max-w-[82%] flex-col ${
                          isUser ? "items-end" : "items-start"
                        }`}
                      >
                        {isUser && msg.isVoice && (
                          <div className="mb-1 flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md border border-moo-accent/30 bg-moo-accent/10 px-2 py-0.5 font-mono text-[10px] text-moo-accent">
                              <Mic className="h-2.5 w-2.5" />
                              Transcripción de tu audio
                            </span>
                            <button
                              type="button"
                              onClick={() => setMessageInput(msg.content)}
                              className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:border-moo-accent/50 hover:text-white transition"
                              title="Editar transcripción y reenviar"
                            >
                              <Pencil className="h-2.5 w-2.5" />
                              <span>Corregir</span>
                            </button>
                          </div>
                        )}

                        <div
                          className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                            isUser
                              ? "rounded-br-sm bg-moo-accent text-zinc-950 font-semibold"
                              : hasBlockedOnly
                              ? "rounded-bl-sm border border-red-500/40 bg-red-500/10 text-red-100"
                              : "rounded-bl-sm border border-zinc-800 bg-zinc-900/90 text-zinc-100"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {isUser && msg.isVoice && (
                              <Mic className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-900" />
                            )}
                            {!isUser && hasBlockedOnly && (
                              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                            )}
                            <p>{msg.content}</p>
                          </div>

                          {/* Acciones ejecutadas por Moo */}
                          {!isUser &&
                            msg.executedActions &&
                            msg.executedActions.length > 0 && (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-zinc-800/80 pt-2">
                                {msg.executedActions.map((act) => (
                                  <span
                                    key={act.id}
                                    className="inline-flex items-center gap-1 rounded-lg border border-moo-accent/40 bg-zinc-950/90 px-2 py-0.5 text-[10px] font-medium text-moo-accent"
                                  >
                                    <Check className="h-3 w-3" />
                                    <span>{act.summary}</span>
                                  </span>
                                ))}
                              </div>
                            )}

                          {/* Acciones bloqueadas por el Sandbox */}
                          {!isUser &&
                            msg.blockedActions &&
                            msg.blockedActions.length > 0 && (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-red-500/25 pt-2">
                                {msg.blockedActions.map((blk) => (
                                  <span
                                    key={blk.id}
                                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-zinc-950/90 px-2 py-0.5 text-[10px] font-medium text-red-300"
                                  >
                                    <Lock className="h-2.5 w-2.5" />
                                    <span>Bloqueado sin permiso</span>
                                  </span>
                                ))}
                              </div>
                            )}
                        </div>

                        <span className="mt-1 px-1 text-[10px] text-zinc-500">
                          {isUser
                            ? msg.isVoice
                              ? "Tú (Audio transcripto)"
                              : "Tú"
                            : <span className="font-display">Moo</span>}{" "}
                          · {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {isTranscribingAudio && (
                <div className="flex flex-row-reverse items-center gap-2.5">
                  <div className="rounded-2xl rounded-br-sm border border-moo-accent/50 bg-moo-accent/15 px-3.5 py-2 text-xs text-moo-accent">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <Mic className="h-3.5 w-3.5 animate-pulse" />
                      {transcribingStatus ||
                        "Transcribiendo tu audio a texto..."}
                    </span>
                  </div>
                </div>
              )}

              {isSimulatingReply && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-moo-accent/40 bg-moo-accent/10 text-moo-accent">
                    <Bot className="h-4 w-4 animate-pulse" />
                  </div>
                  <div className="rounded-2xl rounded-bl-sm border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-xs text-zinc-300">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 animate-ping rounded-full bg-moo-accent" />
                      Moo está procesando tu mensaje...
                    </span>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Composer inferior dentro de la sección Mensajes */}
            <div className="border-t border-zinc-800/80 pt-3 space-y-2">
              {voiceError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-200">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-red-400" />
                  <span>{voiceError}</span>
                </div>
              )}

              <form
                onSubmit={handleMessageSubmit}
                className="flex items-center gap-2"
              >
                <Input
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    onUserTyping?.();
                  }}
                  disabled={isTranscribingAudio}
                  placeholder={
                    isTranscribingAudio
                      ? transcribingStatus || "Transcribiendo tu audio..."
                      : isRecording
                      ? interimTranscript
                        ? `Transcribiendo: "${interimTranscript}"...`
                        : "Escuchando micrófono... habla y pulsa detener"
                      : "Escribe o habla por micrófono (solo recordatorios, tareas y hábitos)..."
                  }
                  className={`h-10 bg-zinc-900/90 border-zinc-800 focus-visible:border-moo-accent ${
                    isRecording || isTranscribingAudio
                      ? "border-moo-accent/70 ring-1 ring-moo-accent/30"
                      : ""
                  }`}
                />
                <Button
                  type="button"
                  variant={isRecording ? "primary" : "secondary"}
                  size="icon"
                  disabled={isTranscribingAudio}
                  onClick={handleMicButtonClick}
                  title={
                    !microphoneAllowed
                      ? "Micrófono desactivado en Ajustes"
                      : isRecording
                      ? "Detener grabación y enviar"
                      : "Hablar por micrófono"
                  }
                  className={`h-10 w-10 shrink-0 ${
                    isRecording ? "animate-pulse" : ""
                  }`}
                >
                  {!microphoneAllowed || permissionState === "denied" ? (
                    <MicOff className="h-4 w-4 text-red-400" />
                  ) : isRecording ? (
                    <Square className="h-3.5 w-3.5 fill-zinc-950 text-zinc-950" />
                  ) : (
                    <Mic className="h-4 w-4 text-moo-accent" />
                  )}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="icon"
                  disabled={!messageInput.trim() || isSimulatingReply}
                  title="Enviar mensaje"
                  className="h-10 w-10 shrink-0"
                >
                  <SendHorizontal className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* SECCIÓN 2: CALENDARIO Y RECORDATORIOS */}
        {activeSection === "calendar" && (
          <div className="flex flex-1 flex-col overflow-y-auto p-6 space-y-4 moo-scrollbar">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Calendario y recordatorios
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Selecciona un día para ver o programar tus recordatorios.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => openCreateReminderModal(selectedDateIso)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nuevo recordatorio</span>
              </Button>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-12">
              {/* Grilla mensual del Calendario */}
              <Card className="p-4 sm:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      {MONTH_NAMES[calendarMonth.month]} {calendarMonth.year}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          setCalendarMonth({
                            year: now.getFullYear(),
                            month: now.getMonth(),
                          });
                          setSelectedDateIso(todayIso);
                        }}
                        className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-medium text-zinc-300 hover:border-moo-accent/50 hover:text-white"
                      >
                        Hoy
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCalendarMonth((prev) =>
                            prev.month === 0
                              ? { year: prev.year - 1, month: 11 }
                              : { year: prev.year, month: prev.month - 1 }
                          )
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-moo-accent/50 hover:text-white"
                        aria-label="Mes anterior"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCalendarMonth((prev) =>
                            prev.month === 11
                              ? { year: prev.year + 1, month: 0 }
                              : { year: prev.year, month: prev.month + 1 }
                          )
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-moo-accent/50 hover:text-white"
                        aria-label="Mes siguiente"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Cabecera días de la semana */}
                  <div className="mb-1.5 grid grid-cols-7 text-center text-[10px] font-medium text-zinc-500">
                    {WEEKDAYS.map((wd) => (
                      <div key={wd} className="py-1">
                        {wd}
                      </div>
                    ))}
                  </div>

                  {/* Celdas de días */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((cell, idx) => {
                      if (!cell.iso || !cell.dayNumber) {
                        return <div key={`empty-${idx}`} className="h-9" />;
                      }

                      const isSelected = cell.iso === selectedDateIso;
                      const isToday = cell.iso === todayIso;
                      const dayReminders = remindersByDate[cell.iso] ?? [];
                      const hasReminders = dayReminders.length > 0;

                      return (
                        <button
                          key={cell.iso}
                          type="button"
                          onClick={() => setSelectedDateIso(cell.iso!)}
                          onDoubleClick={() =>
                            openCreateReminderModal(cell.iso!)
                          }
                          className={`relative flex h-9 flex-col items-center justify-center rounded-xl border font-mono text-xs transition ${
                            isSelected
                              ? "border-moo-accent bg-moo-accent text-zinc-950 font-bold shadow-[0_0_14px_-3px_var(--moo-accent)]"
                              : isToday
                              ? "border-moo-accent/50 bg-moo-accent/10 text-moo-accent font-semibold"
                              : "border-transparent bg-zinc-950/60 text-zinc-300 hover:border-zinc-800 hover:bg-zinc-900"
                          }`}
                        >
                          <span>{cell.dayNumber}</span>
                          {hasReminders && (
                            <span
                              className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                                isSelected ? "bg-zinc-950" : "bg-moo-accent"
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-zinc-800/70 pt-2.5 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-moo-accent" />
                    Días con recordatorios
                  </span>
                  <span>Doble clic en un día para agregar</span>
                </div>
              </Card>

              {/* Lista de recordatorios del día seleccionado */}
              <Card className="p-4 sm:col-span-5 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {formatReadableDate(selectedDateIso)}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {selectedDateReminders.length} recordatorio(s)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openCreateReminderModal(selectedDateIso)}
                      className="rounded-lg border border-moo-accent/40 bg-moo-accent/10 px-2.5 py-1 text-[11px] font-medium text-moo-accent hover:bg-moo-accent hover:text-zinc-950 transition"
                    >
                      + Agregar
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 moo-scrollbar">
                    {selectedDateReminders.length === 0 ? (
                      <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/80 p-4 text-center">
                        <Bell className="mb-1.5 h-4 w-4 text-zinc-500" />
                        <p className="text-xs text-zinc-400">
                          Sin recordatorios este día
                        </p>
                      </div>
                    ) : (
                      selectedDateReminders.map((rem) => (
                        <div
                          key={rem.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/70 px-3 py-2.5 hover:border-moo-accent/40"
                        >
                          <button
                            type="button"
                            onClick={() => onToggleReminder(rem.id)}
                            className="flex flex-1 items-center gap-2.5 text-left min-w-0"
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors ${
                                rem.done
                                  ? "border-moo-accent bg-moo-accent text-zinc-950"
                                  : "border-zinc-700"
                              }`}
                            >
                              {rem.done && (
                                <Check className="h-2.5 w-2.5 stroke-[3]" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <div
                                className={`truncate text-xs font-medium ${
                                  rem.done
                                    ? "line-through text-zinc-500"
                                    : "text-zinc-100"
                                }`}
                              >
                                {rem.title}
                              </div>
                              <div className="font-mono text-[10px] text-moo-accent">
                                {rem.time}
                              </div>
                            </div>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditReminderModal(rem)}
                              className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                              title="Modificar"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteReminder(rem.id)}
                              className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-3 border-t border-zinc-800/70 pt-2.5 text-[10px] text-zinc-500 flex items-center justify-between">
                  <span>Total agendados</span>
                  <span className="font-mono text-moo-accent">
                    {reminders.length} activos
                  </span>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* SECCIÓN 3: TAREAS */}
        {activeSection === "tasks" && (
          <div className="flex flex-1 flex-col overflow-y-auto p-6 space-y-4 moo-scrollbar">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Tareas y programación
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Organiza tus tareas diarias, semanales y mensuales.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/70 p-1">
                  {(["all", "daily", "weekly", "monthly"] as const).map(
                    (freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setTaskFilter(freq)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                          taskFilter === freq
                            ? "bg-moo-accent text-zinc-950 font-semibold"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {freq === "all" ? "Todas" : FREQUENCY_LABELS[freq]}
                      </button>
                    )
                  )}
                </div>

                <Button variant="primary" onClick={openCreateTaskModal}>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Nueva tarea</span>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <Card
                  key={task.id}
                  className="flex items-center justify-between gap-2 px-4 py-3 hover:border-moo-accent/40"
                >
                  <button
                    type="button"
                    onClick={() => onToggleTask(task.id)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        task.done
                          ? "border-moo-accent bg-moo-accent text-zinc-950"
                          : "border-zinc-700"
                      }`}
                    >
                      {task.done && <Check className="h-3 w-3 stroke-[3]" />}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        task.done
                          ? "line-through text-zinc-500"
                          : "text-zinc-100"
                      }`}
                    >
                      {task.title}
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    {task.time && (
                      <span className="font-mono text-xs text-moo-accent">
                        {task.time}
                      </span>
                    )}
                    <Badge variant="accent">
                      {FREQUENCY_LABELS[task.frequency]}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => openEditTaskModal(task)}
                      className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition"
                      title="Modificar tarea"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* SECCIÓN 4: HÁBITOS */}
        {activeSection === "habits" && (
          <div className="flex flex-1 flex-col overflow-y-auto p-6 space-y-4 moo-scrollbar">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Hábitos
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  La categoría de cada hábito impulsa automáticamente su logro.
                </p>
              </div>
              <Button variant="primary" onClick={openCreateHabitModal}>
                <Plus className="h-3.5 w-3.5" />
                <span>Crear hábito</span>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_HABIT_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const exists = habits.some(
                  (h) => h.name.toLowerCase() === preset.name.toLowerCase()
                );
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      if (!exists) {
                        onAddHabit(preset.name, preset.category);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs transition ${
                      exists
                        ? "border-zinc-800/60 bg-zinc-900/30 text-zinc-500"
                        : "border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-moo-accent/50 hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 text-moo-accent" />
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {habits.map((habit) => {
                const normCat = normalizeHabitCategory(
                  habit.category,
                  habit.name
                );
                return (
                  <Card
                    key={habit.id}
                    className="flex items-center justify-between p-3.5 hover:border-moo-accent/40"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleHabit(habit.id)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                          habit.completedToday
                            ? "border-moo-accent bg-moo-accent text-zinc-950"
                            : "border-zinc-700 bg-zinc-950"
                        }`}
                      >
                        {habit.completedToday && (
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        )}
                      </span>
                      <div>
                        <div className="text-xs font-medium text-white">
                          {habit.name}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {normCat}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <Badge variant="accent" className="font-mono">
                        {habit.streak} días
                      </Badge>
                      <button
                        type="button"
                        onClick={() => openEditHabitModal(habit)}
                        className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition"
                        title="Modificar hábito"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteHabit(habit.id)}
                        className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition"
                        title="Eliminar hábito"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* SECCIÓN 5: LOGROS (Cards más chicas, menos texto, 1 por fila horizontal, figura grande protagonista) */}
        {activeSection === "universe" && (
          <div className="flex flex-1 flex-col overflow-y-auto p-6 space-y-3.5 moo-scrollbar">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Logros
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Evolucionan automáticamente al cumplir hábitos de cada
                  categoría.
                </p>
              </div>
              <Badge variant="accent" className="font-mono px-2.5 py-0.5">
                {completedHabitsCount}/{habits.length} hoy
              </Badge>
            </div>

            {/* 1 Card Horizontal compacta por fila, donde la figura es lo más grande */}
            <div className="flex flex-col gap-2.5">
              {UNIVERSE_ACHIEVEMENTS.map((item) => {
                const categoryHabits = habits.filter(
                  (h) =>
                    normalizeHabitCategory(h.category, h.name) === item.category
                );
                const completedInCat = categoryHabits.filter(
                  (h) => h.completedToday
                ).length;
                const totalInCat = categoryHabits.length;
                const isActiveToday = totalInCat > 0 && completedInCat > 0;
                const maxStreakInCat = categoryHabits.reduce(
                  (max, h) => Math.max(max, h.streak),
                  0
                );
                const level =
                  maxStreakInCat >= 5 ? 3 : maxStreakInCat >= 2 ? 2 : 1;
                const progressPct =
                  totalInCat > 0
                    ? Math.round((completedInCat / totalInCat) * 100)
                    : 0;

                return (
                  <Card
                    key={item.kind}
                    className={`flex items-center gap-4 px-3.5 py-2.5 transition-all ${
                      isActiveToday
                        ? "border-moo-accent/45 bg-zinc-900/75"
                        : "border-zinc-800/80 bg-zinc-900/40"
                    }`}
                  >
                    {/* Figura protagonista grande (80x80 px) */}
                    <HabitLoreArt
                      kind={item.kind}
                      completedToday={isActiveToday}
                      streak={maxStreakInCat || 1}
                      size="lg"
                    />

                    {/* Texto horizontal conciso a la derecha */}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className="truncate text-sm font-bold text-white">
                            {item.title}
                          </h3>
                          <Badge variant="default">{item.category}</Badge>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="accent" className="font-mono">
                            Nv. {level}
                          </Badge>
                          {maxStreakInCat > 0 && (
                            <span className="font-mono text-[10px] text-moo-accent">
                              {maxStreakInCat}d
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="truncate text-xs text-zinc-400">
                        {item.shortDesc}
                      </p>

                      {/* Barra de progreso compacta de la categoría */}
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-moo-accent transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-zinc-400 shrink-0">
                          {completedInCat}/{totalInCat} hábitos
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* SECCIÓN 6: AJUSTES */}
        {activeSection === "settings" && <SettingsPanel />}
      </div>

      {/* MODAL PARA CREAR / EDITAR RECORDATORIO DE CALENDARIO */}
      <ModalDialog
        open={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        title={
          editingReminderId ? "Modificar recordatorio" : "Nuevo recordatorio"
        }
        description="Programa un recordatorio en el calendario de Moo."
      >
        <form onSubmit={handleReminderModalSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Recordatorio
            </label>
            <Input
              value={modalReminderTitle}
              onChange={(e) => {
                setModalReminderTitle(e.target.value);
                onUserTyping?.();
              }}
              placeholder="Ej. Reunión de equipo, Llamar al médico..."
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Fecha</label>
              <DatePickerPopover
                value={modalReminderDate}
                onChange={setModalReminderDate}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Hora</label>
              <TimePickerPopover
                value={modalReminderTime}
                onChange={setModalReminderTime}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setReminderModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!modalReminderTitle.trim()}
            >
              {editingReminderId ? "Guardar cambios" : "Agendar"}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL PARA CREAR / EDITAR TAREA */}
      <ModalDialog
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title={editingTaskId ? "Modificar tarea" : "Nueva tarea"}
        description="Define el nombre, la frecuencia y la hora programada."
      >
        <form onSubmit={handleTaskModalSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Título de la tarea
            </label>
            <Input
              value={modalTaskTitle}
              onChange={(e) => {
                setModalTaskTitle(e.target.value);
                onUserTyping?.();
              }}
              placeholder="Ej. Revisar pendientes, Estudiar inglés..."
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Frecuencia
              </label>
              <SelectPopover<TaskFrequency>
                value={modalTaskFreq}
                onChange={setModalTaskFreq}
                options={[
                  { value: "daily", label: "Diaria" },
                  { value: "weekly", label: "Semanal" },
                  { value: "monthly", label: "Mensual" },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Horario / Alarma
              </label>
              <TimePickerPopover
                value={modalTaskTime}
                onChange={setModalTaskTime}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setTaskModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!modalTaskTitle.trim()}
            >
              {editingTaskId ? "Guardar cambios" : "Crear tarea"}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL PARA CREAR / EDITAR HÁBITO */}
      <ModalDialog
        open={habitModalOpen}
        onClose={() => setHabitModalOpen(false)}
        title={editingHabitId ? "Modificar hábito" : "Crear hábito"}
        description="Elige el nombre y la categoría."
      >
        <form onSubmit={handleHabitModalSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Nombre del hábito
            </label>
            <Input
              value={modalHabitName}
              onChange={(e) => {
                const val = e.target.value;
                setModalHabitName(val);
                setModalHabitCategory(
                  normalizeHabitCategory(modalHabitCategory, val)
                );
                onUserTyping?.();
              }}
              placeholder="Ej. Tomar agua, Correr, Leer 20 min, Meditar..."
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Categoría
            </label>
            <SelectPopover<HabitCategory>
              value={modalHabitCategory}
              onChange={setModalHabitCategory}
              options={HABIT_CATEGORIES.map((c) => ({
                value: c.value,
                label: c.label,
              }))}
            />
            <p className="pt-1 text-[11px] text-zinc-400">
              Impulsa el logro:{" "}
              <span className="font-semibold text-moo-accent">
                {selectedCategoryMeta.achievementTitle}
              </span>
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setHabitModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!modalHabitName.trim()}
            >
              {editingHabitId ? "Guardar cambios" : "Crear hábito"}
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
