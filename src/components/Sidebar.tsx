/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { BoardReference } from "../types";

const ITEMS = [
  { type: "note", label: "Metin Notu", icon: "✍️", accent: "#ef4444" },
  { type: "code", label: "Kod Notu", icon: "💻", accent: "#8be9fd" },
  { type: "todo", label: "Yapılacaklar", icon: "✅", accent: "#4ade80" },
  { type: "image", label: "Görsel", icon: "🖼️", accent: "#a78bfa" },
  { type: "file", label: "Dosya", icon: "📎", accent: "#f59e0b" },
  { type: "link", label: "Kaynak", icon: "🔗", accent: "#38bdf8" },
  { type: "stopwatch", label: "Kronometre", icon: "⏱️", accent: "#f59e0b" },
  { type: "clock", label: "Saat", icon: "🕒", accent: "#38bdf8" },
  { type: "timeline", label: "Zaman Çizelgesi", icon: "📅", accent: "#a78bfa" },
  { type: "text", label: "Düz Yazı", icon: "🇹", accent: "#fbbf24" },
];

interface SidebarProps {
  open: boolean;
  onDragStart: (e: React.DragEvent, type: string) => void;
  onClear: () => void;
  onAddGroup: () => void;
  nodeCount: number;
  boards: BoardReference[];
  activeBoardId: string;
  onBoard: (id: string) => void;
  onNewBoard: () => void;
  onDelBoard: (id: string) => void;
  onRenameBoard: (id: string, name: string) => void;
  search: string;
  onSearch: (s: string) => void;
  filterTag: string | null;
  onFilterTag: (t: string | null) => void;
  allTags: string[];
  onExport: () => void;
  onExportPng: (() => void) | null;
  onExportPdf: (() => void) | null;
  onImport: (raw: string) => void;
  darkMode: boolean;
  onTheme: () => void;
  drawMode: boolean;
  onToggleDraw: () => void;
  themeColor: string;
  onThemeColor: (c: string) => void;
  isMobile: boolean;
  onClose: () => void;
  onOpenProject?: () => void;
  onSaveProject?: () => void;
  isElectron: boolean;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  onOpenSettings?: () => void;
}

export default function Sidebar({
  open,
  onDragStart,
  onClear,
  onAddGroup,
  nodeCount,
  boards,
  activeBoardId,
  onBoard,
  onNewBoard,
  onDelBoard,
  onRenameBoard,
  search,
  onSearch,
  filterTag,
  onFilterTag,
  allTags,
  onExport,
  onExportPng,
  onExportPdf,
  onImport,
  darkMode,
  onTheme,
  drawMode,
  onToggleDraw,
  themeColor,
  onThemeColor,
  isMobile,
  onClose,
  onOpenProject,
  onSaveProject,
  isElectron,
  soundEnabled,
  onSoundToggle,
  onOpenSettings,
}: SidebarProps) {
  const [showBoards, setShowBoards] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  return (
    <aside
      style={{
        borderColor: darkMode ? "#30363d" : "rgba(0,0,0,0.1)",
      }}
      className={`relative z-30 flex h-full w-[220px] min-w-[220px] flex-col overflow-hidden border-r font-sans select-none ${
        darkMode ? "bg-brand-sidebar text-brand-text" : "bg-zinc-100 text-zinc-700"
      } ${isMobile && "fixed left-0 top-0 shadow-2xl"}`}
    >
      {/* Upper header segment and user theme settings toggle */}
      <div
        className={`shrink-0 border-b p-3.5 pb-2 transition-colors ${
          darkMode ? "border-brand-border" : "border-black/5"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span style={{ color: themeColor }} className="text-sm font-bold animate-pulse">
              ◈
            </span>
            <span
              className={`font-sans text-sm font-bold tracking-widest ${
                darkMode ? "text-white" : "text-zinc-950"
              }`}
            >
              CaseBoard
            </span>
          </div>
          <div className="flex gap-1 select-none">
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                type="button"
                title="Uygulama Ayarları (32 Özellik)"
                className={`flex h-6 w-6 items-center justify-center rounded border text-xs cursor-pointer transition-colors ${
                  darkMode
                    ? "border-brand-border text-sky-400 hover:bg-brand-surface"
                    : "border-black/15 text-zinc-600 hover:bg-black/5"
                }`}
              >
                ⚙️
              </button>
            )}
            <button
              onClick={onSoundToggle}
              type="button"
              title={soundEnabled ? "Sesi Kapat" : "Sesi Aç"}
              className={`flex h-6 w-6 items-center justify-center rounded border text-xs cursor-pointer transition-colors ${
                darkMode
                  ? "border-brand-border text-teal-400 hover:bg-brand-surface"
                  : "border-black/15 text-zinc-600 hover:bg-black/5"
              }`}
            >
              {soundEnabled ? "🔊" : "🔇"}
            </button>
            <button
              onClick={onTheme}
              type="button"
              className={`flex h-6 w-6 items-center justify-center rounded border text-xs cursor-pointer transition-colors ${
                darkMode
                  ? "border-brand-border text-amber-400 hover:bg-brand-surface"
                  : "border-black/15 text-zinc-600 hover:bg-black/5"
              }`}
            >
              {darkMode ? "🌞" : "🌙"}
            </button>
            {isMobile && (
              <button
                onClick={onClose}
                type="button"
                className="rounded border border-white/12 px-1 text-zinc-500 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="mt-1 font-mono text-[9px] text-zinc-500 font-medium tracking-wide">
          v5 · tauri-optimized
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Search segment */}
        <div
          className={`border-b px-3.5 py-2 ${
            darkMode ? "border-brand-border" : "border-black/6"
          }`}
        >
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Kartları ara..."
            className={`w-full rounded border px-2.5 py-1.5 font-sans text-xs outline-none transition-colors focus:border-brand-accent/40 ${
              darkMode
                ? "border-brand-border bg-brand-surface/50 text-brand-text"
                : "border-black/15 bg-black/[0.04] text-zinc-800"
            }`}
          />
        </div>

        {/* Boards manager panel */}
        <div
          className={`border-b px-3.5 py-2.5 ${
            darkMode ? "border-brand-border" : "border-black/6"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-sans text-[9px] text-brand-text-dim tracking-wider">
                TOPLAM KART
              </div>
              <div
                style={{ color: darkMode ? "#0078d4" : themeColor }}
                className="font-mono text-xl font-bold leading-tight"
              >
                {String(nodeCount).padStart(2, "0")}
              </div>
            </div>
            <button
              onClick={() => setShowBoards(!showBoards)}
              type="button"
              className={`rounded border px-2.5 py-1 text-[10px] font-semibold cursor-pointer ${
                darkMode
                  ? "border-brand-border bg-brand-surface text-brand-text-dim hover:text-white hover:bg-zinc-800"
                  : "bg-white/4 text-zinc-400 hover:text-white"
              }`}
            >
              Dosyalar {showBoards ? "▲" : "▼"}
            </button>
          </div>
        </div>

        {showBoards && (
          <div
            className={`px-3 px-3.5 py-2 flex flex-col gap-1 border-b ${
              darkMode ? "border-brand-border bg-brand-bg/50" : "border-black/6 bg-black/10"
            }`}
          >
            {boards.map((b) => (
              <div key={b.id} className="flex gap-1" id={`board-row-${b.id}`}>
                {renamingId === b.id ? (
                  <input
                    autoFocus
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onBlur={() => {
                      const v = renameVal.trim();
                      if (v) onRenameBoard(b.id, v);
                      setRenamingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const v = renameVal.trim();
                        if (v) onRenameBoard(b.id, v);
                        setRenamingId(null);
                      }
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="flex-1 rounded border border-brand-border bg-brand-bg px-2.5 py-1 font-sans text-[11px] text-white"
                  />
                ) : (
                  <button
                    onClick={() => onBoard(b.id)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setRenamingId(b.id);
                      setRenameVal(b.name || "");
                    }}
                    type="button"
                    style={{
                      backgroundColor: b.id === activeBoardId ? "rgba(0, 120, 212, 0.15)" : "transparent",
                      borderColor: b.id === activeBoardId ? "#0078d4" : (darkMode ? "#30363d" : "rgba(0,0,0,0.1)"),
                    }}
                    className={`flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded border px-2 py-1 text-left text-[11px] cursor-pointer font-sans transition-all ${
                      b.id === activeBoardId
                        ? "text-brand-accent font-semibold"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    📂 {b.name}
                  </button>
                )}
                {boards.length > 1 && (
                  <button
                    onClick={() => onDelBoard(b.id)}
                    type="button"
                    className="px-1 text-zinc-600 hover:text-red-500 cursor-pointer select-none font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={onNewBoard}
              type="button"
              className={`mt-1 rounded border border-dashed py-1 font-sans text-[10px] cursor-pointer transition-colors ${
                darkMode
                  ? "border-brand-border bg-brand-surface/40 text-brand-text-dim hover:text-white"
                  : "border-white/10 bg-white/3 text-zinc-500 hover:text-white"
              }`}
            >
              + Yeni Pano Dosyası
            </button>
          </div>
        )}

        {/* Global interactive tags filter */}
        {allTags.length > 0 && (
          <div
            className={`border-b px-3.5 py-2.5 ${
              darkMode ? "border-brand-border" : "border-black/6"
            }`}
          >
            <div className="mb-1.5 font-sans text-[9px] text-brand-text-dim tracking-wider">
              ETİKET MATRİSİ
            </div>
            <div className="flex flex-wrap gap-1">
              {filterTag && (
                <button
                  onClick={() => onFilterTag(null)}
                  type="button"
                  className="rounded bg-brand-accent/20 px-2 py-0.5 text-[9px] text-white hover:bg-brand-accent/40 cursor-pointer"
                >
                  ×
                </button>
              )}
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => onFilterTag(t === filterTag ? null : t)}
                  type="button"
                  className={`rounded-full border px-2 py-0.5 text-[9px] cursor-pointer transition-colors ${
                    t === filterTag
                      ? "border-brand-accent bg-brand-accent/15 text-brand-accent"
                      : darkMode
                      ? "border-brand-border bg-brand-surface text-zinc-400 hover:border-brand-text-dim hover:text-brand-text"
                      : "border-black/8 bg-black/4 text-zinc-500 hover:text-black"
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Draggable and Double-Clickable toolbox kit items */}
        <div className="p-3 font-sans">
          <div className="mb-2 font-sans text-[9px] text-brand-text-dim tracking-wider">
            SÜRÜKLE veya ÇİFT TIKLA 🖱️
          </div>
          {ITEMS.map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
              onDoubleClick={() => {
                window.dispatchEvent(new CustomEvent("add-node-from-sidebar", { detail: { type: item.type } }));
              }}
              title="Panoya eklemek için sürükleyin veya çift tıklayın"
              className={`mb-1 flex cursor-grab select-none items-center gap-2 rounded border px-3 py-2 transition-all active:scale-[0.98] ${
                darkMode
                  ? "border-brand-border bg-brand-surface/40 hover:bg-brand-surface hover:border-brand-text-dim"
                  : "border-black/5 bg-black/[0.025] hover:bg-black/[0.05]"
              }`}
              style={{ borderLeft: `3px solid ${item.accent}` }}
            >
              <span className="text-xs leading-none">{item.icon}</span>
              <span className={`font-sans text-[11px] leading-none ${darkMode ? "text-brand-text" : "text-zinc-700"}`}>
                {item.label}
              </span>
            </div>
          ))}

          {/* Group wrapper creation buttons */}
          <button
            onClick={onAddGroup}
            type="button"
            className={`mt-2.5 flex w-full items-center gap-2.5 rounded border px-3 py-2 font-sans transition-colors cursor-pointer ${
              darkMode
                ? "border-brand-accent/30 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20"
                : "border-indigo-500/20 bg-indigo-500/6 text-indigo-600 hover:bg-indigo-500/12"
            }`}
          >
            <span className="font-bold">#</span>
            <span className="text-[11px] font-semibold leading-none">İlişki Grubu Oluştur</span>
          </button>



          {/* Drawing layer triggers */}
          <div className="mt-4">
            <div className="mb-2 font-sans text-[9px] text-brand-text-dim tracking-wider">
              ÇİZİM & BEYAZ TAHTA
            </div>
            <button
              onClick={onToggleDraw}
              type="button"
              className={`flex w-full items-center gap-2 rounded border px-3 py-2 font-sans transition-colors cursor-pointer ${
                drawMode
                  ? "border-brand-accent bg-brand-accent/15 text-brand-accent font-semibold"
                  : darkMode
                  ? "border-brand-border bg-brand-surface/40 text-brand-text-dim hover:text-brand-text"
                  : "border-black/5 bg-black/[0.025] text-zinc-600"
              }`}
            >
              <span>{drawMode ? "📝" : "✏️"}</span>
              <span className="text-[11px] leading-none">
                {drawMode ? "✓ Çizim Modu Açık" : "Çizim Modu"}
              </span>
            </button>
          </div>

          {/* Short keyboard triggers guidelines */}
          <div className="mt-4">
            <button
              onClick={() => setShowKeys(!showKeys)}
              type="button"
              className={`w-full rounded border py-1 text-center text-[9px] transition-colors ${
                darkMode
                  ? "border-brand-border text-brand-text-dim hover:text-brand-text"
                  : "border-black/10 text-zinc-500"
              }`}
            >
              {showKeys ? "▲ Kısayolları Gizle" : "▼ Klavye Kısayolları"}
            </button>
            {showKeys && (
              <div className="mt-2 flex flex-col gap-1 font-mono text-[9px]">
                {[
                  ["N", "Not"],
                  ["C", "Kod"],
                  ["T", "Todo"],
                  ["X", "Yazı"],
                  ["Space", "Serbest Kayma"],
                  ["Esc", "Çizgiyi İptal Et"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center text-brand-text-dim">
                    <kbd className={`rounded border px-1 ${
                      darkMode ? "border-brand-border bg-brand-bg text-brand-text" : "border-black/10 bg-black/5 text-zinc-700"
                    }`}>
                      {k}
                    </kbd>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer segment: local workspace management JSON/PNG commands */}
      <div
        className={`p-3.5 border-t ${
          darkMode ? "border-brand-border bg-brand-sidebar" : "border-black/5 bg-zinc-200"
        }`}
      >
        {isElectron && (
          <div className="mb-1.5 flex gap-1 font-sans text-[10px]">
            <button
              onClick={onOpenProject}
              type="button"
              className="flex-1 rounded border border-slate-500/35 bg-slate-500/15 py-1 text-center font-bold text-slate-300 cursor-pointer"
            >
              Gözat
            </button>
            <button
              onClick={onSaveProject}
              type="button"
              className="flex-1 rounded border border-emerald-500/30 bg-emerald-500/12 py-1 text-center font-bold text-emerald-400 cursor-pointer"
            >
              Yedekle
            </button>
          </div>
        )}
        <div className="mb-1.5 flex gap-1 font-sans text-[9px] select-none">
          <button
            onClick={onExport}
            type="button"
            className="flex-1 rounded border border-sky-400/20 bg-sky-400/8 py-1.5 text-center font-bold text-sky-400 hover:bg-sky-400/12"
          >
            YEDEK
          </button>
          {onExportPng && (
            <button
              onClick={onExportPng}
              type="button"
              className="flex-1 rounded border border-rose-500/20 bg-rose-500/5 py-1.5 text-center font-bold text-rose-400 hover:bg-rose-500/10"
            >
              PNG
            </button>
          )}
          {onExportPdf && (
            <button
              onClick={onExportPdf}
              type="button"
              className="flex-1 rounded border border-rose-500/20 bg-rose-500/5 py-1.5 text-center font-bold text-rose-400 hover:bg-rose-500/10"
            >
              PDF
            </button>
          )}
          <button
            onClick={() => {
              const el = document.createElement("input");
              el.type = "file";
              el.accept = ".json";
              el.onchange = (e) => {
                const f = (e.target as any).files[0];
                if (!f) return;
                const r = new FileReader();
                r.onload = (ev) => {
                  if (ev.target?.result) {
                    onImport(ev.target.result as string);
                  }
                };
                r.readAsText(f);
              };
              el.click();
            }}
            type="button"
            className="flex-1 rounded border border-emerald-500/20 bg-emerald-500/8 py-1.5 text-center font-bold text-emerald-400 hover:bg-emerald-500/12"
          >
            İÇE AL
          </button>
        </div>
        <button
          onClick={onClear}
          type="button"
          className="w-full rounded border border-red-500/15 bg-red-500/5 py-1.5 text-center font-sans text-[10px] font-semibold text-red-500/80 cursor-pointer hover:bg-red-500/10"
        >
          Panoyu Temizle
        </button>

        {/* Tauri Status indicator representing "Encrypted / Offline" and "SYSTEM STATUS" matching design layout */}
        <div className={`mt-3 pt-3 border-t font-sans ${darkMode ? 'border-brand-border/40' : 'border-black/5'}`}>
          <div className="text-[9px] text-brand-text-dim tracking-wider font-semibold">SİSTEM DURUMU</div>
          <div className="flex items-center gap-1.5 text-[11px] mt-1 text-brand-text-dim">
            <span className="h-2 w-2 rounded-full bg-brand-success block animate-pulse"></span>
            Şifreli / Çevrimdışı
          </div>
          <div className="flex items-center gap-1.5 text-[10px] mt-1.5 text-[#10b981] font-semibold leading-none select-none">
            <span>✓</span>
            <span>Veriler Otomatik Kayıt Altında</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
