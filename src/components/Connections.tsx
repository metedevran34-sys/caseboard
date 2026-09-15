/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Connection, Node, Text } from "../types";

const CONN_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#4ade80",
  "#38bdf8",
  "#a78bfa",
  "#f472b6",
  "#ffffff",
  "#94a3b8",
];

interface ConnPopupProps {
  conn: Connection;
  onUpdate: (fields: Partial<Connection>) => void;
  onDel: () => void;
  onClose: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}

function ConnPopup({ conn, onUpdate, onDel, onClose, onDragStart }: ConnPopupProps) {
  return (
    <div
      className="w-[240px] rounded-xl border border-white/20 bg-zinc-950/95 shadow-2xl font-mono select-none backdrop-blur-md overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Draggable Title Bar */}
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onDragStart(e);
        }}
        className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10 cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors"
        title="Etiket panelini taşımak için basılı tutup sürükleyin"
      >
        <div className="flex items-center gap-1.5 text-zinc-200 text-[11px] font-bold">
          <span>🏷️</span>
          <span>BAĞLANTI ETİKETİ</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-zinc-500 font-sans font-normal">Sürükle</span>
          <button
            onClick={onClose}
            type="button"
            className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 text-xs cursor-pointer ml-1"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-3.5 space-y-3">
        <div>
          <label className="mb-1 block text-[9px] text-zinc-400 tracking-wider font-bold">
            ETİKET METNİ
          </label>
          <input
            value={conn.label || ""}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="Açıklama girin..."
            className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500/50"
          />
        </div>

        <div>
          <label className="mb-1 block text-[9px] text-zinc-400 tracking-wider font-bold">
            İP RENGİ
          </label>
          <div className="flex flex-wrap gap-1 mb-2">
            {CONN_COLORS.map((col) => (
              <button
                key={col}
                onClick={() => onUpdate({ color: col })}
                type="button"
                style={{ backgroundColor: col }}
                className={`h-5 w-5 rounded-full border cursor-pointer ${
                  conn.color === col ? "border-white border-2 scale-110" : "border-white/10"
                }`}
              />
            ))}
          </div>
          
          {/* Dynamic Color Picker Wheel */}
          <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/4 p-1.5 mt-1.5">
            <input
              type="color"
              value={conn.color || "#ef4444"}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="h-7 w-12 cursor-pointer bg-transparent border-0 rounded"
            />
            <div className="flex flex-col select-none">
              <span className="text-[10px] text-zinc-200 font-bold leading-none">Renk Tekerleği 🎨</span>
              <span className="text-[8px] text-zinc-500 font-mono mt-0.5">{conn.color || "#ef4444"}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[9px] text-zinc-400 tracking-wider font-bold">
            BAĞLANTI YÖNÜ
          </label>
          <button
            onClick={() => onUpdate({ directed: !conn.directed })}
            type="button"
            className={`w-full rounded py-1.5 text-[9px] font-bold transition-all cursor-pointer border ${
              conn.directed
                ? "bg-amber-500/15 border-amber-500/40 text-amber-500"
                : "bg-white/4 border-white/8 text-zinc-400 hover:text-zinc-300"
            }`}
          >
            {conn.directed ? "➔ Yönlü Ok Aktif (Bitiş Gösterir)" : "╶  Yönsüz Düz Bağı (Çift Yön)"}
          </button>
        </div>

        <div>
          <label className="mb-1 block text-[9px] text-zinc-400 tracking-wider font-bold">
            DESEN STİLİ
          </label>
          <div className="grid grid-cols-2 gap-1 max-h-[140px] overflow-y-auto pr-0.5">
            {[
              { id: "straight", l: "Düz Çizgi" },
              { id: "curved", l: "Eğri Çizgi" },
              { id: "thick", l: "Kalın Hat" },
              { id: "dashed", l: "Kesik ─ ─" },
              { id: "dotted", l: "Nokta · ·" },
              { id: "thread", l: "Forensik İp 🧵" },
              { id: "double-line", l: "Çift Hat ⚌" },
              { id: "zigzag", l: "Zikzak ⚡" },
              { id: "wavy", l: "Dalgalı 〰" },
              { id: "dot-dash", l: "Kesik-Nokta" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => onUpdate({ style: s.id })}
                type="button"
                className={`rounded py-1 text-[8px] font-semibold transition-all cursor-pointer border ${
                  conn.style === s.id
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-400 font-bold"
                    : "bg-white/4 border border-white/8 text-zinc-400 hover:text-zinc-300"
                }`}
              >
                {s.l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-1.5 font-mono text-[10px] pt-1 border-t border-white/10">
          <button
            onClick={() => onUpdate({ locked: !conn.locked })}
            type="button"
            className={`flex-1 rounded-md border py-1.5 text-center transition-all cursor-pointer ${
              conn.locked
                ? "bg-amber-500/15 border-amber-500/40 text-amber-500 font-bold"
                : "bg-white/4 border-white/8 text-zinc-400"
            }`}
          >
            {conn.locked ? "Kilitli" : "Serbest"}
          </button>
          <button
            onClick={onDel}
            type="button"
            className="flex-1 rounded-md border border-red-500/30 bg-red-500/10 py-1.5 text-center text-red-400 transition-colors cursor-pointer hover:bg-red-500/20 font-bold"
          >
            Sil
          </button>
        </div>
      </div>
    </div>
  );
}

// Geometry routines
export function getCenter(n: { x: number; y: number; w?: number; h?: number }) {
  return { x: n.x + (n.w || 240) / 2, y: n.y + (n.h || 160) / 2 };
}

export function getBorderPort(
  node: { x: number; y: number; w?: number; h?: number },
  toX: number,
  toY: number
) {
  const cx = node.x + (node.w || 240) / 2;
  const cy = node.y + (node.h || 160) / 2;
  const hw = (node.w || 240) / 2;
  const hh = (node.h || 160) / 2;
  const dx = toX - cx;
  const dy = toY - cy;

  if (!dx && !dy) return { x: cx, y: cy };
  const tx = hw / Math.abs(dx || 0.001);
  const ty = hh / Math.abs(dy || 0.001);
  const t = Math.min(tx, ty);

  return { x: cx + dx * t, y: cy + dy * t };
}

function buildZigzagPath(ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.floor(dist / 14); // segments every 14px
  if (steps <= 2) return `M ${ax} ${ay} L ${bx} ${by}`;
  
  let path = `M ${ax} ${ay}`;
  const px = -dy / dist;
  const py = dx / dist;
  const amplitude = 6;

  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const cx = ax + dx * t;
    const cy = ay + dy * t;
    const offset = (i % 2 === 0 ? 1 : -1) * amplitude;
    path += ` L ${cx + px * offset} ${cy + py * offset}`;
  }
  path += ` L ${bx} ${by}`;
  return path;
}

function buildWavyPath(ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.floor(dist / 16);
  if (steps <= 2) return `M ${ax} ${ay} L ${bx} ${by}`;

  let path = `M ${ax} ${ay}`;
  const px = -dy / (dist || 0.001);
  const py = dx / (dist || 0.001);
  const amplitude = 5;

  let prevX = ax;
  let prevY = ay;

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const nextX = ax + dx * t;
    const nextY = ay + dy * t;
    
    const midX = (prevX + nextX) / 2;
    const midY = (prevY + nextY) / 2;
    
    const offset = (i % 2 === 0 ? 1 : -1) * amplitude;
    const ctrlX = midX + px * offset;
    const ctrlY = midY + py * offset;

    path += ` Q ${ctrlX} ${ctrlY} ${nextX} ${nextY}`;
    prevX = nextX;
    prevY = nextY;
  }
  return path;
}

function buildDoubleLine(ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 2) return `M ${ax} ${ay} L ${bx} ${by}`;
  const px = -dy / dist;
  const py = dx / dist;
  const offset = 3;
  return `M ${ax + px * offset} ${ay + py * offset} L ${bx + px * offset} ${by + py * offset} ` +
         `M ${ax - px * offset} ${ay - py * offset} L ${bx - px * offset} ${by - py * offset}`;
}

export function buildPath(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  style: string
) {
  if (style === "zigzag") {
    return buildZigzagPath(ax, ay, bx, by);
  }
  if (style === "wavy") {
    return buildWavyPath(ax, ay, bx, by);
  }
  if (style === "double-line") {
    return buildDoubleLine(ax, ay, bx, by);
  }
  if (style !== "curved") return `M ${ax} ${ay} L ${bx} ${by}`;
  const ox = (bx - ax) * 0.25;
  const oy = Math.max(40, Math.abs(by - ay) * 0.3);
  return `M ${ax} ${ay} C ${ax + ox} ${ay - oy} ${bx - ox} ${by - oy} ${bx} ${by}`;
}

interface ConnectionsLayerProps {
  connections: Connection[];
  nodes: Node[];
  texts?: Text[];
  onDel: (id: string) => void;
  onUpdate: (fields: Partial<Connection> & { id: string }) => void;
  dragPreview: {
    fromId: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color?: string;
  } | null;
}

export function ConnectionsLayer({
  connections,
  nodes,
  texts = [],
  onDel,
  onUpdate,
  dragPreview,
}: ConnectionsLayerProps) {
  const [popup, setPopup] = useState<{ id: string; x: number; y: number } | null>(null);
  const [popupOffset, setPopupOffset] = useState({ dx: 0, dy: 0 });

  const uniqueColors = useMemo(() => {
    return Array.from(new Set(connections.map((c) => c.color || "#ef4444")));
  }, [connections]);

  const popupConn = popup ? connections.find((c) => c.id === popup.id) : null;

  const getElementBox = (id: string) => {
    const n = nodes.find((nn) => nn.id === id);
    if (n) return { x: n.x, y: n.y, w: n.w || 240, h: n.h || 160 };

    const t = texts.find((tt) => tt.id === id);
    if (!t) return null;

    const fontSize = Number(t.fontSize) || 18;
    const content = t.content || "";
    const lines = content.split("\n");
    const maxLen = Math.max(1, ...lines.map((l) => l.length));
    const w = Math.min(320, Math.max(80, maxLen * (fontSize * 0.55)));
    const h = Math.max(40, lines.length * (fontSize * 1.4));
    return { x: t.x, y: t.y, w, h };
  };

  const getStroke = (style?: string) => {
    if (style === "thick") return { lw: 4, dash: undefined };
    if (style === "dashed") return { lw: 1.8, dash: "8,5" };
    if (style === "dotted") return { lw: 2, dash: "2,5" };
    if (style === "dot-dash") return { lw: 2, dash: "12,4,2,4" };
    if (style === "thread") return { lw: 3.2, dash: undefined };
    if (style === "double-line") return { lw: 1.5, dash: undefined };
    if (style === "zigzag") return { lw: 2, dash: undefined };
    if (style === "wavy") return { lw: 2, dash: undefined };
    return { lw: 1.8, dash: undefined };
  };

  return (
    <>
      <svg className="absolute inset-0 h-full w-full pointer-events-none overflow-visible">
        <defs>
          {uniqueColors.map((col) => {
            const mid = `arr-${col.replace(/[^a-zA-Z0-9]/g, "")}`;
            return (
              <marker
                key={mid}
                id={mid}
                markerWidth="9"
                markerHeight="7"
                refX="8"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0,9 3.5,0 7" fill={col} />
              </marker>
            );
          })}
        </defs>
        {connections.map((c) => {
          const bA = getElementBox(c.from);
          const bB = getElementBox(c.to);
          if (!bA || !bB) return null;

          const nA = { x: bA.x, y: bA.y, w: bA.w, h: bA.h };
          const nB = { x: bB.x, y: bB.y, w: bB.w, h: bB.h };

          // Fixed pushpin anchor points on each card (Forensic Corkboard standard)
          const pA = {
            x: nA.x + (nA.w || 240) / 2,
            y: nA.y + 14,
          };
          const pB = {
            x: nB.x + (nB.w || 240) / 2,
            y: nB.y + 14,
          };

          const color = c.color || "#ef4444";
          const { lw, dash } = getStroke(c.style);
          const markId = `arr-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
          const d = buildPath(pA.x, pA.y, pB.x, pB.y, c.style || "curved");
          const mx = (pA.x + pB.x) / 2;
          const my = (pA.y + pB.y) / 2 - (c.style === "curved" ? 18 : 0);

          return (
            <g key={c.id}>
              {/* Hit target for connection clicks */}
              <path
                d={d}
                stroke="transparent"
                strokeWidth="18"
                fill="none"
                onClick={(e) => {
                  e.stopPropagation();
                  setPopup({ id: c.id, x: e.clientX, y: e.clientY });
                }}
                className="pointer-events-auto cursor-pointer"
              />
              {/* Render physical drop shadow of the thread casting on the board */}
              <path
                d={d}
                stroke="rgba(0,0,0,0.55)"
                strokeWidth={lw + 2.8}
                fill="none"
                style={{ filter: "blur(1px)" }}
                className="select-none pointer-events-none"
                transform="translate(1.8, 3.8)"
              />
              
              {/* Dynamic background glow / string body */}
              <path
                d={d}
                stroke={`${color}33`}
                strokeWidth={lw + 2}
                fill="none"
                className="select-none pointer-events-none animate-yarn-glow"
              />

              {c.style === "thread" ? (
                <>
                  <path
                    d={d}
                    stroke={`${color}77`}
                    strokeWidth={lw + 1.8}
                    fill="none"
                    className="select-none pointer-events-none"
                    opacity="0.85"
                  />
                  <path
                    d={d}
                    stroke={color}
                    strokeWidth={lw}
                    fill="none"
                    className="select-none pointer-events-none"
                    markerEnd={c.directed ? `url(#${markId})` : undefined}
                    opacity={c.locked ? 1 : 0.95}
                  />
                  {/* Subtle animated thread fiber / flow pulse */}
                  <path
                    d={d}
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeDasharray="6,18"
                    fill="none"
                    className="select-none pointer-events-none animate-thread-flow"
                    opacity="0.6"
                  />
                </>
              ) : (
                <>
                  <path
                    d={d}
                    stroke={color}
                    strokeWidth={lw}
                    fill="none"
                    strokeDasharray={dash}
                    markerEnd={c.directed ? `url(#${markId})` : undefined}
                    opacity={c.locked ? 1 : 0.92}
                  />
                  {/* Gentle animated fiber wave on all active forensic strings */}
                  <path
                    d={d}
                    stroke={`${color}bb`}
                    strokeWidth={Math.max(1, lw * 0.7)}
                    strokeDasharray="8,24"
                    fill="none"
                    className="select-none pointer-events-none animate-thread-flow"
                    opacity="0.45"
                  />
                </>
              )}

              {/* Forensic Pinheads at Start and End of Thread */}
              <g className="pointer-events-none select-none">
                {/* Start Pin */}
                <circle cx={pA.x} cy={pA.y + 1.5} r={4.5} fill="rgba(0,0,0,0.5)" />
                <circle cx={pA.x} cy={pA.y} r={4} fill={color} stroke="#ffffff" strokeWidth="1" />
                <circle cx={pA.x - 1} cy={pA.y - 1} r={1.2} fill="#ffffff" opacity="0.8" />
                {/* End Pin */}
                <circle cx={pB.x} cy={pB.y + 1.5} r={4.5} fill="rgba(0,0,0,0.5)" />
                <circle cx={pB.x} cy={pB.y} r={4} fill={color} stroke="#ffffff" strokeWidth="1" />
                <circle cx={pB.x - 1} cy={pB.y - 1} r={1.2} fill="#ffffff" opacity="0.8" />
              </g>
              {c.label && (
                <g
                  onClick={(e) => {
                    e.stopPropagation();
                    setPopupOffset({ dx: 0, dy: 0 });
                    setPopup({ id: c.id, x: e.clientX, y: e.clientY });
                  }}
                  className="pointer-events-auto cursor-pointer group"
                >
                  <rect
                    x={mx - (c.label.length * 3.5 + 10)}
                    y={my - 16}
                    width={c.label.length * 7 + 20}
                    height={20}
                    rx={10}
                    fill="#0a0a0c"
                    stroke={color}
                    strokeWidth="1.2"
                    className="transition-all group-hover:scale-105 group-hover:stroke-amber-400"
                  />
                  <text
                    x={mx}
                    y={my - 2}
                    textAnchor="middle"
                    fontSize="10"
                    fill={color}
                    className="font-mono font-bold select-none"
                  >
                    {c.label}
                  </text>
                </g>
              )}
              {!c.label && (
                <circle
                  cx={mx}
                  cy={my}
                  r={6}
                  fill="#0a0a0c"
                  stroke={color}
                  strokeWidth="1.8"
                  opacity={0.85}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPopupOffset({ dx: 0, dy: 0 });
                    setPopup({ id: c.id, x: e.clientX, y: e.clientY });
                  }}
                  className="pointer-events-auto cursor-pointer hover:scale-125 transition-transform"
                />
              )}
            </g>
          );
        })}
        {dragPreview && (
          <line
            x1={dragPreview.x1}
            y1={dragPreview.y1}
            x2={dragPreview.x2}
            y2={dragPreview.y2}
            stroke={dragPreview.color || "#f59e0b"}
            strokeWidth="2"
            strokeDasharray="7,4"
            opacity="0.85"
          />
        )}
      </svg>
      {popupConn && popup && (
        <div
          style={{
            position: "fixed",
            left: Math.min(window.innerWidth - 250, Math.max(10, popup.x + popupOffset.dx)),
            top: Math.min(window.innerHeight - 420, Math.max(10, popup.y + popupOffset.dy)),
            zIndex: 9999,
          }}
          className="pointer-events-auto"
        >
          <ConnPopup
            conn={popupConn}
            onUpdate={(fields) => onUpdate({ id: popupConn.id, ...fields })}
            onDel={() => {
              onDel(popupConn.id);
              setPopup(null);
            }}
            onClose={() => setPopup(null)}
            onDragStart={(e) => {
              const startX = e.clientX;
              const startY = e.clientY;
              const startDx = popupOffset.dx;
              const startDy = popupOffset.dy;

              const onMouseMove = (me: MouseEvent) => {
                setPopupOffset({
                  dx: startDx + (me.clientX - startX),
                  dy: startDy + (me.clientY - startY),
                });
              };

              const onMouseUp = () => {
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
              };

              window.addEventListener("mousemove", onMouseMove);
              window.addEventListener("mouseup", onMouseUp);
            }}
          />
        </div>
      )}
    </>
  );
}
