/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Node } from "../types";
import { NodeWrap, Header, Resizer } from "./NodeBase";

// ─── TODO NODE ──────────────────────────────────────────────────
interface TodoNodeProps {
  node: Node;
  upd: (fields: Partial<Node> & { id: string }) => void;
  del: (id: string) => void;
  drag: (e: React.MouseEvent, id: string) => void;
  connStart: (id: string) => void;
  connecting: string | null;
  connEnd: (id: string) => void;
  portDragStart: (e: React.MouseEvent, id: string) => void;
  zoom: number;
  inGroup?: boolean;
  onDuplicate?: () => void;
}

export function TodoNode({
  node,
  upd,
  del,
  drag,
  connStart,
  connecting,
  connEnd,
  portDragStart,
  zoom,
  inGroup,
  onDuplicate,
}: TodoNodeProps) {
  const [title, setTitle] = useState(node.title || "Yapılacaklar");
  const [inp, setInp] = useState("");
  const todos = node.todos || [];
  const done = todos.filter((t) => t.done).length;
  const pct = todos.length ? Math.round((done / todos.length) * 100) : 0;

  const addItem = () => {
    const t = inp.trim();
    if (!t) return;
    upd({
      id: node.id,
      todos: [...todos, { id: Date.now(), text: t, done: false }],
    });
    setInp("");
  };

  return (
    <NodeWrap
      node={{ ...node, bg: "#0f1f0f" }}
      connecting={connecting}
      onConnectEnd={connEnd}
      onPortDragStart={portDragStart}
      accent="#4ade80"
      inGroup={inGroup}
    >
      <Header
        title={title}
        onTitle={(t) => {
          setTitle(t);
          upd({ id: node.id, title: t });
        }}
        onDrag={(e) => {
          e.stopPropagation();
          drag(e, node.id);
        }}
        accent="#4ade80"
        icon="✅"
        isConnSrc={connecting === node.id}
        onConnect={() => connStart(node.id)}
        onDel={() => del(node.id)}
        onDuplicate={onDuplicate}
        createdAt={node.createdAt}
      />

      {todos.length > 0 && (
        <div className="border-b border-white/5 px-[14px] py-1.5 font-mono select-none">
          <div className="mb-1 flex justify-between">
            <span className="text-[10px] text-zinc-500">
              {done}/{todos.length}
            </span>
            <span className="text-[10px] font-bold text-emerald-400">{pct}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded bg-white/10">
            <div
              style={{ width: `${pct}%` }}
              className={`h-full rounded transition-all duration-300 ${
                pct === 100 ? "bg-emerald-400" : "bg-emerald-400/60"
              }`}
            />
          </div>
        </div>
      )}

      {/* Todo list rendering overlay */}
      <div className="px-3 py-1 font-mono">
        {todos.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-2.5 border-b border-white/4 py-1.5"
          >
            <button
              onClick={() =>
                upd({
                  id: node.id,
                  todos: todos.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)),
                })
              }
              onMouseDown={(e) => e.stopPropagation()}
              type="button"
              className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer ${
                t.done
                  ? "border-emerald-400 bg-emerald-400/20"
                  : "border-white/20 bg-transparent hover:border-emerald-400/50"
              }`}
            >
              {t.done && (
                <svg width="10" height="8" viewBox="0 0 10 8" className="stroke-emerald-400 select-none">
                  <polyline
                    points="1,4 4,7 9,1"
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
            <span
              className={`flex-1 break-word text-[12px] leading-relaxed select-text ${
                t.done ? "text-zinc-500 line-through" : "text-zinc-200"
              }`}
            >
              {t.text}
            </span>
            <button
              onClick={() =>
                upd({
                  id: node.id,
                  todos: todos.filter((x) => x.id !== t.id),
                })
              }
              onMouseDown={(e) => e.stopPropagation()}
              type="button"
              className="px-1 text-xs text-red-500/50 hover:text-red-500 cursor-pointer"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="p-3">
        <div className="flex gap-2">
          <input
            value={inp}
            onChange={(e) => setInp(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addItem();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Yeni görev..."
            className="flex-1 rounded border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[11px] text-zinc-300 outline-none focus:border-[#4ade80]/30"
          />
          <button
            onClick={addItem}
            onMouseDown={(e) => e.stopPropagation()}
            type="button"
            className="flex h-[28px] w-9 items-center justify-center rounded border border-[#4ade80]/35 bg-[#4ade80]/15 text-sm font-semibold text-[#4ade80] cursor-pointer hover:bg-[#4ade80]/25"
          >
            +
          </button>
        </div>
      </div>
      <Resizer id={node.id} x={node.x} y={node.y} w={node.w} h={node.h} onUpdate={upd} zoom={zoom} />
    </NodeWrap>
  );
}

// ─── STOPWATCH (Kronometre) ───
interface StopwatchNodeProps {
  node: Node;
  upd: (fields: Partial<Node> & { id: string }) => void;
  del: (id: string) => void;
  drag: (e: React.MouseEvent, id: string) => void;
  connStart: (id: string) => void;
  connecting: string | null;
  connEnd: (id: string) => void;
  portDragStart: (e: React.MouseEvent, id: string) => void;
  zoom: number;
  inGroup?: boolean;
  onDuplicate?: () => void;
}

export function StopwatchNode({
  node,
  upd,
  del,
  drag,
  connStart,
  connecting,
  connEnd,
  portDragStart,
  zoom,
  inGroup,
  onDuplicate,
}: StopwatchNodeProps) {
  const elapsedMs = node.elapsedMs ?? 0;
  const running = node.running ?? false;
  const startedAt = node.startedAt ?? null;
  const mode = node.swMode || "up";
  const countdownMs = node.countdownMs ?? 60000;
  const [displayMs, setDisplayMs] = useState(elapsedMs);
  const [cdInput, setCdInput] = useState(String(Math.floor(countdownMs / 60000)));

  // Trigger fast fractional rendering updates for high-precision stopwatch visual values
  useEffect(() => {
    if (!running) {
      setDisplayMs(elapsedMs);
      return;
    }
    const tick = () => {
      const now = Date.now();
      const current = startedAt ? elapsedMs + (now - startedAt) : elapsedMs;
      setDisplayMs(current);
      if (mode === "down" && current >= countdownMs) {
        upd({
          id: node.id,
          running: false,
          startedAt: null,
          elapsedMs: countdownMs,
        });
      }
    };
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [running, elapsedMs, startedAt, mode, countdownMs, node.id, upd]);

  // Persists tick rates into React state reducer context safely once per second
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const now = Date.now();
      const newElapsed = startedAt ? elapsedMs + (now - startedAt) : elapsedMs;
      upd({ id: node.id, elapsedMs: newElapsed, startedAt: now });
    }, 1000);
    return () => clearInterval(id);
  }, [running, elapsedMs, startedAt, node.id, upd]);

  const toggle = () => {
    if (running) {
      const now = Date.now();
      const newElapsed = startedAt ? elapsedMs + (now - startedAt) : elapsedMs;
      upd({
        id: node.id,
        running: false,
        startedAt: null,
        elapsedMs: newElapsed,
      });
    } else {
      upd({ id: node.id, running: true, startedAt: Date.now() });
    }
  };

  const reset = () => {
    upd({ id: node.id, elapsedMs: 0, running: false, startedAt: null });
  };

  const fmt = (ms: number) => {
    const safe = Math.max(0, ms);
    const h = Math.floor(safe / 3600000);
    const m = Math.floor((safe % 3600000) / 60000);
    const s = Math.floor((safe % 60000) / 1000);
    const x = Math.floor((safe % 1000) / 10);

    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(x).padStart(2, "0")}`;
    }
    return `${m}:${String(s).padStart(2, "0")}.${String(x).padStart(2, "0")}`;
  };

  const remaining = mode === "down" ? Math.max(0, countdownMs - displayMs) : displayMs;
  const pct = mode === "down" ? Math.min(100, (displayMs / countdownMs) * 100) : null;
  const finished = mode === "down" && displayMs >= countdownMs;

  return (
    <NodeWrap
      node={{ ...node, bg: "#0f1419" }}
      connecting={connecting}
      onConnectEnd={connEnd}
      onPortDragStart={portDragStart}
      accent="#f59e0b"
      inGroup={inGroup}
    >
      <Header
        title="Kronometre ve Geri Sayım"
        onTitle={() => {}}
        onDrag={(e) => {
          e.stopPropagation();
          drag(e, node.id);
        }}
        accent="#f59e0b"
        icon="⏱️"
        isConnSrc={connecting === node.id}
        onConnect={() => connStart(node.id)}
        onDel={() => del(node.id)}
        onDuplicate={onDuplicate}
        createdAt={node.createdAt}
      />
      <div className="flex flex-col items-center gap-3 px-4 py-3 select-none font-mono">
        <div className="mb-1 flex gap-1.5">
          <button
            onClick={() =>
              upd({
                id: node.id,
                swMode: "up",
                elapsedMs: 0,
                running: false,
                startedAt: null,
              })
            }
            onMouseDown={(e) => e.stopPropagation()}
            type="button"
            className={`rounded px-2.5 py-1 text-[10px] border cursor-pointer ${
              mode === "up"
                ? "border-amber-500/50 bg-amber-500/20 text-amber-500"
                : "border-white/10 bg-white/5 text-zinc-500 hover:text-white"
            }`}
          >
            ⏱️ Kronometre
          </button>
          <button
            onClick={() =>
              upd({
                id: node.id,
                swMode: "down",
                elapsedMs: 0,
                running: false,
                startedAt: null,
              })
            }
            onMouseDown={(e) => e.stopPropagation()}
            type="button"
            className={`rounded px-2.5 py-1 text-[10px] border cursor-pointer ${
              mode === "down"
                ? "border-red-500/50 bg-red-500/20 text-red-400"
                : "border-white/10 bg-white/5 text-zinc-500 hover:text-white"
            }`}
          >
            ⏳ Geri Sayım
          </button>
        </div>

        {mode === "down" && !running && (
          <div
            className="flex items-center gap-1.5"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              type="number"
              value={cdInput}
              min="1"
              onChange={(e) => {
                setCdInput(e.target.value);
                const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                upd({ id: node.id, countdownMs: v * 60000, elapsedMs: 0 });
              }}
              className="w-14 rounded border border-white/15 bg-white/5 px-1.5 py-1 text-center text-xs text-white outline-none focus:border-red-500/40"
            />
            <span className="text-[11px] text-zinc-500">dakika</span>
          </div>
        )}

        <div
          className={`font-mono text-3xl font-bold tracking-wider ${
            finished
              ? "text-red-500 animate-pulse"
              : mode === "down"
              ? "text-red-400"
              : "text-amber-400"
          }`}
        >
          {fmt(remaining)}
        </div>

        {mode === "down" && pct !== null && (
          <div className="h-1.5 w-full overflow-hidden rounded bg-white/10">
            <div
              style={{ width: `${pct}%` }}
              className={`h-full rounded transition-all duration-300 ${
                pct > 80 ? "bg-red-500" : "bg-amber-500"
              }`}
            />
          </div>
        )}

        {finished && <div className="text-[11px] font-bold text-red-500 tracking-wide">⚠️ Süre Doldu!</div>}

        <div className="flex gap-2">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={toggle}
            type="button"
            className={`rounded-lg border px-3.5 py-1.5 text-[11px] cursor-pointer font-semibold transition-colors ${
              running
                ? "border-red-500 bg-red-500/15 text-red-400 hover:bg-red-500/25"
                : "border-emerald-500 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
            }`}
          >
            {running ? "Durdur" : "Başlat"}
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={reset}
            type="button"
            className="rounded-lg border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] text-zinc-400 cursor-pointer hover:bg-white/10"
          >
            Sıfırla
          </button>
        </div>
      </div>
      <Resizer id={node.id} x={node.x} y={node.y} w={node.w} h={node.h} onUpdate={upd} zoom={zoom} />
    </NodeWrap>
  );
}

// ─── CLOCK NODE ─────────────────────────────────────────────────
interface ClockNodeProps {
  node: Node;
  upd: (fields: Partial<Node> & { id: string }) => void;
  del: (id: string) => void;
  drag: (e: React.MouseEvent, id: string) => void;
  connStart: (id: string) => void;
  connecting: string | null;
  connEnd: (id: string) => void;
  portDragStart: (e: React.MouseEvent, id: string) => void;
  zoom: number;
  inGroup?: boolean;
  onDuplicate?: () => void;
}

export function ClockNode({
  node,
  upd,
  del,
  drag,
  connStart,
  connecting,
  connEnd,
  portDragStart,
  zoom,
  inGroup,
  onDuplicate,
}: ClockNodeProps) {
  const [now, setNow] = useState(() => new Date());
  const tz = node.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString("tr-TR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const dateStr = now.toLocaleDateString("tr-TR", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <NodeWrap
      node={{ ...node, bg: "#0a0e14" }}
      connecting={connecting}
      onConnectEnd={connEnd}
      onPortDragStart={portDragStart}
      accent="#38bdf8"
      inGroup={inGroup}
    >
      <Header
        title={node.title || "Saat Widget"}
        onTitle={(t) => upd({ id: node.id, title: t })}
        onDrag={(e) => {
          e.stopPropagation();
          drag(e, node.id);
        }}
        accent="#38bdf8"
        icon="🕒"
        isConnSrc={connecting === node.id}
        onConnect={() => connStart(node.id)}
        onDel={() => del(node.id)}
        onDuplicate={onDuplicate}
        createdAt={node.createdAt}
      />
      <div className="flex flex-col items-center gap-1.5 px-4 py-4 font-mono select-none">
        <div className="text-3xl font-bold tracking-wide text-sky-400">{timeStr}</div>
        <div className="text-[11px] text-zinc-500">{dateStr}</div>
      </div>
      <Resizer id={node.id} x={node.x} y={node.y} w={node.w} h={node.h} onUpdate={upd} zoom={zoom} />
    </NodeWrap>
  );
}
