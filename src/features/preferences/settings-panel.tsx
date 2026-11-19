"use client";

import React, { useEffect, useState } from "react";
import {
  AppWindow,
  Bot,
  Check,
  Database,
  Keyboard,
  Lock,
  Mic,
  MousePointer,
  Palette,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Volume2,
} from "lucide-react";
import { ACCENT_PALETTES, usePreferences } from "./index";
import { fetchAgentStatus } from "@/lib/agent-client";
import { Badge, Button, Card, Input } from "@/components/ui/primitives";
import type { AccentTheme } from "@/types";
import type { AgentStatus } from "@/types/agent-contract";

type SettingsTab = "asistente" | "microfono" | "apariencia" | "atajos";

const SETTINGS_TABS: {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "asistente", label: "Asistente", icon: Bot },
  { id: "microfono", label: "Micrófono", icon: Mic },
  { id: "apariencia", label: "Apariencia", icon: Palette },
  { id: "atajos", label: "Atajos", icon: Keyboard },
];

const PRESET_SHORTCUTS = ["Ctrl+Shift+M", "Alt+M", "Ctrl+Alt+M", "Alt+Space"];

/**
 * Switch con diseño y tokens de shadcn UI
 */
function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  className = "",
}: {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        if (!disabled && onCheckedChange) {
          onCheckedChange(!checked);
        }
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moo-accent focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-moo-accent" : "bg-zinc-800"
      } ${className}`}
    >
      <span
        className={`pointer-events-none block h-4 w-4 rounded-full shadow-md ring-0 transition-transform duration-200 ease-in-out ${
          checked
            ? "translate-x-4 bg-zinc-950"
            : "translate-x-0 bg-zinc-300"
        }`}
      />
    </button>
  );
}

export function SettingsPanel() {
  const { preferences, updatePreference, resetPreferences } = usePreferences();
  const [activeTab, setActiveTab] = useState<SettingsTab>("asistente");
  const [recordingShortcut, setRecordingShortcut] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [checkingOllama, setCheckingOllama] = useState(false);
  const [micTestStatus, setMicTestStatus] = useState<
    "idle" | "granted" | "denied"
  >("idle");

  const checkStatus = async () => {
    setCheckingOllama(true);
    try {
      const st = await fetchAgentStatus({
        ollamaUrl: preferences.ollamaUrl,
        ollamaModel: preferences.ollamaModel,
      });
      setAgentStatus(st);
    } finally {
      setCheckingOllama(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRequestMicAccess = async () => {
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setMicTestStatus("denied");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) {
        track.stop();
      }
      updatePreference("microphoneAllowed", true);
      setMicTestStatus("granted");
    } catch {
      setMicTestStatus("denied");
    }
  };

  const handleKeyDownCapture = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!recordingShortcut) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.key === "Escape") {
      setRecordingShortcut(false);
      return;
    }

    const modifiers: string[] = [];
    if (e.ctrlKey) modifiers.push("Ctrl");
    if (e.altKey) modifiers.push("Alt");
    if (e.shiftKey) modifiers.push("Shift");

    const ignoredKeys = ["Control", "Alt", "Shift", "Meta"];
    if (!ignoredKeys.includes(e.key) && modifiers.length > 0) {
      const keyLabel =
        e.key === " "
          ? "Space"
          : e.key.length === 1
          ? e.key.toUpperCase()
          : e.key;
      updatePreference("globalShortcut", [...modifiers, keyLabel].join("+"));
      setRecordingShortcut(false);
    }
  };

  const shortcutParts = preferences.globalShortcut.split("+");

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6 text-xs text-zinc-100 moo-scrollbar">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Ajustes
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            Personaliza el asistente, micrófono, apariencia y atajos de Moo.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetPreferences}>
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Restablecer</span>
        </Button>
      </div>

      {/* Barra de Tabs Simplificada con una sola palabra */}
      <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-1 sm:grid-cols-4">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                isActive
                  ? "bg-moo-accent text-zinc-950 font-semibold shadow-[0_0_15px_-4px_var(--moo-accent)]"
                  : "text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-100"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? "text-zinc-950" : "text-moo-accent"
                }`}
              />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ASISTENTE */}
      {activeTab === "asistente" && (
        <div className="space-y-4">
          {/* Card: Servidor Local / Ollama */}
          <Card className="p-4 space-y-3.5 border-moo-accent/35">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Bot className="h-4 w-4 text-moo-accent" />
                <span>Modelo de IA y Motor Local</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="accent" className="font-mono text-[10px]">
                  {agentStatus?.ollamaAvailable
                    ? `Ollama · ${agentStatus.modelName}`
                    : "Moo Local Guard Activo"}
                </Badge>
                <button
                  type="button"
                  onClick={checkStatus}
                  disabled={checkingOllama}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 p-1 text-zinc-400 hover:border-moo-accent/50 hover:text-white transition"
                  title="Verificar conexión con Ollama"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${
                      checkingOllama ? "animate-spin text-moo-accent" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Moo procesa órdenes con su motor seguro local o mediante conexión directa
              a tu servidor Ollama local sin enviar datos a la nube.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-300">
                  Servidor Ollama local
                </label>
                <Input
                  value={preferences.ollamaUrl}
                  onChange={(e) => updatePreference("ollamaUrl", e.target.value)}
                  placeholder="http://127.0.0.1:11434"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-300">
                  Modelo Ollama (ej. llama3.2, qwen2.5)
                </label>
                <Input
                  value={preferences.ollamaModel}
                  onChange={(e) =>
                    updatePreference("ollamaModel", e.target.value)
                  }
                  placeholder="llama3.2"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </Card>

          {/* Card: Permisos del Sandbox con Switches Shadcn */}
          <Card className="p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">
                  Sandbox de Permisos Estricto
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                <Lock className="h-2.5 w-2.5" /> Aislamiento Activo
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              El asistente opera bajo reglas estrictas: solo puede crear, modificar
              y completar dentro de la app. No tiene permisos de eliminación ni
              acceso al sistema operativo.
            </p>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5">
                <div>
                  <div className="text-xs font-medium text-white">
                    Recordatorios de Calendario
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Crear, modificar y marcar como completados
                  </div>
                </div>
                <Switch checked={true} label="Recordatorios" disabled={true} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5">
                <div>
                  <div className="text-xs font-medium text-white">
                    Tareas Programadas
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Crear, modificar frecuencia y marcar como hechas
                  </div>
                </div>
                <Switch checked={true} label="Tareas" disabled={true} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5">
                <div>
                  <div className="text-xs font-medium text-white">
                    Hábitos y Lore
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Crear hábitos, registrar cumplimiento y avanzar rachas
                  </div>
                </div>
                <Switch checked={true} label="Hábitos" disabled={true} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 p-2.5">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 text-red-400" />
                  <div>
                    <div className="text-xs font-medium text-red-200">
                      Eliminar datos o ejecutar comandos externos
                    </div>
                    <div className="text-[10px] text-red-300/80">
                      Bloqueado por sandbox para proteger tus datos
                    </div>
                  </div>
                </div>
                <Switch checked={false} label="Comandos externos" disabled={true} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: MICRÓFONO */}
      {activeTab === "microfono" && (
        <div className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Mic className="mt-0.5 h-4 w-4 shrink-0 text-moo-accent" />
                <div>
                  <div className="text-xs font-semibold text-white">
                    Captura por micrófono
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Habilita la grabación de audio para dictar órdenes por voz a Moo
                    manteniendo presionado el botón o usando el atajo.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleRequestMicAccess}
                >
                  <Mic className="h-3.5 w-3.5 text-moo-accent" />
                  <span>
                    {micTestStatus === "granted"
                      ? "Verificado ✓"
                      : "Verificar permiso"}
                  </span>
                </Button>
                <Switch
                  label="Permiso de micrófono"
                  checked={preferences.microphoneAllowed}
                  onCheckedChange={(val) => updatePreference("microphoneAllowed", val)}
                />
              </div>
            </div>

            {micTestStatus === "denied" && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-[11px] text-red-400">
                No se pudo acceder al micrófono. Por favor revisa la
                configuración de permisos de micrófono en Windows o en las
                opciones de WebView2.
              </p>
            )}

            {micTestStatus === "granted" && (
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[11px] text-emerald-300">
                ✓ Acceso al micrófono verificado correctamente.
              </p>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-moo-accent" />
              <div>
                <div className="text-xs font-semibold text-white">
                  Transcripción Inmediata y Whisper Local
                </div>
                <p className="mt-1 text-[11px] text-zinc-400 leading-relaxed">
                  Cuando hablas, Moo captura tu voz y genera la transcripción en vivo
                  sin repetir el procesamiento. Si la conexión offline lo requiere,
                  utiliza Whisper cuantizado localmente sin enviar datos a servidores.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
                <div className="text-[10px] font-medium text-zinc-400">Velocidad</div>
                <div className="mt-0.5 text-xs font-semibold text-white">Sin espera redundante</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
                <div className="text-[10px] font-medium text-zinc-400">Privacidad</div>
                <div className="mt-0.5 text-xs font-semibold text-white">100% en tu equipo</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
                <div className="text-[10px] font-medium text-zinc-400">Idioma</div>
                <div className="mt-0.5 text-xs font-semibold text-white">Español nativo</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: APARIENCIA */}
      {activeTab === "apariencia" && (
        <div className="space-y-4">
          {/* Card: Color principal */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Palette className="h-4 w-4 text-moo-accent" />
                <span>Color principal de acento</span>
              </div>
              <span className="text-[11px] text-zinc-400">
                Sidebar, indicadores y logros
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {(Object.keys(ACCENT_PALETTES) as AccentTheme[]).map((themeKey) => {
                const item = ACCENT_PALETTES[themeKey];
                const active = preferences.accentTheme === themeKey;
                return (
                  <button
                    key={themeKey}
                    type="button"
                    onClick={() => updatePreference("accentTheme", themeKey)}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                      active
                        ? "border-moo-accent bg-moo-accent/15 text-white shadow-[0_0_20px_-6px_var(--moo-accent)]"
                        : "border-zinc-800/90 bg-zinc-950/60 text-zinc-400 hover:border-moo-accent/40 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-4 w-4 shrink-0 rounded-full border border-white/20 shadow"
                        style={{ backgroundColor: item.primary }}
                      />
                      <div>
                        <div className="text-xs font-semibold text-white">
                          {item.name}
                        </div>
                        <div className="font-mono text-[10px] text-zinc-400">
                          {item.primary}
                        </div>
                      </div>
                    </div>
                    {active && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-moo-accent text-zinc-950">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Card: Efectos y Animaciones con Switch Shadcn */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-moo-accent" />
                <div>
                  <div className="text-xs font-semibold text-white">
                    Reducir movimiento
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Desactiva el seguimiento del cursor y los parpadeos animados
                    de la mascota Moo para una experiencia visual estática.
                  </p>
                </div>
              </div>
              <Switch
                label="Reducir movimiento"
                checked={preferences.reduceMotion}
                onCheckedChange={(val) => updatePreference("reduceMotion", val)}
              />
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: ATAJOS */}
      {activeTab === "atajos" && (
        <div className="space-y-4">
          {/* Card: Atajo Global de Teclado */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Keyboard className="h-4 w-4 text-moo-accent" />
                  <span>Atajo global para abrir o cerrar el Notch</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Haz clic en el recuadro para grabar una combinación o elige una
                  predefinida.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setRecordingShortcut((v) => !v)}
                onKeyDown={handleKeyDownCapture}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 transition ${
                  recordingShortcut
                    ? "border-moo-accent bg-moo-accent/15 text-moo-accent"
                    : "border-zinc-800 bg-zinc-950/80 text-zinc-200 hover:border-moo-accent/50"
                }`}
              >
                {recordingShortcut ? (
                  <span className="font-mono text-xs">Presiona teclas...</span>
                ) : (
                  shortcutParts.map((part, idx) => (
                    <React.Fragment key={`${part}-${idx}`}>
                      <kbd className="rounded-md border border-zinc-700/80 bg-zinc-900 px-2 py-0.5 font-mono text-[11px] font-semibold text-moo-accent">
                        {part}
                      </kbd>
                      {idx < shortcutParts.length - 1 && (
                        <span className="text-zinc-500">+</span>
                      )}
                    </React.Fragment>
                  ))
                )}
              </button>
            </div>

            <div className="flex items-center gap-1.5 border-t border-zinc-800/70 pt-2.5">
              <span className="mr-1 text-[11px] text-zinc-500">Sugeridos:</span>
              {PRESET_SHORTCUTS.map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => {
                    updatePreference("globalShortcut", sc);
                    setRecordingShortcut(false);
                  }}
                  className={`rounded-lg border px-2.5 py-1 font-mono text-[10px] transition ${
                    preferences.globalShortcut === sc
                      ? "border-moo-accent/50 bg-moo-accent text-zinc-950 font-semibold"
                      : "border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-moo-accent/40 hover:text-zinc-200"
                  }`}
                >
                  {sc}
                </button>
              ))}
            </div>
          </Card>

          {/* Card: Modo de Despliegue (Click vs Hover) */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <MousePointer className="mt-0.5 h-4 w-4 shrink-0 text-moo-accent" />
                <div>
                  <div className="text-xs font-semibold text-white">
                    Desplegar al pasar el ratón (Hover)
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Por defecto se abre con un clic para no estorbar al cambiar de
                    pestaña en el navegador. Actívalo si prefieres abrirlo con solo pasar el cursor.
                  </p>
                </div>
              </div>
              <Switch
                label="Desplegar con Hover"
                checked={preferences.expandTrigger === "hover"}
                onCheckedChange={(hover) =>
                  updatePreference("expandTrigger", hover ? "hover" : "click")
                }
              />
            </div>
          </Card>

          {/* Card: Comportamiento de Ventana */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AppWindow className="mt-0.5 h-4 w-4 shrink-0 text-moo-accent" />
                <div>
                  <div className="text-xs font-semibold text-white">
                    Iniciar en modo Notch compacto
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Abre la aplicación discretamente anclada como notch superior.
                  </p>
                </div>
              </div>
              <Switch
                label="Iniciar en modo Notch compacto"
                checked={preferences.startInCompactMode}
                onCheckedChange={(val) =>
                  updatePreference("startInCompactMode", val)
                }
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-zinc-800/70 pt-3">
              <div className="flex items-start gap-2.5">
                <Sliders className="mt-0.5 h-4 w-4 shrink-0 text-moo-accent" />
                <div>
                  <div className="text-xs font-semibold text-white">
                    Recordar última posición de ventana
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Restaura las coordenadas donde dejaste el notch la última vez.
                  </p>
                </div>
              </div>
              <Switch
                label="Recordar última posición de ventana"
                checked={preferences.rememberWindowPosition}
                onCheckedChange={(val) =>
                  updatePreference("rememberWindowPosition", val)
                }
              />
            </div>
          </Card>

          {/* Card: Base de datos local */}
          <Card className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <Database className="mt-0.5 h-4 w-4 shrink-0 text-moo-accent" />
                <div>
                  <div className="text-xs font-semibold text-white">
                    Base de datos local SQLite
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Tus tareas, hábitos, recordatorios e historial de auditoría
                    se guardan en SQLite local en tu equipo.
                  </p>
                </div>
              </div>
              <Badge variant="accent" className="font-mono shrink-0">
                SQLite Activo
              </Badge>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-800/70 pt-2.5 text-[11px] text-zinc-400">
              <span className="font-mono text-[10px] text-zinc-500">
                backend/moo.sqlite
              </span>
              <span className="font-display text-xs text-white">
                Moo Desk v2.2
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
