import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, "moo.sqlite");
const PORT = Number(process.env.MOO_BACKEND_PORT || 8000);
const DEFAULT_OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

const db = new DatabaseSync(DB_FILE);

// Inicializar tablas SQLite
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'daily',
    time TEXT,
    done INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Personal',
    completed_today INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 1,
    lore_kind TEXT NOT NULL DEFAULT 'crystal'
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL DEFAULT '09:00',
    done INTEGER NOT NULL DEFAULT 0
  );

  DROP TABLE IF EXISTS agent_audit_log;
`);

function formatIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Semillas iniciales si la base está vacía
const taskCount = db.prepare("SELECT COUNT(*) as c FROM tasks").get().c;
if (taskCount === 0) {
  const insertTask = db.prepare(
    "INSERT INTO tasks (id, title, frequency, time, done) VALUES (?, ?, ?, ?, ?)"
  );
  insertTask.run("t-1", "Revisión de pendientes del día", "daily", "09:00", 0);
  insertTask.run("t-2", "Bloque de enfoque profundo", "daily", "11:30", 0);
  insertTask.run("t-3", "Planificación de la semana", "weekly", "17:00", 0);
  insertTask.run("t-4", "Balance y objetivos del mes", "monthly", "10:00", 1);
}

const habitCount = db.prepare("SELECT COUNT(*) as c FROM habits").get().c;
if (habitCount === 0) {
  const insertHabit = db.prepare(
    "INSERT INTO habits (id, name, category, completed_today, streak, lore_kind) VALUES (?, ?, ?, ?, ?, ?)"
  );
  insertHabit.run("h-1", "Tomar agua", "Hidratación", 1, 6, "plant");
  insertHabit.run("h-2", "Leer", "Conocimiento", 0, 4, "books");
  insertHabit.run("h-3", "Ejercicio", "Movimiento", 0, 3, "fire");
  insertHabit.run("h-4", "Estudiar", "Conocimiento", 0, 5, "books");
  insertHabit.run("h-5", "Correr", "Movimiento", 0, 2, "fire");
}

const reminderCount = db.prepare("SELECT COUNT(*) as c FROM reminders").get().c;
if (reminderCount === 0) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const inThreeDays = new Date(today);
  inThreeDays.setDate(today.getDate() + 3);

  const insertReminder = db.prepare(
    "INSERT INTO reminders (id, title, date, time, done) VALUES (?, ?, ?, ?, ?)"
  );
  insertReminder.run(
    "r-1",
    "Entrega de avance de proyecto",
    formatIsoDate(today),
    "15:00",
    0
  );
  insertReminder.run(
    "r-2",
    "Reunión de seguimiento",
    formatIsoDate(tomorrow),
    "10:30",
    0
  );
  insertReminder.run(
    "r-3",
    "Revisión mensual con Moo",
    formatIsoDate(inThreeDays),
    "18:00",
    0
  );
}

function normalizeHabitCategory(category = "", name = "") {
  const catLower = String(category || "").toLowerCase();
  const nameLower = String(name || "").toLowerCase();

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
    catLower.includes("mente") ||
    nameLower.includes("leer") ||
    nameLower.includes("estudi") ||
    nameLower.includes("aprender") ||
    nameLower.includes("libro")
  ) {
    return "Conocimiento";
  }
  return "Equilibrio";
}

function categoryToLoreKind(category = "", name = "") {
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

function mapTask(row) {
  return {
    id: row.id,
    title: row.title,
    frequency: row.frequency,
    time: row.time || undefined,
    done: Boolean(row.done),
  };
}

function mapHabit(row) {
  const cat = normalizeHabitCategory(row.category, row.name);
  return {
    id: row.id,
    name: row.name,
    category: cat,
    completedToday: Boolean(row.completed_today),
    streak: Number(row.streak),
    loreKind: row.lore_kind || categoryToLoreKind(cat, row.name),
  };
}

function mapReminder(row) {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    time: row.time || "09:00",
    done: Boolean(row.done),
  };
}

function getAllState() {
  const tasks = db
    .prepare("SELECT * FROM tasks ORDER BY rowid DESC")
    .all()
    .map(mapTask);
  const habits = db
    .prepare("SELECT * FROM habits ORDER BY rowid ASC")
    .all()
    .map(mapHabit);
  const reminders = db
    .prepare("SELECT * FROM reminders ORDER BY date ASC, time ASC")
    .all()
    .map(mapReminder);
  return { tasks, habits, reminders };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      // Limitar a 15MB para soportar audio base64
      if (raw.length > 15 * 1024 * 1024) {
        reject(new Error("Payload demasiado grande"));
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

// ============================================================================
// PERMISOS Y GUARDRAILS ESTRICTOS DEL AGENTE (ETAPA 4)
// ============================================================================
// Regla de oro del usuario:
// "Por ahora solo quiero que haga cosas dentro de mi app, no puede hacer otra
// cosa si no le doy permiso. Solo puede crear recordatorios, tareas, hábitos y
// nada más. Crear, modificar y completar."

const ALLOWED_TOOL_SET = new Set([
  "create_reminder",
  "update_reminder",
  "complete_reminder",
  "create_task",
  "update_task",
  "complete_task",
  "create_habit",
  "update_habit",
  "complete_habit",
]);

function normalizeText(str = "") {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function findMatchingItem(items, query, field = "title") {
  if (!query) return null;
  const qNorm = normalizeText(query);
  if (!qNorm) return null;

  // 1. Coincidencia por ID exacto
  const byId = items.find((item) => normalizeText(item.id) === qNorm);
  if (byId) return byId;

  // 2. Coincidencia exacta por título/nombre
  const exact = items.find((item) => normalizeText(item[field]) === qNorm);
  if (exact) return exact;

  // 3. Coincidencia parcial (incluye query o query incluye item)
  const partial = items.find((item) => {
    const val = normalizeText(item[field]);
    return val.includes(qNorm) || qNorm.includes(val);
  });
  if (partial) return partial;

  // 4. Coincidencia por palabras clave (>2 letras)
  const tokens = qNorm.split(/\s+/).filter((t) => t.length > 2);
  if (tokens.length > 0) {
    let best = null;
    let bestScore = 0;
    for (const item of items) {
      const val = normalizeText(item[field]);
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

const SPANISH_MONTHS_MAP = {
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

const SPANISH_WEEKDAYS_MAP = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

function parseRelativeDateFromText(text) {
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

  // Fecha hablada en español: "el 6 de febrero de 2017", "6 de febrero del 2027", "15 de marzo"
  const spokenDateMatch = norm.match(
    /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+(?:de|del)\s+(\d{4}))?\b/
  );
  if (spokenDateMatch) {
    const day = String(spokenDateMatch[1]).padStart(2, "0");
    const month = SPANISH_MONTHS_MAP[spokenDateMatch[2]] || "01";
    const year = spokenDateMatch[3] || String(today.getFullYear());
    return `${year}-${month}-${day}`;
  }

  // YYYY-MM-DD explícito
  const isoMatch = text.match(/\b((?:19|20)\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  // DD/MM o DD-MM (con año opcional de 4 dígitos)
  const dmMatch = text.match(
    /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-]((?:19|20)\d{2}))?\b/
  );
  if (dmMatch) {
    const day = String(dmMatch[1]).padStart(2, "0");
    const month = String(dmMatch[2]).padStart(2, "0");
    const year = dmMatch[3] || String(today.getFullYear());
    return `${year}-${month}-${day}`;
  }

  // "en X días"
  const inDaysMatch = norm.match(/\ben\s+(\d+)\s+dias?\b/);
  if (inDaysMatch) {
    const d = new Date(today);
    d.setDate(today.getDate() + Number(inDaysMatch[1]));
    return formatIsoDate(d);
  }

  // Día de la semana: "el lunes", "para el viernes"
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

function parseTimeFromText(text, fallback = "09:00") {
  const norm = normalizeText(text);

  // HH:MM explícito (ej. 14:30, 9:15)
  const hhmm = norm.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (hhmm) {
    let h = Number(hhmm[1]);
    const m = hhmm[2];
    if (norm.includes("de la tarde") || norm.includes("pm")) {
      if (h < 12) h += 12;
    }
    return `${String(h).padStart(2, "0")}:${m}`;
  }

  // "a las 5 de la tarde" / "a las 18" / "a las 9am"
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
    } else if (
      (period === "am" || period === "de la manana") &&
      h === 12
    ) {
      h = 0;
    }
    if (h >= 0 && h <= 23) {
      return `${String(h).padStart(2, "0")}:${m}`;
    }
  }

  return fallback;
}

function parseFrequencyFromText(text, fallback = "daily") {
  const norm = normalizeText(text);
  if (norm.includes("semanal") || norm.includes("cada semana")) return "weekly";
  if (norm.includes("mensual") || norm.includes("cada mes")) return "monthly";
  return fallback;
}

function logAudit() {
  // Por privacidad y pedido del usuario, los mensajes y transcripciones son 100% efímeros y no se guardan en disco.
}

/**
 * Ejecuta una operación validada por la lista blanca estricta.
 * Cualquier acción fuera de crear/modificar/completar (tareas, hábitos, recordatorios)
 * es rechazada y registrada como bloqueada por falta de permiso.
 */
function executeWhitelistedTool(toolCall, transcript, provider) {
  const nowStr = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const tool = String(toolCall.tool || "").trim();
  const args = toolCall.args || {};

  // Verificar si el modelo o el usuario intentó eliminar o hacer algo externo
  if (tool === "blocked_action" || !ALLOWED_TOOL_SET.has(tool)) {
    const reason =
      args.reason ||
      "Acción bloqueada: Moo solo tiene permiso para crear, modificar y completar recordatorios, tareas y hábitos dentro de la app.";
    logAudit(
      transcript,
      provider,
      tool || "blocked",
      args.domain || "external",
      "BLOCKED",
      reason
    );
    return {
      executed: null,
      blocked: {
        id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        requestedIntent: args.requestedIntent || tool || transcript,
        reason,
        domain: args.domain || "restricted",
        requiresPermission: true,
        timestamp: nowStr,
      },
    };
  }

  const currentState = getAllState();

  // 1. RECORDATORIOS
  if (tool === "create_reminder") {
    const rawCandidate = String(args.title || "").trim();
    const title =
      /\b(?:se\s+llam[ea]|ponele|ponle|ponerle|con\s+nombre|llamad[oa])\b/i.test(
        transcript
      ) || !rawCandidate
        ? extractEntityName(transcript, "reminder")
        : extractEntityName(rawCandidate, "reminder") || rawCandidate;
    const date = args.date || parseRelativeDateFromText(transcript);
    const time = args.time || parseTimeFromText(transcript, "10:00");
    const id = `r-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

    db.prepare(
      "INSERT INTO reminders (id, title, date, time, done) VALUES (?, ?, ?, ?, 0)"
    ).run(id, title, date, time);

    const summary = `Recordatorio creado: «${title}» (${date} a las ${time})`;
    logAudit(transcript, provider, "create", "reminder", "EXECUTED", summary);

    return {
      executed: {
        id: `act-${Date.now()}`,
        domain: "reminder",
        action: "create",
        targetId: id,
        title,
        summary,
        timestamp: nowStr,
      },
      blocked: null,
    };
  }

  if (tool === "update_reminder") {
    const target = findMatchingItem(
      currentState.reminders,
      args.target || args.id || args.title,
      "title"
    );
    if (!target) {
      return {
        executed: null,
        blocked: {
          id: `blk-${Date.now()}`,
          requestedIntent: `Modificar recordatorio "${args.target || ""}"`,
          reason: "No encontré ningún recordatorio que coincida para modificar.",
          domain: "reminder",
          requiresPermission: true,
          timestamp: nowStr,
        },
      };
    }

    const nextTitle = args.newTitle ? String(args.newTitle).trim() : target.title;
    const nextDate = args.date || target.date;
    const nextTime = args.time || target.time;

    db.prepare(
      "UPDATE reminders SET title = ?, date = ?, time = ? WHERE id = ?"
    ).run(nextTitle, nextDate, nextTime, target.id);

    const summary = `Recordatorio modificado: «${nextTitle}» (${nextDate} · ${nextTime})`;
    logAudit(transcript, provider, "update", "reminder", "EXECUTED", summary);

    return {
      executed: {
        id: `act-${Date.now()}`,
        domain: "reminder",
        action: "update",
        targetId: target.id,
        title: nextTitle,
        summary,
        timestamp: nowStr,
      },
      blocked: null,
    };
  }

  if (tool === "complete_reminder") {
    const rawTarget = String(args.target || args.id || args.title || "");
    const normTarget = normalizeText(rawTarget);

    if (
      normTarget === "todos" ||
      normTarget === "todas" ||
      normTarget === "all" ||
      normTarget.includes("todos los recordatorios")
    ) {
      const pending = currentState.reminders.filter((r) => !r.done);
      const list = pending.length > 0 ? pending : currentState.reminders;
      db.exec("UPDATE reminders SET done = 1");
      const summary = `Todos los recordatorios completados (${list.length})`;
      return {
        executed: {
          id: `act-${Date.now()}`,
          domain: "reminder",
          action: "complete",
          targetId: "all-reminders",
          title: `Todos los recordatorios (${list.length})`,
          summary,
          timestamp: nowStr,
        },
        blocked: null,
      };
    }

    const target = findMatchingItem(
      currentState.reminders,
      rawTarget,
      "title"
    );
    if (!target) {
      return {
        executed: null,
        blocked: {
          id: `blk-${Date.now()}`,
          requestedIntent: `Completar recordatorio "${args.target || ""}"`,
          reason: "No encontré un recordatorio con ese nombre.",
          domain: "reminder",
          requiresPermission: true,
          timestamp: nowStr,
        },
      };
    }

    const doneVal = args.done !== undefined ? (args.done ? 1 : 0) : 1;
    db.prepare("UPDATE reminders SET done = ? WHERE id = ?").run(
      doneVal,
      target.id
    );

    const summary = doneVal
      ? `Recordatorio completado: «${target.title}»`
      : `Recordatorio marcado como pendiente: «${target.title}»`;
    logAudit(transcript, provider, "complete", "reminder", "EXECUTED", summary);

    return {
      executed: {
        id: `act-${Date.now()}`,
        domain: "reminder",
        action: doneVal ? "complete" : "uncomplete",
        targetId: target.id,
        title: target.title,
        summary,
        timestamp: nowStr,
      },
      blocked: null,
    };
  }

  // 2. TAREAS
  if (tool === "create_task") {
    const rawCandidate = String(args.title || "").trim();
    const title =
      /\b(?:se\s+llam[ea]|ponele|ponle|ponerle|con\s+nombre|llamad[oa])\b/i.test(
        transcript
      ) || !rawCandidate
        ? extractEntityName(transcript, "task")
        : extractEntityName(rawCandidate, "task") || rawCandidate;
    const frequency = ["daily", "weekly", "monthly"].includes(args.frequency)
      ? args.frequency
      : parseFrequencyFromText(transcript, "daily");
    const time = args.time || parseTimeFromText(transcript, "09:00");
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

    db.prepare(
      "INSERT INTO tasks (id, title, frequency, time, done) VALUES (?, ?, ?, ?, 0)"
    ).run(id, title, frequency, time);

    const freqLabel =
      frequency === "weekly"
        ? "semanal"
        : frequency === "monthly"
        ? "mensual"
        : "diaria";
    const summary = `Tarea creada: «${title}» (${freqLabel} · ${time})`;
    logAudit(transcript, provider, "create", "task", "EXECUTED", summary);

    return {
      executed: {
        id: `act-${Date.now()}`,
        domain: "task",
        action: "create",
        targetId: id,
        title,
        summary,
        timestamp: nowStr,
      },
      blocked: null,
    };
  }

  if (tool === "update_task") {
    const target = findMatchingItem(
      currentState.tasks,
      args.target || args.id || args.title,
      "title"
    );
    if (!target) {
      return {
        executed: null,
        blocked: {
          id: `blk-${Date.now()}`,
          requestedIntent: `Modificar tarea "${args.target || ""}"`,
          reason: "No encontré ninguna tarea que coincida para modificar.",
          domain: "task",
          requiresPermission: true,
          timestamp: nowStr,
        },
      };
    }

    const nextTitle = args.newTitle ? String(args.newTitle).trim() : target.title;
    const nextFreq = ["daily", "weekly", "monthly"].includes(args.frequency)
      ? args.frequency
      : target.frequency;
    const nextTime = args.time || target.time || "09:00";

    db.prepare(
      "UPDATE tasks SET title = ?, frequency = ?, time = ? WHERE id = ?"
    ).run(nextTitle, nextFreq, nextTime, target.id);

    const summary = `Tarea modificada: «${nextTitle}» (${nextTime})`;
    logAudit(transcript, provider, "update", "task", "EXECUTED", summary);

    return {
      executed: {
        id: `act-${Date.now()}`,
        domain: "task",
        action: "update",
        targetId: target.id,
        title: nextTitle,
        summary,
        timestamp: nowStr,
      },
      blocked: null,
    };
  }

  if (tool === "complete_task") {
    const rawTarget = String(args.target || args.id || args.title || "");
    const normTarget = normalizeText(rawTarget);

    if (
      normTarget === "todas" ||
      normTarget === "todos" ||
      normTarget === "all" ||
      normTarget.includes("todas las tareas")
    ) {
      const pending = currentState.tasks.filter((t) => !t.done);
      const list = pending.length > 0 ? pending : currentState.tasks;
      db.exec("UPDATE tasks SET done = 1");
      const summary = `Todas las tareas completadas (${list.length})`;
      return {
        executed: {
          id: `act-${Date.now()}`,
          domain: "task",
          action: "complete",
          targetId: "all-tasks",
          title: `Todas las tareas (${list.length})`,
          summary,
          timestamp: nowStr,
        },
        blocked: null,
      };
    }

    const target = findMatchingItem(
      currentState.tasks,
      rawTarget,
      "title"
    );
    if (!target) {
      return {
        executed: null,
        blocked: {
          id: `blk-${Date.now()}`,
          requestedIntent: `Completar tarea "${args.target || ""}"`,
          reason: "No encontré una tarea con ese nombre.",
          domain: "task",
          requiresPermission: true,
          timestamp: nowStr,
        },
      };
    }

    const doneVal = args.done !== undefined ? (args.done ? 1 : 0) : 1;
    db.prepare("UPDATE tasks SET done = ? WHERE id = ?").run(
      doneVal,
      target.id
    );

    const summary = doneVal
      ? `Tarea completada: «${target.title}»`
      : `Tarea marcada como pendiente: «${target.title}»`;
    logAudit(transcript, provider, "complete", "task", "EXECUTED", summary);

    return {
      executed: {
        id: `act-${Date.now()}`,
        domain: "task",
        action: doneVal ? "complete" : "uncomplete",
        targetId: target.id,
        title: target.title,
        summary,
        timestamp: nowStr,
      },
      blocked: null,
    };
  }

  // 3. HÁBITOS
  if (tool === "create_habit") {
    const rawCandidate = String(args.name || args.title || "").trim();
    const name =
      /\b(?:se\s+llam[ea]|ponele|ponle|ponerle|con\s+nombre|llamad[oa])\b/i.test(
        transcript
      ) || !rawCandidate
        ? extractEntityName(transcript, "habit")
        : extractEntityName(rawCandidate, "habit") || rawCandidate;
    const category = normalizeHabitCategory(args.category, name);
    const loreKind = categoryToLoreKind(category, name);
    const id = `h-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

    db.prepare(
      "INSERT INTO habits (id, name, category, completed_today, streak, lore_kind) VALUES (?, ?, ?, 0, 1, ?)"
    ).run(id, name, category, loreKind);

    const summary = `Hábito creado: «${name}» (Categoría: ${category})`;
    logAudit(transcript, provider, "create", "habit", "EXECUTED", summary);

    return {
      executed: {
        id: `act-${Date.now()}`,
        domain: "habit",
        action: "create",
        targetId: id,
        title: name,
        summary,
        timestamp: nowStr,
      },
      blocked: null,
    };
  }

  if (tool === "update_habit") {
    const target = findMatchingItem(
      currentState.habits,
      args.target || args.id || args.name || args.title,
      "name"
    );
    if (!target) {
      return {
        executed: null,
        blocked: {
          id: `blk-${Date.now()}`,
          requestedIntent: `Modificar hábito "${args.target || ""}"`,
          reason: "No encontré ningún hábito que coincida para modificar.",
          domain: "habit",
          requiresPermission: true,
          timestamp: nowStr,
        },
      };
    }

    const nextName = args.newName || args.newTitle
      ? String(args.newName || args.newTitle).trim()
      : target.name;
    const nextCat = normalizeHabitCategory(
      args.category || target.category,
      nextName
    );
    const nextLore = categoryToLoreKind(nextCat, nextName);

    db.prepare(
      "UPDATE habits SET name = ?, category = ?, lore_kind = ? WHERE id = ?"
    ).run(nextName, nextCat, nextLore, target.id);

    const summary = `Hábito modificado: «${nextName}» (${nextCat})`;
    logAudit(transcript, provider, "update", "habit", "EXECUTED", summary);

    return {
      executed: {
        id: `act-${Date.now()}`,
        domain: "habit",
        action: "update",
        targetId: target.id,
        title: nextName,
        summary,
        timestamp: nowStr,
      },
      blocked: null,
    };
  }

  if (tool === "complete_habit") {
    const rawTarget = String(
      args.target || args.id || args.name || args.title || ""
    );
    const normTarget = normalizeText(rawTarget);

    // Si Ollama envió target: "todos" / "all"
    if (
      normTarget === "todos" ||
      normTarget === "todas" ||
      normTarget === "all" ||
      normTarget.includes("todos los habitos")
    ) {
      const pending = currentState.habits.filter((h) => !h.completedToday);
      const list = pending.length > 0 ? pending : currentState.habits;
      for (const h of list) {
        const nextStreak = Number(h.streak || 0) + (h.completedToday ? 0 : 1);
        db.prepare(
          "UPDATE habits SET completed_today = 1, streak = ? WHERE id = ?"
        ).run(nextStreak, h.id);
      }
      const summary = `Todos los hábitos completados hoy (${list.length})`;
      return {
        executed: {
          id: `act-${Date.now()}`,
          domain: "habit",
          action: "complete",
          targetId: "all-habits",
          title: `Todos los hábitos (${list.length})`,
          summary,
          timestamp: nowStr,
        },
        blocked: null,
      };
    }

    const target = findMatchingItem(
      currentState.habits,
      rawTarget,
      "name"
    );
    if (!target) {
      return {
        executed: null,
        blocked: {
          id: `blk-${Date.now()}`,
          requestedIntent: `Completar hábito "${args.target || ""}"`,
          reason: "No encontré un hábito con ese nombre.",
          domain: "habit",
          requiresPermission: true,
          timestamp: nowStr,
        },
      };
    }

    const doneVal = args.done !== undefined ? (args.done ? 1 : 0) : 1;
    const nextStreak = doneVal
      ? Number(target.streak || 0) + 1
      : Math.max(0, Number(target.streak || 1) - 1);

    db.prepare(
      "UPDATE habits SET completed_today = ?, streak = ? WHERE id = ?"
    ).run(doneVal, nextStreak, target.id);

    const summary = doneVal
      ? `Hábito completado hoy: «${target.name}» (racha: ${nextStreak}d)`
      : `Hábito desmarcado hoy: «${target.name}»`;
    logAudit(transcript, provider, "complete", "habit", "EXECUTED", summary);

    return {
      executed: {
        id: `act-${Date.now()}`,
        domain: "habit",
        action: doneVal ? "complete" : "uncomplete",
        targetId: target.id,
        title: target.name,
        summary,
        timestamp: nowStr,
      },
      blocked: null,
    };
  }

  return { executed: null, blocked: null };
}

// ============================================================================
// MOTOR NLU LOCAL CON GUARDRAILS (SIEMPRE DISPONIBLE + FALLBACK INSTANTÁNEO)
// ============================================================================

function cleanExtractedTitle(raw = "") {
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

/**
 * Extrae el nombre o título real de un recordatorio, tarea o hábito:
 * 1) Primero busca si el usuario indicó explícitamente cómo llamarlo:
 *    - "que se llame X" / "que se llama X" / "se llame X" / "se llama X" / "llamado X" / "llamada X"
 *    - "ponele el nombre X" / "ponele de nombre X" / "ponle de nombre X" / "ponele X" / "ponerle X"
 *    - "con el nombre X" / "de nombre X" / "que diga X" / "que dice X"
 *    - o texto entre comillas "X" / «X»
 * 2) Si no usó una frase de nombrado explícito, limpia los verbos de comando,
 *    el tipo de ítem ("recordatorio", "tarea", "hábito") y las expresiones de fecha/hora.
 */
function extractEntityName(transcript = "", domain = "reminder") {
  const text = String(transcript || "").trim();
  if (!text) return "";

  // 1. Si hay texto entre comillas ("..." o «...»), ese es el nombre explícito
  const quotedMatch = text.match(/["«]([^"»]{1,80})["»]/);
  if (quotedMatch && quotedMatch[1]) {
    const cleaned = cleanExtractedTitle(quotedMatch[1]);
    if (cleaned) return cleaned;
  }

  // 2. Patrones explícitos de nombrado ("que se llame/llama X", "ponele el nombre X", "con nombre X", "llamado X", "que diga/dice X")
  const explicitNamingPatterns = [
    /\b(?:que\s+se\s+llam[ea]|se\s+llam[ea]|llamad[oa]|ponele\s+(?:el\s+|de\s+)?nombre|ponle\s+(?:el\s+|de\s+)?nombre|ponerle\s+(?:el\s+|de\s+)?nombre|con\s+(?:el\s+)?nombre|de\s+nombre|que\s+dig[ae]|que\s+dice)\s+(.+)$/i,
    /\b(?:ponele|ponle|ponerle)\s+(?!un\s+recordatorio|una\s+tarea|un\s+h[aá]bito)(.+)$/i,
  ];

  for (const pattern of explicitNamingPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Cortar si después del nombre viene una cláusula de fecha/hora ("para mañana...", "el 6 de febrero...", "a las 10...")
      const candidate = match[1].split(
        /\b(?:para\s+hoy|para\s+ma[ñn]ana|para\s+pasado\s+ma[ñn]ana|(?:para\s+el\s+|el\s+)\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)|a\s+las?\s+\d{1,2})\b/i
      )[0];
      const cleaned = cleanExtractedTitle(candidate);
      if (cleaned) return cleaned;
    }
  }

  // 3. Si no dijo "que se llame...", quitamos las fechas/horas primero y luego el prefijo del comando
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

  // domain === "reminder"
  const stripped = withoutDates
    .replace(
      /^.*?\b(?:crea(?:r)?|agrega(?:r)?|a[ñn]ade|a[ñn]adir|nuevo|pon(?:er)?|agenda(?:r)?|programa(?:r)?)?\s*(?:un\s+|el\s+)?(?:recordatorio\s*(?:de|para|sobre|que\s+sea|que|:)?|recu[eé]rdame\s*(?:de|que)?|recordarme\s*(?:de|que)?|av[ií]same\s*(?:de|que)?)\s*/i,
      ""
    )
    .trim();

  return cleanExtractedTitle(stripped || withoutDates) || "Recordatorio";
}

function interpretWithLocalGuardedEngine(transcript) {
  const norm = normalizeText(transcript);
  const currentState = getAllState();

  // 1. Detectar intentos prohibidos: ELIMINAR / BORRAR
  const deleteMatch = norm.match(
    /\b(elimina|eliminar|borra|borrar|quita|quitar|suprime|suprimir|destruye|limpia)\b/
  );
  if (deleteMatch) {
    return {
      reply:
        "No tengo permiso para eliminar elementos. Por seguridad, actualmente solo puedo crear, modificar y completar recordatorios, tareas y hábitos.",
      toolCalls: [
        {
          tool: "blocked_action",
          args: {
            requestedIntent: transcript,
            domain: "delete",
            reason:
              "Permiso denegado: eliminar o borrar elementos no está autorizado. Solo se permite crear, modificar y completar.",
          },
        },
      ],
    };
  }

  // 2. Detectar intentos de acciones fuera de la app (archivos, navegador, sistema, emails, consola, etc.)
  const externalMatch = norm.match(
    /\b(abre|abrir|ejecuta|ejecutar|instala|instalar|descarga|descargar|envia|enviar\s+correo|email|whatsapp|navegador|chrome|terminal|powershell|cmd|archivo|carpeta|sistema|apaga|reinicia|busca\s+en\s+internet|google)\b/
  );
  if (externalMatch) {
    return {
      reply:
        "Acción bloqueada: no tengo permiso para realizar acciones fuera de Moo Desk. Solo estoy autorizado para crear, modificar y completar tus recordatorios, tareas y hábitos.",
      toolCalls: [
        {
          tool: "blocked_action",
          args: {
            requestedIntent: transcript,
            domain: "external-system",
            reason:
              "Sandbox activo: Moo no tiene permiso para ejecutar acciones fuera de la aplicación.",
          },
        },
      ],
    };
  }

  // 3. Detectar COMPLETAR / MARCAR COMO HECHO
  const isCompleteIntent =
    /\b(completa|completar|complete|marca\s+como\s+(hecho|hecha|completad[oa]s?|list[oa]s?)|ya\s+(hice|tome|lei|corri|estudie|entrene|termine|cumpli)|termine|finalice|cumpli)\b/.test(
      norm
    );

  if (isCompleteIntent) {
    const isBulkAll =
      /\b(todos|todas|todo|mis\s+habitos|los\s+habitos|las\s+tareas|mis\s+tareas|los\s+recordatorios|mis\s+recordatorios)\b/.test(
        norm
      );

    if (isBulkAll && norm.includes("habito")) {
      const pendingHabits = currentState.habits.filter((h) => !h.completedToday);
      const targets =
        pendingHabits.length > 0 ? pendingHabits : currentState.habits;

      if (targets.length === 0) {
        return {
          reply: "No tienes hábitos registrados para completar hoy.",
          toolCalls: [],
        };
      }

      return {
        reply: `¡Increíble! He marcado todos tus hábitos de hoy (${targets.length}) como completados.`,
        toolCalls: targets.map((h) => ({
          tool: "complete_habit",
          args: { target: h.id, done: true },
        })),
      };
    }

    if (isBulkAll && norm.includes("tarea")) {
      const pendingTasks = currentState.tasks.filter((t) => !t.done);
      const targets = pendingTasks.length > 0 ? pendingTasks : currentState.tasks;

      if (targets.length === 0) {
        return {
          reply: "No tienes tareas pendientes para completar.",
          toolCalls: [],
        };
      }

      return {
        reply: `¡Excelente! He marcado todas tus tareas (${targets.length}) como completadas.`,
        toolCalls: targets.map((t) => ({
          tool: "complete_task",
          args: { target: t.id, done: true },
        })),
      };
    }

    if (isBulkAll && norm.includes("recordatorio")) {
      const todayIso = formatIsoDate(new Date());
      const todayOnly = norm.includes("hoy");
      const pool = todayOnly
        ? currentState.reminders.filter((r) => r.date === todayIso)
        : currentState.reminders;
      const pendingRems = pool.filter((r) => !r.done);
      const targets = pendingRems.length > 0 ? pendingRems : pool;

      if (targets.length === 0) {
        return {
          reply: "No tienes recordatorios pendientes para completar.",
          toolCalls: [],
        };
      }

      return {
        reply: `Listo, marqué todos los recordatorios (${targets.length}) como completados.`,
        toolCalls: targets.map((r) => ({
          tool: "complete_reminder",
          args: { target: r.id, done: true },
        })),
      };
    }

    // ¿Menciona explícitamente un hábito, tarea o recordatorio individual?
    const cleanedTarget = transcript
      .replace(
        /\b(por favor|moo|completa|completar|marca como completad[oa]s?|marca como hech[oa]s?|marca|ya hice|ya tome|ya lei|ya corri|ya estudie|ya termine|termine|cumpli|el habito|los habitos|la tarea|las tareas|el recordatorio|los recordatorios|de|del|dia|hoy)\b/gi,
        " "
      )
      .trim();

    if (norm.includes("habito")) {
      return {
        reply: `¡Excelente! He marcado tu hábito como completado hoy.`,
        toolCalls: [
          {
            tool: "complete_habit",
            args: { target: cleanedTarget || transcript, done: true },
          },
        ],
      };
    }
    if (norm.includes("recordatorio")) {
      return {
        reply: `Listo, marqué el recordatorio como completado.`,
        toolCalls: [
          {
            tool: "complete_reminder",
            args: { target: cleanedTarget || transcript, done: true },
          },
        ],
      };
    }
    if (norm.includes("tarea")) {
      return {
        reply: `¡Muy bien! Marqué la tarea como completada.`,
        toolCalls: [
          {
            tool: "complete_task",
            args: { target: cleanedTarget || transcript, done: true },
          },
        ],
      };
    }

    // Buscar automáticamente en hábitos, tareas o recordatorios existentes
    const matchedHabit = findMatchingItem(
      currentState.habits,
      cleanedTarget || transcript,
      "name"
    );
    if (matchedHabit) {
      return {
        reply: `¡Genial! Completé el hábito «${matchedHabit.name}» por hoy.`,
        toolCalls: [
          {
            tool: "complete_habit",
            args: { target: matchedHabit.id, done: true },
          },
        ],
      };
    }

    const matchedTask = findMatchingItem(
      currentState.tasks,
      cleanedTarget || transcript,
      "title"
    );
    if (matchedTask) {
      return {
        reply: `Listo, completé la tarea «${matchedTask.title}».`,
        toolCalls: [
          {
            tool: "complete_task",
            args: { target: matchedTask.id, done: true },
          },
        ],
      };
    }

    const matchedReminder = findMatchingItem(
      currentState.reminders,
      cleanedTarget || transcript,
      "title"
    );
    if (matchedReminder) {
      return {
        reply: `He marcado el recordatorio «${matchedReminder.title}» como completado.`,
        toolCalls: [
          {
            tool: "complete_reminder",
            args: { target: matchedReminder.id, done: true },
          },
        ],
      };
    }
  }

  // 4. Detectar MODIFICAR / CAMBIAR / EDITAR / MOVER / RENOMBRAR
  const isUpdateIntent =
    /\b(modifica|modificar|cambia|cambiar|edita|editar|mueve|mover|pospone|posponer|reprograma|reprogramar|renombra|renombrar|actualiza|actualizar)\b/.test(
      norm
    );

  if (isUpdateIntent) {
    const newTime = parseTimeFromText(transcript, "");
    const hasExplicitDate =
      norm.includes("manana") ||
      norm.includes("hoy") ||
      /\b20\d{2}-\d{2}-\d{2}\b/.test(norm) ||
      /\b\d{1,2}[\/\-]\d{1,2}\b/.test(norm);
    const newDate = hasExplicitDate ? parseRelativeDateFromText(transcript) : undefined;

    // Extraer posible nuevo nombre si dice "que se llame X", "ponele el nombre X", "a X", "por X"
    let newName = undefined;
    const explicitRenameMatch = transcript.match(
      /\b(?:que\s+se\s+llame|se\s+llame|llamad[oa]|ponele\s+(?:el\s+|de\s+)?nombre|ponle\s+(?:el\s+|de\s+)?nombre|con\s+(?:el\s+)?nombre|de\s+nombre|renombra(?:r)?\s+(?:a|como|por)|cambia(?:r)?\s+(?:el\s+)?nombre\s+(?:a|por))\s+["'«]?([^"'»]+)["'»]?$/i
    );
    if (explicitRenameMatch && explicitRenameMatch[1]) {
      newName = cleanExtractedTitle(explicitRenameMatch[1]);
    } else {
      const renameMatch = transcript.match(
        /\b(?:renombra(?:r)?|nombre\s+a|llama(?:r)?)\s+.+?\s+(?:a|por)\s+["'«]?([^"'»]+)["'»]?$/i
      );
      if (renameMatch) {
        newName = cleanExtractedTitle(renameMatch[1]);
      }
    }

    if (norm.includes("habito")) {
      const targetHabit = findMatchingItem(currentState.habits, transcript, "name");
      return {
        reply: `He actualizado el hábito.`,
        toolCalls: [
          {
            tool: "update_habit",
            args: {
              target: targetHabit ? targetHabit.id : transcript,
              newName,
            },
          },
        ],
      };
    }

    if (norm.includes("recordatorio")) {
      const targetRem = findMatchingItem(
        currentState.reminders,
        transcript,
        "title"
      );
      return {
        reply: `He modificado el recordatorio.`,
        toolCalls: [
          {
            tool: "update_reminder",
            args: {
              target: targetRem ? targetRem.id : transcript,
              newTitle: newName,
              date: newDate,
              time: newTime || undefined,
            },
          },
        ],
      };
    }

    if (norm.includes("tarea")) {
      const targetTask = findMatchingItem(
        currentState.tasks,
        transcript,
        "title"
      );
      return {
        reply: `He modificado la tarea.`,
        toolCalls: [
          {
            tool: "update_task",
            args: {
              target: targetTask ? targetTask.id : transcript,
              newTitle: newName,
              time: newTime || undefined,
              frequency: norm.includes("semanal")
                ? "weekly"
                : norm.includes("mensual")
                ? "monthly"
                : norm.includes("diaria")
                ? "daily"
                : undefined,
            },
          },
        ],
      };
    }

    // Si no especificó tipo, buscar coincidencia en recordatorios, tareas o hábitos
    const matchedRem = findMatchingItem(currentState.reminders, transcript, "title");
    if (matchedRem) {
      return {
        reply: `Actualicé el recordatorio «${matchedRem.title}».`,
        toolCalls: [
          {
            tool: "update_reminder",
            args: {
              target: matchedRem.id,
              newTitle: newName,
              date: newDate,
              time: newTime || undefined,
            },
          },
        ],
      };
    }

    const matchedTask = findMatchingItem(currentState.tasks, transcript, "title");
    if (matchedTask) {
      return {
        reply: `Actualicé la tarea «${matchedTask.title}».`,
        toolCalls: [
          {
            tool: "update_task",
            args: {
              target: matchedTask.id,
              newTitle: newName,
              time: newTime || undefined,
            },
          },
        ],
      };
    }

    const matchedHabit = findMatchingItem(currentState.habits, transcript, "name");
    if (matchedHabit) {
      return {
        reply: `Actualicé el hábito «${matchedHabit.name}».`,
        toolCalls: [
          {
            tool: "update_habit",
            args: {
              target: matchedHabit.id,
              newName,
            },
          },
        ],
      };
    }
  }

  // 5. Detectar CREAR HÁBITO
  if (
    /\b(habito)\b/.test(norm) ||
    /\b(empezar\s+a|practicar\s+todos\s+los\s+dias)\b/.test(norm)
  ) {
    const name = extractEntityName(transcript, "habit");
    const category = normalizeHabitCategory("", name);

    return {
      reply: `He creado el hábito «${name}» en la categoría ${category}.`,
      toolCalls: [
        {
          tool: "create_habit",
          args: { name, category },
        },
      ],
    };
  }

  // 6. Detectar CREAR RECORDATORIO
  if (
    /\b(recordatorio|recuerdame|recordarme|agenda|agendar|avisame)\b/.test(norm)
  ) {
    const title = extractEntityName(transcript, "reminder");
    const date = parseRelativeDateFromText(transcript);
    const time = parseTimeFromText(transcript, "10:00");

    return {
      reply: `Agendé el recordatorio «${title}» para el ${date} a las ${time}.`,
      toolCalls: [
        {
          tool: "create_reminder",
          args: { title, date, time },
        },
      ],
    };
  }

  // 7. Detectar CREAR TAREA
  if (
    /\b(tarea|pendiente|programar|anota|anotar|crea|crear|agrega|agregar)\b/.test(
      norm
    )
  ) {
    const title = extractEntityName(transcript, "task");
    const frequency = parseFrequencyFromText(transcript, "daily");
    const time = parseTimeFromText(transcript, "09:00");

    return {
      reply: `He creado la tarea «${title}» (${time}).`,
      toolCalls: [
        {
          tool: "create_task",
          args: { title, frequency, time },
        },
      ],
    };
  }

  // 8. Si es una frase corta y directa, por defecto la agendamos como recordatorio o tarea si tiene hora/fecha, o informamos las capacidades
  if (
    /\ba\s+las\s+\d{1,2}\b/.test(norm) ||
    norm.includes("manana") ||
    norm.includes("hoy")
  ) {
    const title = extractEntityName(transcript, "reminder") || transcript;
    const date = parseRelativeDateFromText(transcript);
    const time = parseTimeFromText(transcript, "10:00");
    return {
      reply: `He creado el recordatorio «${title}» para el ${date} a las ${time}.`,
      toolCalls: [
        {
          tool: "create_reminder",
          args: { title, date, time },
        },
      ],
    };
  }

  return {
    reply:
      "Solo tengo permiso para crear, modificar y completar recordatorios, tareas y hábitos dentro de Moo. Por ejemplo, dime: «Recuérdame llamar al médico mañana a las 11:00», «Crea la tarea estudiar inglés a las 18:00» o «Completa el hábito tomar agua».",
    toolCalls: [],
  };
}

// ============================================================================
// CONEXIÓN CON OLLAMA LOCAL (LLM) Y TRANSCRIPCIÓN DE AUDIO
// ============================================================================

async function checkOllamaStatus(ollamaUrl = DEFAULT_OLLAMA_URL) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${ollamaUrl.replace(/\/$/, "")}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return { available: false, models: [] };
    const data = await res.json();
    const models = Array.isArray(data.models)
      ? data.models.map((m) => m.name)
      : [];
    return { available: true, models };
  } catch {
    return { available: false, models: [] };
  }
}

async function callOllamaAgent(transcript, config = {}) {
  const ollamaUrl = (config.ollamaUrl || DEFAULT_OLLAMA_URL).replace(/\/$/, "");
  const status = await checkOllamaStatus(ollamaUrl);
  if (!status.available) {
    return null;
  }

  const chosenModel =
    config.ollamaModel && status.models.includes(config.ollamaModel)
      ? config.ollamaModel
      : status.models[0] || config.ollamaModel || DEFAULT_OLLAMA_MODEL;

  const state = getAllState();
  const todayIso = formatIsoDate(new Date());

  const systemPrompt = `Eres Moo, el compañero de escritorio personal dentro de Moo Desk.
FECHA ACTUAL: ${todayIso}.

REGLA DE SEGURIDAD ESTRICTA E INQUEBRANTABLE:
Solo tienes permiso para operar DENTRO de Moo Desk sobre 3 dominios:
1. Recordatorios (reminder)
2. Tareas (task)
3. Hábitos (habit)
Y SOLO puedes realizar 3 operaciones: CREAR, MODIFICAR y COMPLETAR.
NO tienes permiso para ELIMINAR/BORRAR nada, ni para ejecutar comandos del sistema, abrir programas, navegar web ni ninguna otra cosa fuera de crear/modificar/completar recordatorios, tareas y hábitos.
Si el usuario pide eliminar algo o hacer cualquier otra cosa fuera de esas 3 operaciones y 3 dominios, DEBES usar la herramienta "blocked_action" explicando que no tienes permiso.

REGLA PARA EXTRAER NOMBRES DE RECORDATORIOS, TAREAS Y HÁBITOS:
- Si el usuario dice frases como "que se llame X", "se llame X", "ponele el nombre X", "ponele de nombre X", "con el nombre X", "llamado X" o "que diga X", el campo "title" o "name" DEBE ser únicamente "X" (sin incluir "que se llame", ni la fecha/hora como "para mañana a las 10").
- Ejemplo: "Creame un recordatorio para mañana a las 5 que se llame comprar café" -> title: "comprar café", time: "17:00".

ESTADO ACTUAL EN LA BASE DE DATOS:
- Tareas: ${JSON.stringify(
    state.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      frequency: t.frequency,
      time: t.time,
      done: t.done,
    }))
  )}
- Hábitos: ${JSON.stringify(
    state.habits.map((h) => ({
      id: h.id,
      name: h.name,
      category: h.category,
      completedToday: h.completedToday,
      streak: h.streak,
    }))
  )}
- Recordatorios: ${JSON.stringify(
    state.reminders.map((r) => ({
      id: r.id,
      title: r.title,
      date: r.date,
      time: r.time,
      done: r.done,
    }))
  )}

Responde SIEMPRE en JSON válido con este esquema exacto:
{
  "reply": "Respuesta breve y amigable en español confirmando lo que hiciste o por qué fue bloqueado",
  "toolCalls": [
    {
      "tool": "create_reminder | update_reminder | complete_reminder | create_task | update_task | complete_task | create_habit | update_habit | complete_habit | blocked_action",
      "args": {
        "title": "string (para crear tarea/recordatorio)",
        "name": "string (para crear hábito)",
        "target": "id o nombre del item a modificar/completar",
        "newTitle": "nuevo título si se modifica tarea/recordatorio",
        "newName": "nuevo nombre si se modifica hábito",
        "date": "YYYY-MM-DD (para recordatorios)",
        "time": "HH:MM (24h)",
        "frequency": "daily | weekly | monthly (para tareas)",
        "category": "Hidratación | Movimiento | Conocimiento | Equilibrio (para hábitos)",
        "done": true,
        "requestedIntent": "descripción si es blocked_action",
        "reason": "motivo de bloqueo si es blocked_action"
      }
    }
  ]
}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: chosenModel,
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
      provider: "ollama",
      model: chosenModel,
      reply:
        typeof parsed.reply === "string" && parsed.reply.trim()
          ? parsed.reply.trim()
          : "Listo.",
      toolCalls: Array.isArray(parsed.toolCalls) ? parsed.toolCalls : [],
    };
  } catch {
    return null;
  }
}

/**
 * Si el usuario envía audio grabado (MediaRecorder) y no vino transcripto o
 * configuró Gemini / OpenAI API Key para transcripción multimodal de audio:
 */
async function transcribeAudioIfNeeded(
  audioBase64,
  audioMimeType = "audio/webm",
  config = {}
) {
  if (!audioBase64) return null;

  // 1. Si hay Gemini API Key configurada, podemos transcribir el audio con Gemini Flash
  if (config.geminiApiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(
          config.geminiApiKey
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: "Transcribe exactamente lo que dice el usuario en español. Devuelve únicamente el texto transcripto, sin comillas ni explicaciones.",
                  },
                  {
                    inlineData: {
                      mimeType: audioMimeType.split(";")[0] || "audio/webm",
                      data: audioBase64,
                    },
                  },
                ],
              },
            ],
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        if (text) return text;
      }
    } catch {
      // fallback
    }
  }

  return null;
}

// ============================================================================
// SERVIDOR HTTP
// ============================================================================

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
  const pathname = url.pathname;

  try {
    if (req.method === "GET" && pathname === "/api/health") {
      return sendJson(res, 200, {
        status: "ok",
        engine: "sqlite",
        database: DB_FILE,
      });
    }

    // Estado del Agent Core (Ollama + Sandbox de Permisos)
    if (req.method === "GET" && pathname === "/api/agent/status") {
      const customUrl = url.searchParams.get("ollamaUrl") || DEFAULT_OLLAMA_URL;
      const ollama = await checkOllamaStatus(customUrl);
      return sendJson(res, 200, {
        connected: true,
        providerName: ollama.available
          ? "Ollama Local + Moo Guard"
          : "Moo Local Guarded Engine",
        modelName: ollama.available
          ? ollama.models[0] || DEFAULT_OLLAMA_MODEL
          : "moo-nlu-v1",
        ollamaAvailable: ollama.available,
        ollamaModels: ollama.models,
        mode: ollama.available ? "ollama-local" : "local-guarded-engine",
        strictSandbox: true,
        allowedActions: Array.from(ALLOWED_TOOL_SET),
      });
    }

    // Endpoint principal del Agente: procesa voz/texto y ejecuta SOLO acciones permitidas
    if (req.method === "POST" && pathname === "/api/agent/command") {
      const body = await readJsonBody(req);
      const config = body.config || {};
      let transcript = String(body.text || "").trim();

      if (!transcript && body.audioBase64) {
        const fromAudio = await transcribeAudioIfNeeded(
          body.audioBase64,
          body.audioMimeType,
          config
        );
        if (fromAudio) {
          transcript = fromAudio;
        }
      }

      if (!transcript) {
        return sendJson(res, 400, {
          error:
            "No se detectó voz o texto en el mensaje. Intenta hablar más cerca del micrófono.",
        });
      }

      // 1. Intentar con Ollama local si está activo
      let plan = await callOllamaAgent(transcript, config);
      let provider = "Ollama Local";
      let model = plan?.model || config.ollamaModel || DEFAULT_OLLAMA_MODEL;

      // 2. Si Ollama no está corriendo o no devolvió acciones claras, usar el motor NLU local determinístico
      if (!plan || (!plan.toolCalls?.length && !plan.reply)) {
        const localPlan = interpretWithLocalGuardedEngine(transcript);
        plan = localPlan;
        provider = "Moo Guard Engine";
        model = "moo-local-guard-v1";
      } else if (plan.toolCalls.length === 0) {
        // Verificar si el motor local detecta una intención clara o un bloqueo que el LLM pasó por alto
        const localCheck = interpretWithLocalGuardedEngine(transcript);
        if (localCheck.toolCalls.length > 0) {
          plan.toolCalls = localCheck.toolCalls;
          if (localCheck.toolCalls[0].tool === "blocked_action") {
            plan.reply = localCheck.reply;
          }
        }
      }

      const executedActions = [];
      const blockedActions = [];

      for (const tc of plan.toolCalls) {
        const outcome = executeWhitelistedTool(tc, transcript, provider);
        if (outcome.executed) executedActions.push(outcome.executed);
        if (outcome.blocked) blockedActions.push(outcome.blocked);
      }

      let finalReply = plan.reply;
      if (executedActions.length > 0 && !finalReply) {
        finalReply = executedActions.map((a) => a.summary).join(" · ");
      }
      if (blockedActions.length > 0 && executedActions.length === 0) {
        finalReply = blockedActions[0].reason;
      }

      return sendJson(res, 200, {
        id: `agent-${Date.now()}`,
        transcript,
        reply: finalReply,
        provider,
        model,
        executedActions,
        blockedActions,
        state: getAllState(),
      });
    }

    if (req.method === "GET" && pathname === "/api/state") {
      return sendJson(res, 200, getAllState());
    }

    // Reemplazar todo el estado (sincronización completa)
    if (req.method === "PUT" && pathname === "/api/state") {
      const body = await readJsonBody(req);
      if (Array.isArray(body.tasks)) {
        db.exec("DELETE FROM tasks");
        const stmt = db.prepare(
          "INSERT INTO tasks (id, title, frequency, time, done) VALUES (?, ?, ?, ?, ?)"
        );
        for (const t of [...body.tasks].reverse()) {
          stmt.run(
            t.id,
            t.title,
            t.frequency || "daily",
            t.time || null,
            t.done ? 1 : 0
          );
        }
      }
      if (Array.isArray(body.habits)) {
        db.exec("DELETE FROM habits");
        const stmt = db.prepare(
          "INSERT INTO habits (id, name, category, completed_today, streak, lore_kind) VALUES (?, ?, ?, ?, ?, ?)"
        );
        for (const h of body.habits) {
          const cat = normalizeHabitCategory(h.category, h.name);
          stmt.run(
            h.id,
            h.name,
            cat,
            h.completedToday ? 1 : 0,
            Number(h.streak ?? 1),
            h.loreKind || categoryToLoreKind(cat, h.name)
          );
        }
      }
      if (Array.isArray(body.reminders)) {
        db.exec("DELETE FROM reminders");
        const stmt = db.prepare(
          "INSERT INTO reminders (id, title, date, time, done) VALUES (?, ?, ?, ?, ?)"
        );
        for (const r of body.reminders) {
          stmt.run(
            r.id,
            r.title,
            r.date,
            r.time || "09:00",
            r.done ? 1 : 0
          );
        }
      }
      return sendJson(res, 200, getAllState());
    }

    // POST /api/tasks
    if (req.method === "POST" && pathname === "/api/tasks") {
      const body = await readJsonBody(req);
      const id = body.id || `t-${Date.now()}`;
      db.prepare(
        "INSERT OR REPLACE INTO tasks (id, title, frequency, time, done) VALUES (?, ?, ?, ?, ?)"
      ).run(
        id,
        body.title,
        body.frequency || "daily",
        body.time || null,
        body.done ? 1 : 0
      );
      const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
      return sendJson(res, 201, mapTask(row));
    }

    // PUT /api/tasks/:id
    if (req.method === "PUT" && pathname.startsWith("/api/tasks/")) {
      const id = decodeURIComponent(pathname.replace("/api/tasks/", ""));
      const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
      if (!existing) return sendJson(res, 404, { error: "Tarea no encontrada" });

      const body = await readJsonBody(req);
      const title = body.title ?? existing.title;
      const frequency = body.frequency ?? existing.frequency;
      const time = body.time !== undefined ? body.time : existing.time;
      const done =
        body.done !== undefined ? (body.done ? 1 : 0) : existing.done;

      db.prepare(
        "UPDATE tasks SET title = ?, frequency = ?, time = ?, done = ? WHERE id = ?"
      ).run(title, frequency, time, done, id);
      const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
      return sendJson(res, 200, mapTask(updated));
    }

    // DELETE /api/tasks/:id (Solo permitido manualmente desde la UI, nunca por el modelo)
    if (req.method === "DELETE" && pathname.startsWith("/api/tasks/")) {
      const id = decodeURIComponent(pathname.replace("/api/tasks/", ""));
      db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
      return sendJson(res, 200, { deleted: id });
    }

    // POST /api/habits
    if (req.method === "POST" && pathname === "/api/habits") {
      const body = await readJsonBody(req);
      const id = body.id || `h-${Date.now()}`;
      const cat = normalizeHabitCategory(body.category, body.name);
      db.prepare(
        "INSERT OR REPLACE INTO habits (id, name, category, completed_today, streak, lore_kind) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(
        id,
        body.name,
        cat,
        body.completedToday ? 1 : 0,
        Number(body.streak ?? 1),
        body.loreKind || categoryToLoreKind(cat, body.name)
      );
      const row = db.prepare("SELECT * FROM habits WHERE id = ?").get(id);
      return sendJson(res, 201, mapHabit(row));
    }

    // PUT /api/habits/:id
    if (req.method === "PUT" && pathname.startsWith("/api/habits/")) {
      const id = decodeURIComponent(pathname.replace("/api/habits/", ""));
      const existing = db.prepare("SELECT * FROM habits WHERE id = ?").get(id);
      if (!existing) return sendJson(res, 404, { error: "Hábito no encontrado" });

      const body = await readJsonBody(req);
      const name = body.name ?? existing.name;
      const category = normalizeHabitCategory(
        body.category ?? existing.category,
        name
      );
      const completedToday =
        body.completedToday !== undefined
          ? body.completedToday
            ? 1
            : 0
          : existing.completed_today;
      const streak =
        body.streak !== undefined ? Number(body.streak) : existing.streak;
      const loreKind = body.loreKind ?? categoryToLoreKind(category, name);

      db.prepare(
        "UPDATE habits SET name = ?, category = ?, completed_today = ?, streak = ?, lore_kind = ? WHERE id = ?"
      ).run(name, category, completedToday, streak, loreKind, id);
      const updated = db.prepare("SELECT * FROM habits WHERE id = ?").get(id);
      return sendJson(res, 200, mapHabit(updated));
    }

    // DELETE /api/habits/:id
    if (req.method === "DELETE" && pathname.startsWith("/api/habits/")) {
      const id = decodeURIComponent(pathname.replace("/api/habits/", ""));
      db.prepare("DELETE FROM habits WHERE id = ?").run(id);
      return sendJson(res, 200, { deleted: id });
    }

    // POST /api/reminders
    if (req.method === "POST" && pathname === "/api/reminders") {
      const body = await readJsonBody(req);
      const id = body.id || `r-${Date.now()}`;
      db.prepare(
        "INSERT OR REPLACE INTO reminders (id, title, date, time, done) VALUES (?, ?, ?, ?, ?)"
      ).run(
        id,
        body.title,
        body.date || formatIsoDate(new Date()),
        body.time || "09:00",
        body.done ? 1 : 0
      );
      const row = db.prepare("SELECT * FROM reminders WHERE id = ?").get(id);
      return sendJson(res, 201, mapReminder(row));
    }

    // PUT /api/reminders/:id
    if (req.method === "PUT" && pathname.startsWith("/api/reminders/")) {
      const id = decodeURIComponent(pathname.replace("/api/reminders/", ""));
      const existing = db
        .prepare("SELECT * FROM reminders WHERE id = ?")
        .get(id);
      if (!existing)
        return sendJson(res, 404, { error: "Recordatorio no encontrado" });

      const body = await readJsonBody(req);
      const title = body.title ?? existing.title;
      const date = body.date ?? existing.date;
      const time = body.time ?? existing.time;
      const done =
        body.done !== undefined ? (body.done ? 1 : 0) : existing.done;

      db.prepare(
        "UPDATE reminders SET title = ?, date = ?, time = ?, done = ? WHERE id = ?"
      ).run(title, date, time, done, id);
      const updated = db
        .prepare("SELECT * FROM reminders WHERE id = ?")
        .get(id);
      return sendJson(res, 200, mapReminder(updated));
    }

    // DELETE /api/reminders/:id
    if (req.method === "DELETE" && pathname.startsWith("/api/reminders/")) {
      const id = decodeURIComponent(pathname.replace("/api/reminders/", ""));
      db.prepare("DELETE FROM reminders WHERE id = ?").run(id);
      return sendJson(res, 200, { deleted: id });
    }

    return sendJson(res, 404, { error: "Ruta no encontrada" });
  } catch (err) {
    console.error("[Moo SQLite Backend]", err);
    return sendJson(res, 500, { error: String(err) });
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(
      `[Moo Backend] Puerto ${PORT} ya está en uso (backend SQLite activo).`
    );
    process.exit(0);
  }
  console.error("[Moo Backend] Error:", err);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `[Moo SQLite Backend + Agent Core] Activo en http://127.0.0.1:${PORT} -> ${DB_FILE}`
  );
});
