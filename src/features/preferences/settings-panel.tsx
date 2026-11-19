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

type SettingsTab = "ia" | "voice" | "appearance" | "system";

const SETTINGS_TABS: {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "ia", label: "IA y Sandbox", icon: Bot },
  { id: "voice", label: "Voz y Micrófono", icon: Mic },
  { id: "appearance", label: "Apariencia", icon: Palette },
  { id: "system", label: "Atajos y Sistema", icon: Keyboard },
];

const PRESET_SHORTCUTS = ["Ctrl+Shift+M", "Alt+M", "Ctrl+Alt+M", "Alt+Space"];

function SwitchToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus:outline-none ${
        checked
          ? "border-moo-accent bg-moo-accent"
          : "border-zinc-700 bg-zinc-900"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-200 ${
          checked
            ? "translate-x-4 bg-zinc-950"
            : "translate-x-0.5 bg-zinc-400"
        }`}
      />
    </button>
  );
}

export function SettingsPanel() {
  const { preferences, updatePreference, resetPreferences } = usePreferences();
  const [activeTab, setActiveTab] = useState<SettingsTab>("ia");
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
            Configura el modelo de IA, permisos de voz, apariencia y sistema.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetPreferences}>
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Restablecer</span>
        </Button>
      </div>

      {/* Barra de Tabs */}
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

      {/* TAB 1: IA Y SANDBOX */}
      {activeTab === "ia" && (
        <div className="space-y-4">
          {/* Card: Modelo y Conexión */}
          <Card className="p-4 space-y-3.5 border-moo-accent/35">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Bot className="h-4 w-4 text-moo-accent" />
                <span>Modelo de IA & Servidor Local</span>
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
              Moo puede conectarse a un modelo local vía Ollama o utilizar su motor
              integrado de procesamiento seguro sin dependencias externas.
            </p>

            {/* Configuración de Ollama Local */}
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

          {/* Card: Sandbox Estricto de Permisos */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Modo Sandbox Estricto (Solo dentro de Moo Desk)
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                <Lock className="h-2.5 w-2.5" /> Bloqueado sin permiso
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Moo <strong className="text-zinc-200">no puede</strong> realizar
              acciones fuera de la aplicación ni eliminar datos del usuario. Solo
              tiene autorización para{" "}
              <strong className="text-moo-accent">
                crear, modificar y completar
              </strong>{" "}
              dentro de estos 3 módulos:
            </p>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="rounded-lg border border-moo-accent/35 bg-moo-accent/10 px-2.5 py-1 text-[10px] font-medium text-moo-accent">
                ✓ Recordatorios (Crear · Modificar · Completar)
              </span>
              <span className="rounded-lg border border-moo-accent/35 bg-moo-accent/10 px-2.5 py-1 text-[10px] font-medium text-moo-accent">
                ✓ Tareas (Crear · Modificar · Completar)
              </span>
              <span className="rounded-lg border border-moo-accent/35 bg-moo-accent/10 px-2.5 py-1 text-[10px] font-medium text-moo-accent">
                ✓ Hábitos (Crear · Modificar · Completar)
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-medium text-red-300">
                <ShieldAlert className="h-3 w-3" /> Eliminar / Acciones externas:
                Denegado
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: VOZ Y MICRÓFONO */}
      {activeTab === "voice" && (
        <div className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Mic className="mt-0.5 h-4 w-4 shrink-0 text-moo-accent" />
                <div>
                  <div className="text-xs font-semibold text-white">
                    Permiso de micrófono
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Autoriza a Moo a capturar tu voz con MediaRecorder cuando
                    mantienes presionado el botón del micrófono o usas el atajo.
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
                      ? "Micrófono verificado"
                      : "Verificar permiso"}
                  </span>
                </Button>
                <SwitchToggle
                  label="Permiso de micrófono"
                  checked={preferences.microphoneAllowed}
                  onChange={(val) => updatePreference("microphoneAllowed", val)}
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
                ✓ Acceso al micrófono verificado correctamente. Tu voz está lista
                para ser procesada.
              </p>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-moo-accent" />
              <div>
                <div className="text-xs font-semibold text-white">
                  Motor de Transcripción Local (Whisper)
                </div>
                <p className="mt-1 text-[11px] text-zinc-400 leading-relaxed">
                  El audio capturado se procesa en tu propio ordenador con{" "}
                  <strong className="text-zinc-200">
                    Whisper Base Cuantizado (ONNX)
                  </strong>{" "}
                  mediante Web Audio API a 16 kHz mono con normalización de picos
                  y recorte de silencios.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
                <div className="text-[10px] font-medium text-zinc-400">Privacidad</div>
                <div className="mt-0.5 text-xs font-semibold text-white">100% Local / Offline</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
                <div className="text-[10px] font-medium text-zinc-400">Idioma</div>
                <div className="mt-0.5 text-xs font-semibold text-white">Español Nativo</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
                <div className="text-[10px] font-medium text-zinc-400">Entendimiento</div>
                <div className="mt-0.5 text-xs font-semibold text-white">Nombres y Fechas</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: APARIENCIA */}
      {activeTab === "appearance" && (
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

          {/* Card: Efectos y Animaciones */}
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
                    de la mascota Moo para una experiencia más sobria.
                  </p>
                </div>
              </div>
              <SwitchToggle
                label="Reducir movimiento"
                checked={preferences.reduceMotion}
                onChange={(val) => updatePreference("reduceMotion", val)}
              />
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: ATAJOS Y SISTEMA */}
      {activeTab === "system" && (
        <div className="space-y-4">
          {/* Card: Atajo Global de Teclado */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Keyboard className="h-4 w-4 text-moo-accent" />
                  <span>Atajo para desplegar o plegar el Notch</span>
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
              <SwitchToggle
                label="Iniciar en modo Notch compacto"
                checked={preferences.startInCompactMode}
                onChange={(val) =>
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
              <SwitchToggle
                label="Recordar última posición de ventana"
                checked={preferences.rememberWindowPosition}
                onChange={(val) =>
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
                Moo Desk v0.2.0
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
