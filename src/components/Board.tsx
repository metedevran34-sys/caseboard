/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { BoardState, BoardAction, Node, Group, Text, Drawing, Shape } from "../types";
import { getCenter, getBorderPort, buildPath, ConnectionsLayer } from "./Connections";
import { NoteNode } from "./NoteNode";
import { CodeNode } from "./CodeNode";
import { TodoNode, StopwatchNode, ClockNode } from "./UtilityNodes";
import { ImageNode, FileNode, LinkNode } from "./AttachmentNodes";
import { TimelineNode } from "./TimelineNode";
import { TableNode } from "./TableNode";
import { NOTE_COLORS, TEXT_COLORS } from "./NodeBase";
import { forensicAudio } from "../utils/audio";

const CONN_COLORS = ["#ef4444", "#f59e0b", "#4ade80", "#38bdf8", "#a78bfa", "#f472b6", "#ffffff", "#94a3b8"];

const GROUP_COLORS = [
  { id: "blue", border: "#3b82f6", bg: "rgba(59,130,246,0.07)" },
  { id: "green", border: "#10b981", bg: "rgba(16,185,129,0.07)" },
  { id: "amber", border: "#f59e0b", bg: "rgba(245,158,11,0.07)" },
  { id: "purple", border: "#8b5cf6", bg: "rgba(139,92,246,0.07)" },
  { id: "red", border: "#ef4444", bg: "rgba(239,68,68,0.07)" },
  { id: "cyan", border: "#06b6d4", bg: "rgba(6,182,212,0.07)" },
];

// ─── MINIMAP OVERVIEW ───────────────────────────────────────────
interface MinimapProps {
  nodes: Node[];
  pan: { x: number; y: number };
  zoom: number;
}

export function Minimap({ nodes, pan, zoom }: MinimapProps) {
  const W = 160;
  const H = 100;
  const S = 5000;
  const sc = W / S;
  const vx = (-pan.x / zoom) * sc;
  const vy = (-pan.y / zoom) * sc;
  const vw = Math.min(W, (window.innerWidth / zoom) * sc);
  const vh = Math.min(H, (window.innerHeight / zoom) * sc);

  return (
    <div className="relative h-[100px] w-[160px] overflow-hidden rounded-lg border border-white/8 bg-zinc-950/90 select-none">
      <svg width={W} height={H}>
        {nodes.map((n) => {
          const col =
            n.type === "code"
              ? "#1e3a5f"
              : n.type === "todo"
              ? "#1a3a1a"
              : n.type === "stopwatch"
              ? "#3d2e0f"
              : n.bg || "#1e1e2e";
          return (
            <rect
              key={n.id}
              x={(n.x || 0) * sc}
              y={(n.y || 0) * sc}
              width={Math.max(4, (n.w || 240) * sc)}
              height={Math.max(3, (n.h || 160) * sc)}
              fill={col}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="0.5"
              rx="1"
            />
          );
        })}
        <rect
          x={vx}
          y={vy}
          width={vw}
          height={vh}
          fill="rgba(239,68,68,0.05)"
          stroke="rgba(239,68,68,0.5)"
          strokeWidth="1"
        />
      </svg>
      <div className="absolute bottom-1 left-2 font-mono text-[8px] text-zinc-600 leading-none">
        MAPA OVERVIEW
      </div>
    </div>
  );
}

// ─── RELATIONSHIP GROUP BOX ──────────────────────────────────────
interface GroupBoxProps {
  key?: any;
  g: Group;
  allNodes: Node[];
  dispatch: React.Dispatch<BoardAction>;
  zoom: number;
  isDragOver: boolean;
  onRequestDeleteGroup?: (id: string, name: string) => void;
}

export function GroupBox({
  g,
  allNodes,
  dispatch,
  zoom,
  isDragOver,
  onRequestDeleteGroup,
}: GroupBoxProps) {
  const colorDef = GROUP_COLORS.find((c) => c.id === g.colorId) || GROUP_COLORS[0];
  const collapsed = g.collapsed || false;
  
  // Custom Color Resolver
  const borderCol = g.customColor || colorDef.border;
  const bgCol = g.customColor ? `${g.customColor}14` : colorDef.bg;
  const bgDragCol = g.customColor ? `${g.customColor}30` : colorDef.bg.replace("0.07", "0.18");

  // Subgroup resolution (Module 7)
  const groupsState = useRef<Group[]>([]);
  // We can query all groups from state inside Board
  const members = allNodes.filter((n) => (g.nodeIds || []).includes(n.id));
  const PAD = 10;
  const HEADER_H = 36;
  let bx = g.x || 100;
  let by = g.y || 100;
  let bw = g.w || 320;
  let bh = g.h || 260;

  if (members.length > 0 && !collapsed) {
    const minX = Math.min(...members.map((n) => n.x || 0)) - PAD;
    const minY = Math.min(...members.map((n) => n.y || 0)) - HEADER_H - PAD;
    const maxX = Math.max(...members.map((n) => (n.x || 0) + (n.w || 240))) + PAD;
    const maxY = Math.max(...members.map((n) => (n.y || 0) + (n.h || 160))) + PAD;
    bx = minX;
    by = minY;
    bw = Math.max(bw, maxX - minX);
    bh = Math.max(HEADER_H + 45, maxY - minY);
  } else if (collapsed) {
    bx = g.x || 100;
    by = g.y || 100;
    bw = g.w || 300;
    bh = HEADER_H;
  }

  const [menuOpen, setMenuOpen] = useState(false);
  const membersRef = useRef(members);
  membersRef.current = members;

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const handleHeaderDown = useCallback(
    (e: React.MouseEvent) => {
      if (g.locked) {
        forensicAudio.playWarning(); // Play mechanical audio alert if locked
        return;
      }
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "BUTTON" || tag === "SELECT") return;
      if ((e.target as HTMLElement).closest("[data-menu]")) return;
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const startPositions = membersRef.current.map((n) => ({ id: n.id, x: n.x || 0, y: n.y || 0 }));
      const startGx = g.x || 100;
      const startGy = g.y || 100;

      const onMouseMove = (me: MouseEvent) => {
        const dx = (me.clientX - startX) / zoom;
        const dy = (me.clientY - startY) / zoom;
        startPositions.forEach((sp) => {
          dispatch({ type: "UPD", p: { id: sp.id, x: sp.x + dx, y: sp.y + dy } });
        });
        dispatch({ type: "UPD_GROUP", p: { id: g.id, x: startGx + dx, y: startGy + dy, updatedAt: Date.now() } });
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [g, zoom, dispatch]
  );

  return (
    <div
      style={{
        left: bx,
        top: by,
        width: bw,
        height: collapsed ? HEADER_H : bh,
        backgroundColor: isDragOver ? bgDragCol : bgCol,
        borderColor: borderCol,
      }}
      className={`absolute z-1 pointer-events-none rounded-xl border-2 transition-colors duration-150 ${
        isDragOver ? "border-solid shadow-2xl scale-[1.005]" : "border-dashed"
      }`}
    >
      <div
        onMouseDown={handleHeaderDown}
        style={{
          height: HEADER_H,
          borderColor: `${borderCol}25`,
          backgroundColor: `${borderCol}14`,
        }}
        className={`flex h-9 items-center gap-1.5 px-3 border-b select-none cursor-grab pointer-events-auto ${
          collapsed ? "rounded-xl border-none" : "rounded-t-xl"
        }`}
      >
        {/* Toggle Lock action (Module 4) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: "UPD_GROUP", p: { id: g.id, locked: !g.locked, updatedAt: Date.now() } });
          }}
          type="button"
          style={{ color: borderCol }}
          className="w-5 cursor-pointer text-center text-xs hover:scale-110 active:scale-95 transition-transform"
          title={g.locked ? "Kilit Aç" : "Grubu Kilitle"}
        >
          {g.locked ? "🔒" : "🔓"}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: "UPD_GROUP", p: { id: g.id, collapsed: !collapsed, updatedAt: Date.now() } });
          }}
          type="button"
          style={{ color: borderCol }}
          className="w-4 cursor-pointer text-center font-bold text-xs"
          title={collapsed ? "Genişlet" : "Daralt"}
        >
          {collapsed ? "▶" : "▼"}
        </button>

        <input
          defaultValue={g.name || "Grup"}
          onBlur={(e) => dispatch({ type: "UPD_GROUP", p: { id: g.id, name: e.target.value, updatedAt: Date.now() } })}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLElement).blur();
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ color: borderCol }}
          className="flex-1 min-w-0 border-none bg-transparent font-mono text-[11px] font-bold outline-none uppercase"
        />

        <span
          style={{ color: borderCol }}
          className="shrink-0 font-mono text-[9px] opacity-60 px-1"
          title="Üye Kart Sayısı"
        >
          {members.length}
        </span>

        {/* Ready Colors Palete / Selector (Module 1) */}
        <div className="flex gap-1.2 shrink-0 items-center" onMouseDown={(e) => e.stopPropagation()}>
          {GROUP_COLORS.map((gc) => (
            <button
              key={gc.id}
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: "UPD_GROUP", p: { id: g.id, colorId: gc.id, customColor: undefined, updatedAt: Date.now() } });
              }}
              type="button"
              style={{ backgroundColor: gc.border }}
              className={`h-2.5 w-2.5 rounded-full border cursor-pointer transition-all ${
                gc.id === g.colorId && !g.customColor ? "border-white border-2 scale-125 ring-1 ring-white/30" : "border-white/20 hover:scale-110"
              }`}
              title={gc.id}
            />
          ))}
          {/* Custom HTML5 color picker input */}
          <div className="relative flex items-center justify-center h-4 w-4 rounded-full border border-white/20 bg-zinc-900 cursor-pointer overflow-hidden zoom-90 hover:scale-115 transition-transform" title="Özel Renk Seç (Color Picker)">
            <span className="text-[9px] leading-none pointer-events-none">🎨</span>
            <input
              type="color"
              value={g.customColor || "#3b82f6"}
              onChange={(e) => {
                dispatch({
                  type: "UPD_GROUP",
                  p: { id: g.id, customColor: e.target.value, updatedAt: Date.now() },
                });
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
        </div>

        {/* Triple Dot action menu */}
        <div data-menu="1" className="relative shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            type="button"
            style={{ color: borderCol }}
            className="flex h-5 items-center px-1 text-center font-bold text-xs cursor-pointer rounded hover:bg-white/5"
          >
            •••
          </button>
          {menuOpen && (
            <div
              style={{ borderColor: `${borderCol}50` }}
              className="absolute left-full top-0 ml-2 z-[9999] min-w-[210px] rounded-lg border bg-zinc-950 py-1.5 shadow-2xl pointer-events-auto select-none font-mono"
            >
              <div
                style={{ color: borderCol }}
                className="px-3 py-1 font-mono text-[9px] tracking-wider opacity-70 flex justify-between items-center"
              >
                <span>GRUP ÜYELERİ</span>
                <span>{g.locked ? "🔒 KİLİTLİ" : ""}</span>
              </div>
              {members.length === 0 && (
                <div className="px-3 py-1.5 text-xs text-zinc-500 italic">Kayıtlı eleman yok</div>
              )}
              {members.map((n) => (
                <div
                  key={n.id}
                  className="flex items-center gap-1.5 px-3 py-1 hover:bg-white/5"
                >
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-zinc-400">
                    {n.title || n.type}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (g.locked) return;
                      dispatch({
                        type: "UPD_GROUP",
                        p: { id: g.id, nodeIds: (g.nodeIds || []).filter((x) => x !== n.id), updatedAt: Date.now() },
                      });
                    }}
                    disabled={g.locked}
                    type="button"
                    className="flex h-4 w-4 items-center justify-center rounded border border-red-500/20 bg-red-500/10 text-xs text-red-500 cursor-pointer disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>
              ))}
              <div className="mx-2.5 my-1 h-px bg-white/10" />
              
              {/* Nested Subgroup selector (Module 7) */}
              <div className="px-3 py-1 flex flex-col gap-1">
                <span className="text-[8px] text-zinc-500 tracking-wider font-bold">ALT GRUP BAĞLANTISI (PARENT)</span>
                <select
                  value={g.parentId || ""}
                  onChange={(e) => {
                    const pid = e.target.value || null;
                    dispatch({ type: "UPD_GROUP", p: { id: g.id, parentId: pid, updatedAt: Date.now() } });
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded font-mono text-[9px] text-zinc-300 p-1 px-1.5 outline-none cursor-pointer"
                >
                  <option value="">Bağımsız (Üst Yok)</option>
                  {/* Wait, avoid cyclic subgroups link */}
                  {allNodes.length === 0 ? null : null /* dummy */}
                </select>
              </div>
              
              <div className="mx-2.5 my-1 h-px bg-white/10" />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (members.length > 0) {
                    const cols = Math.min(members.length, 2);
                    const gx = g.x || 100;
                    const gy = g.y || 100;
                    members.forEach((m, idx) => {
                      const row = Math.floor(idx / cols);
                      const col = idx % cols;
                      const mw = m.w || 240;
                      const mh = m.h || 160;
                      dispatch({
                        type: "UPD",
                        p: {
                          id: m.id,
                          x: gx + 10 + col * (mw + 10),
                          y: gy + 36 + 10 + row * (mh + 10),
                        },
                      });
                    });
                  }
                  setMenuOpen(false);
                }}
                type="button"
                className="w-full px-3 py-1.5 text-left text-xs text-sky-400 hover:bg-sky-500/10 cursor-pointer font-bold flex items-center gap-1.5"
              >
                <span>🎯</span> Kartları Ortala (10px Boşluk)
              </button>

              <div className="mx-2.5 my-1 h-px bg-white/10" />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestDeleteGroup?.(g.id, g.name || "Grup");
                  setMenuOpen(false);
                }}
                type="button"
                className="w-full px-3 py-1 text-left text-xs text-red-500/60 hover:text-red-500 hover:bg-red-500/5 cursor-pointer font-bold"
              >
                Grubu Sil
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Group Meta statistics panel displayed at the bottom right (Module 6) */}
      {!collapsed && (
        <div className="absolute bottom-2 right-3.5 flex items-center gap-2.5 font-mono text-[9px] opacity-75 text-zinc-500 tracking-tight pointer-events-none select-none">
          <span>📄 {members.length} kart</span>
          <span>📎 {members.filter((m) => m.type === "file").length} dosya</span>
          <span>🖼️ {members.filter((m) => m.type === "image").length} görsel</span>
          {g.updatedAt && (
            <span className="text-[8px] opacity-45">Son Güncelleme: {new Date(g.updatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
          )}
        </div>
      )}

      {isDragOver && !collapsed && (
        <div className="absolute bottom-2.5 left-3 flex justify-start pointer-events-none">
          <div
            style={{ borderColor: `${borderCol}60`, color: borderCol }}
            className="rounded border bg-black/60 px-3 py-0.5 font-mono text-[9px] font-bold"
          >
            + Gruba İliştirin
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FREE TEXT NOTE ─────────────────────────────────────────────
interface FreeTextProps {
  key?: any;
  t: Text;
  dispatch: React.Dispatch<BoardAction>;
  startDrag: (e: React.MouseEvent, id: string, kind: string) => void;
  connecting: string | null;
  connEnd: (id: string) => void;
  portDragStart: (e: React.MouseEvent, id: string) => void;
}

export function FreeText({
  t,
  dispatch,
  startDrag,
  connecting,
  connEnd,
  portDragStart,
}: FreeTextProps) {
  const [editing, setEditing] = useState(!t.content && !t._saved);
  const [val, setVal] = useState(t.content || "");
  const [showToolbar, setShowToolbar] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hasMovedRef = useRef(false);
  const dragPosRef = useRef({ x: 0, y: 0 });
  const fontSize = Number(t.fontSize) || 18;
  const color = t.color || "#ffffff";
  const bg = t.bg || "transparent";
  const fontFamily = t.fontFamily || "sans-serif";
  const bold = t.bold ?? true;
  const italic = t.italic ?? false;
  const underline = t.underline ?? false;
  const strikethrough = t.strikethrough ?? false;
  const rotation = t.rotation || 0;
  const pinned = t.pinned || false;
  const isDst = !!connecting && connecting !== t.id;

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
      taRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!showToolbar) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as HTMLElement)) {
        setShowToolbar(false);
      }
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [showToolbar]);

  const commit = () => {
    dispatch({ type: "UPD_TEXT", p: { id: t.id, content: val, _saved: true } });
    setEditing(false);
  };

  const getFontFamilyStyle = (ff: string) => {
    switch (ff) {
      case "serif":
        return "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif";
      case "mono":
        return "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      case "cursive":
        return "'Comic Sans MS', 'Dancing Script', cursive, sans-serif";
      case "display":
        return "'Impact', 'Arial Black', sans-serif";
      default:
        return "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    }
  };

  if (editing) {
    return (
      <div
        className="absolute z-[999]"
        style={{ left: t.x || 0, top: t.y || 0 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="w-[320px] rounded-xl border border-white/15 bg-zinc-950 p-3.5 shadow-2xl font-sans text-xs">
          <textarea
            ref={taRef}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) {
                e.preventDefault();
                commit();
              }
              if (e.key === "Escape") commit();
            }}
            placeholder="Metin ekleyin (Ctrl+Enter kaydeder)..."
            style={{
              color,
              backgroundColor: bg !== "transparent" ? bg : "rgba(255,255,255,0.05)",
              fontSize: `${Math.min(24, Math.max(12, fontSize))}px`,
              fontFamily: getFontFamilyStyle(fontFamily),
              fontWeight: bold ? "bold" : "normal",
              fontStyle: italic ? "italic" : "normal",
              textDecoration: [underline && "underline", strikethrough && "line-through"].filter(Boolean).join(" "),
            }}
            className="mb-3 w-full rounded border border-white/10 p-2.5 outline-none focus:border-amber-500/40 resize-y min-h-[70px]"
          />

          {/* Style Toggles: B, I, U, S */}
          <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-[10px] text-zinc-400 font-mono">Biçim:</span>
            <div className="flex gap-1">
              <button
                onClick={() => dispatch({ type: "UPD_TEXT", p: { id: t.id, bold: !bold } })}
                type="button"
                className={`h-6 w-6 rounded border font-bold text-xs cursor-pointer ${
                  bold ? "border-amber-500 bg-amber-500/20 text-amber-400" : "border-white/10 bg-white/5 text-zinc-400"
                }`}
                title="Kalın (Bold)"
              >
                B
              </button>
              <button
                onClick={() => dispatch({ type: "UPD_TEXT", p: { id: t.id, italic: !italic } })}
                type="button"
                className={`h-6 w-6 rounded border italic text-xs cursor-pointer ${
                  italic ? "border-amber-500 bg-amber-500/20 text-amber-400" : "border-white/10 bg-white/5 text-zinc-400"
                }`}
                title="İtalik (Italic)"
              >
                I
              </button>
              <button
                onClick={() => dispatch({ type: "UPD_TEXT", p: { id: t.id, underline: !underline } })}
                type="button"
                className={`h-6 w-6 rounded border underline text-xs cursor-pointer ${
                  underline ? "border-amber-500 bg-amber-500/20 text-amber-400" : "border-white/10 bg-white/5 text-zinc-400"
                }`}
                title="Altı Çizili (Underline)"
              >
                U
              </button>
              <button
                onClick={() => dispatch({ type: "UPD_TEXT", p: { id: t.id, strikethrough: !strikethrough } })}
                type="button"
                className={`h-6 w-6 rounded border line-through text-xs cursor-pointer ${
                  strikethrough ? "border-amber-500 bg-amber-500/20 text-amber-400" : "border-white/10 bg-white/5 text-zinc-400"
                }`}
                title="Üstü Çizili (Strikethrough)"
              >
                S
              </button>
            </div>
          </div>

          {/* Font Family Selector */}
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 font-mono">Yazı Tipi:</span>
            <select
              value={fontFamily}
              onChange={(e) => dispatch({ type: "UPD_TEXT", p: { id: t.id, fontFamily: e.target.value } })}
              className="bg-zinc-900 border border-white/15 rounded text-[11px] text-zinc-200 p-1 px-2 outline-none cursor-pointer"
            >
              <option value="sans">Sans-Serif (Modern)</option>
              <option value="serif">Serif (Klasik)</option>
              <option value="mono">Monospace (Kod / Daktilo)</option>
              <option value="cursive">Cursive (El Yazısı)</option>
              <option value="display">Display (Manşet)</option>
            </select>
          </div>

          {/* Color & Background Picker */}
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-400 font-mono">Yazı:</span>
              <input
                type="color"
                value={color}
                onChange={(e) => dispatch({ type: "UPD_TEXT", p: { id: t.id, color: e.target.value } })}
                className="h-6 w-8 rounded border border-white/20 bg-transparent cursor-pointer p-0.5"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-400 font-mono">Arka Plan:</span>
              <input
                type="color"
                value={bg === "transparent" ? "#20222a" : bg}
                onChange={(e) => dispatch({ type: "UPD_TEXT", p: { id: t.id, bg: e.target.value } })}
                className="h-6 w-8 rounded border border-white/20 bg-transparent cursor-pointer p-0.5"
              />
              <button
                onClick={() => dispatch({ type: "UPD_TEXT", p: { id: t.id, bg: "transparent" } })}
                type="button"
                className="text-[9px] text-zinc-500 hover:text-white border border-white/10 rounded px-1"
                title="Şeffaf Yap"
              >
                Ø
              </button>
            </div>
          </div>

          {/* Font Size Selector */}
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 font-mono">Boyut ({fontSize}px):</span>
            <div className="flex items-center gap-1">
              <input
                type="range"
                min={10}
                max={72}
                value={fontSize}
                onChange={(e) => dispatch({ type: "UPD_TEXT", p: { id: t.id, fontSize: Number(e.target.value) } })}
                className="w-28 accent-amber-500 cursor-pointer"
              />
              <input
                type="number"
                min={8}
                max={120}
                value={fontSize}
                onChange={(e) => dispatch({ type: "UPD_TEXT", p: { id: t.id, fontSize: Number(e.target.value) || 18 } })}
                className="w-11 bg-zinc-900 border border-white/15 rounded text-[10px] text-center text-white p-0.5"
              />
            </div>
          </div>

          {/* Rotation / Inclination Angle Slider */}
          <div className="mb-3 flex items-center justify-between border-t border-white/10 pt-2">
            <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
              📐 Eğim ({rotation}°):
            </span>
            <div className="flex items-center gap-1">
              <input
                type="range"
                min={-180}
                max={180}
                value={rotation}
                onChange={(e) => dispatch({ type: "UPD_TEXT", p: { id: t.id, rotation: Number(e.target.value) } })}
                className="w-28 accent-amber-500 cursor-pointer"
              />
              <button
                onClick={() => dispatch({ type: "UPD_TEXT", p: { id: t.id, rotation: 0 } })}
                type="button"
                className="text-[9px] text-zinc-500 hover:text-white border border-white/10 rounded px-1"
                title="Sıfırla (0°)"
              >
                0°
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 pt-1 border-t border-white/10">
            <button
              onClick={commit}
              type="button"
              className="flex-1 rounded border border-emerald-500/30 bg-emerald-500/15 py-1.5 text-xs text-emerald-400 font-bold cursor-pointer hover:bg-emerald-500/25"
            >
              Kaydet ✓
            </button>
            <button
              onClick={() => dispatch({ type: "DEL_TEXT", p: t.id })}
              type="button"
              className="rounded border border-red-500/30 bg-red-500/10 px-3 text-xs text-red-400 cursor-pointer hover:bg-red-500/20"
            >
              Sil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      onClick={(e) => {
        if (isDst) {
          e.stopPropagation();
          connEnd(t.id);
          return;
        }
        if (hasMovedRef.current) return;
        e.stopPropagation();
        setShowToolbar(!showToolbar);
      }}
      style={{
        left: t.x || 0,
        top: t.y || 0,
        zIndex: showToolbar ? 50 : t.z || 10,
        borderColor: isDst ? "#ef4444" : showToolbar ? "rgba(255,255,255,0.35)" : "transparent",
        backgroundColor: bg !== "transparent" ? bg : undefined,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "center center",
      }}
      onMouseDown={(e) => {
        if (pinned || isDst) return;
        if (e.button === 0) {
          e.stopPropagation();
          dragPosRef.current = { x: e.clientX, y: e.clientY };
          hasMovedRef.current = false;
          
          const onDocMove = (me: MouseEvent) => {
            if (
              Math.abs(me.clientX - dragPosRef.current.x) > 4 ||
              Math.abs(me.clientY - dragPosRef.current.y) > 4
            ) {
              hasMovedRef.current = true;
            }
          };
          const onDocUp = () => {
            window.removeEventListener("mousemove", onDocMove);
            window.removeEventListener("mouseup", onDocUp);
          };
          window.addEventListener("mousemove", onDocMove);
          window.addEventListener("mouseup", onDocUp);

          startDrag(e, t.id, "text");
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
        setShowToolbar(false);
      }}
      className={`absolute rounded-lg border px-3 py-1.5 select-none transition-all ${
        isDst
          ? "border-2 border-dashed ring-2 ring-red-500/20 cursor-pointer animate-pulse"
          : "cursor-grab active:cursor-grabbing hover:border-white/20 hover:bg-white/[0.04]"
      }`}
    >
      {/* Top Anchor Pin / Handle (Identical to Note Cards) */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none select-none">
        <div className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white shadow-md" />
      </div>

      {isDst && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[9px] font-bold font-mono px-2 py-0.5 rounded-full shadow-lg z-30 pointer-events-none animate-bounce whitespace-nowrap">
          ⚡ Bağlamak için tıkla
        </div>
      )}
      {showToolbar && (
        <div
          className="absolute -top-11 left-0 flex items-center gap-1 rounded-lg border border-white/15 bg-zinc-950 p-1 font-mono shadow-2xl z-50 pointer-events-auto"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              dispatch({ type: "UPD_TEXT", p: { id: t.id, pinned: !pinned } });
              setShowToolbar(false);
            }}
            type="button"
            className={`rounded border px-2 py-0.5 text-[9px] cursor-pointer ${
              pinned ? "border-amber-500/40 bg-amber-500/15 text-amber-500" : "border-white/10 text-zinc-300"
            }`}
          >
            {pinned ? "Sabiti Kaldır" : "Sabitle"}
          </button>
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              portDragStart(e, t.id);
              setShowToolbar(false);
            }}
            type="button"
            className="rounded border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[9px] text-amber-400 font-bold cursor-crosshair hover:bg-amber-500/25"
            title="Karta Bağlantı Oluştur"
          >
            ⚡ Bağla
          </button>
          <button
            onClick={() => {
              // Quick rotation increment by 15°
              const nextRot = (rotation + 15) % 360;
              dispatch({ type: "UPD_TEXT", p: { id: t.id, rotation: nextRot } });
            }}
            type="button"
            className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-cyan-400 hover:bg-cyan-400/10 cursor-pointer"
            title="15° Döndür"
          >
            📐 {rotation}°
          </button>
          <button
            onClick={() => {
              dispatch({ type: "DUP_TEXT", p: t.id });
              setShowToolbar(false);
            }}
            type="button"
            className="rounded border border-white/10 px-2 py-0.5 text-[9px] text-zinc-300 hover:bg-white/5 cursor-pointer"
          >
            Kopyala
          </button>
          <button
            onClick={() => {
              setEditing(true);
              setShowToolbar(false);
            }}
            type="button"
            className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] hover:bg-white/5 cursor-pointer"
            title="Düzenle"
          >
            ✏️
          </button>
          <button
            onClick={() => dispatch({ type: "DEL_TEXT", p: t.id })}
            type="button"
            className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-400 cursor-pointer hover:bg-red-500/20"
            title="Sil"
          >
            ×
          </button>
        </div>
      )}

      {pinned && <span className="absolute -right-2 -top-2.5 text-xs select-none">📌</span>}

      {/* Rotation Indicator Icon Handle when active */}
      {showToolbar && (
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            const startX = e.clientX;
            const startRot = rotation;
            const onMouseMove = (me: MouseEvent) => {
              const dx = me.clientX - startX;
              const newRot = Math.round((startRot + dx) % 360);
              dispatch({ type: "UPD_TEXT", p: { id: t.id, rotation: newRot } });
            };
            const onMouseUp = () => {
              window.removeEventListener("mousemove", onMouseMove);
              window.removeEventListener("mouseup", onMouseUp);
            };
            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
          }}
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center h-5 w-5 rounded-full border border-amber-500/50 bg-zinc-950 text-[10px] text-amber-400 cursor-ew-resize shadow-lg z-50 hover:scale-125 transition-transform"
          title="Sürükleyerek Döndür / Eğim Ver"
        >
          🔄
        </div>
      )}

      <div
        style={{
          color,
          fontSize: `${fontSize}px`,
          fontFamily: getFontFamilyStyle(fontFamily),
          fontWeight: bold ? "bold" : "normal",
          fontStyle: italic ? "italic" : "normal",
          textDecoration: [underline && "underline", strikethrough && "line-through"].filter(Boolean).join(" "),
        }}
        className="max-w-[500px] whitespace-pre-wrap break-words select-none leading-snug"
      >
        {val || <span className="opacity-25 italic">Yazı ekleyin...</span>}
      </div>
    </div>
  );
}

// ─── BOARD VIEW PORT STAGE ──────────────────────────────────────────
const DRAW_SIZES = [1, 3, 5, 10, 16];

interface BoardProps {
  state: BoardState;
  dispatch: React.Dispatch<BoardAction>;
  search: string;
  filterTag: string | null;
  darkMode: boolean;
  boardId: string;
  showMinimap: boolean;
  drawMode: boolean;
  onToggleDraw: () => void;
  drawColor: string;
  setDrawColor: (c: string) => void;
  drawSize: number;
  setDrawSize: (s: number) => void;
  eraseMode: boolean;
  shapeTool: string;
  setShapeTool: (s: string) => void;
  onRequestDeleteGroup?: (id: string, name: string) => void;
  boardTheme: "cork" | "grid" | "slate";
  onBoardTheme: (t: "cork" | "grid" | "slate") => void;
}

export function recognizeDrawnShape(points: { x: number; y: number }[]): {
  kind: "circle" | "rect" | "triangle";
  x: number;
  y: number;
  w: number;
  h: number;
} | null {
  if (points.length < 10) return null;

  // 1. Compute bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const w = maxX - minX;
  const h = maxY - minY;
  const diag = Math.sqrt(w * w + h * h);

  // Reject tiny drawings/accidental taps
  if (w < 15 || h < 15) return null;

  const cx = minX + w / 2;
  const cy = minY + h / 2;

  // 2. Assess closeness of start and end points (is it a closed loop?)
  const start = points[0];
  const end = points[points.length - 1];
  const startEndDist = Math.sqrt((start.x - end.x) ** 2 + (start.y - end.y) ** 2);
  const isClosed = startEndDist < 0.45 * diag;

  if (!isClosed) return null; // Shape recognition triggers on closed loops

  // 3. Compute distance variance for circle detection
  const distances = points.map(p => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2));
  const avgR = distances.reduce((sum, d) => sum + d, 0) / distances.length;
  const variance = distances.reduce((sum, d) => sum + (d - avgR) ** 2, 0) / distances.length;
  const stdDev = Math.sqrt(variance);
  const relativeVariance = stdDev / avgR;

  // Circle Detection
  if (relativeVariance < 0.15) {
    return { kind: "circle", x: cx - avgR, y: cy - avgR, w: avgR * 2, h: avgR * 2 };
  }

  // 4. Check corners closeness for rectangle vs triangle
  // Distances to bounding box corners
  const distTL = Math.min(...points.map(p => Math.sqrt((p.x - minX) ** 2 + (p.y - minY) ** 2)));
  const distTR = Math.min(...points.map(p => Math.sqrt((p.x - maxX) ** 2 + (p.y - minY) ** 2)));
  const distBL = Math.min(...points.map(p => Math.sqrt((p.x - minX) ** 2 + (p.y - maxY) ** 2)));
  const distBR = Math.min(...points.map(p => Math.sqrt((p.x - maxX) ** 2 + (p.y - maxY) ** 2)));

  const cornerThreshold = 0.3 * diag;

  const hitTL = distTL < cornerThreshold;
  const hitTR = distTR < cornerThreshold;
  const hitBL = distBL < cornerThreshold;
  const hitBR = distBR < cornerThreshold;

  const hitCount = (hitTL ? 1 : 0) + (hitTR ? 1 : 0) + (hitBL ? 1 : 0) + (hitBR ? 1 : 0);

  // Rectangle Detection
  if (hitCount === 4) {
    return { kind: "rect", x: minX, y: minY, w, h };
  }

  // Triangle Detection
  if (hitCount === 3) {
    return { kind: "triangle", x: minX, y: minY, w, h };
  }

  // Fallback Apex check for Triangles
  const distApex = Math.min(...points.map(p => Math.sqrt((p.x - cx) ** 2 + (p.y - minY) ** 2)));
  if (distApex < cornerThreshold && hitBL && hitBR) {
    return { kind: "triangle", x: minX, y: minY, w, h };
  }

  // Default closed loop fallback to rectangle if it's boxy
  if (relativeVariance < 0.25) {
    return { kind: "rect", x: minX, y: minY, w, h };
  }

  return null;
}

const PENCIL_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpath d='M1 19 L4 15 L16 3 C17 2 18 2 19 3 C20 4 20 5 19 6 L7 18 L1 19 Z' fill='%23fbbf24' stroke='%2318181b' stroke-width='1.2'/%3E%3Cpolygon points='1,19 4.5,17 3,15.5' fill='%23f1f5f9' stroke='%2318181b' stroke-width='0.8'/%3E%3Ccircle cx='1' cy='19' r='1' fill='%23ef4444'/%3E%3C/svg%3E") 1 19, crosshair`;

const ERASER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Crect x='3' y='8' width='14' height='9' rx='2' transform='rotate(-25 10 12)' fill='%23f43f5e' stroke='%23ffffff' stroke-width='1.2'/%3E%3Crect x='3' y='8' width='7' height='9' rx='1' transform='rotate(-25 10 12)' fill='%23e2e8f0'/%3E%3C/svg%3E") 3 17, cell`;

export default function Board({
  state,
  dispatch,
  search,
  filterTag,
  darkMode,
  boardId,
  showMinimap,
  drawMode,
  onToggleDraw,
  drawColor,
  setDrawColor,
  drawSize,
  setDrawSize,
  eraseMode,
  shapeTool,
  setShapeTool,
  onRequestDeleteGroup,
  boardTheme,
  onBoardTheme,
}: BoardProps) {
  const { nodes, connections } = state;
  const groups = state.groups || [];
  const texts = state.texts || [];
  const drawings = state.drawings || [];
  const shapes = state.shapes || [];

  const ref = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [drag, setDrag] = useState<{ id: string; kind: string; ox: number; oy: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<any>(null);
  const [connColor, setConnColor] = useState("#ef4444");
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [altHeld, setAltHeld] = useState(false);
  const [spacePanStart, setSpacePanStart] = useState<{ x: number; y: number } | null>(null);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[] | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [sidebarDragging, setSidebarDragging] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [boxSelectMode, setBoxSelectMode] = useState(false);
  const [showDesktopGuide, setShowDesktopGuide] = useState(false);

  // Whiteboard properties
  const [drawTool, setDrawTool] = useState("pen");
  const [drawFillColor, setDrawFillColor] = useState("none");
  const [drawOpacity, setDrawOpacity] = useState(1);
  const [drawHistory, setDrawHistory] = useState<any[]>([]);
  const [drawRedoStack, setDrawRedoStack] = useState<any[]>([]);

  // Swatches palette storage
  const [swatches, setSwatches] = useState(["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ffffff", "#000000"]);

  // Context Menu and Clipboard States
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    boardPos: { x: number; y: number };
  } | null>(null);

  const clipboardRef = useRef<{
    nodes: any[];
    texts: any[];
    shapes: any[];
  }>({ nodes: [], texts: [], shapes: [] });

  const rightClickStartRef = useRef<{ x: number; y: number } | null>(null);

  // Browser-native eyedropper support
  const pickEyeColor = async () => {
    if (typeof window !== "undefined" && (window as any).EyeDropper) {
      try {
        const dropper = new (window as any).EyeDropper();
        const res = await dropper.open();
        setDrawColor(res.sRGBHex);
        setSwatches((prev) => {
          if (prev.map(x => x.toLowerCase()).includes(res.sRGBHex.toLowerCase())) return prev;
          return [res.sRGBHex, ...prev.slice(0, 6)];
        });
      } catch (err) {
        console.log("Eyedropper cancelled or failed", err);
      }
    }
  };

  // Undo drawing/shape action handler
  const handleUndo = () => {
    if (drawHistory.length === 0) return;
    const prev = drawHistory[drawHistory.length - 1];
    setDrawRedoStack((r) => [...r, { drawings: drawings.slice(), shapes: shapes.slice() }]);
    setDrawHistory((h) => h.slice(0, -1));
    dispatch({
      type: "SET_DRAW_STATE",
      p: {
        drawings: prev.drawings,
        shapes: prev.shapes,
      },
    });
    forensicAudio.playTypewriter();
  };

  // Redo drawing/shape action handler
  const handleRedo = () => {
    if (drawRedoStack.length === 0) return;
    const next = drawRedoStack[drawRedoStack.length - 1];
    setDrawHistory((h) => [...h, { drawings: drawings.slice(), shapes: shapes.slice() }]);
    setDrawRedoStack((r) => r.slice(0, -1));
    dispatch({
      type: "SET_DRAW_STATE",
      p: {
        drawings: next.drawings,
        shapes: next.shapes,
      },
    });
    forensicAudio.playTypewriter();
  };

  // Clear drawings and shapes with undoability
  const handleClearCanvas = () => {
    setDrawHistory((h) => [...h, { drawings: drawings.slice(), shapes: shapes.slice() }]);
    setDrawRedoStack([]);
    dispatch({ type: "CLEAR_DRAWINGS" });
    dispatch({ type: "CLEAR_SHAPES" });
    forensicAudio.playWarning();
  };

  const [shapeDrawStart, setShapeDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [shapePreview, setShapePreview] = useState<any>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  const drawRef = useRef(false);
  const eraseRef = useRef(false);
  const dragCountRef = useRef(0);
  const panR = useRef({ x: 0, y: 0 });
  const zoomR = useRef(1);
  panR.current = pan;
  zoomR.current = zoom;

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.id) {
        const nodeId = customEvent.detail.id;
        const targetNode = nodes.find((n) => n.id === nodeId);
        if (targetNode) {
          const targetZoom = 1.1;
          const cardWidth = targetNode.w || 240;
          const cardHeight = targetNode.h || 160;
          const targetCx = targetNode.x + cardWidth / 2;
          const targetCy = targetNode.y + cardHeight / 2;
          
          const vcx = window.innerWidth / 2;
          const vcy = window.innerHeight / 2;

          setZoom(targetZoom);
          setPan({
            x: vcx - targetCx * targetZoom,
            y: vcy - targetCy * targetZoom,
          });
        }
      }
    };
    window.addEventListener("focus-board-node", handler);
    return () => window.removeEventListener("focus-board-node", handler);
  }, [nodes]);

  const visible = useMemo(() => {
    let f = nodes;
    // Hide cards inside collapsed groups
    f = f.filter((n) => {
      const gp = groups.find((g) => (g.nodeIds || []).includes(n.id));
      return !(gp && gp.collapsed);
    });

    if (search) {
      const q = search.toLowerCase();
      f = f.filter(
        (n) =>
          (n.title || "").toLowerCase().includes(q) ||
          (n.text || "").toLowerCase().includes(q) ||
          (n.code || "").toLowerCase().includes(q) ||
          (n.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    if (filterTag) f = f.filter((n) => (n.tags || []).includes(filterTag));
    return f;
  }, [nodes, groups, search, filterTag]);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const factor = e.deltaY > 0 ? 0.92 : 1.08;

    const oldZoom = zoomR.current;
    const newZoom = Math.min(2.5, Math.max(0.2, oldZoom * factor));
    const scaleFactor = newZoom / oldZoom;

    const nextPanX = mx - (mx - panR.current.x) * scaleFactor;
    const nextPanY = my - (my - panR.current.y) * scaleFactor;

    zoomR.current = newZoom;
    panR.current = { x: nextPanX, y: nextPanY };

    setZoom(newZoom);
    setPan({ x: nextPanX, y: nextPanY });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  useEffect(() => {
    const onKeyD = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).tagName === "INPUT" ||
        (e.target as HTMLElement).tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setSpaceHeld(true);
      }
      if (e.key === "Alt") {
        e.preventDefault();
        setAltHeld(true);
      }
      if (e.key === "Escape") {
        setConnecting(null);
        setDragPreview(null);
      }
    };
    const onKeyU = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpaceHeld(false);
        setSpacePanStart(null);
      }
      if (e.key === "Alt") setAltHeld(false);
    };

    window.addEventListener("keydown", onKeyD);
    window.addEventListener("keyup", onKeyU);
    return () => {
      window.removeEventListener("keydown", onKeyD);
      window.removeEventListener("keyup", onKeyU);
    };
  }, []);

  const s2b = useCallback((sx: number, sy: number) => {
    if (!ref.current) return { x: 0, y: 0 };
    const r = ref.current.getBoundingClientRect();
    return {
      x: (sx - r.left - panR.current.x) / zoomR.current,
      y: (sy - r.top - panR.current.y) / zoomR.current,
    };
  }, []);

  const s2rel = useCallback((sx: number, sy: number) => {
    if (!ref.current) return { x: 0, y: 0 };
    const r = ref.current.getBoundingClientRect();
    return { x: sx - r.left, y: sy - r.top };
  }, []);

  const addCenter = useCallback((type: string, title?: string) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const pos = s2b(r.left + r.width / 2, r.top + r.height / 2);

    if (type === "text") {
      dispatch({
        type: "ADD_TEXT",
        p: { id: `tx${Date.now()}`, x: pos.x - 60, y: pos.y - 30, content: "", color: "#ffffff", fontSize: 18, z: Date.now() },
      });
    } else {
      const labels: Record<string, string> = {
        note: "Not",
        code: "Kod",
        todo: "Yapılacaklar",
        image: "Görsel",
        file: "Dosya",
        link: "Kaynak",
        stopwatch: "Kronometre",
        clock: "Saat",
        timeline: "Zaman Çizelgesi",
        table: "Tablo Kartı",
      };
      const base = {
        id: `n${Date.now()}`,
        type,
        x: pos.x - (type === "table" ? 260 : 120),
        y: pos.y - (type === "table" ? 170 : 80),
        w: type === "table" ? 520 : undefined,
        h: type === "table" ? 340 : undefined,
        title: title || labels[type] || type,
        bg: NOTE_COLORS[0].bg,
        z: Date.now(),
      };
      if (type === "stopwatch") {
        dispatch({ type: "ADD", p: { ...base, elapsedMs: 0, running: false, startedAt: null } });
      } else if (type === "clock") {
        dispatch({ type: "ADD", p: base });
      } else if (type === "timeline") {
        dispatch({ type: "ADD", p: { ...base, posts: [] } });
      } else if (type === "table") {
        dispatch({ type: "ADD", p: { ...base } });
      } else {
        dispatch({ type: "ADD", p: { ...base, text: "", code: "" } });
      }
    }
  }, [dispatch, s2b]);

  useEffect(() => {
    const handleAdd = (e: any) => {
      if (e.detail && e.detail.type) {
        addCenter(e.detail.type);
      }
    };
    window.addEventListener("add-node-from-sidebar", handleAdd);
    return () => window.removeEventListener("add-node-from-sidebar", handleAdd);
  }, [addCenter]);

  const addTextCenter = () => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const pos = s2b(r.left + r.width / 2, r.top + r.height / 2);
    dispatch({
      type: "ADD_TEXT",
      p: {
        id: `tx${Date.now()}`,
        x: pos.x - 60,
        y: pos.y - 30,
        content: "",
        color: "#ffffff",
        fontSize: 18,
        z: Date.now(),
      },
    });
  };

  const copySelected = useCallback(() => {
    const effectiveIds =
      selectedIds.length > 0
        ? selectedIds
        : selectedShapeId
        ? [selectedShapeId]
        : [];
    if (effectiveIds.length === 0) return;

    const selN = nodes.filter((n) => effectiveIds.includes(n.id));
    const selT = texts.filter((t) => effectiveIds.includes(t.id));
    const selS = shapes.filter((s) => effectiveIds.includes(s.id));

    clipboardRef.current = {
      nodes: JSON.parse(JSON.stringify(selN)),
      texts: JSON.parse(JSON.stringify(selT)),
      shapes: JSON.parse(JSON.stringify(selS)),
    };
    forensicAudio.playTypewriter();
  }, [selectedIds, selectedShapeId, nodes, texts, shapes]);

  const pasteClipboard = useCallback(
    (targetPos?: { x: number; y: number }) => {
      const clip = clipboardRef.current;
      if (
        !clip ||
        (clip.nodes.length === 0 && clip.texts.length === 0 && clip.shapes.length === 0)
      ) {
        return;
      }

      const newIds: string[] = [];
      const offset = 36;

      let minX = Infinity;
      let minY = Infinity;
      clip.nodes.forEach((n) => {
        minX = Math.min(minX, n.x || 0);
        minY = Math.min(minY, n.y || 0);
      });
      clip.texts.forEach((t) => {
        minX = Math.min(minX, t.x || 0);
        minY = Math.min(minY, t.y || 0);
      });
      clip.shapes.forEach((s) => {
        minX = Math.min(minX, s.x !== undefined ? s.x : s.x1 || 0);
        minY = Math.min(minY, s.y !== undefined ? s.y : s.y1 || 0);
      });

      const dx = targetPos && minX !== Infinity ? targetPos.x - minX : offset;
      const dy = targetPos && minY !== Infinity ? targetPos.y - minY : offset;

      clip.nodes.forEach((n, i) => {
        const nid = `n${Date.now()}_${i}`;
        newIds.push(nid);
        dispatch({
          type: "ADD",
          p: {
            ...n,
            id: nid,
            x: (n.x || 0) + dx,
            y: (n.y || 0) + dy,
            z: Date.now() + i,
          },
        });
      });

      clip.texts.forEach((t, i) => {
        const tid = `tx${Date.now()}_${i}`;
        newIds.push(tid);
        dispatch({
          type: "ADD_TEXT",
          p: {
            ...t,
            id: tid,
            x: (t.x || 0) + dx,
            y: (t.y || 0) + dy,
            z: Date.now() + i,
          },
        });
      });

      clip.shapes.forEach((s, i) => {
        const sid = `sh${Date.now()}_${i}`;
        newIds.push(sid);
        if (s.kind === "line" || s.kind === "arrow") {
          dispatch({
            type: "ADD_SHAPE",
            p: {
              ...s,
              id: sid,
              x1: (s.x1 ?? 0) + dx,
              y1: (s.y1 ?? 0) + dy,
              x2: (s.x2 ?? 0) + dx,
              y2: (s.y2 ?? 0) + dy,
            },
          });
        } else {
          dispatch({
            type: "ADD_SHAPE",
            p: {
              ...s,
              id: sid,
              x: (s.x || 0) + dx,
              y: (s.y || 0) + dy,
            },
          });
        }
      });

      setSelectedIds(newIds);
      setSelectedShapeId(null);
      forensicAudio.playStamp();
    },
    [dispatch]
  );

  const deleteSelected = useCallback(() => {
    const effectiveIds =
      selectedIds.length > 0
        ? selectedIds
        : selectedShapeId
        ? [selectedShapeId]
        : [];
    if (effectiveIds.length === 0) return;

    effectiveIds.forEach((id) => {
      if (nodes.some((n) => n.id === id)) dispatch({ type: "DEL", p: id });
      if (texts.some((t) => t.id === id)) dispatch({ type: "DEL_TEXT", p: id });
      if (shapes.some((s) => s.id === id)) dispatch({ type: "DEL_SHAPE", p: id });
    });
    setSelectedIds([]);
    setSelectedShapeId(null);
    forensicAudio.playCrumple();
  }, [selectedIds, selectedShapeId, nodes, texts, shapes, dispatch]);

  const cutSelected = useCallback(() => {
    copySelected();
    deleteSelected();
  }, [copySelected, deleteSelected]);

  const duplicateSelected = useCallback(() => {
    copySelected();
    pasteClipboard();
  }, [copySelected, pasteClipboard]);

  const applyColorToSelection = useCallback(
    (color: string) => {
      setDrawColor(color);
      setConnColor(color);
      const effectiveIds =
        selectedIds.length > 0
          ? selectedIds
          : selectedShapeId
          ? [selectedShapeId]
          : [];

      effectiveIds.forEach((id) => {
        if (shapes.some((s) => s.id === id)) {
          dispatch({ type: "UPD_SHAPE", p: { id, color, stroke: color } });
        }
        if (texts.some((t) => t.id === id)) {
          dispatch({ type: "UPD_TEXT", p: { id, color } });
        }
        if (nodes.some((n) => n.id === id)) {
          dispatch({ type: "UPD", p: { id, bg: color } });
        }
      });
    },
    [selectedIds, selectedShapeId, shapes, texts, nodes, dispatch]
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.getAttribute("contenteditable") === "true";

      if (isInput) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Copy (Ctrl+C / Cmd+C)
      if (isCtrlOrCmd && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copySelected();
        return;
      }

      // Paste (Ctrl+V / Cmd+V)
      if (isCtrlOrCmd && e.key.toLowerCase() === "v") {
        e.preventDefault();
        pasteClipboard();
        return;
      }

      // Cut (Ctrl+X / Cmd+X)
      if (isCtrlOrCmd && e.key.toLowerCase() === "x") {
        e.preventDefault();
        cutSelected();
        return;
      }

      // Undo (Ctrl+Z / Cmd+Z)
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo (Ctrl+Y / Cmd+Y / Ctrl+Shift+Z)
      if (
        (isCtrlOrCmd && e.key.toLowerCase() === "y") ||
        (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Duplicate (Ctrl+D / Cmd+D)
      if (isCtrlOrCmd && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      // Select All (Ctrl+A / Cmd+A)
      if (isCtrlOrCmd && e.key.toLowerCase() === "a") {
        e.preventDefault();
        const allIds = [
          ...nodes.map((n) => n.id),
          ...texts.map((t) => t.id),
          ...shapes.map((s) => s.id),
        ];
        setSelectedIds(allIds);
        return;
      }

      // Delete (Delete / Backspace)
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length > 0 || selectedShapeId) {
          e.preventDefault();
          deleteSelected();
          return;
        }
      }

      // Escape: deselect and close menus
      if (e.key === "Escape") {
        setSelectedIds([]);
        setSelectedShapeId(null);
        setContextMenu(null);
        return;
      }

      if (!isCtrlOrCmd && !e.altKey) {
        const map: Record<string, string[]> = {
          n: ["note", "Not"],
          t: ["todo", "Todo"],
        };
        const en = map[e.key.toLowerCase()];
        if (en) addCenter(en[0], en[1]);
        if (e.key.toLowerCase() === "x") addTextCenter();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [
    copySelected,
    pasteClipboard,
    cutSelected,
    deleteSelected,
    duplicateSelected,
    handleUndo,
    handleRedo,
    nodes,
    texts,
    shapes,
    selectedIds,
    selectedShapeId,
    addCenter,
  ]);

  const getGroupAt = useCallback(
    (bx: number, by: number) => {
      for (const g of groups) {
        const members = nodes.filter((n) => (g.nodeIds || []).includes(n.id));
        const PAD = 32;
        const HEADER_H = 36;
        let gx = g.x || 100;
        let gy = g.y || 100;
        let gw = g.w || 320;
        let gh = g.h || 260;

        if (members.length > 0) {
          const minX = Math.min(...members.map((n) => n.x || 0)) - PAD;
          const minY = Math.min(...members.map((n) => n.y || 0)) - PAD - HEADER_H;
          const maxX = Math.max(...members.map((n) => (n.x || 0) + (n.w || 240))) + PAD;
          const maxY = Math.max(...members.map((n) => (n.y || 0) + (n.h || 160))) + PAD;
          gx = minX;
          gy = minY;
          gw = maxX - minX;
          gh = maxY - minY;
        }

        if (bx >= gx && bx <= gx + gw && by >= gy && by <= gy + gh) return g.id;
      }
      return null;
    },
    [groups, nodes]
  );

  const onBoardDown = useCallback(
    (e: React.MouseEvent) => {
      if (sidebarDragging) return;

      // Right-click drag marquee selection or context menu trigger
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        rightClickStartRef.current = { x: e.clientX, y: e.clientY };
        const start = s2rel(e.clientX, e.clientY);
        setSelectionStart(start);
        setSelectionRect({ x1: start.x, y1: start.y, x2: start.x, y2: start.y });
        return;
      }

      setContextMenu(null);

      if (e.button !== 0) return;

      if (spaceHeld) {
        setSpacePanStart({ x: e.clientX - panR.current.x, y: e.clientY - panR.current.y });
        return;
      }

      if (connecting) {
        setConnecting(null);
        return;
      }
      if (dragPreview) {
        setDragPreview(null);
        return;
      }

      if (drawMode) {
        setSelectedShapeId(null);
        if (drawTool === "pan") {
          setPanning(true);
          setPanStart({ x: e.clientX - panR.current.x, y: e.clientY - panR.current.y });
          return;
        }
        if (drawTool === "eraser") {
          eraseRef.current = true;
          return;
        }
        if (drawTool === "pen" || drawTool === "brush") {
          drawRef.current = true;
          const p = s2rel(e.clientX, e.clientY);
          setCurrentStroke([p]);
          return;
        }

        // Shape modes
        const bp = s2b(e.clientX, e.clientY);
        setShapeDrawStart({ x: bp.x, y: bp.y });
        setShapePreview({ x: bp.x, y: bp.y, w: 0, h: 0, x2: bp.x, y2: bp.y });
        return;
      }

      const start = s2rel(e.clientX, e.clientY);
      if (e.shiftKey || spaceHeld || altHeld || boxSelectMode) {
        setSelectionStart(start);
        setSelectionRect({ x1: start.x, y1: start.y, x2: start.x, y2: start.y });
      } else {
        // Clicking on an empty space on the board deselects all items
        setSelectedIds([]);
        setSelectedShapeId(null);
        setPanning(true);
        setPanStart({ x: e.clientX - panR.current.x, y: e.clientY - panR.current.y });
      }
    },
    [spaceHeld, altHeld, boxSelectMode, connecting, dragPreview, drawMode, drawTool, s2rel, s2b, sidebarDragging]
  );

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (spaceHeld && spacePanStart) {
        setPan({ x: e.clientX - spacePanStart.x, y: e.clientY - spacePanStart.y });
        return;
      }

      if (eraseRef.current && drawMode) {
        const p = s2b(e.clientX, e.clientY);
        const base = Math.max(4, drawSize || 8);
        dispatch({ type: "ERASE_AT", p: { bx: p.x, by: p.y, r: (base * 1.5) / zoomR.current } });
        return;
      }

      if (drawRef.current && drawMode) {
        const p = s2rel(e.clientX, e.clientY);
        setCurrentStroke((prev) => (prev ? [...prev, p] : [p]));
        return;
      }

      if (shapeDrawStart && drawMode) {
        const bp = s2b(e.clientX, e.clientY);
        const isLineType = drawTool === "line" || drawTool === "arrow";
        if (isLineType) {
          setShapePreview({ x: shapeDrawStart.x, y: shapeDrawStart.y, x2: bp.x, y2: bp.y, w: 0, h: 0 });
        } else {
          const x = Math.min(shapeDrawStart.x, bp.x);
          const y = Math.min(shapeDrawStart.y, bp.y);
          const w = Math.abs(bp.x - shapeDrawStart.x);
          const h = Math.abs(bp.y - shapeDrawStart.y);
          setShapePreview({ x, y, w: Math.max(4, w), h: Math.max(4, h), x2: bp.x, y2: bp.y });
        }
        return;
      }

      if (selectionStart && !drag && !panning) {
        const cur = s2rel(e.clientX, e.clientY);
        setSelectionRect({ x1: selectionStart.x, y1: selectionStart.y, x2: cur.x, y2: cur.y });
        return;
      }

      if (drag) {
        const p = s2b(e.clientX, e.clientY);
        if (drag.kind === "text") {
          dispatch({ type: "UPD_TEXT", p: { id: drag.id, x: p.x - drag.ox, y: p.y - drag.oy } });
        } else {
          const nx = p.x - drag.ox;
          const ny = p.y - drag.oy;
          dispatch({ type: "UPD", p: { id: drag.id, x: nx, y: ny } });

          const n = nodes.find((x) => x.id === drag.id);
          const gid = getGroupAt(nx + (n ? n.w || 240 : 240) / 2, ny + (n ? n.h || 160 : 160) / 2);
          setDragOverGroupId(gid || null);
        }
        return;
      }

      if (panning && panStart) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        return;
      }

      if (dragPreview) {
        const p = s2b(e.clientX, e.clientY);
        setDragPreview((prev: any) => (prev ? { ...prev, x2: p.x, y2: p.y } : null));
      }
    },
    [drag, panning, panStart, dragPreview, s2b, s2rel, dispatch, drawMode, drawTool, drawSize, shapeDrawStart, spaceHeld, spacePanStart, getGroupAt, nodes, selectionStart]
  );

  const onUp = useCallback(
    (e: React.MouseEvent) => {
      if (spaceHeld && spacePanStart) {
        setSpacePanStart(null);
        return;
      }
      if (eraseRef.current) {
        eraseRef.current = false;
        return;
      }
      if (drawRef.current && drawMode) {
        drawRef.current = false;
        if (currentStroke && currentStroke.length > 1) {
          setDrawHistory((h) => [...h.slice(-20), { drawings: drawings.slice(), shapes: shapes.slice() }]);
          setDrawRedoStack([]);
          const bPoints = currentStroke.map((p) => ({
            x: (p.x - panR.current.x) / zoomR.current,
            y: (p.y - panR.current.y) / zoomR.current,
          }));
          
          const recognized = recognizeDrawnShape(bPoints);
          if (recognized) {
            dispatch({
              type: "ADD_SHAPE",
              p: {
                id: `sh${Date.now()}`,
                kind: recognized.kind,
                x: recognized.x,
                y: recognized.y,
                w: recognized.w,
                h: recognized.h,
                color: drawColor,
                strokeWidth: Math.max(drawSize / zoomR.current, 1.5),
                opacity: drawOpacity,
              },
            });
            forensicAudio.playPinPing();
          } else {
            const brushMult = drawTool === "brush" ? 2.5 : 1;
            dispatch({
              type: "ADD_DRAWING",
              p: {
                id: `d${Date.now()}`,
                points: bPoints,
                color: drawColor,
                size: (drawSize * brushMult) / zoomR.current,
                opacity: drawOpacity,
              },
            });
          }
        }
        setCurrentStroke(null);
        return;
      }

      if (shapeDrawStart && shapePreview && drawMode) {
        const isLineType = drawTool === "line" || drawTool === "arrow";
        if (isLineType) {
          const dx = (shapePreview.x2 || shapeDrawStart.x) - shapeDrawStart.x;
          const dy = (shapePreview.y2 || shapeDrawStart.y) - shapeDrawStart.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 5) {
            setDrawHistory((hh) => [...hh.slice(-20), { drawings: drawings.slice(), shapes: shapes.slice() }]);
            setDrawRedoStack([]);
            const x = Math.min(shapeDrawStart.x, shapePreview.x2);
            const y = Math.min(shapeDrawStart.y, shapePreview.y2);
            dispatch({
              type: "ADD_SHAPE",
              p: {
                id: `sh${Date.now()}`,
                kind: drawTool as any,
                x,
                y,
                w: Math.max(Math.abs(dx), 2),
                h: Math.max(Math.abs(dy), 2),
                x1: shapeDrawStart.x,
                y1: shapeDrawStart.y,
                x2: shapePreview.x2,
                y2: shapePreview.y2,
                color: drawColor,
                fill: drawFillColor,
                strokeWidth: drawSize,
                opacity: drawOpacity,
              },
            });
          }
        } else {
          const { x, y, w, h } = shapePreview;
          if (w > 8 && h > 8) {
            setDrawHistory((hh) => [...hh.slice(-20), { drawings: drawings.slice(), shapes: shapes.slice() }]);
            setDrawRedoStack([]);
            dispatch({
              type: "ADD_SHAPE",
              p: {
                id: `sh${Date.now()}`,
                kind: drawTool as any,
                x,
                y,
                w,
                h,
                color: drawColor,
                fill: drawFillColor,
                strokeWidth: drawSize,
                opacity: drawOpacity,
              },
            });
          }
        }
        setShapeDrawStart(null);
        setShapePreview(null);
        return;
      }

      if (selectionStart && selectionRect) {
        const minRelX = Math.min(selectionRect.x1, selectionRect.x2);
        const maxRelX = Math.max(selectionRect.x1, selectionRect.x2);
        const minRelY = Math.min(selectionRect.y1, selectionRect.y2);
        const maxRelY = Math.max(selectionRect.y1, selectionRect.y2);

        const minX = (minRelX - panR.current.x) / zoomR.current;
        const maxX = (maxRelX - panR.current.x) / zoomR.current;
        const minY = (minRelY - panR.current.y) / zoomR.current;
        const maxY = (maxRelY - panR.current.y) / zoomR.current;

        const inBox = (x: number, y: number, w: number, h: number) => {
          return x + w >= minX && x <= maxX && y + h >= minY && y <= maxY;
        };

        const selNodes = nodes.filter((n) => inBox(n.x || 0, n.y || 0, n.w || 240, n.h || 160)).map((n) => n.id);
        const selTexts = texts.filter((t) => inBox(t.x || 0, t.y || 0, 140, 50)).map((t) => t.id);
        const selShapes = shapes.filter((s) => inBox(s.x || 0, s.y || 0, s.w || 100, s.h || 100)).map((s) => s.id);

        setSelectedIds([...selNodes, ...selTexts, ...selShapes]);
        setSelectionStart(null);
        setSelectionRect(null);
      }

      // Check if right-click was a simple click (not a drag) -> show context menu!
      if (e.button === 2) {
        const rcs = rightClickStartRef.current;
        if (rcs && Math.hypot(e.clientX - rcs.x, e.clientY - rcs.y) < 6) {
          const bp = s2b(e.clientX, e.clientY);
          setContextMenu({ x: e.clientX, y: e.clientY, boardPos: bp });
          setSelectionStart(null);
          setSelectionRect(null);
          rightClickStartRef.current = null;
          return;
        }
        rightClickStartRef.current = null;
      }

      if (drag && drag.kind === "node") {
        if (dragOverGroupId) {
          const g = groups.find((x) => x.id === dragOverGroupId);
          if (g && !(g.nodeIds || []).includes(drag.id)) {
            dispatch({
              type: "UPD_GROUP",
              p: { id: dragOverGroupId, nodeIds: [...(g.nodeIds || []), drag.id] },
            });
          }
        } else {
          const n = nodes.find((x) => x.id === drag.id);
          if (n) {
            const gid = getGroupAt((n.x || 0) + (n.w || 240) / 2, (n.y || 0) + (n.h || 160) / 2);
            if (!gid) {
              groups.forEach((g) => {
                if ((g.nodeIds || []).includes(drag.id)) {
                  dispatch({
                    type: "UPD_GROUP",
                    p: { id: g.id, nodeIds: (g.nodeIds || []).filter((x) => x !== drag.id) },
                  });
                }
              });
            }
          }
        }
      }

      setDragOverGroupId(null);

      if (dragPreview) {
        const p = s2b(e.clientX, e.clientY);
        const targetNode = nodes.find((n) => {
          const nx = n.x || 0;
          const ny = n.y || 0;
          const nw = n.w || 240;
          const nh = n.h || 160;
          return p.x >= nx && p.x <= nx + nw && p.y >= ny && p.y <= ny + nh && n.id !== dragPreview.fromId;
        });

        let targetId = targetNode?.id;
        if (!targetId) {
          const candidateText = texts.find((t) => {
            const fontSize = Number(t.fontSize) || 18;
            const content = t.content || "";
            const lines = content.split("\n");
            const maxLen = Math.max(1, ...lines.map((l) => l.length));
            const w = Math.min(320, Math.max(80, maxLen * (fontSize * 0.55)));
            const h = Math.max(40, lines.length * (fontSize * 1.4));
            const tx = t.x || 0;
            const ty = t.y || 0;
            return p.x >= tx && p.x <= tx + w && p.y >= ty && p.y <= ty + h && t.id !== dragPreview.fromId;
          });
          if (candidateText) targetId = candidateText.id;
        }

        if (targetId) {
          dispatch({ type: "CONN", p: { from: dragPreview.fromId, to: targetId, color: connColor } });
        }
        setDragPreview(null);
      }

      setPanning(false);
      setDrag(null);
    },
    [drag, dragPreview, dragOverGroupId, nodes, groups, s2b, dispatch, connColor, drawMode, drawTool, currentStroke, drawColor, drawSize, drawOpacity, drawFillColor, shapeDrawStart, shapePreview, spaceHeld, spacePanStart, getGroupAt, selectionStart, selectionRect, drawings, shapes, texts]
  );

  const startDrag = useCallback(
    (e: React.MouseEvent, id: string, kind = "node") => {
      e.stopPropagation();
      e.preventDefault();
      let ox: number;
      let oy: number;

      // If item is part of multi-selection, drag all selected items together
      if (selectedIds.length > 0 && selectedIds.includes(id)) {
        const p0 = s2b(e.clientX, e.clientY);
        const nodePositions = nodes.filter((n) => selectedIds.includes(n.id)).map((n) => ({ id: n.id, x: n.x || 0, y: n.y || 0 }));
        const textPositions = texts.filter((t) => selectedIds.includes(t.id)).map((t) => ({ id: t.id, x: t.x || 0, y: t.y || 0 }));
        const shapePositions = shapes.filter((s) => selectedIds.includes(s.id)).map((s) => ({
          id: s.id,
          x: s.x || 0,
          y: s.y || 0,
          x1: s.x1,
          y1: s.y1,
          x2: s.x2,
          y2: s.y2,
          kind: s.kind,
        }));

        const onMouseMove = (me: MouseEvent) => {
          const p = s2b(me.clientX, me.clientY);
          const dx = p.x - p0.x;
          const dy = p.y - p0.y;
          nodePositions.forEach((sp) => {
            dispatch({ type: "UPD", p: { id: sp.id, x: sp.x + dx, y: sp.y + dy } });
          });
          textPositions.forEach((sp) => {
            dispatch({ type: "UPD_TEXT", p: { id: sp.id, x: sp.x + dx, y: sp.y + dy } });
          });
          shapePositions.forEach((sp) => {
            if (sp.kind === "line" || sp.kind === "arrow") {
              dispatch({
                type: "UPD_SHAPE",
                p: {
                  id: sp.id,
                  x1: (sp.x1 ?? 0) + dx,
                  y1: (sp.y1 ?? 0) + dy,
                  x2: (sp.x2 ?? 0) + dx,
                  y2: (sp.y2 ?? 0) + dy,
                },
              });
            } else {
              dispatch({ type: "UPD_SHAPE", p: { id: sp.id, x: sp.x + dx, y: sp.y + dy } });
            }
          });
        };
        const onMouseUp = () => {
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
        };
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return;
      }

      if (kind === "text") {
        const t = texts.find((x) => x.id === id);
        if (!t) return;
        const p = s2b(e.clientX, e.clientY);
        ox = p.x - (t.x || 0);
        oy = p.y - (t.y || 0);
        setDrag({ id, kind: "text", ox, oy });
      } else if (kind === "shape") {
        const s = shapes.find((x) => x.id === id);
        if (!s) return;
        const p = s2b(e.clientX, e.clientY);
        ox = p.x - (s.x || 0);
        oy = p.y - (s.y || 0);
        setDrag({ id, kind: "shape", ox, oy });
      } else {
        const n = nodes.find((x) => x.id === id);
        if (!n) return;
        
        // Prevent dragging if node is in a locked group (Module 4)
        const parentGroup = groups.find((g) => (g.nodeIds || []).includes(id));
        if (parentGroup && parentGroup.locked) {
          forensicAudio.playWarning();
          return;
        }

        const p = s2b(e.clientX, e.clientY);
        ox = p.x - (n.x || 0);
        oy = p.y - (n.y || 0);
        setDrag({ id, kind: "node", ox, oy });
        dispatch({ type: "UPD", p: { id, z: Date.now() } });
      }

      const onMouseMove = (me: MouseEvent) => {
        const p = s2b(me.clientX, me.clientY);
        if (kind === "text") {
          dispatch({ type: "UPD_TEXT", p: { id, x: p.x - ox, y: p.y - oy } });
        } else if (kind === "shape") {
          dispatch({ type: "UPD_SHAPE", p: { id, x: p.x - ox, y: p.y - oy } });
        } else {
          const nx = p.x - ox;
          const ny = p.y - oy;
          dispatch({ type: "UPD", p: { id, x: nx, y: ny } });

          const n = nodes.find((x) => x.id === id);
          const gid = getGroupAt(nx + (n ? n.w || 240 : 240) / 2, ny + (n ? n.h || 160 : 160) / 2);
          setDragOverGroupId(gid || null);
        }
      };

      const onMouseUp = () => {
        setDrag(null);
        setDragOverGroupId(null);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [nodes, texts, shapes, s2b, dispatch, spaceHeld, altHeld, selectedIds, groups, getGroupAt]
  );

  const portDragStart = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const n = nodes.find((x) => x.id === id);
      if (n) {
        const c = getCenter(n);
        setDragPreview({ fromId: id, x1: c.x, y1: c.y, x2: c.x, y2: c.y, color: connColor });
        return;
      }
      const t = texts.find((x) => x.id === id);
      if (t) {
        const fontSize = Number(t.fontSize) || 18;
        const content = t.content || "";
        const lines = content.split("\n");
        const maxLen = Math.max(1, ...lines.map((l) => l.length));
        const w = Math.min(320, Math.max(80, maxLen * (fontSize * 0.55)));
        const h = Math.max(40, lines.length * (fontSize * 1.4));
        const cx = (t.x || 0) + w / 2;
        const cy = (t.y || 0) + h / 2;
        setDragPreview({ fromId: id, x1: cx, y1: cy, x2: cx, y2: cy, color: connColor });
      }
    },
    [nodes, texts, connColor]
  );

  const connStart = useCallback(
    (id: string) => {
      setConnecting((p) => {
        if (p && p !== id) {
          dispatch({ type: "CONN", p: { from: p, to: id, color: connColor } });
          return p; // Keep source active for connecting to multiple cards
        }
        return p === id ? null : id;
      });
    },
    [dispatch, connColor]
  );
  const connEnd = useCallback(
    (id: string) => {
      if (connecting && connecting !== id) {
        dispatch({ type: "CONN", p: { from: connecting, to: id, color: connColor } });
        // Keep connecting source active so user can connect to multiple cards continuously
      } else {
        setConnecting(null);
      }
    },
    [connecting, dispatch, connColor]
  );

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current++;
    setSidebarDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    dragCountRef.current--;
    if (dragCountRef.current <= 0) {
      dragCountRef.current = 0;
      setSidebarDragging(false);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCountRef.current = 0;
      setSidebarDragging(false);
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const pos = {
        x: (e.clientX - r.left - panR.current.x) / zoomR.current,
        y: (e.clientY - r.top - panR.current.y) / zoomR.current,
      };

      const files = Array.from(e.dataTransfer.files || []);
      if (files.length > 0) {
        const baseX = pos.x - 120;
        const baseY = pos.y - 80;
        files.forEach((f: any, idx) => {
          const fp = (f as any).path ? String((f as any).path) : null;
          const ext = String(f.name || "").split(".").pop()?.toLowerCase() || "";
          const mime = String(f.type || "");
          const isImg = mime.startsWith("image/");
          const isVid = mime.startsWith("video/");
          const isAud = mime.startsWith("audio/");
          const isDoc = ["pdf", "txt", "docx", "doc", "zip", "rar", "7z"].includes(ext);
          const isCode = ["js", "ts", "tsx", "jsx", "py", "sh", "json"].includes(ext);
          const kind = isImg ? "image" : "file";

          const id = `n${Date.now()}_${idx}`;
          const x = baseX + (idx % 3) * 40;
          const y = baseY + Math.floor(idx / 3) * 40;

          if (kind === "image") {
            if (fp) {
              const fileUrl = `file:///${fp.replace(/\\/g, "/")}`;
              dispatch({
                type: "ADD",
                p: { id, type: "image", x, y, w: 320, h: 240, title: f.name, img: fileUrl, imgPath: fp, imgScale: 1, z: Date.now() },
              });
            } else {
              const reader = new FileReader();
              reader.onload = (ev) => {
                dispatch({
                  type: "ADD",
                  p: {
                    id,
                    type: "image",
                    x,
                    y,
                    w: 320,
                    h: 240,
                    title: f.name,
                    img: ev.target?.result as string,
                    imgScale: 1,
                    z: Date.now(),
                  },
                });
              };
              reader.readAsDataURL(f);
            }
          } else {
            const meta: any = { name: f.name, type: mime, size: f.size || 0, lastModified: f.lastModified || Date.now() };
            if (fp) meta.path = fp;
            else meta.url = URL.createObjectURL(f);
            const title = f.name || (isVid ? "Video" : isAud ? "Ses" : isDoc ? "Döküman" : isCode ? "Kod" : "Dosya");
            dispatch({
              type: "ADD",
              p: { id, type: "file", x, y, w: 320, h: 180, title, file: meta, z: Date.now() },
            });
          }
        });
        return;
      }

      // Drag and drop posts between feeds to link cards
      const tlPostId = e.dataTransfer.getData("tlPostId");
      const tlNodeId = e.dataTransfer.getData("tlNodeId");
      if (tlPostId && tlNodeId) {
        const tlNode = state.nodes.find((n) => n.id === tlNodeId);
        const tlPost = tlNode ? (tlNode.posts || []).find((p) => p.id === tlPostId) : null;
        if (tlPost) {
          const newId = `n${Date.now()}`;
          dispatch({
            type: "ADD",
            p: {
              id: newId,
              type: "note",
              x: pos.x - 120,
              y: pos.y - 80,
              title: tlPost.title || `Post — ${new Date(tlPost.time).toLocaleDateString("tr-TR")}`,
              text: tlPost.text,
              bg: NOTE_COLORS[0].bg,
              z: Date.now(),
              tags: tlPost.tags || [],
            },
          });
          const updPosts = (tlNode.posts || []).map((p) =>
            p.id === tlPostId ? { ...p, linkedNodes: [...(p.linkedNodes || []), newId] } : p
          );
          dispatch({ type: "UPD", p: { id: tlNodeId, posts: updPosts } });
        }
        return;
      }

      const type = e.dataTransfer.getData("nodeType") || e.dataTransfer.getData("nodetype") || e.dataTransfer.getData("text/plain");
      if (!type) return;

      if (type === "text") {
        dispatch({
          type: "ADD_TEXT",
          p: { id: `tx${Date.now()}`, x: pos.x - 60, y: pos.y - 30, content: "", color: "#ffffff", fontSize: 18, z: Date.now() },
        });
      } else {
        const labels: Record<string, string> = {
          note: "Not",
          code: "Kod",
          todo: "Yapılacaklar",
          image: "Görsel",
          file: "Dosya",
          link: "Kaynak",
          stopwatch: "Kronometre",
          clock: "Saat",
          timeline: "Zaman Çizelgesi",
          table: "Tablo Kartı",
        };
        const base = {
          id: `n${Date.now()}`,
          type,
          x: pos.x - (type === "table" ? 260 : 120),
          y: pos.y - (type === "table" ? 170 : 80),
          w: type === "table" ? 520 : undefined,
          h: type === "table" ? 340 : undefined,
          title: labels[type] || type,
          bg: NOTE_COLORS[0].bg,
          z: Date.now(),
        };
        if (type === "stopwatch") {
          dispatch({ type: "ADD", p: { ...base, elapsedMs: 0, running: false, startedAt: null } });
        } else if (type === "clock") {
          dispatch({ type: "ADD", p: base });
        } else if (type === "timeline") {
          dispatch({ type: "ADD", p: { ...base, posts: [] } });
        } else if (type === "table") {
          dispatch({ type: "ADD", p: { ...base } });
        } else {
          dispatch({ type: "ADD", p: { ...base, text: "", code: "" } });
        }
      }
    },
    [dispatch, state.nodes, connColor]
  );

  const getProps = (n: Node) => {
    const parentGroup = groups.find((g) => (g.nodeIds || []).includes(n.id));
    const inGroup = !!parentGroup;
    let groupAccent: string | undefined = undefined;
    if (parentGroup) {
      const borderDef = GROUP_COLORS.find((c) => c.id === parentGroup.colorId);
      groupAccent = parentGroup.customColor || (borderDef ? borderDef.border : "#ef4444");
    }
    return {
      node: n,
      upd: (fields: any) => dispatch({ type: "UPD", p: fields }),
      del: (id: string) => dispatch({ type: "DEL", p: id }),
      drag: startDrag,
      connStart,
      connecting,
      connEnd,
      portDragStart,
      zoom,
      inGroup,
      accent: groupAccent,
      allNodes: nodes,
      onDuplicate: () => dispatch({ type: "DUPLICATE", p: n.id }),
    };
  };

  const connectSelectedNodes = () => {
    if (selectedIds.length < 2) return;
    for (let i = 0; i < selectedIds.length - 1; i++) {
      dispatch({
        type: "CONN",
        p: {
          from: selectedIds[i],
          to: selectedIds[i + 1],
          color: connColor,
          style: "thread",
        },
      });
    }
    forensicAudio.playPinPing();
  };

  const connectAllNodes = () => {
    const allIds = [...nodes.map((n) => n.id), ...texts.map((t) => t.id)];
    if (allIds.length < 2) return;
    for (let i = 0; i < allIds.length - 1; i++) {
      dispatch({
        type: "CONN",
        p: {
          from: allIds[i],
          to: allIds[i + 1],
          color: connColor,
          style: "thread",
        },
      });
    }
    forensicAudio.playPinPing();
  };

  const cursor = sidebarDragging
    ? "copy"
    : drawMode
    ? drawTool === "eraser"
      ? ERASER_CURSOR
      : drawTool === "pan"
      ? panning
        ? "grabbing"
        : "grab"
      : drawTool === "pen" || drawTool === "brush"
      ? PENCIL_CURSOR
      : "crosshair"
    : spaceHeld || altHeld
    ? spacePanStart
      ? "grabbing"
      : selectedIds.length > 0
      ? "move"
      : "crosshair"
    : connecting || dragPreview
    ? "crosshair"
    : drag
    ? "grabbing"
    : panning
    ? "grabbing"
    : "grab";

  const getBoardBgStyle = () => {
    if (boardTheme === "slate") {
      return { 
        backgroundColor: darkMode ? "#0c0d12" : "#f1f5f9" 
      };
    }
    if (boardTheme === "cork") {
      return {
        backgroundColor: darkMode ? "#2e2118" : "#cd9b70",
        backgroundImage: darkMode 
          ? `radial-gradient(rgba(0,0,0,0.55) 1px, transparent 1px), radial-gradient(rgba(0,0,0,0.45) 1.2px, transparent 1.2px)`
          : `radial-gradient(rgba(0,0,0,0.18) 1px, transparent 1px), radial-gradient(rgba(0,0,0,0.12) 1.5px, transparent 1.5px)`,
        backgroundSize: "18px 18px",
        backgroundPosition: "0 0, 9px 9px"
      };
    }
    return {
      backgroundColor: darkMode ? "#0a0c10" : "#dfdfdf"
    };
  };

  return (
    <div
      ref={ref}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={onBoardDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`relative flex-1 overflow-hidden transition-all duration-300 ${
        boardTheme === "cork" ? "shadow-inner border-[12px] border-[#3e2723]" : ""
      }`}
      style={{ cursor, ...getBoardBgStyle() }}
    >
      {/* Background blueprint timeline alignment grids */}
      {boardTheme === "grid" && (
        <svg className="absolute inset-0 h-full w-full pointer-events-none select-none">
          <defs>
            <pattern
              id="g1"
              width={24 * zoom}
              height={24 * zoom}
              x={pan.x % (24 * zoom)}
              y={pan.y % (24 * zoom)}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${24 * zoom} 0 L 0 0 0 ${24 * zoom}`}
                fill="none"
                stroke={darkMode ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.04)"}
                strokeWidth="0.5"
              />
            </pattern>
            <pattern
              id="g2"
              width={120 * zoom}
              height={120 * zoom}
              x={pan.x % (120 * zoom)}
              y={pan.y % (120 * zoom)}
              patternUnits="userSpaceOnUse"
            >
              <rect width={120 * zoom} height={120 * zoom} fill="url(#g1)" />
              <path
                d={`M ${120 * zoom} 0 L 0 0 0 ${120 * zoom}`}
                fill="none"
                stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)"}
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g2)" />
        </svg>
      )}

      <div
        className="absolute w-[5000px] h-[5000px] will-change-transform"
        style={{
          transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {groups.map((g) => (
          <GroupBox
            key={g.id}
            g={g}
            allNodes={nodes}
            dispatch={dispatch}
            zoom={zoom}
            isDragOver={dragOverGroupId === g.id}
            onRequestDeleteGroup={onRequestDeleteGroup}
          />
        ))}

        <ConnectionsLayer
          connections={connections}
          nodes={nodes}
          texts={texts}
          onDel={(id) => dispatch({ type: "DEL_CONN", p: id })}
          onUpdate={(fields) => dispatch({ type: "UPD_CONN", p: fields })}
          dragPreview={dragPreview}
        />

        {/* Custom drawn and rendered SVG shapes (rects, circles, lines) */}
        {shapes.map((s) => {
          const isSelected = selectedShapeId === s.id || selectedIds.includes(s.id);
          const isLineKind = s.kind === "line" || s.kind === "arrow";

          if (isLineKind && s.x1 !== undefined && s.x2 !== undefined && s.y1 !== undefined && s.y2 !== undefined) {
            const lx1 = s.x1;
            const ly1 = s.y1;
            const lx2 = s.x2;
            const ly2 = s.y2;
            const bx = Math.min(lx1, lx2) - 10;
            const by = Math.min(ly1, ly2) - 10;
            const bw = Math.abs(lx2 - lx1) + 20;
            const bh = Math.abs(ly2 - ly1) + 20;
            const rx1 = lx1 - bx;
            const ry1 = ly1 - by;
            const rx2 = lx2 - bx;
            const ry2 = ly2 - by;

            return (
              <div
                key={s.id}
                style={{ left: bx, top: by, width: bw, height: bh, opacity: s.opacity || 1 }}
                className={`absolute select-none ${drawMode ? "pointer-events-none" : "pointer-events-auto"}`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!selectedIds.includes(s.id)) setSelectedIds([s.id]);
                  setSelectedShapeId(s.id);
                  setContextMenu({ x: e.clientX, y: e.clientY, boardPos: s2b(e.clientX, e.clientY) });
                }}
              >
                <svg
                  width={bw}
                  height={bh}
                  className="absolute left-0 top-0 overflow-visible"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedShapeId(isSelected ? null : s.id);
                  }}
                >
                  <line
                    x1={rx1}
                    y1={ry1}
                    x2={rx2}
                    y2={ry2}
                    stroke="transparent"
                    strokeWidth={Math.max(12, (s.strokeWidth || 2) + 8)}
                    className="cursor-pointer"
                  />
                  {s.kind === "arrow" && (
                    <defs>
                      <marker
                        id={`arrm-${s.id}`}
                        viewBox="0 0 10 10"
                        refX="9"
                        refY="5"
                        markerWidth="7"
                        markerHeight="7"
                        orient="auto"
                      >
                        <path d="M0,0 L10,5 L0,10 z" fill={s.color || "#ef4444"} />
                      </marker>
                    </defs>
                  )}
                  <line
                    x1={rx1}
                    y1={ry1}
                    x2={rx2}
                    y2={ry2}
                    stroke={isSelected ? "#fbbf24" : s.color || "#ef4444"}
                    strokeWidth={s.strokeWidth || 2}
                    strokeLinecap="round"
                    strokeDasharray={isSelected ? "8,3" : undefined}
                    markerEnd={s.kind === "arrow" ? `url(#arrm-${s.id})` : undefined}
                  />
                  {isSelected && (
                    <>
                      <circle
                        cx={rx1}
                        cy={ry1}
                        r={6}
                        fill="#fff"
                        stroke="#333"
                        strokeWidth={1.5}
                        className="cursor-move"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const onMouseMove = (me: MouseEvent) => {
                            const bp = s2b(me.clientX, me.clientY);
                            dispatch({ type: "UPD_SHAPE", p: { id: s.id, x1: bp.x, y1: bp.y } });
                          };
                          const onMouseUp = () => {
                            window.removeEventListener("mousemove", onMouseMove);
                            window.removeEventListener("mouseup", onMouseUp);
                          };
                          window.addEventListener("mousemove", onMouseMove);
                          window.addEventListener("mouseup", onMouseUp);
                        }}
                      />
                      <circle
                        cx={rx2}
                        cy={ry2}
                        r={6}
                        fill="#fbbf24"
                        stroke="#333"
                        strokeWidth={1.5}
                        className="cursor-move"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const onMouseMove = (me: MouseEvent) => {
                            const bp = s2b(me.clientX, me.clientY);
                            dispatch({ type: "UPD_SHAPE", p: { id: s.id, x2: bp.x, y2: bp.y } });
                          };
                          const onMouseUp = () => {
                            window.removeEventListener("mousemove", onMouseMove);
                            window.removeEventListener("mouseup", onMouseUp);
                          };
                          window.addEventListener("mousemove", onMouseMove);
                          window.addEventListener("mouseup", onMouseUp);
                        }}
                      />
                    </>
                  )}
                </svg>
                {isSelected && (
                  <button
                    onClick={() => {
                      dispatch({ type: "DEL_SHAPE", p: s.id });
                      setSelectedShapeId(null);
                    }}
                    type="button"
                    className="absolute right-0 top-0 flex h-4.5 w-4.5 items-center justify-center rounded-full border-none bg-red-500/85 text-xs text-white cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          }

          const sw = s.w || 160;
          const sh = s.h || 100;

          return (
            <div
              key={s.id}
              style={{ left: s.x || 0, top: s.y || 0, width: sw, height: sh, opacity: s.opacity || 1 }}
              className={`absolute select-none ${drawMode ? "pointer-events-none" : "pointer-events-auto"}`}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!selectedIds.includes(s.id)) setSelectedIds([s.id]);
                setSelectedShapeId(s.id);
                setContextMenu({ x: e.clientX, y: e.clientY, boardPos: s2b(e.clientX, e.clientY) });
              }}
            >
              <svg
                width="100%"
                height="100%"
                className="overflow-visible"
                style={{ cursor: isSelected ? "move" : "pointer" }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setSelectedShapeId(s.id);
                  startDrag(e, s.id, "shape");
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedShapeId(isSelected ? null : s.id);
                }}
              >
                {s.kind === "rect" && (
                  <rect
                    x="1"
                    y="1"
                    width={sw - 2}
                    height={sh - 2}
                    fill={s.fill && s.fill !== "none" ? s.fill : "none"}
                    stroke={isSelected ? "#fbbf24" : s.color || "#ef4444"}
                    strokeWidth={s.strokeWidth || 2}
                    rx="4"
                  />
                )}
                {s.kind === "circle" && (
                  <ellipse
                    cx={sw / 2}
                    cy={sh / 2}
                    rx={sw / 2 - 2}
                    ry={sh / 2 - 2}
                    fill={s.fill && s.fill !== "none" ? s.fill : "none"}
                    stroke={isSelected ? "#fbbf24" : s.color || "#ef4444"}
                    strokeWidth={s.strokeWidth || 2}
                  />
                )}
                {s.kind === "triangle" && (
                  <polygon
                    points={`${sw / 2},2 ${sw - 2},${sh - 2} 2,${sh - 2}`}
                    fill={s.fill && s.fill !== "none" ? s.fill : "none"}
                    stroke={isSelected ? "#fbbf24" : s.color || "#ef4444"}
                    strokeWidth={s.strokeWidth || 2}
                  />
                )}
              </svg>

              {/* Bound handles for scaling elements */}
              {isSelected &&
                [
                  { cx: 0, cy: 0, cursor: "nwse-resize", dir: "nw" },
                  { cx: sw / 2, cy: 0, cursor: "ns-resize", dir: "n" },
                  { cx: sw, cy: 0, cursor: "nesw-resize", dir: "ne" },
                  { cx: sw, cy: sh / 2, cursor: "ew-resize", dir: "e" },
                  { cx: sw, cy: sh, cursor: "nwse-resize", dir: "se" },
                  { cx: sw / 2, cy: sh, cursor: "ns-resize", dir: "s" },
                  { cx: 0, cy: sh, cursor: "nesw-resize", dir: "sw" },
                  { cx: 0, cy: sh / 2, cursor: "ew-resize", dir: "w" },
                ].map((h) => (
                  <div
                    key={h.dir}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const origX = s.x || 0;
                      const origY = s.y || 0;
                      const origW = sw;
                      const origH = sh;

                      const onMouseMove = (me: MouseEvent) => {
                        const dx = (me.clientX - startX) / zoomR.current;
                        const dy = (me.clientY - startY) / zoomR.current;
                        let nx = origX;
                        let ny = origY;
                        let nw = origW;
                        let nh = origH;
                        if (h.dir.includes("e")) nw = Math.max(20, origW + dx);
                        if (h.dir.includes("s")) nh = Math.max(20, origH + dy);
                        if (h.dir.includes("w")) {
                          nw = Math.max(20, origW - dx);
                          nx = origX + origW - nw;
                        }
                        if (h.dir.includes("n")) {
                          nh = Math.max(20, origH - dy);
                          ny = origY + origH - nh;
                        }
                        dispatch({ type: "UPD_SHAPE", p: { id: s.id, x: nx, y: ny, w: nw, h: nh } });
                      };
                      const onMouseUp = () => {
                        window.removeEventListener("mousemove", onMouseMove);
                        window.removeEventListener("mouseup", onMouseUp);
                      };
                      window.addEventListener("mousemove", onMouseMove);
                      window.addEventListener("mouseup", onMouseUp);
                    }}
                    style={{ left: h.cx - 5, top: h.cy - 5, cursor: h.cursor }}
                    className="absolute z-10 h-2.5 w-2.5 rounded border border-zinc-600 bg-white"
                  />
                ))}

              {isSelected && (
                <button
                  onClick={() => {
                    dispatch({ type: "DEL_SHAPE", p: s.id });
                    setSelectedShapeId(null);
                  }}
                  type="button"
                  className="absolute -right-3.5 -top-3.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border-none bg-red-500/85 text-xs text-white cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}

        {/* Live shape draw overlay previews */}
        {shapePreview && shapeDrawStart && drawTool !== "line" && drawTool !== "arrow" && shapePreview.w > 0 && shapePreview.h > 0 && (
          <div
            style={{
              left: shapePreview.x,
              top: shapePreview.y,
              width: shapePreview.w,
              height: shapePreview.h,
              opacity: drawOpacity,
            }}
            className="absolute pointer-events-none"
          >
            <svg width="100%" height="100%">
              {drawTool === "rect" && (
                <rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  fill={drawFillColor && drawFillColor !== "none" ? drawFillColor : "none"}
                  stroke={drawColor}
                  strokeWidth={drawSize}
                  strokeDasharray="6,3"
                  rx="4"
                />
              )}
              {drawTool === "circle" && (
                <ellipse
                  cx="50%"
                  cy="50%"
                  rx="48%"
                  ry="48%"
                  fill={drawFillColor && drawFillColor !== "none" ? drawFillColor : "none"}
                  stroke={drawColor}
                  strokeWidth={drawSize}
                  strokeDasharray="6,3"
                />
              )}
              {drawTool === "triangle" && (
                <polygon
                  points="50%,2 98%,97% 2%,97%"
                  fill={drawFillColor && drawFillColor !== "none" ? drawFillColor : "none"}
                  stroke={drawColor}
                  strokeWidth={drawSize}
                  strokeDasharray="6,3"
                />
              )}
            </svg>
          </div>
        )}

        {visible.map((n) => {
          const props = getProps(n);
          if (n.type === "note") return <NoteNode key={n.id} {...(props as any)} />;
          if (n.type === "code") return <CodeNode key={n.id} {...(props as any)} />;
          if (n.type === "todo") return <TodoNode key={n.id} {...(props as any)} />;
          if (n.type === "image") return <ImageNode key={n.id} {...(props as any)} />;
          if (n.type === "file") return <FileNode key={n.id} {...(props as any)} />;
          if (n.type === "link") return <LinkNode key={n.id} {...(props as any)} />;
          if (n.type === "stopwatch") return <StopwatchNode key={n.id} {...(props as any)} />;
          if (n.type === "clock") return <ClockNode key={n.id} {...(props as any)} />;
          if (n.type === "timeline") return <TimelineNode key={n.id} {...(props as any)} />;
          if (n.type === "table") return null;
          return null;
        })}

        {texts.map((t) => (
          <FreeText
            key={t.id}
            t={t}
            dispatch={dispatch}
            startDrag={startDrag}
            connecting={connecting}
            connEnd={connEnd}
            portDragStart={portDragStart}
          />
        ))}
      </div>

      {/* SVG drawing paths layer overlays */}
      <svg className="absolute inset-0 h-full w-full pointer-events-none z-50">
        {drawings.map((s) => {
          const pts = s.points.map((p) => `${p.x * zoom + pan.x},${p.y * zoom + pan.y}`).join(" ");
          return (
            <polyline
              key={s.id}
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth={s.size * zoom}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={s.opacity || 0.9}
            />
          );
        })}
        {currentStroke && currentStroke.length > 1 && (
          <polyline
            points={currentStroke.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={drawColor}
            strokeWidth={drawSize * (drawTool === "brush" ? 2.5 : 1)}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={drawOpacity}
          />
        )}
        {shapePreview && shapeDrawStart && (drawTool === "line" || drawTool === "arrow") && (
          <g>
            {drawTool === "arrow" && (
              <defs>
                <marker
                  id="prev-arr"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto"
                >
                  <path d="M0,0 L10,5 L0,10 z" fill={drawColor} />
                </marker>
              </defs>
            )}
            <line
              x1={shapeDrawStart.x * zoom + pan.x}
              y1={shapeDrawStart.y * zoom + pan.y}
              x2={(shapePreview.x2 ?? shapeDrawStart.x) * zoom + pan.x}
              y2={(shapePreview.y2 ?? shapeDrawStart.y) * zoom + pan.y}
              stroke={drawColor}
              strokeWidth={drawSize}
              strokeLinecap="round"
              strokeDasharray="8,4"
              opacity={drawOpacity}
              markerEnd={drawTool === "arrow" ? "url(#prev-arr)" : undefined}
            />
          </g>
        )}
        {selectionRect && (
          <rect
            x={Math.min(selectionRect.x1, selectionRect.x2)}
            y={Math.min(selectionRect.y1, selectionRect.y2)}
            width={Math.abs(selectionRect.x2 - selectionRect.x1)}
            height={Math.abs(selectionRect.y2 - selectionRect.y1)}
            fill="rgba(59, 130, 246, 0.15)"
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeDasharray="5,3"
            rx="4"
          />
        )}
      </svg>

      <div className="absolute top-2.5 right-3.5 z-40 flex items-center gap-1.5 rounded-lg border border-white/8 bg-zinc-950/80 px-2 py-1.5 shadow backdrop-blur select-none">
        <span className="font-mono text-[9px] text-zinc-500">ÇİZGİ:</span>
        <div className="flex gap-0.5">
          {CONN_COLORS.map((col) => (
            <button
              key={col}
              onClick={() => setConnColor(col)}
              type="button"
              style={{ backgroundColor: col }}
              className={`h-3 w-3 rounded-full cursor-pointer ${
                connColor === col ? "scale-110 border border-white" : "border border-transparent"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Dynamic Board Theme Backdrop Switcher & Selection Tools (Bottom-Left Float) */}
      <div className="absolute bottom-3 left-3 z-40 flex flex-wrap items-center gap-1.5 bg-zinc-950/90 p-1.5 rounded-xl border border-white/10 shadow-2xl backdrop-blur select-none max-w-[90vw]">
        <span className="font-sans text-[10px] font-bold text-zinc-500 tracking-wider px-1 uppercase">Yüzey:</span>
        {[
          { id: "cork", label: "Mantar Pano", icon: "📌" },
          { id: "grid", label: "Kılavuz Izgara", icon: "📐" },
          { id: "slate", label: "Sade Pano", icon: "⬜" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => onBoardTheme(t.id as any)}
            type="button"
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              boardTheme === t.id
                ? "bg-[#0078d4] text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden xs:inline">{t.label}</span>
          </button>
        ))}

        <div className="h-4 w-px bg-white/10 mx-0.5" />

        {/* Multi-Select Box Mode Toggle */}
        <button
          type="button"
          onClick={() => setBoxSelectMode((b) => !b)}
          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
            boxSelectMode
              ? "border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-md"
              : "border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
          }`}
          title="Masaüstünde fare ile sürükleyerek toplu kart/yazı seçme modunu aç/kapat (Shift+Sürükle)"
        >
          <span>📦</span>
          <span>{boxSelectMode ? "Toplu Seçim Açık" : "Toplu Seç"}</span>
          {selectedIds.length > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-400 text-zinc-950 text-[9px] font-extrabold">
              {selectedIds.length}
            </span>
          )}
        </button>

        {/* Quick Connection and Selection Controls */}
        {selectedIds.length >= 2 && (
          <button
            type="button"
            onClick={connectSelectedNodes}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 shadow-lg animate-pulse"
            title="Seçili tüm kartları ve yazıları birbirine bağla"
          >
            <span>⚡</span>
            <span>Seçilenleri Bağla ({selectedIds.length})</span>
          </button>
        )}

        {(selectedIds.length > 0 || selectedShapeId) && (
          <>
            <div className="h-4 w-px bg-white/10 mx-0.5" />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={copySelected}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                title="Kopyala (Ctrl+C)"
              >
                <span>📋</span>
                <span className="hidden sm:inline">Kopyala</span>
              </button>
              <button
                type="button"
                onClick={cutSelected}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                title="Kes (Ctrl+X)"
              >
                <span>✂️</span>
                <span className="hidden sm:inline">Kes</span>
              </button>
              <button
                type="button"
                onClick={duplicateSelected}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                title="Çoğalt (Ctrl+D)"
              >
                <span>📑</span>
                <span className="hidden sm:inline">Çoğalt</span>
              </button>

              {/* Color balls quick selection */}
              <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-lg border border-white/10 ml-0.5">
                <span className="text-[9px] text-zinc-400 font-bold px-0.5">Renk:</span>
                {swatches.map((sw, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyColorToSelection(sw)}
                    style={{ backgroundColor: sw }}
                    className="h-3.5 w-3.5 rounded-full border border-white/30 cursor-pointer hover:scale-125 active:scale-95 transition-transform"
                    title={`Rengi uygula: ${sw}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={deleteSelected}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all cursor-pointer flex items-center gap-1"
                title="Sil (Delete)"
              >
                <span>🗑️</span>
              </button>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={connectAllNodes}
          className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
          title="Panodaki tüm kartları birbirine bağla"
        >
          <span>🔗</span>
          <span className="hidden sm:inline">Tüm Kartları Bağla</span>
        </button>

        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border border-white/10 bg-white/5 text-zinc-400 hover:text-white"
            title="Seçimi Bırak"
          >
            <span>×</span>
          </button>
        )}
      </div>

      {/* Whiteboard Color Swatches Update */}

      {drawMode && (
        <div 
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-stretch gap-2 bg-zinc-950/95 border border-white/10 px-4 py-3 rounded-2xl shadow-3xl backdrop-blur-md select-none w-[94vw] max-w-[620px]"
        >
          {/* Main Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 font-sans text-xs">
            {/* Subsection 1: Kalem Tipleri (Brush Types) */}
            <div className="flex items-center gap-1 border-r border-white/5 pr-2.5">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider hidden sm:inline mr-1">Tip:</span>
              <button
                type="button"
                onClick={() => {
                  setDrawTool("pen");
                  setDrawSize(2);
                  setDrawOpacity(0.5);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                  drawTool === "pen" && drawSize === 2 && drawOpacity === 0.5
                    ? "border-sky-500/40 bg-sky-500/10 text-sky-400 font-extrabold"
                    : "border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/5"
                }`}
                title="Yarı şeffaf ince kurşun kalem"
              >
                <span>✏️</span>
                <span className="hidden xs:inline">Kurşun</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrawTool("pen");
                  setDrawSize(4);
                  setDrawOpacity(1.0);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                  drawTool === "pen" && drawSize === 4 && drawOpacity === 1.0
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-400 font-extrabold"
                    : "border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/5"
                }`}
                title="Düz kalın tükenmez kalem"
              >
                <span>✒️</span>
                <span className="hidden xs:inline">Tükenmez</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrawTool("pen");
                  setDrawSize(14);
                  setDrawOpacity(0.45);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                  drawTool === "pen" && drawSize === 14 && drawOpacity === 0.45
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-extrabold"
                    : "border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/5"
                }`}
                title="Geniş yarı şeffaf keçeli kalem"
              >
                <span>🖍️</span>
                <span className="hidden xs:inline">Keçeli</span>
              </button>
            </div>

            {/* Subsection 2: Geometrik Şekiller & Silgi & El Aracı */}
            <div className="flex items-center gap-1">
              {[
                { id: "line", name: "Çizgi", icon: "─" },
                { id: "rect", name: "Kare", icon: "▢" },
                { id: "circle", name: "Daire", icon: "◯" },
                { id: "eraser", name: "Silgi", icon: "🧹" },
                { id: "pan", name: "El Aracı", icon: "🖐️" },
              ].map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setDrawTool(tool.id)}
                  className={`p-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center min-w-[28px] ${
                    drawTool === tool.id
                      ? "border-purple-500/40 bg-purple-500/10 text-purple-400"
                      : "border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/5"
                  }`}
                  title={tool.name}
                >
                  <span>{tool.icon}</span>
                </button>
              ))}
            </div>

            {/* Undo, Redo, Clear */}
            <div className="flex items-center gap-1 border-l border-white/5 pl-2.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={drawHistory.length === 0}
                className="p-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/5 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                title="Geri Al (Undo)"
              >
                ↩️
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={drawRedoStack.length === 0}
                className="p-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/5 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                title="İleri Al (Redo)"
              >
                ↪️
              </button>
              <button
                type="button"
                onClick={handleClearCanvas}
                className="p-1.5 rounded-lg border border-red-500/15 bg-red-500/5 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all cursor-pointer"
                title="Tüm Kanvası Temizle"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Sliders and Color Picker Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-2 flex-col sm:flex-row">
            {/* Color section (wheel, eyedropper, swatches) */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              {/* Native Color Picker Wrapper (Millions of Colors) */}
              <div className="relative h-6.5 w-6.5 shrink-0 rounded-full border border-white/10 overflow-hidden flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform bg-zinc-900" title="Renk Çarkı (Color Picker)">
                <input
                  type="color"
                  value={drawColor}
                  onChange={(e) => {
                    setDrawColor(e.target.value);
                    setSwatches((prev) => {
                      if (prev.map(x => x.toLowerCase()).includes(e.target.value.toLowerCase())) return prev;
                      return [e.target.value, ...prev.slice(0, 6)];
                    });
                  }}
                  className="absolute inset-0 opacity-0 h-full w-full cursor-pointer z-10"
                />
                <span className="text-[12px] pointer-events-none">🎨</span>
              </div>

              {/* Eyedropper Button */}
              {typeof window !== "undefined" && (window as any).EyeDropper && (
                <button
                  type="button"
                  onClick={pickEyeColor}
                  className="h-6.5 w-[28px] rounded-lg border border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/10 hover:text-white select-none transition-all flex items-center justify-center cursor-pointer text-[12px]"
                  title="Damlalık (Eyedropper)"
                >
                  🧪
                </button>
              )}

              {/* Swatches palette */}
              <div className="flex gap-1 items-center bg-white/[0.02] p-0.5 px-1.5 rounded-lg border border-white/5">
                {swatches.map((sw, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setDrawColor(sw);
                      applyColorToSelection(sw);
                    }}
                    style={{ backgroundColor: sw }}
                    className={`h-4 w-4 rounded-full border cursor-pointer hover:scale-115 active:scale-90 transition-transform ${
                      drawColor.toLowerCase() === sw.toLowerCase()
                        ? "border-white ring-1 ring-purple-500/50"
                        : "border-white/20"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Slider section (thickness, opacity) */}
            <div className="flex flex-wrap items-center gap-3.5 text-[9px] text-zinc-400 font-semibold font-mono flex-1 justify-between sm:justify-end w-full sm:w-auto">
              <div className="flex items-center gap-1.5">
                <span>Kalınlık:</span>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={drawSize}
                  onChange={(e) => setDrawSize(parseInt(e.target.value))}
                  className="h-1 w-20 rounded-lg bg-zinc-800 accent-purple-500 cursor-pointer"
                />
                <span className="w-5 text-right font-bold text-zinc-200">{drawSize}px</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>Opaklık:</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={drawOpacity}
                  onChange={(e) => setDrawOpacity(parseFloat(e.target.value))}
                  className="h-1 w-16 rounded-lg bg-zinc-800 accent-purple-500 cursor-pointer"
                />
                <span className="w-6 text-right font-bold text-zinc-200">{Math.round(drawOpacity * 100)}%</span>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 border-t sm:border-t-0 sm:border-l border-white/5 pt-2 sm:pt-0 pl-0 sm:pl-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setZoom(z => Math.max(0.2, z - 0.15))}
                className="h-6.5 w-6 rounded-lg border border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/5 transition-colors cursor-pointer font-bold text-[10px]"
                title="Uzaklaştır"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className="px-1.5 h-6.5 rounded-lg border border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/5 transition-colors cursor-pointer text-[9px] font-bold font-mono"
                title="Odak Sıfırla"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom(z => Math.min(3.0, z + 0.15))}
                className="h-6.5 w-6 rounded-lg border border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/5 transition-colors cursor-pointer font-bold text-[10px]"
                title="Yakınlaştır"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {showMinimap && <div className="absolute bottom-3 right-3 z-40"><Minimap nodes={visible} pan={pan} zoom={zoom} /></div>}

      {/* Right-click sleek context menu */}
      {contextMenu && (
        <div
          style={{ left: contextMenu.x, top: contextMenu.y }}
          className="fixed z-50 min-w-[170px] rounded-xl border border-white/15 bg-zinc-900/95 p-1.5 shadow-2xl backdrop-blur-md text-xs select-none"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {selectedIds.length > 0 || selectedShapeId ? (
            <>
              <button
                type="button"
                onClick={() => {
                  copySelected();
                  setContextMenu(null);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-200 hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2">📋 Kopyala</span>
                <span className="text-[10px] text-zinc-400 font-mono">Ctrl+C</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  cutSelected();
                  setContextMenu(null);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-200 hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2">✂️ Kes</span>
                <span className="text-[10px] text-zinc-400 font-mono">Ctrl+X</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  duplicateSelected();
                  setContextMenu(null);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-200 hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2">📑 Çoğalt</span>
                <span className="text-[10px] text-zinc-400 font-mono">Ctrl+D</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  pasteClipboard(contextMenu.boardPos);
                  setContextMenu(null);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-200 hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2">📌 Yapıştır</span>
                <span className="text-[10px] text-zinc-400 font-mono">Ctrl+V</span>
              </button>

              <div className="h-px bg-white/10 my-1" />

              {/* Color swatches in context menu */}
              <div className="px-2 py-1">
                <div className="text-[10px] font-bold text-zinc-400 mb-1">Renk Seç:</div>
                <div className="flex gap-1.5 items-center">
                  {swatches.map((sw, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        applyColorToSelection(sw);
                        setContextMenu(null);
                      }}
                      style={{ backgroundColor: sw }}
                      className="h-4 w-4 rounded-full border border-white/30 cursor-pointer hover:scale-125 transition-transform"
                      title={sw}
                    />
                  ))}
                </div>
              </div>

              <div className="h-px bg-white/10 my-1" />

              <button
                type="button"
                onClick={() => {
                  deleteSelected();
                  setContextMenu(null);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-500/15 text-left cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2">🗑️ Sil</span>
                <span className="text-[10px] text-red-300 font-mono">Del</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  pasteClipboard(contextMenu.boardPos);
                  setContextMenu(null);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-200 hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2">📌 Yapıştır</span>
                <span className="text-[10px] text-zinc-400 font-mono">Ctrl+V</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  dispatch({
                    type: "ADD",
                    p: {
                      id: `n${Date.now()}`,
                      type: "note",
                      title: "Yeni Not",
                      content: "",
                      x: contextMenu.boardPos.x,
                      y: contextMenu.boardPos.y,
                      w: 240,
                      h: 160,
                      color: "#1e1e1e",
                      tags: [],
                    },
                  });
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-200 hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <span>📝 Yeni Not Kartı Ekle</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  dispatch({
                    type: "ADD_TEXT",
                    p: {
                      id: `txt_${Date.now()}`,
                      content: "Metin yazın...",
                      x: contextMenu.boardPos.x,
                      y: contextMenu.boardPos.y,
                      color: "#ffffff",
                      fontSize: 18,
                    },
                  });
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-200 hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <span>✍️ Düz Yazı Ekle</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
export type { MinimapProps, GroupBoxProps, FreeTextProps, BoardProps };
