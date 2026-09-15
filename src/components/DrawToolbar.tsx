/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";

const DRAW_TOOLS = [
  { id: "pen", icon: "✏️", label: "Kalem" },
  { id: "brush", icon: "🖌️", label: "Fırça" },
  { id: "eraser", icon: "⬜", label: "Silgi" },
  { id: "line", icon: "╱", label: "Çizgi" },
  { id: "arrow", icon: "➡️", label: "Ok" },
  { id: "rect", icon: "▭", label: "Dikdörtgen" },
  { id: "circle", icon: "○", label: "Daire" },
  { id: "triangle", icon: "△", label: "Üçgen" },
];

const DRAW_COLORS_PALETTE = [
  "#ef4444",
  "#f59e0b",
  "#4ade80",
  "#38bdf8",
  "#a78bfa",
  "#f472b6",
  "#ffffff",
  "#000000",
  "#ffd700",
  "#ff6b35",
];

const DRAW_SIZES = [1, 3, 5, 10, 16];

interface DrawToolbarProps {
  tool: string;
  onTool: (t: string) => void;
  color: string;
  onColor: (c: string) => void;
  size: number;
  onSize: (s: number) => void;
  fillColor: string;
  onFillColor: (c: string) => void;
  opacity: number;
  onOpacity: (o: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onClose: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function DrawToolbar({
  tool,
  onTool,
  color,
  onColor,
  size,
  onSize,
  fillColor,
  onFillColor,
  opacity,
  onOpacity,
  onUndo,
  onRedo,
  onClear,
  onClose,
  canUndo,
  canRedo,
}: DrawToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFillPicker, setShowFillPicker] = useState(false);
  const isShape = ["rect", "circle", "triangle"].includes(tool);

  return (
    <div
      className="absolute top-2 left-1/2 z-[200] flex max-w-[calc(100vw-60px)] -translate-x-1/2 flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-md select-none"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Tool select buttons with interactive hovers and focus frames */}
      <div className="flex gap-1">
        {DRAW_TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => onTool(t.id)}
            type="button"
            title={t.label}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-all cursor-pointer ${
              tool === t.id
                ? "border-amber-500/50 bg-amber-500/20 text-amber-400"
                : "border-white/5 bg-white/5 text-zinc-400 hover:border-white/15 hover:bg-white/10"
            }`}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="mx-1 h-6 w-px bg-white/10" />

      {/* Stroke Color selection overlay */}
      <div className="relative">
        <button
          onClick={() => {
            setShowColorPicker(!showColorPicker);
            setShowFillPicker(false);
          }}
          type="button"
          title="Çizgi Rengi"
          style={{ backgroundColor: color }}
          className="h-6 w-6 rounded-md border-2 border-white/20 shadow-md cursor-pointer transition-transform"
        />
        {showColorPicker && (
          <div
            className="absolute top-9 left-0 z-[300] flex min-w-[142px] flex-col gap-2 rounded-lg border border-white/12 bg-zinc-950 p-2 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="font-mono text-[9px] text-zinc-500 tracking-wider">
              ÇİZGİ RENGİ
            </div>
            <div className="flex w-[130px] flex-wrap gap-1">
              {DRAW_COLORS_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    onColor(c);
                    setShowColorPicker(false);
                  }}
                  type="button"
                  style={{ backgroundColor: c }}
                  className={`h-5 w-5 rounded cursor-pointer transition-transform ${
                    color === c ? "scale-110 border border-white" : "border border-black/30"
                  }`}
                />
              ))}
            </div>
            <input
              type="color"
              value={color}
              onChange={(e) => onColor(e.target.value)}
              className="h-6 w-full cursor-pointer bg-transparent border-none outline-none"
            />
          </div>
        )}
      </div>

      {/* Shapes-only Fill Color picker */}
      {isShape && (
        <div className="relative">
          <button
            onClick={() => {
              setShowFillPicker(!showFillPicker);
              setShowColorPicker(false);
            }}
            type="button"
            title="Dolgu Rengi"
            style={{
              backgroundColor: fillColor && fillColor !== "none" ? fillColor : "transparent",
            }}
            className="h-6 w-6 rounded-md border-2 border-dashed border-white/35 shadow-md cursor-pointer transition-transform"
          />
          {showFillPicker && (
            <div
              className="absolute top-9 left-0 z-[300] flex min-w-[142px] flex-col gap-2 rounded-lg border border-white/12 bg-zinc-950 p-2 shadow-2xl"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="font-mono text-[9px] text-zinc-500 tracking-wider">
                DOLGU RENGİ
              </div>
              <button
                onClick={() => {
                  onFillColor("none");
                  setShowFillPicker(false);
                }}
                type="button"
                className="w-full rounded bg-white/5 py-1 font-mono text-[9px] text-zinc-400 hover:bg-white/10"
              >
                Şeffaf / Dolgu Yok
              </button>
              <div className="flex w-[130px] flex-wrap gap-1">
                {DRAW_COLORS_PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      onFillColor(c);
                      setShowFillPicker(false);
                    }}
                    type="button"
                    style={{ backgroundColor: c }}
                    className={`h-5 w-5 rounded cursor-pointer transition-transform ${
                      fillColor === c ? "scale-110 border border-white" : "border border-black/30"
                    }`}
                  />
                ))}
              </div>
              <input
                type="color"
                value={fillColor && fillColor !== "none" ? fillColor : "#ffffff"}
                onChange={(e) => onFillColor(e.target.value)}
                className="h-6 w-full cursor-pointer bg-transparent border-none outline-none"
              />
            </div>
          )}
        </div>
      )}

      <div className="mx-1 h-6 w-px bg-white/10" />

      {/* Preset Stroke Width selection */}
      <div className="flex gap-0.5">
        {DRAW_SIZES.map((s) => (
          <button
            key={s}
            onClick={() => onSize(s)}
            type="button"
            title={`${s}px`}
            className={`flex h-7 w-7 items-center justify-center rounded-md border transition-all cursor-pointer ${
              size === s
                ? "border-amber-500/50 bg-amber-500/15"
                : "border-transparent hover:bg-white/5"
            }`}
          >
            <div
              style={{
                width: Math.max(2, Math.round(s * 0.7)),
                height: Math.max(2, Math.round(s * 0.7)),
              }}
              className={`rounded-full ${size === s ? "bg-amber-400" : "bg-zinc-500"}`}
            />
          </button>
        ))}
      </div>

      <div className="mx-1 h-6 w-px bg-white/10" />

      {/* Advanced Opacity slide bar */}
      <div className="flex items-center gap-1.5 px-1 font-mono text-[9px]">
        <span className="text-zinc-500">MAtLIK</span>
        <input
          type="range"
          min={10}
          max={100}
          value={Math.round(opacity * 100)}
          onChange={(e) => onOpacity(Number(e.target.value) / 100)}
          className="w-14 cursor-pointer accent-amber-500"
        />
        <span className="w-[28px] text-zinc-400">{Math.round(opacity * 100)}%</span>
      </div>

      <div className="mx-1 h-6 w-px bg-white/10" />

      {/* History features & Actions */}
      <div className="flex gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          type="button"
          title="Geri Al (Ctrl+Z)"
          className={`h-7 w-7 rounded-md border text-xs cursor-pointer ${
            canUndo
              ? "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
              : "border-transparent text-zinc-600"
          }`}
        >
          ↩
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          type="button"
          title="İleri Al (Ctrl+Y)"
          className={`h-7 w-7 rounded-md border text-xs cursor-pointer ${
            canRedo
              ? "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
              : "border-transparent text-zinc-600"
          }`}
        >
          ↪
        </button>
        <button
          onClick={onClear}
          type="button"
          title="Çizimleri Temizle"
          className="h-7 w-7 rounded-md border border-red-500/20 bg-red-500/5 text-center text-xs text-red-400 transition-colors cursor-pointer hover:border-red-500/30 hover:bg-red-500/10"
        >
          🗑️
        </button>
        <button
          onClick={onClose}
          type="button"
          title="Çizim Modunu Kapat"
          className="h-7 w-7 rounded-md border border-white/15 bg-white/5 text-xs text-zinc-400 transition-colors cursor-pointer hover:border-white/20 hover:bg-white/10"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
