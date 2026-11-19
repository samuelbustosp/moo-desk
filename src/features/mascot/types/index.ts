export type MascotState =
  | "idle"
  | "listening"
  | "processing"
  | "responding"
  | "attention"
  | "thinking"
  | "smile"
  | "love"
  | "wink"
  | "sleeping"
  | "surprised"
  | "cool";

export interface MascotStateMeta {
  id: MascotState;
  label: string;
  shortStatus: string;
  description: string;
  badgeColor: string;
}

export const MASCOT_STATES: Record<MascotState, MascotStateMeta> = {
  idle: {
    id: "idle",
    label: "Reposo",
    shortStatus: "En calma en tu escritorio",
    description: "Moo acompaña discretamente sin consumir atención.",
    badgeColor: "#A3ADA8",
  },
  listening: {
    id: "listening",
    label: "Escuchando",
    shortStatus: "Escuchando entrada de audio o voz",
    description: "Moo atento con auriculares captando audio.",
    badgeColor: "#60A5FA",
  },
  processing: {
    id: "processing",
    label: "Procesando",
    shortStatus: "Organizando respuesta...",
    description: "Animación sutil de espera mientras Moo procesa una solicitud.",
    badgeColor: "#FBBF24",
  },
  responding: {
    id: "responding",
    label: "Respondiendo",
    shortStatus: "Mostrando respuesta activa",
    description: "Expresión activa mientras entrega un mensaje.",
    badgeColor: "#8BCF9B",
  },
  attention: {
    id: "attention",
    label: "Atención",
    shortStatus: "Aviso o sugerencia pendiente",
    description: "Aviso discreto cuando hay una nota o recordatorio.",
    badgeColor: "#F59E0B",
  },
  thinking: {
    id: "thinking",
    label: "Pensando",
    shortStatus: "Analizando opciones e ideas",
    description: "Moo mira hacia arriba con ceja pensativa y burbujas de ideas.",
    badgeColor: "#A78BFA",
  },
  smile: {
    id: "smile",
    label: "Sonriendo",
    shortStatus: "Contente y satisfecho",
    description: "Ojos en arco feliz, sonrisita sutil y mejillas rosadas.",
    badgeColor: "#34D399",
  },
  love: {
    id: "love",
    label: "Enamorado",
    shortStatus: "¡Le encanta!",
    description: "Ojos de corazón y corazoncitos flotantes.",
    badgeColor: "#FB7185",
  },
  wink: {
    id: "wink",
    label: "Guiño",
    shortStatus: "Complicidad y picardía",
    description: "Guiño con destello dorado.",
    badgeColor: "#FBBF24",
  },
  sleeping: {
    id: "sleeping",
    label: "Durmiendo",
    shortStatus: "En reposo profundo",
    description: "Ojos cerrados pacíficamente con Zzz.",
    badgeColor: "#93C5FD",
  },
  surprised: {
    id: "surprised",
    label: "Sorprendido",
    shortStatus: "¡Novedad o asombro!",
    description: "Ojos muy abiertos con brillo y boca de asombro.",
    badgeColor: "#F59E0B",
  },
  cool: {
    id: "cool",
    label: "Modo Pro",
    shortStatus: "Gafas oscuras estilo agente",
    description: "Moo con gafas de sol oscuras y reflejos cyber.",
    badgeColor: "#38BDF8",
  },
};
