import {
  categoryToLoreKind,
  normalizeHabitCategory,
} from "@/features/mascot/components/habit-lore-art";
import { formatIsoDate } from "./db";
import type {
  AgentBlockedAction,
  AgentConfigPayload,
  AgentExecutedAction,
  AgentMessageRequest,
  AgentMessageResponse,
  AgentStatus,
} from "@/types/agent-contract";
import type {
  CalendarReminder,
  HabitItem,
  ScheduledTask,
  TaskFrequency,
} from "@/types";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000/api";

function normalizeText(str = ""): string {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function findMatchingItem<T extends { id: string }>(
  items: T[],
  query: string,
  field: keyof T
): T | null {
  if (!query) return null;
  const qNorm = normalizeText(query);
  if (!qNorm) return null;

  const byId = items.find((item) => normalizeText(item.id) === qNorm);
  if (byId) return byId;

  const exact = items.find(
    (item) => normalizeText(String(item[field] || "")) === qNorm
  );
  if (exact) return exact;

  const partial = items.find((item) => {
    const val = normalizeText(String(item[field] || ""));
    return val.includes(qNorm) || qNorm.includes(val);
  });
  if (partial) return partial;

  const tokens = qNorm.split(/\s+/).filter((t) => t.length > 2);
  if (tokens.length > 0) {
    let best: T | null = null;
    let bestScore = 0;
    for (const item of items) {
      const val = normalizeText(String(item[field] || ""));
      let score = 0;
      for (const tok of tokens) {
        if (val.includes(tok)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    if (bestScore > 0) return best;
  }

  return null;
}

const SPANISH_MONTHS_MAP: Record<string, string> = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  setiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
};

const SPANISH_WEEKDAYS_MAP: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

function parseRelativeDateFromText(text: string): string {
  const norm = normalizeText(text);
  const today = new Date();

  if (norm.includes("pasado manana")) {
    const d = new Date(today);
    d.setDate(today.getDate() + 2);
    return formatIsoDate(d);
  }
  if (norm.includes("manana")) {
    const d = new Date(today);
    d.setDate(today.getDate() + 1);
    return formatIsoDate(d);
  }

  // Fecha hablada en español: "el 6 de febrero de 2017", "15 de marzo"
  const spokenDateMatch = norm.match(
    /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+(?:de|del)\s+(\d{4}))?\b/
  );
  if (spokenDateMatch) {
    const day = String(spokenDateMatch[1]).padStart(2, "0");
    const month = SPANISH_MONTHS_MAP[spokenDateMatch[2]] || "01";
    const year = spokenDateMatch[3] || String(today.getFullYear());
    return `${year}-${month}-${day}`;
  }

  const isoMatch = text.match(/\b((?:19|20)\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  const dmMatch = text.match(
    /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-]((?:19|20)\d{2}))?\b/
  );
  if (dmMatch) {
    const day = String(dmMatch[1]).padStart(2, "0");
    const month = String(dmMatch[2]).padStart(2, "0");
    const year = dmMatch[3] || String(today.getFullYear());
    return `${year}-${month}-${day}`;
  }

  const inDaysMatch = norm.match(/\ben\s+(\d+)\s+dias?\b/);
  if (inDaysMatch) {
    const d = new Date(today);
    d.setDate(today.getDate() + Number(inDaysMatch[1]));
    return formatIsoDate(d);
  }

  const weekdayMatch = norm.match(
    /\b(?:el|para\s+el|este|proximo)\s+(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/
  );
  if (weekdayMatch) {
    const targetDay = SPANISH_WEEKDAYS_MAP[weekdayMatch[1]];
    if (targetDay !== undefined) {
      const d = new Date(today);
      const currentDay = d.getDay();
      let diff = (targetDay - currentDay + 7) % 7;
      if (diff === 0) diff = 7;
      d.setDate(d.getDate() + diff);
      return formatIsoDate(d);
    }
  }

  return formatIsoDate(today);
}

function parseTimeFromText(text: string, fallback = "09:00"): string {
  const norm = normalizeText(text);

  const hhmm = norm.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (hhmm) {
    let h = Number(hhmm[1]);
    const m = hhmm[2];
    if ((norm.includes("de la tarde") || norm.includes("pm")) && h < 12) {
      h += 12;
    }
    return `${String(h).padStart(2, "0")}:${m}`;
  }

  const atHour = norm.match(
    /\ba\s+las?\s+(\d{1,2})(?:\s*y\s*(media|cuarto))?(?:\s*(am|pm|de la manana|de la tarde|de la noche|hs|horas))?\b/
  );
  if (atHour) {
    let h = Number(atHour[1]);
    let m = "00";
    if (atHour[2] === "media") m = "30";
    if (atHour[2] === "cuarto") m = "15";
    const period = atHour[3] || "";
    if (
      (period === "pm" ||
        period === "de la tarde" ||
        period === "de la noche") &&
      h < 12
    ) {
      h += 12;
    } else if ((period === "am" || period === "de la manana") && h === 12) {
      h = 0;
    }
    if (h >= 0 && h <= 23) {
      return `${String(h).padStart(2, "0")}:${m}`;
    }
  }

  return fallback;
}

function parseFrequencyFromText(
  text: string,
  fallback: TaskFrequency = "daily"
): TaskFrequency {
  const norm = normalizeText(text);
  if (norm.includes("semanal") || norm.includes("cada semana")) return "weekly";
  if (norm.includes("mensual") || norm.includes("cada mes")) return "monthly";
  return fallback;
}

function cleanExtractedTitle(raw = ""): string {
  return raw
    .replace(
      /\b((?:para\s+el\s+|el\s+|para\s+)?\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+(?:de|del)\s+\d{4})?)\b/gi,
      " "
    )
    .replace(
      /\b((?:para\s+el\s+|el\s+|este\s+|pr[oó]ximo\s+)(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo))\b/gi,
      " "
    )
    .replace(
      /\b(para\s+pasado\s+ma[ñn]ana|para\s+ma[ñn]ana|para\s+hoy|pasado\s+ma[ñn]ana|ma[ñn]ana|hoy|en\s+\d+\s+d[ií]as?|(?:para\s+el\s+|el\s+)?\d{1,2}[\/\-]\d{1,2}(?:[\/\-](?:19|20)\d{2})?|(?:19|20)\d{2}-\d{2}-\d{2}|a\s+las?\s+\d{1,2}(?::\d{2})?(?:\s*y\s*(?:media|cuarto))?(?:\s*(?:am|pm|hs|horas|de\s+la\s+tarde|de\s+la\s+ma[ñn]ana|de\s+la\s+noche))?|diaria|diario|semanal|mensual|por\s+favor|gracias)\b/gi,
      " "
    )
    .replace(
      /^(?:que\s+se\s+llam[ea]|se\s+llam[ea]|llamad[oa]|con\s+(?:el\s+)?nombre|de\s+nombre|ponele\s+(?:de\s+|el\s+)?nombre|ponle\s+(?:de\s+|el\s+)?nombre|ponerle\s+(?:de\s+|el\s+)?nombre|ponele|ponle|ponerle|que\s+diga|que\s+dice|sobre|para|de|que)\s+/i,
      ""
    )
    .replace(/\s+(?:y|e|o|con|para|de|a|el|la|los|las)$/i, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s:.,;-]+|[\s:.,;-]+$/g, "")
    .replace(/^["'«»]+|["'«»]+$/g, "")
    .trim();
}

function extractEntityName(
  transcript = "",
  domain: "reminder" | "task" | "habit" = "reminder"
): string {
  const text = String(transcript || "").trim();
  if (!text) return "";

  const quotedMatch = text.match(/["«]([^"»]{1,80})["»]/);
  if (quotedMatch && quotedMatch[1]) {
    const cleaned = cleanExtractedTitle(quotedMatch[1]);
    if (cleaned) return cleaned;
  }

  const explicitNamingPatterns = [
    /\b(?:que\s+se\s+llam[ea]|se\s+llam[ea]|llamad[oa]|ponele\s+(?:el\s+|de\s+)?nombre|ponle\s+(?:el\s+|de\s+)?nombre|ponerle\s+(?:el\s+|de\s+)?nombre|con\s+(?:el\s+)?nombre|de\s+nombre|que\s+dig[ae]|que\s+dice)\s+(.+)$/i,
    /\b(?:ponele|ponle|ponerle)\s+(?!un\s+recordatorio|una\s+tarea|un\s+h[aá]bito)(.+)$/i,
  ];

  for (const pattern of explicitNamingPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].split(
        /\b(?:para\s+hoy|para\s+ma[ñn]ana|para\s+pasado\s+ma[ñn]ana|(?:para\s+el\s+|el\s+)\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)|a\s+las?\s+\d{1,2})\b/i
      )[0];
      const cleaned = cleanExtractedTitle(candidate);
      if (cleaned) return cleaned;
    }
  }

  const withoutDates = cleanExtractedTitle(text);

  if (domain === "habit") {
    const stripped = withoutDates
      .replace(
        /^.*?\b(?:crea(?:r)?|agrega(?:r)?|a[ñn]ade|a[ñn]adir|nuevo|nueva|empezar\s+a|hacer)?\s*(?:un\s+|el\s+)?h[aá]bito\s*(?:de|para|que\s+sea|:)?\s*/i,
        ""
      )
      .trim();
    return cleanExtractedTitle(stripped || withoutDates) || "Nuevo hábito";
  }

  if (domain === "task") {
    const stripped = withoutDates
      .replace(
        /^.*?\b(?:crea(?:r)?|agrega(?:r)?|a[ñn]ade|a[ñn]adir|nueva|nuevo|anota(?:r)?|pon(?:er)?|programa(?:r)?)\s*(?:una\s+|la\s+)?(?:tarea|pendiente)?\s*(?:de|para|que\s+sea|:)?\s*/i,
        ""
      )
      .trim();
    return cleanExtractedTitle(stripped || withoutDates) || "Nueva tarea";
  }

  const stripped = withoutDates
    .replace(
      /^.*?\b(?:crea(?:r)?|agrega(?:r)?|a[ñn]ade|a[ñn]adir|nuevo|pon(?:er)?|agenda(?:r)?|programa(?:r)?)?\s*(?:un\s+|el\s+)?(?:recordatorio\s*(?:de|para|sobre|que\s+sea|que|:)?|recu[eé]rdame\s*(?:de|que)?|recordarme\s*(?:de|que)?|av[ií]same\s*(?:de|que)?)\s*/i,
      ""
    )
    .trim();

  return cleanExtractedTitle(stripped || withoutDates) || "Nuevo recordatorio";
}

/**
 * Ejecutor local en memoria con las mismas restricciones de seguridad estrictas
 * para cuando el backend HTTP no esté activo (por ejemplo, build estático puro).
 */
export function executeClientSideGuardedAgent(
  transcript: string,
  currentState: {
    tasks: ScheduledTask[];
    habits: HabitItem[];
    reminders: CalendarReminder[];
  }
): AgentMessageResponse {
  const norm = normalizeText(transcript);
  const nowStr = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const nextTasks = [...currentState.tasks];
  const nextHabits = [...currentState.habits];
  const nextReminders = [...currentState.reminders];
  const executedActions: AgentExecutedAction[] = [];
  const blockedActions: AgentBlockedAction[] = [];

  // 1. Bloquear ELIMINAR / BORRAR
  if (
    /\b(elimina|eliminar|borra|borrar|quita|quitar|suprime|suprimir|destruye|limpia)\b/.test(
      norm
    )
  ) {
    const reason =
      "Permiso denegado: Moo no puede eliminar ni borrar elementos. Solo tiene permiso para crear, modificar y completar recordatorios, tareas y hábitos.";
    blockedActions.push({
      id: `blk-${Date.now()}`,
      requestedIntent: transcript,
      reason,
      domain: "delete",
      requiresPermission: true,
      timestamp: nowStr,
    });
    return {
      id: `agent-${Date.now()}`,
      transcript,
      reply: reason,
      provider: "Moo Guard Sandbox",
      model: "moo-local-guard-v1",
      executedActions,
      blockedActions,
      state: { tasks: nextTasks, habits: nextHabits, reminders: nextReminders },
    };
  }

  // 2. Bloquear acciones fuera de la aplicación
  if (
    /\b(abre|abrir|ejecuta|ejecutar|instala|instalar|descarga|descargar|envia|enviar\s+correo|email|whatsapp|navegador|chrome|terminal|powershell|cmd|archivo|carpeta|sistema|apaga|reinicia|busca\s+en\s+internet|google)\b/.test(
      norm
    )
  ) {
    const reason =
      "Acción bloqueada por Sandbox: Moo no tiene permiso para operar fuera de la aplicación. Solo puede crear, modificar y completar recordatorios, tareas y hábitos.";
    blockedActions.push({
      id: `blk-${Date.now()}`,
      requestedIntent: transcript,
      reason,
      domain: "external-system",
      requiresPermission: true,
      timestamp: nowStr,
    });
    return {
      id: `agent-${Date.now()}`,
      transcript,
      reply: reason,
      provider: "Moo Guard Sandbox",
      model: "moo-local-guard-v1",
      executedActions,
      blockedActions,
      state: { tasks: nextTasks, habits: nextHabits, reminders: nextReminders },
    };
  }

  // 3. COMPLETAR
  if (
    /\b(completa|completar|complete|marca\s+como\s+(hecho|hecha|completad[oa]s?|list[oa]s?)|ya\s+(hice|tome|lei|corri|estudie|entrene|termine|cumpli)|termine|finalice|cumpli)\b/.test(
      norm
    )
  ) {
    const isBulkAll =
      /\b(todos|todas|todo|mis\s+habitos|los\s+habitos|las\s+tareas|mis\s+tareas|los\s+recordatorios|mis\s+recordatorios)\b/.test(
        norm
      );

    if (isBulkAll && norm.includes("habito")) {
      const pending = nextHabits.filter((h) => !h.completedToday);
      const count = pending.length > 0 ? pending.length : nextHabits.length;

      for (let i = 0; i < nextHabits.length; i++) {
        const h = nextHabits[i];
        const nextStreak = h.completedToday ? h.streak : h.streak + 1;
        nextHabits[i] = {
          ...h,
          completedToday: true,
          streak: nextStreak,
        };
      }

      const summary = `Todos los hábitos completados hoy (${count})`;
      executedActions.push({
        id: `act-${Date.now()}`,
        domain: "habit",
        action: "complete",
        targetId: "all-habits",
        title: `Todos los hábitos (${count})`,
        summary,
        timestamp: nowStr,
      });

      return {
        id: `agent-${Date.now()}`,
        transcript,
        reply: `¡Increíble! He marcado todos tus hábitos de hoy (${count}) como completados.`,
        provider: "Moo Guard Engine",
        model: "moo-local-guard-v1",
        executedActions,
        blockedActions,
        state: {
          tasks: nextTasks,
          habits: nextHabits,
          reminders: nextReminders,
        },
      };
    }

    if (isBulkAll && norm.includes("tarea")) {
      const pending = nextTasks.filter((t) => !t.done);
      const count = pending.length > 0 ? pending.length : nextTasks.length;

      for (let i = 0; i < nextTasks.length; i++) {
        nextTasks[i] = { ...nextTasks[i], done: true };
      }

      const summary = `Todas las tareas completadas (${count})`;
      executedActions.push({
        id: `act-${Date.now()}`,
        domain: "task",
        action: "complete",
        targetId: "all-tasks",
        title: `Todas las tareas (${count})`,
        summary,
        timestamp: nowStr,
      });

      return {
        id: `agent-${Date.now()}`,
        transcript,
        reply: `¡Excelente! He marcado todas tus tareas (${count}) como completadas.`,
        provider: "Moo Guard Engine",
        model: "moo-local-guard-v1",
        executedActions,
        blockedActions,
        state: {
          tasks: nextTasks,
          habits: nextHabits,
          reminders: nextReminders,
        },
      };
    }

    if (isBulkAll && norm.includes("recordatorio")) {
      const pending = nextReminders.filter((r) => !r.done);
      const count = pending.length > 0 ? pending.length : nextReminders.length;

      for (let i = 0; i < nextReminders.length; i++) {
        nextReminders[i] = { ...nextReminders[i], done: true };
      }

      const summary = `Todos los recordatorios completados (${count})`;
      executedActions.push({
        id: `act-${Date.now()}`,
        domain: "reminder",
        action: "complete",
        targetId: "all-reminders",
        title: `Todos los recordatorios (${count})`,
        summary,
        timestamp: nowStr,
      });

      return {
        id: `agent-${Date.now()}`,
        transcript,
        reply: `Listo, marqué todos tus recordatorios (${count}) como completados.`,
        provider: "Moo Guard Engine",
        model: "moo-local-guard-v1",
        executedActions,
        blockedActions,
        state: {
          tasks: nextTasks,
          habits: nextHabits,
          reminders: nextReminders,
        },
      };
    }

    const cleaned = transcript
      .replace(
        /\b(por favor|moo|completa|completar|marca como completad[oa]s?|marca como hech[oa]s?|marca|ya hice|ya tome|ya lei|ya corri|ya estudie|ya termine|termine|cumpli|el habito|los habitos|la tarea|las tareas|el recordatorio|los recordatorios|de|hoy)\b/gi,
        " "
      )
      .trim();

    const habitMatch =
      !norm.includes("tarea") && !norm.includes("recordatorio")
        ? findMatchingItem(nextHabits, cleaned || transcript, "name")
        : null;

    if (habitMatch) {
      const idx = nextHabits.findIndex((h) => h.id === habitMatch.id);
      const nextStreak = habitMatch.completedToday
        ? habitMatch.streak
        : habitMatch.streak + 1;
      nextHabits[idx] = {
        ...habitMatch,
        completedToday: true,
        streak: nextStreak,
      };
      const summary = `Hábito completado hoy: «${habitMatch.name}» (racha: ${nextStreak}d)`;
      executedActions.push({
        id: `act-${Date.now()}`,
        domain: "habit",
        action: "complete",
        targetId: habitMatch.id,
        title: habitMatch.name,
        summary,
        timestamp: nowStr,
      });
      return {
        id: `agent-${Date.now()}`,
        transcript,
        reply: `¡Excelente! Marqué el hábito «${habitMatch.name}» como completado hoy.`,
        provider: "Moo Guard Engine",
        model: "moo-local-guard-v1",
        executedActions,
        blockedActions,
        state: {
          tasks: nextTasks,
          habits: nextHabits,
          reminders: nextReminders,
        },
      };
    }

    const taskMatch = !norm.includes("recordatorio")
      ? findMatchingItem(nextTasks, cleaned || transcript, "title")
      : null;

    if (taskMatch) {
      const idx = nextTasks.findIndex((t) => t.id === taskMatch.id);
      nextTasks[idx] = { ...taskMatch, done: true };
      const summary = `Tarea completada: «${taskMatch.title}»`;
      executedActions.push({
        id: `act-${Date.now()}`,
        domain: "task",
        action: "complete",
        targetId: taskMatch.id,
        title: taskMatch.title,
        summary,
        timestamp: nowStr,
      });
      return {
        id: `agent-${Date.now()}`,
        transcript,
        reply: `Listo, completé la tarea «${taskMatch.title}».`,
        provider: "Moo Guard Engine",
        model: "moo-local-guard-v1",
        executedActions,
        blockedActions,
        state: {
          tasks: nextTasks,
          habits: nextHabits,
          reminders: nextReminders,
        },
      };
    }

    const remMatch = findMatchingItem(
      nextReminders,
      cleaned || transcript,
      "title"
    );
    if (remMatch) {
      const idx = nextReminders.findIndex((r) => r.id === remMatch.id);
      nextReminders[idx] = { ...remMatch, done: true };
      const summary = `Recordatorio completado: «${remMatch.title}»`;
      executedActions.push({
        id: `act-${Date.now()}`,
        domain: "reminder",
        action: "complete",
        targetId: remMatch.id,
        title: remMatch.title,
        summary,
        timestamp: nowStr,
      });
      return {
        id: `agent-${Date.now()}`,
        transcript,
        reply: `Marqué el recordatorio «${remMatch.title}» como completado.`,
        provider: "Moo Guard Engine",
        model: "moo-local-guard-v1",
        executedActions,
        blockedActions,
        state: {
          tasks: nextTasks,
          habits: nextHabits,
          reminders: nextReminders,
        },
      };
    }
  }

  // 4. MODIFICAR
  if (
    /\b(modifica|modificar|cambia|cambiar|edita|editar|mueve|mover|pospone|posponer|reprograma|reprogramar|renombra|renombrar|actualiza|actualizar)\b/.test(
      norm
    )
  ) {
    const newTime = parseTimeFromText(transcript, "");
    const hasDate =
      norm.includes("manana") ||
      norm.includes("hoy") ||
      /\b20\d{2}-\d{2}-\d{2}\b/.test(norm);
    const newDate = hasDate ? parseRelativeDateFromText(transcript) : undefined;

    const remMatch = findMatchingItem(nextReminders, transcript, "title");
    if (remMatch && !norm.includes("tarea") && !norm.includes("habito")) {
      const idx = nextReminders.findIndex((r) => r.id === remMatch.id);
      const updated: CalendarReminder = {
        ...remMatch,
        date: newDate || remMatch.date,
        time: newTime || remMatch.time,
      };
      nextReminders[idx] = updated;
      const summary = `Recordatorio modificado: «${updated.title}» (${updated.date} · ${updated.time})`;
      executedActions.push({
        id: `act-${Date.now()}`,
        domain: "reminder",
        action: "update",
        targetId: updated.id,
        title: updated.title,
        summary,
        timestamp: nowStr,
      });
      return {
        id: `agent-${Date.now()}`,
        transcript,
        reply: summary,
        provider: "Moo Guard Engine",
        model: "moo-local-guard-v1",
        executedActions,
        blockedActions,
        state: {
          tasks: nextTasks,
          habits: nextHabits,
          reminders: nextReminders,
        },
      };
    }

    const taskMatch = findMatchingItem(nextTasks, transcript, "title");
    if (taskMatch && !norm.includes("habito")) {
      const idx = nextTasks.findIndex((t) => t.id === taskMatch.id);
      const updated: ScheduledTask = {
        ...taskMatch,
        time: newTime || taskMatch.time,
        frequency: norm.includes("semanal")
          ? "weekly"
          : norm.includes("mensual")
          ? "monthly"
          : norm.includes("diaria")
          ? "daily"
          : taskMatch.frequency,
      };
      nextTasks[idx] = updated;
      const summary = `Tarea modificada: «${updated.title}» (${updated.time})`;
      executedActions.push({
        id: `act-${Date.now()}`,
        domain: "task",
        action: "update",
        targetId: updated.id,
        title: updated.title,
        summary,
        timestamp: nowStr,
      });
      return {
        id: `agent-${Date.now()}`,
        transcript,
        reply: summary,
        provider: "Moo Guard Engine",
        model: "moo-local-guard-v1",
        executedActions,
        blockedActions,
        state: {
          tasks: nextTasks,
          habits: nextHabits,
          reminders: nextReminders,
        },
      };
    }
  }

  // 5. CREAR HÁBITO
  if (/\b(habito)\b/.test(norm)) {
    const name = extractEntityName(transcript, "habit");
    const category = normalizeHabitCategory("", name);
    const item: HabitItem = {
      id: `h-${Date.now()}`,
      name,
      category,
      completedToday: false,
      streak: 1,
      loreKind: categoryToLoreKind(category, name),
    };
    nextHabits.push(item);
    const summary = `Hábito creado: «${name}» (${category})`;
    executedActions.push({
      id: `act-${Date.now()}`,
      domain: "habit",
      action: "create",
      targetId: item.id,
      title: item.name,
      summary,
      timestamp: nowStr,
    });
    return {
      id: `agent-${Date.now()}`,
      transcript,
      reply: `He creado el hábito «${name}» en la categoría ${category}.`,
      provider: "Moo Guard Engine",
      model: "moo-local-guard-v1",
      executedActions,
      blockedActions,
      state: { tasks: nextTasks, habits: nextHabits, reminders: nextReminders },
    };
  }

  // 6. CREAR RECORDATORIO
  if (
    /\b(recordatorio|recuerdame|recordarme|agenda|agendar|avisame)\b/.test(norm)
  ) {
    const title = extractEntityName(transcript, "reminder");
    const date = parseRelativeDateFromText(transcript);
    const time = parseTimeFromText(transcript, "10:00");
    const item: CalendarReminder = {
      id: `r-${Date.now()}`,
      title,
      date,
      time,
      done: false,
    };
    nextReminders.push(item);
    const summary = `Recordatorio creado: «${title}» (${date} · ${time})`;
    executedActions.push({
      id: `act-${Date.now()}`,
      domain: "reminder",
      action: "create",
      targetId: item.id,
      title: item.title,
      summary,
      timestamp: nowStr,
    });
    return {
      id: `agent-${Date.now()}`,
      transcript,
      reply: `Agendé el recordatorio «${title}» para el ${date} a las ${time}.`,
      provider: "Moo Guard Engine",
      model: "moo-local-guard-v1",
      executedActions,
      blockedActions,
      state: { tasks: nextTasks, habits: nextHabits, reminders: nextReminders },
    };
  }

  // 7. CREAR TAREA
  if (
    /\b(tarea|pendiente|programar|anota|anotar|crea|crear|agrega|agregar)\b/.test(
      norm
    )
  ) {
    const title = extractEntityName(transcript, "task");
    const frequency = parseFrequencyFromText(transcript, "daily");
    const time = parseTimeFromText(transcript, "09:00");
    const item: ScheduledTask = {
      id: `t-${Date.now()}`,
      title,
      frequency,
      time,
      done: false,
    };
    nextTasks.unshift(item);
    const summary = `Tarea creada: «${title}» (${time})`;
    executedActions.push({
      id: `act-${Date.now()}`,
      domain: "task",
      action: "create",
      targetId: item.id,
      title: item.title,
      summary,
      timestamp: nowStr,
    });
    return {
      id: `agent-${Date.now()}`,
      transcript,
      reply: `He creado la tarea «${title}» programada a las ${time}.`,
      provider: "Moo Guard Engine",
      model: "moo-local-guard-v1",
      executedActions,
      blockedActions,
      state: { tasks: nextTasks, habits: nextHabits, reminders: nextReminders },
    };
  }

  return {
    id: `agent-${Date.now()}`,
    transcript,
    reply:
      "Solo tengo permiso para crear, modificar y completar recordatorios, tareas y hábitos dentro de Moo. Prueba decir: «Recuérdame reunión mañana a las 10:30», «Crea la tarea revisar pendientes a las 09:00» o «Completa el hábito tomar agua».",
    provider: "Moo Guard Engine",
    model: "moo-local-guard-v1",
    executedActions,
    blockedActions,
    state: { tasks: nextTasks, habits: nextHabits, reminders: nextReminders },
  };
}

export async function fetchAgentStatus(
  config?: AgentConfigPayload
): Promise<AgentStatus> {
  try {
    const query = config?.ollamaUrl
      ? `?ollamaUrl=${encodeURIComponent(config.ollamaUrl)}`
      : "";
    const res = await fetch(`${BACKEND_URL}/agent/status${query}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      return (await res.json()) as AgentStatus;
    }
  } catch {
    // fallback
  }

  return {
    connected: true,
    providerName: "Moo Local Guarded Engine",
    modelName: "moo-local-guard-v1",
    ollamaAvailable: false,
    ollamaModels: [],
    mode: "local-guarded-engine",
    strictSandbox: true,
    allowedActions: [
      "create_reminder",
      "update_reminder",
      "complete_reminder",
      "create_task",
      "update_task",
      "complete_task",
      "create_habit",
      "update_habit",
      "complete_habit",
    ],
  };
}

export async function sendAgentCommand(
  req: AgentMessageRequest,
  fallbackState: {
    tasks: ScheduledTask[];
    habits: HabitItem[];
    reminders: CalendarReminder[];
  }
): Promise<AgentMessageResponse> {
  const transcript = String(req.text || "").trim();

  try {
    const res = await fetch(`${BACKEND_URL}/agent/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (res.ok) {
      const data = (await res.json()) as AgentMessageResponse;

      // Si el usuario pidió una acción masiva ("completa todos los hábitos de hoy", "completa todas las tareas")
      // y un proceso backend anterior sin reiniciar devolvió error de "No encontré un hábito con ese nombre",
      // ejecutamos la acción masiva directamente y sincronizamos el estado.
      const normTranscript = normalizeText(transcript);
      const isBulkComplete =
        /\b(completa|completar|complete|marca|termine|cumpli)\b/.test(
          normTranscript
        ) &&
        /\b(todos|todas|todo|los\s+habitos|mis\s+habitos|las\s+tareas|mis\s+tareas|los\s+recordatorios)\b/.test(
          normTranscript
        );

      if (
        isBulkComplete &&
        (!data.executedActions || data.executedActions.length === 0)
      ) {
        return executeClientSideGuardedAgent(
          transcript,
          data.state || fallbackState
        );
      }

      // Garantizar en el cliente que si el usuario dijo "que se llama/llame X" o "el 6 de febrero de 2017",
      // el título y la fecha estén limpios incluso si el proceso backend era una instancia previa.
      if (data.executedActions && data.executedActions.length > 0 && transcript) {
        const parsedDate = parseRelativeDateFromText(transcript);
        for (const act of data.executedActions) {
          if (act.action === "create") {
            const cleanTitle = extractEntityName(transcript, act.domain);
            if (cleanTitle && cleanTitle !== act.title) {
              act.title = cleanTitle;
              if (act.domain === "reminder") {
                const rem = data.state?.reminders?.find(
                  (r) => r.id === act.targetId
                );
                if (rem) {
                  rem.title = cleanTitle;
                  rem.date = parsedDate;
                  act.summary = `Recordatorio creado: «${cleanTitle}» (${rem.date} · ${rem.time})`;
                  data.reply = `Agendé el recordatorio «${cleanTitle}» para el ${rem.date} a las ${rem.time}.`;
                }
              } else if (act.domain === "task") {
                const tsk = data.state?.tasks?.find(
                  (t) => t.id === act.targetId
                );
                if (tsk) {
                  tsk.title = cleanTitle;
                  act.summary = `Tarea creada: «${cleanTitle}» (${tsk.time || "09:00"})`;
                  data.reply = `He creado la tarea «${cleanTitle}» (${tsk.time || "09:00"}).`;
                }
              } else if (act.domain === "habit") {
                const hab = data.state?.habits?.find(
                  (h) => h.id === act.targetId
                );
                if (hab) {
                  hab.name = cleanTitle;
                  act.summary = `Hábito creado: «${cleanTitle}» (${hab.category})`;
                  data.reply = `He creado el hábito «${cleanTitle}» en la categoría ${hab.category}.`;
                }
              }
            }
          }
        }
      }

      return data;
    }
  } catch {
    // fallback local si el backend HTTP no está disponible
  }

  return executeClientSideGuardedAgent(transcript, fallbackState);
}
