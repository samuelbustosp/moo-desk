"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function mergeClasses(...values: (string | undefined | null | false)[]) {
  return twMerge(clsx(values));
}

/**
 * Calcula automáticamente si un popover debe abrirse hacia arriba o hacia abajo
 * según el espacio disponible en la ventana para que nunca se corte.
 */
function usePopoverPlacement(
  open: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
  estimatedHeight = 200
): "up" | "down" {
  const [placement, setPlacement] = useState<"up" | "down">("down");

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = Math.min(window.innerHeight, 510);
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      setPlacement("up");
    } else {
      setPlacement("down");
    }
  }, [open, triggerRef, estimatedHeight]);

  return placement;
}

export interface UIButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "icon";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: UIButtonProps) {
  const variantStyles = {
    primary:
      "bg-moo-accent text-zinc-950 hover:bg-moo-accent-hover font-semibold shadow-[0_0_18px_-4px_var(--moo-accent)]",
    secondary:
      "bg-zinc-900 text-zinc-100 border border-zinc-800 hover:border-moo-accent/50 hover:bg-zinc-800/80",
    outline:
      "bg-transparent text-zinc-200 border border-zinc-800 hover:border-moo-accent/50 hover:bg-zinc-900 hover:text-white",
    ghost:
      "bg-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
  }[variant];

  const sizeStyles = {
    sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
    md: "h-9 px-3.5 text-xs rounded-xl gap-2",
    icon: "h-9 w-9 rounded-xl justify-center",
  }[size];

  return (
    <button
      type="button"
      className={mergeClasses(
        "inline-flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-moo-accent disabled:pointer-events-none disabled:opacity-45",
        variantStyles,
        sizeStyles,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={mergeClasses(
        "flex h-9 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 transition-colors focus-visible:border-moo-accent/70 focus-visible:outline-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={mergeClasses(
        "rounded-2xl border border-zinc-800/80 bg-zinc-900/50 text-zinc-100 transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "accent" | "muted";
}) {
  const styles = {
    default: "border-zinc-800 bg-zinc-900 text-zinc-300",
    accent: "border-moo-accent/35 bg-moo-accent/15 text-moo-accent",
    muted: "border-zinc-800/70 bg-zinc-950/60 text-zinc-400",
  }[variant];

  return (
    <span
      className={mergeClasses(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        styles,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/* Custom shadcn/ui-style Modal Dialog */
export function ModalDialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0c0c0e] p-5 text-zinc-100 shadow-[0_24px_64px_rgba(0,0,0,0.95)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-white">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-xs text-zinc-400">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* Custom shadcn/ui-style Select Popover */
export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export function SelectPopover<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: SelectOption<T>[];
  onChange: (next: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const placement = usePopoverPlacement(open, containerRef, 160);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const activeLabel =
    options.find((o) => o.value === value)?.label ?? String(value);

  return (
    <div ref={containerRef} className={mergeClasses("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 text-xs font-medium text-zinc-200 transition hover:border-moo-accent/50 focus:outline-none"
      >
        <span className="truncate">{activeLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform ${
            open ? "rotate-180 text-moo-accent" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 z-50 min-w-full w-44 rounded-xl border border-zinc-800 bg-[#0c0c0e] p-1 shadow-2xl ${
            placement === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                  active
                    ? "bg-moo-accent/15 text-moo-accent font-medium"
                    : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {active && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-moo-accent" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Custom shadcn/ui-style Time Picker Popover (Compacto y con apertura inteligente arriba/abajo) */
const QUICK_TIMES = [
  "08:00",
  "09:00",
  "10:30",
  "12:00",
  "14:00",
  "16:00",
  "18:00",
  "20:00",
];

export function TimePickerPopover({
  value,
  onChange,
}: {
  value: string;
  onChange: (nextTime: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const placement = usePopoverPlacement(open, containerRef, 165);

  const [rawH = "09", rawM = "00"] = (value || "09:00").split(":");
  const hourNum = Number(rawH) || 0;
  const minNum = Number(rawM) || 0;

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const stepHour = (delta: number) => {
    const nextH = (hourNum + delta + 24) % 24;
    onChange(
      `${String(nextH).padStart(2, "0")}:${String(minNum).padStart(2, "0")}`
    );
  };

  const stepMin = (delta: number) => {
    const nextM = (minNum + delta + 60) % 60;
    onChange(
      `${String(hourNum).padStart(2, "0")}:${String(nextM).padStart(2, "0")}`
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 font-mono text-xs text-zinc-200 transition hover:border-moo-accent/50 focus:outline-none"
      >
        <span className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-moo-accent" />
          <span>{value || "09:00"}</span>
        </span>
        <ChevronDown
          className={`h-3 w-3 text-zinc-500 transition-transform ${
            open ? "rotate-180 text-moo-accent" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute right-0 z-50 w-52 rounded-2xl border border-zinc-800 bg-[#0c0c0e] p-2.5 shadow-2xl ${
            placement === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          {/* Selector digital compacto Hora : Minuto */}
          <div className="mb-2 flex items-center justify-between rounded-xl border border-zinc-800/90 bg-zinc-950 px-2.5 py-1.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => stepHour(-1)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-white"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center font-mono text-xs font-bold text-white">
                {String(hourNum).padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={() => stepHour(1)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-white"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            <span className="font-mono text-xs font-bold text-moo-accent">
              :
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => stepMin(-15)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-white"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center font-mono text-xs font-bold text-white">
                {String(minNum).padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={() => stepMin(15)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-white"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Grilla rápida de horarios frecuentes (2 filas x 4 columnas, súper compacto) */}
          <div className="grid grid-cols-4 gap-1">
            {QUICK_TIMES.map((preset) => {
              const active = value === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    onChange(preset);
                    setOpen(false);
                  }}
                  className={`rounded-lg border py-1 font-mono text-[10px] transition ${
                    active
                      ? "border-moo-accent bg-moo-accent text-zinc-950 font-semibold"
                      : "border-zinc-800/80 bg-zinc-900/70 text-zinc-300 hover:border-moo-accent/40 hover:text-white"
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* Custom shadcn/ui-style Date Picker Popover */
const SHORT_WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const SHORT_MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export function DatePickerPopover({
  value,
  onChange,
}: {
  value: string; // YYYY-MM-DD
  onChange: (nextIso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const placement = usePopoverPlacement(open, containerRef, 225);

  const parsedDate = useMemo(() => {
    const [y, m, d] = (value || "").split("-").map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  }, [value]);

  const [viewMonth, setViewMonth] = useState(() => ({
    year: parsedDate.getFullYear(),
    month: parsedDate.getMonth(),
  }));

  useEffect(() => {
    if (open) {
      setViewMonth({
        year: parsedDate.getFullYear(),
        month: parsedDate.getMonth(),
      });
    }
  }, [open, parsedDate]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const daysGrid = useMemo(() => {
    const { year, month } = viewMonth;
    const firstDay = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    const offset = (firstDay.getDay() + 6) % 7;

    const list: { iso: string | null; day: number | null }[] = [];
    for (let i = 0; i < offset; i++) {
      list.push({ iso: null, day: null });
    }
    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(month + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      list.push({ iso: `${year}-${mStr}-${dStr}`, day: d });
    }
    return list;
  }, [viewMonth]);

  const formattedLabel = useMemo(() => {
    const [y, m, d] = (value || "").split("-").map(Number);
    if (!y || !m || !d) return "Elegir fecha";
    return `${d} ${SHORT_MONTHS[m - 1]} ${y}`;
  }, [value]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 text-xs text-zinc-200 transition hover:border-moo-accent/50 focus:outline-none"
      >
        <span className="flex items-center gap-2 truncate">
          <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-moo-accent" />
          <span className="font-mono text-xs">{formattedLabel}</span>
        </span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-zinc-500 transition-transform ${
            open ? "rotate-180 text-moo-accent" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 z-50 w-56 rounded-2xl border border-zinc-800 bg-[#0c0c0e] p-2.5 shadow-2xl ${
            placement === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          {/* Header Mes/Año */}
          <div className="mb-1.5 flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-white">
              {SHORT_MONTHS[viewMonth.month]} {viewMonth.year}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setViewMonth((p) =>
                    p.month === 0
                      ? { year: p.year - 1, month: 11 }
                      : { year: p.year, month: p.month - 1 }
                  )
                }
                className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-white"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setViewMonth((p) =>
                    p.month === 11
                      ? { year: p.year + 1, month: 0 }
                      : { year: p.year, month: p.month + 1 }
                  )
                }
                className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-white"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mb-1 grid grid-cols-7 text-center text-[9px] font-medium text-zinc-500">
            {SHORT_WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {daysGrid.map((cell, i) => {
              if (!cell.iso || !cell.day) {
                return <div key={`e-${i}`} className="h-6" />;
              }
              const active = cell.iso === value;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => {
                    onChange(cell.iso!);
                    setOpen(false);
                  }}
                  className={`flex h-6 items-center justify-center rounded-md font-mono text-[11px] transition ${
                    active
                      ? "bg-moo-accent text-zinc-950 font-bold"
                      : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
