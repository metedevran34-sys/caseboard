/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Node } from "../types";

export const NOTE_COLORS = [
  { bg: "#20222a", text: "#ffffff" },   // Default black-slate
  { bg: "#ffffff", text: "#18181b" },   // Clean white
  { bg: "#3b82f6", text: "#ffffff" },   // Electric blue
  { bg: "#fef08a", text: "#1c1917" },   // Neon notebook yellow
  { bg: "#bfdbfe", text: "#1e3a8a" },   // Pastel sky blue
  { bg: "#bbf7d0", text: "#064e3b" },   // Soft mint green
  { bg: "#fca5a5", text: "#7f1d1d" },   // Forensic red
  { bg: "#fbcfe8", text: "#831843" },   // Pastel post-it pink
  { bg: "#ddd6fe", text: "#4c1d95" },   // Retro violet
];

export const TEXT_COLORS = [
  "#ffffff",
  "#ffd866",
  "#ef4444",
  "#f59e0b",
  "#4ade80",
  "#38bdf8",
  "#a78bfa",
  "#f472b6",
];

// ─── TAG MANAGERS ───────────────────────────────────────────────
interface TagsProps {
  tags?: string[];
  onChange: (t: string[]) => void;
}

export function Tags({ tags = [], onChange }: TagsProps) {
  const [inp, setInp] = useState("");

  const add = () => {
    const t = inp.trim().replace(/^#/, "");
    if (t && !tags.includes(t)) {
      onChange([...tags, t]);
    }
    setInp("");
  };

  return (
    <div className="border-t border-brand-border px-3 py-2 font-sans">
      {tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {tags.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1.5 rounded bg-brand-surface border border-brand-border px-2.5 py-1 text-[11px] text-brand-text-dim"
            >
              #{t}
              <button
                type="button"
                onClick={() => onChange(tags.filter((x) => x !== t))}
                className="cursor-pointer text-[10px] text-zinc-500 hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <input
          value={inp}
          onChange={(e) => setInp(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="# etiket ekle..."
          className="flex-1 rounded border border-brand-border bg-brand-bg/40 px-2.5 py-1 text-[11px] text-brand-text outline-none focus:border-brand-accent/40"
        />
        <button
          onClick={add}
          type="button"
          className="w-7 rounded border border-brand-border bg-brand-surface text-brand-text transition-colors cursor-pointer hover:bg-zinc-800 text-xs"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── CARD RESIZER ──────────────────────────────────────────────
interface ResizerProps {
  id: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  onUpdate: (fields: { id: string; x?: number; y?: number; w?: number; h?: number }) => void;
  zoom: number;
}

export function Resizer({ id, x = 0, y = 0, w = 240, h = 160, onUpdate, zoom }: ResizerProps) {
  const minW = 180;
  const minH = 80;

  const handleDown = (e: React.MouseEvent, corner: string) => {
    e.stopPropagation();
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    const start = { x, y, w, h };

    const onMouseMove = (me: MouseEvent) => {
      me.preventDefault();
      const dx = (me.clientX - sx) / zoom;
      const dy = (me.clientY - sy) / zoom;
      let nx = start.x;
      let ny = start.y;
      let nw = start.w;
      let nh = start.h;

      if (corner.includes("e")) nw = Math.max(minW, start.w + dx);
      if (corner.includes("s")) nh = Math.max(minH, start.h + dy);
      if (corner.includes("w")) {
        nw = Math.max(minW, start.w - dx);
        nx = start.x + (start.w - nw);
      }
      if (corner.includes("n")) {
        nh = Math.max(minH, start.h - dy);
        ny = start.y + (start.h - nh);
      }

      onUpdate({ id, x: nx, y: ny, w: nw, h: nh });
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const Handle = ({ corner, style, cursor }: { corner: string; style: React.CSSProperties; cursor: string }) => (
    <div
      role="presentation"
      onMouseDown={(e) => handleDown(e, corner)}
      style={{ ...style, cursor }}
      className="absolute h-3.5 w-3.5 rounded-md border border-white/10 bg-white/[0.04] transition-colors hover:bg-white/20 z-10"
    />
  );

  return (
    <>
      <Handle corner="nw" cursor="nwse-resize" style={{ left: 0, top: 0 }} />
      <Handle corner="ne" cursor="nesw-resize" style={{ right: 0, top: 0 }} />
      <Handle corner="sw" cursor="nesw-resize" style={{ left: 0, bottom: 0 }} />
      <div
        role="presentation"
        onMouseDown={(e) => handleDown(e, "se")}
        className="absolute bottom-0 right-0 h-4.5 w-4.5 cursor-nwse-resize flex items-end justify-end p-0.5 z-10"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" className="opacity-25">
          <line x1="2" y1="9" x2="9" y2="2" stroke="white" strokeWidth="1.5" />
          <line x1="6" y1="9" x2="9" y2="6" stroke="white" strokeWidth="1.5" />
        </svg>
      </div>
    </>
  );
}

// ─── CARD WRAPPER ───────────────────────────────────────────────
interface NodeWrapProps {
  node: Node;
  connecting: string | null;
  onConnectEnd: (id: string) => void;
  onConnectStart?: (id: string) => void;
  onPortDragStart: (e: React.MouseEvent, id: string) => void;
  accent?: string;
  inGroup?: boolean;
  children: React.ReactNode;
}

export function NodeWrap({
  node,
  connecting,
  onConnectEnd,
  onConnectStart,
  onPortDragStart,
  accent = "#ef4444",
  inGroup,
  children,
}: NodeWrapProps) {
  const isSrc = connecting === node.id;
  const isDst = !!connecting && connecting !== node.id;
  const [hover, setHover] = useState(false);

  const baseShadow = isSrc
    ? "0 0 28px rgba(245,158,11,0.35)"
    : "0 4px 28px rgba(0,0,0,0.55)";
  const hoverShadow = isSrc
    ? baseShadow
    : "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)";

  const customBg = node.bg ? (node.bg === "#1e1e2e" ? "#20222a" : node.bg) : "#20222a";
    
  const customBorder = isSrc
    ? "#0078d4"
    : isDst
    ? "rgba(239,68,68,0.5)"
    : inGroup
    ? `${accent}40`
    : "#30363d";

  const customRadius = "8px";
  const customShadow = hover ? hoverShadow : baseShadow;

  return (
    <div
      role="presentation"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => {
        if (isDst) {
          e.stopPropagation();
          onConnectEnd(node.id);
        }
      }}
      style={{
        left: node.x || 0,
        top: node.y || 0,
        width: node.w || 240,
        minHeight: node.h || 160,
        borderColor: isDst ? (hover ? "#f59e0b" : "#ef4444") : customBorder,
        backgroundColor: customBg,
        boxShadow: isDst ? "0 0 20px rgba(239,68,68,0.4)" : customShadow,
        zIndex: node.z || 3,
        borderRadius: customRadius,
        opacity: 1,
        willChange: "left, top",
      }}
      className={`absolute select-none overflow-visible border transition-all duration-150 ${
        isDst ? "border-2 border-dashed cursor-pointer ring-2 ring-red-500/20" : "border-solid cursor-default"
      }`}
    >
      {isDst && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[9px] font-bold font-mono px-2 py-0.5 rounded-full shadow-lg z-30 pointer-events-none animate-bounce">
          ⚡ Bağlamak için tıkla
        </div>
      )}
      <div className="h-full w-full overflow-hidden" style={{ borderRadius: customRadius }}>{children}</div>

      {/* Target connection dock */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isDst) {
            onConnectEnd(node.id);
          } else if (onConnectStart) {
            onConnectStart(node.id);
          }
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onPortDragStart(e, node.id);
        }}
        type="button"
        title="Bağlantı Oluştur (Sürükle veya Tıkla)"
        style={{
          boxShadow: isSrc ? "0 0 12px rgba(245,158,11,0.9)" : "0 2px 8px rgba(0,0,0,0.5)",
          borderColor: isSrc ? "#f59e0b" : "#ef4444",
        }}
        className="absolute -right-3 top-1/2 z-20 h-6 w-6 -translate-y-1/2 rounded-full border-2 bg-zinc-950 flex items-center justify-center text-[10px] text-red-400 hover:scale-125 active:scale-95 cursor-crosshair transition-all hover:border-amber-400 hover:text-amber-300"
      >
        ⚡
      </button>
    </div>
  );
}

// ─── CARD HEADER ────────────────────────────────────────────────
interface HeaderProps {
  title: string;
  onTitle: (v: string) => void;
  onDrag: (e: React.MouseEvent) => void;
  accent: string;
  icon?: string;
  isConnSrc: boolean;
  onConnect: () => void;
  onDel: () => void;
  extra?: React.ReactNode;
  onDuplicate?: () => void;
  createdAt?: number;
}

export function Header({
  title,
  onTitle,
  onDrag,
  accent,
  icon,
  isConnSrc,
  onConnect,
  onDel,
  extra,
  onDuplicate,
  createdAt,
}: HeaderProps) {
  const dateStr = createdAt
    ? new Date(createdAt).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      role="presentation"
      onMouseDown={onDrag}
      className="border-b border-brand-border cursor-grab transition-all select-none"
    >
      <div className="flex items-center gap-1.5 px-3 py-2 font-mono">
        {icon && (
          <span style={{ color: accent }} className="text-xs font-bold leading-none select-none">
            {icon}
          </span>
        )}
        <input
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={accent ? { color: accent } : undefined}
          className="flex-1 min-w-0 border-none bg-transparent font-mono text-[11px] font-semibold text-white/80 outline-none leading-none tracking-wider font-bold"
        />
        <div className="flex gap-1 select-none">
          {extra}
          {onDuplicate && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              type="button"
              title="Kopyala"
              className="flex h-[22px] w-6 items-center justify-center rounded border border-cyan-400/25 text-xs text-cyan-400/60 cursor-pointer hover:bg-cyan-400/10 hover:text-cyan-400"
            >
              ⧉
            </button>
          )}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onConnect();
            }}
            type="button"
            title="Bağlantı Noktası"
            style={{
              backgroundColor: isConnSrc ? "rgba(245,158,11,0.18)" : "transparent",
              borderColor: isConnSrc ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.12)",
            }}
            className="flex h-[22px] w-6 items-center justify-center rounded border text-[9px] text-amber-500 cursor-pointer hover:bg-amber-500/10"
          >
            ⚡
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDel();
            }}
            type="button"
            title="Sil"
            className="flex h-[22px] w-6 items-center justify-center rounded border border-white/10 text-xs text-red-500/60 cursor-pointer hover:border-red-500/20 hover:bg-red-500/12 hover:text-red-500"
          >
            ×
          </button>
        </div>
      </div>
      {dateStr && (
        <div className="px-3 pb-1.5 font-mono text-[9px] text-zinc-500 select-none">
          📅 {dateStr}
        </div>
      )}
    </div>
  );
}
