"use client";

import React, { useEffect, useRef } from "react";
import {
  Bot,
  Info,
  RotateCcw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import type { ConversationMessage } from "../types";
import { DEMO_PROMPTS } from "../hooks/use-conversation";
import { MASCOT_STATES, type MascotState } from "@/features/mascot/types";

interface ConversationViewProps {
  messages: ConversationMessage[];
  isSimulatingReply: boolean;
  mascotState: MascotState;
  onSelectMascotState: (state: MascotState) => void;
  onSendPreset: (prompt: string) => void;
  onClearMessages: () => void;
  onRestoreMessages: () => void;
}

export function ConversationView({
  messages,
  isSimulatingReply,
  mascotState,
  onSelectMascotState,
  onSendPreset,
  onClearMessages,
  onRestoreMessages,
}: ConversationViewProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isSimulatingReply]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Sub-header moderno con selector de estados en vivo y controles */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] bg-[#121518]/80 px-5 py-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="mr-1 text-[11px] font-medium text-moo-muted">
            Estado en vivo:
          </span>
          {(Object.keys(MASCOT_STATES) as MascotState[]).map((st) => {
            const item = MASCOT_STATES[st];
            const active = mascotState === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => onSelectMascotState(st)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                  active
                    ? "border-moo-accent bg-moo-accent/15 text-moo-accent shadow-sm"
                    : "border-white/[0.07] bg-[#0B0D0F] text-moo-muted hover:border-white/15 hover:text-white"
                }`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: item.badgeColor }}
                />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={onClearMessages}
              title="Limpiar conversación"
              className="inline-flex items-center gap-1 rounded-lg border border-white/[0.07] bg-[#0B0D0F] px-2.5 py-1 text-[11px] text-moo-muted transition hover:border-white/15 hover:text-white"
            >
              <Trash2 className="h-3 w-3" />
              Limpiar
            </button>
          ) : (
            <button
              type="button"
              onClick={onRestoreMessages}
              className="inline-flex items-center gap-1 rounded-lg border border-moo-accent/40 bg-moo-accent/10 px-2.5 py-1 text-[11px] text-moo-accent transition hover:bg-moo-accent/20"
            >
              <RotateCcw className="h-3 w-3" />
              Restaurar bienvenida
            </button>
          )}
        </div>
      </div>

      {/* Área principal de mensajes */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 moo-scrollbar">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center px-6 py-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-moo-accent/30 bg-moo-accent/10 text-moo-accent shadow-lg">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">
              Moo está listo en tu Notch
            </h3>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-moo-muted">
              Selecciona una tarjeta de comando rápido o escribe abajo para
              probar la experiencia conversacional y las reacciones de la
              mascota.
            </p>
            <div className="mt-5 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-3">
              {DEMO_PROMPTS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSendPreset(preset.prompt)}
                  className="flex flex-col items-start gap-1 rounded-xl border border-white/[0.08] bg-[#14181C] p-3 text-left transition hover:border-moo-accent/60 hover:bg-[#1A1F24]"
                >
                  <Wand2 className="h-3.5 w-3.5 text-moo-accent" />
                  <span className="text-xs font-medium text-white">
                    {preset.label}
                  </span>
                  <span className="line-clamp-2 text-[10px] text-moo-muted">
                    {preset.prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    isUser ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {!isUser && (
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#161A1E] text-moo-accent">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`flex max-w-[78%] flex-col ${
                      isUser ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                        isUser
                          ? "rounded-br-sm bg-moo-accent text-[#0B0D0E] font-medium"
                          : "rounded-bl-sm border border-white/[0.08] bg-[#15191D] text-[#F2F4F3]"
                      }`}
                    >
                      <p>{msg.content}</p>
                      {msg.isDemoResponse && msg.demoTag && (
                        <div className="mt-2 flex items-center gap-1.5 border-t border-white/[0.07] pt-1.5 text-[10px] text-moo-muted">
                          <Info className="h-3 w-3 text-moo-accent" />
                          <span>{msg.demoTag}</span>
                        </div>
                      )}
                    </div>
                    <span className="mt-1 px-1 text-[10px] text-moo-muted">
                      {isUser ? "Tú" : "Moo"} · {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {isSimulatingReply && (
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-moo-accent/40 bg-moo-accent/10 text-moo-accent">
                  <Bot className="h-4 w-4 animate-pulse" />
                </div>
                <div className="rounded-2xl rounded-bl-sm border border-white/[0.08] bg-[#15191D] px-4 py-2.5 text-xs text-moo-muted">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 animate-ping rounded-full bg-moo-accent" />
                    Moo está procesando tu consulta...
                  </span>
                </div>
              </div>
            )}

            {/* Tarjetas de sugerencias rápidas */}
            <div className="pt-2">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-moo-muted">
                <Wand2 className="h-3 w-3 text-moo-accent" />
                <span>Acciones rápidas de prueba:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {DEMO_PROMPTS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSendPreset(preset.prompt)}
                    className="rounded-xl border border-white/[0.08] bg-[#14181C] px-3 py-1.5 text-xs text-moo-muted transition hover:border-moo-accent/60 hover:bg-[#1B2026] hover:text-white"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
