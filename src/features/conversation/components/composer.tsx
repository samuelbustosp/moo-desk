"use client";

import React, { useState } from "react";
import { Mic, MicOff, SendHorizontal } from "lucide-react";

interface ComposerProps {
  onSend: (text: string) => void;
  onToggleListeningDemo: () => void;
  isListening: boolean;
  microphoneAllowed: boolean;
  disabled?: boolean;
}

export function Composer({
  onSend,
  onToggleListeningDemo,
  isListening,
  microphoneAllowed,
  disabled = false,
}: ComposerProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-white/[0.08] bg-[#111417] px-5 py-3"
    >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleListeningDemo}
          title={
            isListening
              ? "Detener simulación visual de voz"
              : "Activar estado Escuchando"
          }
          aria-label="Control visual de voz"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
            isListening
              ? "border-moo-accent bg-moo-accent text-[#0B0D0E] shadow-[0_0_16px_rgba(245,158,11,0.4)]"
              : microphoneAllowed
              ? "border-white/10 bg-[#1A1F24] text-white hover:border-moo-accent/60"
              : "border-white/[0.06] bg-[#0D0F12] text-moo-muted hover:text-white"
          }`}
        >
          {microphoneAllowed || isListening ? (
            <Mic className="h-4 w-4" />
          ) : (
            <MicOff className="h-4 w-4" />
          )}
        </button>

        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            isListening
              ? "Escuchando en el Notch (modo demostración)..."
              : "Pregúntale algo a Moo o ejecuta un comando rápido..."
          }
          disabled={disabled}
          aria-label="Mensaje para Moo"
          className="h-10 flex-1 rounded-xl border border-white/10 bg-[#171B20] px-3.5 text-xs text-white placeholder:text-moo-muted/75 focus:border-moo-accent focus:outline-none"
        />

        <button
          type="submit"
          disabled={!value.trim() || disabled}
          aria-label="Enviar mensaje"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-moo-accent px-4 text-xs font-semibold text-[#0B0D0E] transition hover:bg-moo-accent-hover disabled:opacity-40"
        >
          <span>Enviar</span>
          <SendHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
    </form>
  );
}
