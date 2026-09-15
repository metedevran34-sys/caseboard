/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Node } from "../types";
import { NodeWrap, Header, Tags, Resizer } from "./NodeBase";
import { forensicAudio } from "../utils/audio";
import { openDesktopFile, openDesktopUrl } from "../utils/openFile";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

// Check if electron API is exposed
const electronAPI = typeof window !== "undefined" && (window as any).electronAPI ? (window as any).electronAPI : null;

// ─── IMAGE NODE ─────────────────────────────────────────────────
interface ImageNodeProps {
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

export function ImageNode({
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
}: ImageNodeProps) {
  const [title, setTitle] = useState(node.title || "Görsel");
  const [scale, setScale] = useState(Number(node.imgScale) || 1);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const clampScale = (v: number) => Math.max(0.2, Math.min(6, v));

  useEffect(() => {
    setScale(Number(node.imgScale) || 1);
  }, [node.imgScale, node.id]);

  useEffect(() => {
    if (node.title) setTitle(node.title);
  }, [node.title]);

  return (
    <NodeWrap
      node={node}
      connecting={connecting}
      onConnectEnd={connEnd}
      onPortDragStart={portDragStart}
      accent="#3b82f6"
      inGroup={inGroup}
    >
      <div 
        className="group relative flex h-full w-full flex-col p-3 pb-8 bg-zinc-900 text-zinc-100 transition-all cursor-default"
        onMouseDown={(e) => {
          const tag = (e.target as HTMLElement).tagName;
          if (tag === "INPUT" || tag === "BUTTON" || (e.target as HTMLElement).closest(".hover-bar")) {
            return;
          }
          e.stopPropagation();
          drag(e, node.id);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (node.imgPath || node.img) {
            openDesktopFile({ path: node.imgPath, url: node.img });
          } else {
            setShowDrawModal(true);
          }
        }}
      >
        {/* Permanently visible Close (Delete) button to match other cards */}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            del(node.id);
          }}
          type="button"
          title="Sil"
          className="absolute top-2.5 right-2.5 z-50 flex h-[22px] w-6 items-center justify-center rounded border border-white/10 bg-zinc-900/90 text-xs text-red-500/60 cursor-pointer hover:border-red-500/20 hover:bg-red-500/12 hover:text-red-500 shadow-md"
        >
          ×
        </button>

        {/* Floating Hover Controls Capsule bar */}
        <div className="hover-bar select-none absolute -top-11 left-1/2 -translate-x-1/2 z-50 pointer-events-auto opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1.5 rounded-full bg-zinc-900/95 backdrop-blur-md px-3 py-1 border border-[#30363d] shadow-2xl scale-95 origin-bottom duration-200">
          <button
            onClick={() => fileRef.current?.click()}
            type="button"
            title="Görsel Değiştir"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-855 text-[10px] text-zinc-200 cursor-pointer hover:bg-zinc-750 hover:text-white"
          >
            📁
          </button>

          <button
            onClick={() => setShowDrawModal(true)}
            type="button"
            title="🎨 Çizim Yap & Düzenle (Tüm Araçlar)"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-900/60 text-[10px] text-pink-300 cursor-pointer hover:bg-pink-800 hover:text-white"
          >
            🎨
          </button>

          <span className="w-px h-3 bg-white/10" />

          <button
            onClick={() => {
              const v = clampScale(scale * 0.82);
              setScale(v);
              upd({ id: node.id, imgScale: v });
            }}
            type="button"
            title="Küçült"
            className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-400 cursor-pointer hover:bg-zinc-700 hover:text-white"
          >
            −
          </button>
          <span className="font-mono text-[9px] text-zinc-400 min-w-8 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => {
              const v = clampScale(scale * 1.18);
              setScale(v);
              upd({ id: node.id, imgScale: v });
            }}
            type="button"
            title="Büyüt"
            className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-400 cursor-pointer hover:bg-zinc-700 hover:text-white"
          >
            +
          </button>

          <span className="w-px h-3 bg-white/10" />

          <button
            onClick={() => connStart(node.id)}
            type="button"
            title="İp Bağlantısı Oluştur"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600/30 text-[10px] text-blue-500 hover:bg-blue-600/50 cursor-pointer font-bold"
          >
            ⚡
          </button>

          {onDuplicate && (
            <button
              onClick={onDuplicate}
              type="button"
              title="Kopyasını Klonla"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-950 text-[10px] text-cyan-400 hover:bg-cyan-900 cursor-pointer"
            >
              ⧉
            </button>
          )}

          <button
            onClick={() => del(node.id)}
            type="button"
            title="Sil"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-red-950 text-xs text-red-400 hover:bg-red-900 cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Display window */}
        <div 
          className="relative flex flex-1 items-center justify-center overflow-hidden bg-zinc-950 border border-zinc-800 shadow-inner rounded"
          style={{ height: node.h ? node.h - 56 : 130 }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const f = e.dataTransfer.files[0];
            if (!f || !(f.type || "").startsWith("image/")) return;

            if ((f as any).path) {
              const fp = String((f as any).path);
              const fileUrl = `file:///${fp.replace(/\\/g, "/")}`;
              upd({ id: node.id, img: fileUrl, imgPath: fp });
              return;
            }

            const reader = new FileReader();
            reader.onload = (ev) => {
              if (ev.target?.result) {
                upd({ id: node.id, img: ev.target.result as string });
              }
            };
            reader.readAsDataURL(f);
          }}
          onWheel={(e) => {
            if (!node.img) return;
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? 0.93 : 1.07;
            const v = clampScale(scale * delta);
            setScale(v);
            upd({ id: node.id, imgScale: v });
          }}
        >
          {node.img ? (
            <div className="absolute inset-0 flex items-center justify-center p-1.5">
              <img
                src={node.img}
                alt=""
                draggable={false}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  transform: `scale(${scale})`,
                  transformOrigin: "center center",
                }}
                className="block h-auto w-auto object-contain select-none"
              />
            </div>
          ) : (
            <div className="py-8 text-center select-none font-sans">
              <div className="mb-2 text-3xl opacity-60">🖼️</div>
              <button
                onClick={() => fileRef.current?.click()}
                type="button"
                className="rounded-md border border-zinc-750 bg-zinc-800 hover:bg-zinc-700 px-3 py-1 font-semibold text-[11px] text-zinc-200 cursor-pointer transition-colors"
              >
                Görsel Seç
              </button>
            </div>
          )}
        </div>

        {/* Caption */}
        <div className="mt-2 text-center select-none font-mono px-1">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              upd({ id: node.id, title: e.target.value });
            }}
            placeholder="Başlık ekle..."
            onFocus={(e) => e.target.select()}
            className="w-full text-center bg-transparent border-b border-transparent hover:border-zinc-800 focus:border-zinc-700 font-mono font-bold text-[11px] text-zinc-300 placeholder-zinc-600 outline-none uppercase tracking-wider pb-0.5 leading-none transition-all"
          />
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;

          if ((f as any).path) {
            const fp = String((f as any).path);
            const fileUrl = `file:///${fp.replace(/\\/g, "/")}`;
            upd({ id: node.id, img: fileUrl, imgPath: fp });
            return;
          }

          const reader = new FileReader();
          reader.onload = (ev) => {
            if (ev.target?.result) {
              upd({ id: node.id, img: ev.target.result as string });
            }
          };
          reader.readAsDataURL(f);
        }}
      />
      <Tags tags={node.tags || []} onChange={(tags) => upd({ id: node.id, tags })} />
      <Resizer id={node.id} x={node.x} y={node.y} w={node.w} h={node.h} onUpdate={upd} zoom={zoom} />

      {showDrawModal && (
        <DrawingCanvasModal
          initialImg={node.img}
          title={`${title} — Çizim Studio`}
          onSave={(newImg) => {
            upd({ id: node.id, img: newImg });
          }}
          onClose={() => setShowDrawModal(false)}
        />
      )}
    </NodeWrap>
  );
}

// ─── FILE NODE ───────────────────────────────────────────────────
interface FileNodeProps {
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

export function FileNode({
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
}: FileNodeProps) {
  const [title, setTitle] = useState(node.title || "Dosya/Klasör");
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const meta = node.file || null;

  const ext = (meta?.name || "").split(".").pop()?.toLowerCase() || "";
  const mime = meta?.type || "";
  const size = meta?.size || 0;

  const getIcon = () => {
    if (mime === "directory" || meta?.type === "directory") return "📁 Klasör";
    if (mime.startsWith("image/")) return "🖼️";
    if (mime.startsWith("video/")) return "🎥";
    if (mime.startsWith("audio/")) return "🎵";
    if (ext === "pdf") return "📄 PDF";
    if (ext === "txt") return "📝 TXT";
    if (ext === "docx" || ext === "doc") return "📘 DOC";
    if (ext === "zip" || ext === "rar" || ext === "7z") return "📦 ZIP";
    if (
      ["js", "ts", "tsx", "jsx", "py", "java", "cs", "cpp", "c", "h", "hpp", "go", "rs", "php", "sh"].includes(
        ext
      )
    ) {
      return "💻";
    }
    return "📎";
  };

  const openFile = () => {
    if (!meta) return;
    openDesktopFile(meta);
  };

  const handleSelectFile = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        directory: false,
      });
      if (selected && typeof selected === "string") {
        const fileName = selected.split(/[\/\\]/).pop() || selected;
        const ext = fileName.split(".").pop()?.toLowerCase() || "";
        const next = {
          name: fileName,
          path: selected,
          type: ext,
          size: 0,
          lastModified: Date.now(),
        };
        upd({ id: node.id, file: next, title: fileName });
        setTitle(fileName);
        return;
      }
    } catch {
      // Fallback to standard web file ref
    }
    fileRef.current?.click();
  };

  const handleSelectFolder = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        directory: true,
      });
      if (selected && typeof selected === "string") {
        const folderName = selected.split(/[\/\\]/).pop() || selected;
        const next = {
          name: folderName,
          path: selected,
          type: "directory",
          size: 0,
          lastModified: Date.now(),
        };
        upd({ id: node.id, file: next, title: folderName });
        setTitle(folderName);
        return;
      }
    } catch {
      // Fallback to standard web folder ref
    }
    folderRef.current?.click();
  };

  const attachFile = (f: File) => {
    if (!f) return;
    const next: any = {
      name: f.name,
      type: f.type || "",
      size: f.size || 0,
      lastModified: f.lastModified || Date.now(),
    };
    if ((f as any).path) {
      next.path = String((f as any).path);
    } else {
      next.url = URL.createObjectURL(f);
    }
    upd({ id: node.id, file: next, title: f.name });
    setTitle(f.name);
  };

  const attachFolder = (files: FileList) => {
    if (!files || files.length === 0) return;
    const firstFile = files[0];
    const folderName = firstFile.webkitRelativePath 
      ? firstFile.webkitRelativePath.split("/")[0] 
      : "Klasör";
    
    const totalSize = Array.from(files).reduce((acc, curr) => acc + curr.size, 0);

    const next: any = {
      name: folderName,
      type: "directory",
      size: totalSize,
      lastModified: Date.now(),
    };

    // Extract directory absolute path from files inside it if available (Webkit and Desktop Path wrappers)
    if ((firstFile as any).path) {
      const fullPath = String((firstFile as any).path).replace(/\\/g, "/");
      const relPath = String(firstFile.webkitRelativePath || "").replace(/\\/g, "/");
      if (relPath) {
        const index = fullPath.indexOf(relPath);
        if (index !== -1) {
          next.path = fullPath.substring(0, index + folderName.length).replace(/\//g, "\\");
        } else {
          const parts = fullPath.split("/");
          parts.pop();
          next.path = parts.join("\\");
        }
      } else {
        const parts = fullPath.split("/");
        parts.pop();
        next.path = parts.join("\\");
      }
    }

    upd({ id: node.id, file: next, title: folderName });
    setTitle(folderName);
  };

  return (
    <NodeWrap
      node={{ ...node, bg: "#15110a" }}
      connecting={connecting}
      onConnectEnd={connEnd}
      onPortDragStart={portDragStart}
      accent="#f59e0b"
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
        accent="#f59e0b"
        icon={getIcon()}
        isConnSrc={connecting === node.id}
        onConnect={() => connStart(node.id)}
        onDel={() => del(node.id)}
        onDuplicate={onDuplicate}
        createdAt={node.createdAt}
        extra={
          <div className="flex gap-1">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectFile();
              }}
              type="button"
              className="rounded border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] text-amber-500 cursor-pointer hover:bg-amber-500/20"
            >
              Dosya
            </button>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectFolder();
              }}
              type="button"
              className="rounded border border-yellow-500/25 bg-yellow-500/10 px-2 py-0.5 font-mono text-[9px] text-yellow-500 cursor-pointer hover:bg-yellow-500/20"
            >
              Klasör
            </button>
          </div>
        }
      />
      <div
        className="min-h-[90px] px-3.5 py-3 select-none cursor-pointer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) attachFile(f);
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          drag(e, node.id);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          openFile();
        }}
      >
        {meta ? (
          <div className="flex gap-3 items-start select-none font-mono">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/12 text-sm font-semibold text-amber-500 select-none">
              {getIcon().slice(0, 3)}
            </div>
            <div className="flex-1 min-w-0 font-mono">
              <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-semibold text-white/80 leading-none">
                {meta.name}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-zinc-500">
                <span>{meta.type === "directory" ? "klasör" : (mime || ext || "bilinmiyor")}</span>
                {size > 0 && <span>{Math.round(size / 1024)} KB</span>}
              </div>
              <div className="mt-2 text-[11px] text-amber-500/80 font-medium italic select-none">
                {meta.type === "directory" ? "📂 Klasörü açmak için çift tıklayın" : "📄 Dosyayı açmak için çift tıklayın"}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-2 text-center font-mono">
            <div className="mb-2 text-3xl font-bold text-zinc-600">{getIcon()}</div>
            <p className="mb-2 text-[10px] text-zinc-500">
              Sürükleyin veya aşağıdakilerden birini seçin
            </p>
            <div className="flex justify-center gap-1.5">
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={handleSelectFile}
                type="button"
                className="rounded-lg border border-amber-500/35 bg-amber-500/15 px-3 py-1 text-[11px] text-amber-400 font-semibold cursor-pointer hover:bg-amber-500/25"
              >
                Dosya Seç
              </button>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={handleSelectFolder}
                type="button"
                className="rounded-lg border border-yellow-500/35 bg-yellow-500/15 px-3 py-1 text-[11px] text-yellow-400 font-semibold cursor-pointer hover:bg-yellow-500/25"
              >
                Klasör Seç
              </button>
            </div>
          </div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) attachFile(f);
        }}
      />
      <input
        ref={folderRef}
        type="file"
        className="hidden"
        {...{ webkitdirectory: "", directory: "", multiple: true } as any}
        onChange={(e) => {
          if (e.target.files) attachFolder(e.target.files);
        }}
      />
      <Tags tags={node.tags || []} onChange={(tags) => upd({ id: node.id, tags })} />
      <Resizer id={node.id} x={node.x} y={node.y} w={node.w} h={node.h} onUpdate={upd} zoom={zoom} />
    </NodeWrap>
  );
}

// ─── LINK NODE ──────────────────────────────────────────────────
interface LinkNodeProps {
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

export function LinkNode({
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
}: LinkNodeProps) {
  const [title, setTitle] = useState(node.title || "Kaynaklar");
  const links = node.links || [];
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const urlInpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAddPanel && urlInpRef.current) {
      urlInpRef.current.focus();
    }
  }, [showAddPanel]);

  const addLink = () => {
    const u = newUrl.trim();
    if (!u) return;
    upd({
      id: node.id,
      links: [...links, { id: `l${Date.now()}`, url: u, label: newLabel.trim() }],
    });
    setNewUrl("");
    setNewLabel("");
    setShowAddPanel(false);
  };

  const removeLink = (lid: string) => {
    upd({ id: node.id, links: links.filter((l) => l.id !== lid) });
  };

  const startEdit = (l: any) => {
    setEditingId(l.id);
    setEditUrl(l.url);
    setEditLabel(l.label || "");
  };

  const saveEdit = () => {
    upd({
      id: node.id,
      links: links.map((l) => (l.id === editingId ? { ...l, url: editUrl, label: editLabel } : l)),
    });
    setEditingId(null);
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url.slice(0, 32);
    }
  };

  const getFavicon = (url: string) => {
    try {
      return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`;
    } catch {
      return null;
    }
  };

  return (
    <NodeWrap
      node={{ ...node, bg: "#0a0e1a" }}
      connecting={connecting}
      onConnectEnd={connEnd}
      onPortDragStart={portDragStart}
      accent="#38bdf8"
      inGroup={inGroup}
    >
      <Header
        title={title}
        onTitle={(t) => {
          setTitle(t);
          upd({ id: node.id, title: t });
        }}
        onDrag={(e) => {
          if (editingId) return;
          e.stopPropagation();
          drag(e, node.id);
        }}
        accent="#38bdf8"
        icon="🔗"
        isConnSrc={connecting === node.id}
        onConnect={() => connStart(node.id)}
        onDel={() => del(node.id)}
        onDuplicate={onDuplicate}
        createdAt={node.createdAt}
        extra={
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowAddPanel(!showAddPanel);
            }}
            type="button"
            title="Link Ekle"
            className={`flex h-[22px] w-6 items-center justify-center rounded border transition-colors cursor-pointer ${
              showAddPanel
                ? "border-sky-500 bg-sky-500/20 text-sky-400"
                : "border-white/12 bg-white/4 text-sky-400/80 hover:bg-white/10"
            }`}
          >
            +
          </button>
        }
      />

      {showAddPanel && (
        <div
          className="border-b border-sky-500/12 bg-sky-500/[0.04] px-3.5 py-2 select-text font-mono"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="mb-1 text-[9px] text-sky-500 font-bold tracking-wider">
            YENİ LİNK EKLE
          </div>
          <input
            ref={urlInpRef}
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLink();
              }
            }}
            placeholder="https://..."
            className="mb-1.5 w-full rounded border border-sky-500/20 bg-sky-500/6 px-2 py-1 text-[11px] text-sky-300 outline-none focus:border-sky-500/40"
          />
          <div className="flex gap-1.5 leading-none">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addLink();
              }}
              placeholder="Açıklama (opsiyonel)..."
              className="flex-1 rounded border border-white/8 bg-white/4 px-2 py-1 text-[11px] text-zinc-400 outline-none focus:border-white/20"
            />
            <button
              onClick={addLink}
              type="button"
              className="rounded border border-sky-500/30 bg-sky-500/12 px-2.5 text-xs text-sky-400 font-semibold cursor-pointer hover:bg-sky-500/20"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Link indices listing */}
      <div className="max-h-[220px] overflow-y-auto px-3.5 py-2 flex flex-col gap-1.5 select-text font-mono">
        {links.length === 0 && (
          <div className="py-4 text-center text-xs text-zinc-600 select-none">
            + butonuna tıklayarak link ekleyin
          </div>
        )}
        {links.map((l) => (
          <div
            key={l.id}
            className="rounded border border-sky-500/[0.12] bg-sky-500/[0.04] p-2 hover:bg-sky-500/[0.07]"
          >
            {editingId === l.id ? (
              <div
                className="flex flex-col gap-1 select-text"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <input
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="URL..."
                  className="rounded border border-sky-500/25 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-400 outline-none focus:border-sky-500/40"
                />
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="Açıklama..."
                  className="rounded border border-white/8 bg-white/4 px-2 py-1 text-[11px] text-zinc-400 outline-none focus:border-white/20"
                />
                <div className="flex gap-1">
                  <button
                    onClick={saveEdit}
                    type="button"
                    className="flex-1 rounded bg-sky-500/15 border border-sky-500/30 py-1 text-[9px] text-sky-400 hover:bg-sky-500/25"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    type="button"
                    className="rounded bg-white/4 border border-white/10 px-2 text-[9px] text-zinc-500"
                  >
                    İptal
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                {getFavicon(l.url) && (
                  <img
                    src={getFavicon(l.url) || ""}
                    alt=""
                    width={14}
                    height={14}
                    className="rounded shrink-0"
                    onError={(e) => ((e.target as any).style.display = "none")}
                  />
                )}
                <div className="flex-1 min-w-0 leading-tight">
                  {l.label && (
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-zinc-200">
                      {l.label}
                    </div>
                  )}
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-sky-500 italic mt-0.5">
                    {getDomain(l.url)}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0 select-none">
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.preventDefault();
                      openDesktopUrl(l.url);
                    }}
                    title="Bağlantıyı Aç"
                    className="text-xs text-sky-400 hover:underline"
                  >
                    ↗
                  </a>
                  <button
                    onClick={() => startEdit(l)}
                    onMouseDown={(e) => e.stopPropagation()}
                    type="button"
                    title="Düzenle"
                    className="text-[11px] text-zinc-500 hover:text-white"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => removeLink(l.id)}
                    onMouseDown={(e) => e.stopPropagation()}
                    type="button"
                    title="Sil"
                    className="text-xs text-red-500/50 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <Tags tags={node.tags || []} onChange={(tags) => upd({ id: node.id, tags })} />
      <Resizer id={node.id} x={node.x} y={node.y} w={node.w} h={node.h} onUpdate={upd} zoom={zoom} />
    </NodeWrap>
  );
}

// ─── HIGH-FIDELITY WINDOWS PHOTOS DESKTOP LIGHTBOX SIMULATOR ───
export function PhotosLightbox({
  id,
  imgSrc,
  imgTitle,
  imgPath,
  allImageNodes = [],
  onClose,
  onSelectImage,
  onSaveImage,
}: {
  id: string | null;
  imgSrc: string | null;
  imgTitle: string;
  imgPath?: string;
  allImageNodes?: { id: string; img: string; title: string; imgPath?: string }[];
  onClose: () => void;
  onSelectImage?: (id: string) => void;
  onSaveImage?: (id: string, newImg: string) => void;
}) {
  const [rotate, setRotate] = React.useState(0);
  const [scale, setScale] = React.useState(1);
  const [showMeta, setShowMeta] = React.useState(true);
  const [filterMode, setFilterMode] = React.useState<"normal" | "grayscale" | "invert" | "nightvision" | "contrast" | "infrared">("normal");
  const [showDrawModal, setShowDrawModal] = React.useState(false);
  const [currentImg, setCurrentImg] = React.useState<string | null>(imgSrc);

  React.useEffect(() => {
    setCurrentImg(imgSrc);
  }, [imgSrc, id]);

  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStart = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    // Reset layout zoom on image change
    setRotate(0);
    setScale(1);
    setFilterMode("normal");
    setPosition({ x: 0, y: 0 });
    forensicAudio.playCameraShutter();
  }, [id]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return; // Only pan when zoomed in
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!imgSrc) return null;

  const currentIdx = allImageNodes.findIndex((n) => n.id === id);

  const prev = () => {
    if (currentIdx > 0 && onSelectImage) {
      onSelectImage(allImageNodes[currentIdx - 1].id);
    }
  };

  const next = () => {
    if (currentIdx < allImageNodes.length - 1 && onSelectImage) {
      onSelectImage(allImageNodes[currentIdx + 1].id);
    }
  };

  const handleLocalOpen = () => {
    // Generate actual file download to trigger local OS viewer action
    const link = document.createElement("a");
    link.href = imgSrc;
    link.download = imgTitle.endsWith(".png") || imgTitle.endsWith(".jpg") ? imgTitle : `${imgTitle}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stable metadata generator determined by image ID character hashes
  const meta = (() => {
    const seed = id ? id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) : 101;
    const gpsLat = (41.0 + (seed % 1000) / 10000).toFixed(4);
    const gpsLon = (28.9 + (seed % 505) / 10000).toFixed(4);
    const cameraIndex = seed % 4;
    const cameras = ["Nikon D850 Forensic Pro", "Canon EOS R5 Police-Spec", "Sony A7R V Forensic Lab", "iPhone 15 Pro Max Forensic Lens"];
    const exposure = ["f/2.8, ISO 200, 1/125s", "f/4.0, ISO 400, 1/80s", "f/1.8, ISO 100, 1/250s", "f/2.4, ISO 800, 1/60s"][seed % 4];
    const resolution = ["4032 x 3024 (12.2 MP)", "6000 x 4000 (24 MP)", "8256 x 5504 (45.4 MP)", "4548 x 3420 (15.5 MP)"][seed % 4];
    return {
      gps: `${gpsLat}° N, ${gpsLon}° E`,
      camera: cameras[cameraIndex],
      exposure,
      resolution,
      caseNumber: `VAC-2026-F${seed}`,
      size: `${(2.1 + (seed % 9) / 2).toFixed(1)} MB`,
    };
  })();

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex flex-col bg-zinc-950/98 text-white font-sans overflow-hidden">
      {/* OS Fluent Title Bar */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/5 bg-zinc-900/95 pl-4 pr-1 select-none">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
          <span className="text-sm">🖼️</span>
          <span>Fotoğraflar — Masaüstü Görüntüleyici</span>
          <span className="inline-block rounded bg-zinc-800 border border-white/10 px-1.5 py-0.5 text-[9px] text-zinc-300">WINDOWS DESKTOP</span>
        </div>
        <div className="flex-1 text-center text-xs font-semibold tracking-wide text-zinc-400 max-w-[400px] truncate px-4">
          {imgTitle} — Simüle Edildi
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDrawModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 mr-2 rounded bg-pink-600/30 border border-pink-500/40 text-xs font-semibold text-pink-300 hover:bg-pink-600/50 hover:text-white transition-colors cursor-pointer"
          >
            <span>🎨</span> Çizim Yap & Düzenle
          </button>
          <button 
            type="button" 
            onClick={onClose} 
            className="flex h-11 w-12 items-center justify-center text-zinc-400 hover:bg-red-600 hover:text-white transition-colors cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main interactive preview content area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Toggle Button */}
        {currentIdx > 0 && (
          <button
            onClick={prev}
            type="button"
            className="absolute left-6 top-1/2 -translate-y-1/2 z-[100] flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900/80 border border-white/10 text-white hover:bg-zinc-800 hover:scale-105 duration-150 shadow-2xl cursor-pointer"
          >
            ◀
          </button>
        )}

        {/* Right Toggle Button */}
        {currentIdx < allImageNodes.length - 1 && (
          <button
            onClick={next}
            type="button"
            className="absolute right-6 top-1/2 -translate-y-1/2 z-[100] flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900/80 border border-white/10 text-white hover:bg-zinc-800 hover:scale-105 duration-150 shadow-2xl cursor-pointer"
          >
            ▶
          </button>
        )}

        {/* Central Display Canvas Grid */}
        <div 
          className="flex-1 flex items-center justify-center overflow-hidden p-8 bg-[#0b0c10] cursor-grab active:cursor-grabbing relative select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={(e) => {
            e.preventDefault();
            const factor = e.deltaY > 0 ? 0.9 : 1.15;
            setScale((s) => Math.max(0.15, Math.min(8.0, s * factor)));
          }}
        >
          <div 
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) rotate(${rotate}deg) scale(${scale})`,
              transition: isDragging ? "none" : "transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1)",
              imageRendering: scale > 1 ? "pixelated" : "auto"
            }}
            className="max-w-full max-h-full flex items-center justify-center pointer-events-none"
          >
            <img
              src={currentImg || imgSrc || ""}
              alt={imgTitle}
              style={{
                filter: filterMode === "normal" ? "none" :
                        filterMode === "grayscale" ? "grayscale(100%) contrast(140%) brightness(110%)" :
                        filterMode === "invert" ? "invert(100%) contrast(115%)" :
                        filterMode === "nightvision" ? "sepia(100%) hue-rotate(95deg) saturate(700%) contrast(140%) brightness(115%)" :
                        filterMode === "contrast" ? "contrast(185%) brightness(90%) saturate(145%)" :
                        filterMode === "infrared" ? "invert(100%) hue-rotate(180deg) saturate(220%) contrast(140%)" : "none"
              }}
              className="max-h-[78vh] max-w-[70vw] object-contain shadow-2xl border border-white/5 bg-zinc-950 select-none"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* EXIF Forensic Metadata Collapsible Sidebar */}
        {showMeta && (
          <div className="w-[300px] shrink-0 border-l border-white/10 bg-zinc-900/90 p-5 font-sans overflow-y-auto select-text">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 select-none">
              <span className="text-xs font-bold tracking-widest text-[#0078d4] uppercase">FOTOĞRAF DETAYLARI (EXIF)</span>
              <button 
                type="button" 
                onClick={() => setShowMeta(false)}
                className="text-xs text-zinc-500 hover:text-white cursor-pointer"
              >
                Gizle
              </button>
            </div>

            <div className="flex flex-col gap-4 font-mono text-[11px]">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Etiket Adı</div>
                <div className="text-zinc-200 break-all font-semibold mt-0.5">{imgTitle}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Konum / GPS Birliği</div>
                <div className="text-zinc-200 mt-0.5 flex items-center gap-1">
                  <span>📍</span>
                  <span>{meta.gps}</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Kamera Donanımı</div>
                <div className="text-zinc-200 mt-0.5">{meta.camera}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Işık Değerleri</div>
                <div className="text-zinc-200 mt-0.5">{meta.exposure}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Çözünürlük</div>
                <div className="text-zinc-200 mt-0.5">{meta.resolution}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Ölçülen Boyut</div>
                <div className="text-zinc-200 mt-0.5">{meta.size}</div>
              </div>
              <div className="border-t border-white/10 pt-3 mt-1 select-none font-sans">
                <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Soruşturma Kodu</div>
                <div className="text-xs text-amber-100 font-semibold mt-1 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
                  <span>📂</span>
                  <span>{meta.caseNumber}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/10 select-none font-sans">
              <div className="rounded-lg bg-zinc-950 p-3.5 border border-white/5">
                <div className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 uppercase">
                  🖥️ İşletim Sistemi Entegrasyonu
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed font-sans">
                  "Sistem Fotoğrafçısıyla Aç" butonu; dosyayı orijinal formatıyla indirmeye sunarak, bilgisayarınızda varsayılan açıcı olan <b>Windows Fotoğraflar</b> uygulamasını otomatik tetikler.
                </p>
                <button
                  type="button"
                  onClick={handleLocalOpen}
                  className="w-full mt-3 rounded bg-[#0078d4] hover:bg-[#0078d4]/90 py-1.5 text-[11px] font-semibold text-center uppercase tracking-wide cursor-pointer transition-colors text-white"
                >
                  Sistem Fotoğrafçısıyla Aç ↗
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Actions bar */}
      <div className="flex h-16 shrink-0 items-center justify-between border-t border-white/5 bg-zinc-900/95 px-6 select-none shadow-[0_-4px_24px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-1 bg-zinc-904 p-1 rounded-md border border-white/5 font-sans">
          <button
            onClick={() => setRotate((r) => (r + 90) % 360)}
            type="button"
            className="flex h-9 px-3 items-center justify-center rounded bg-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 cursor-pointer transition-colors gap-1.5"
          >
            <span>↻</span> Döndür
          </button>
          
          <button
            onClick={() => setRotate((r) => (r - 90 + 360) % 360)}
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 cursor-pointer transition-colors"
          >
            ↶
          </button>

          <span className="w-px h-5 bg-white/10 mx-2" />

          <button
            onClick={() => {
              setScale(1);
              setRotate(0);
              setFilterMode("normal");
              setPosition({ x: 0, y: 0 });
            }}
            type="button"
            className="flex h-9 px-3.5 items-center justify-center rounded bg-transparent text-xs text-zinc-400 hover:text-white cursor-pointer"
          >
            Sıfırla
          </button>
        </div>

        {/* Dynamic Forensics Filter Presets Selector Toolbar */}
        <div className="flex gap-1 items-center bg-zinc-950 p-1 rounded-md border border-white/10 select-none">
          {[
            { id: "normal", label: "Normal", icon: "📷" },
            { id: "grayscale", label: "S/B", icon: "⏺️" },
            { id: "nightvision", label: "Gece Görüntüsü", icon: "🟢" },
            { id: "infrared", label: "Kızılötesi", icon: "🔴" },
            { id: "contrast", label: "Kenar Çıkarma", icon: "🔍" },
            { id: "invert", label: "Negatif", icon: "🌗" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFilterMode(f.id as any);
                forensicAudio.playTypewriter();
              }}
              type="button"
              className={`px-2.5 py-1.5 rounded text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                filterMode === f.id
                  ? "bg-[#0078d4] text-white"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>

        {/* Media Control Slider Center */}
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => setScale((s) => Math.max(0.15, s - 0.15))}
            className="text-zinc-400 hover:text-white font-bold text-lg cursor-pointer flex h-8 w-8 items-center justify-center"
          >
            −
          </button>
          <input
            type="range"
            min="0.15"
            max="8.0"
            step="0.05"
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="w-32 accent-[#0078d4] cursor-pointer"
          />
          <button 
            type="button" 
            onClick={() => setScale((s) => Math.min(8.0, s + 0.15))}
            className="text-zinc-400 hover:text-white font-bold text-lg cursor-pointer flex h-8 w-8 items-center justify-center"
          >
            +
          </button>
          <span className="font-mono text-zinc-400 text-xs min-w-10 text-right">{Math.round(scale * 100)}%</span>
        </div>

        {/* Info panel toggle and Local download launcher */}
        <div className="flex items-center gap-3 font-sans">
          <button
            onClick={() => setShowMeta(!showMeta)}
            type="button"
            className={`flex h-9 px-3.5 items-center justify-center rounded text-xs transition-colors cursor-pointer gap-1.5 ${
              showMeta 
                ? "bg-[#0078d4]/15 text-[#0078d4] border border-[#0078d4]/30" 
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-white/5"
            }`}
          >
            <span>ℹ️</span> Detayları Aç/Gizle
          </button>

          <button
            onClick={handleLocalOpen}
            type="button"
            className="flex h-9 px-4.5 items-center justify-center rounded bg-[#0078d4] hover:bg-[#0078d4]/90 text-xs font-bold uppercase tracking-wide text-white cursor-pointer transition-colors gap-1.5"
          >
            <span>📥</span> Windows Fotoğraflar ile Aç ↗
          </button>
        </div>
      </div>

      {showDrawModal && (
        <DrawingCanvasModal
          initialImg={currentImg || imgSrc}
          title={`${imgTitle} — Çizim Studio`}
          onSave={(newImg) => {
            setCurrentImg(newImg);
            if (id && onSaveImage) {
              onSaveImage(id, newImg);
            }
          }}
          onClose={() => setShowDrawModal(false)}
        />
      )}
    </div>,
    document.body
  );
}

// ─── FULL-SCREEN INTERACTIVE DRAWING CANVAS STUDIO MODAL ───────────
export function DrawingCanvasModal({
  initialImg,
  title = "Çizim & Görsel Düzenleyici Studio",
  onSave,
  onClose,
}: {
  initialImg?: string | null;
  title?: string;
  onSave: (newImgDataUrl: string) => void;
  onClose: () => void;
}) {
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [tool, setTool] = useState<"pen" | "brush" | "eraser" | "line" | "arrow" | "rect" | "circle" | "pan">("pen");
  const [color, setColor] = useState("#38bdf8");
  const [size, setSize] = useState(4);
  const [opacity, setOpacity] = useState(1.0);
  const [bgColor, setBgColor] = useState<"dark" | "white" | "transparent">("dark");
  const [zoom, setZoom] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const tempSnapshot = useRef<ImageData | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Setup High Definition Dual Canvas (Base Layer + Drawing Overlay Layer)
  useEffect(() => {
    const bgCanvas = bgCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    if (!bgCanvas || !drawCanvas) return;

    const bgCtx = bgCanvas.getContext("2d");
    const drawCtx = drawCanvas.getContext("2d");
    if (!bgCtx || !drawCtx) return;

    bgCtx.imageSmoothingEnabled = true;
    bgCtx.imageSmoothingQuality = "high";
    drawCtx.imageSmoothingEnabled = true;
    drawCtx.imageSmoothingQuality = "high";

    const setupDimensions = (w: number, h: number) => {
      bgCanvas.width = w;
      bgCanvas.height = h;
      drawCanvas.width = w;
      drawCanvas.height = h;

      // Draw background
      bgCtx.clearRect(0, 0, w, h);
      if (bgColor === "dark") {
        bgCtx.fillStyle = "#18181b";
        bgCtx.fillRect(0, 0, w, h);
      } else if (bgColor === "white") {
        bgCtx.fillStyle = "#ffffff";
        bgCtx.fillRect(0, 0, w, h);
      }

      // Initial empty snapshot for drawing layer
      drawCtx.clearRect(0, 0, w, h);
      const snap = drawCtx.getImageData(0, 0, w, h);
      setHistory([snap]);
    };

    if (initialImg) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const hdW = Math.max(1920, img.naturalWidth || 1920);
        const hdH = Math.max(1080, img.naturalHeight || 1080);
        setupDimensions(hdW, hdH);

        const scale = Math.min(hdW / img.width, hdH / img.height, 1);
        const nw = img.width * scale;
        const nh = img.height * scale;
        const nx = (hdW - nw) / 2;
        const ny = (hdH - nh) / 2;

        bgCtx.drawImage(img, nx, ny, nw, nh);
      };
      img.src = initialImg;
    } else {
      setupDimensions(1920, 1080);
    }
  }, [initialImg, bgColor]);

  const saveToHistory = () => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext("2d");
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    setHistory((h) => [...h.slice(-35), snap]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext("2d");
    if (!ctx) return;

    forensicAudio.playTypewriter();
    const current = history[history.length - 1];
    const prev = history[history.length - 2];
    setRedoStack((r) => [...r, current]);
    setHistory((h) => h.slice(0, -1));
    ctx.putImageData(prev, 0, 0);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext("2d");
    if (!ctx) return;

    forensicAudio.playTypewriter();
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setHistory((h) => [...h, next]);
    ctx.putImageData(next, 0, 0);
  };

  const handleClear = () => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext("2d");
    if (!ctx) return;

    forensicAudio.playYarnStretch();
    saveToHistory();
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    saveToHistory();
    showToast("Tüm çizimler temizlendi (Arka plan korundu)");
  };

  // Accurate mouse coordinate calculation matching canvas backing resolution
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return { x: 0, y: 0 };
    const rect = drawCanvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };

    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const scaleX = drawCanvas.width / rect.width;
    const scaleY = drawCanvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Cursor indicator tracking in DOM container space (div-relative)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; scale: number } | null>(null);

  const updateCursorPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;
    const rect = drawCanvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // Exact unscaled container coordinates (cancels out zoom transform for 1:1 indicator overlay)
    const containerX = (clientX - rect.left) / zoom;
    const containerY = (clientY - rect.top) / zoom;
    const strokeScale = (rect.width / zoom) / drawCanvas.width;

    setCursorPos({
      x: containerX,
      y: containerY,
      scale: strokeScale,
    });
  };

  // Mouse Wheel Zoom & Pan Handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((z) => Math.max(0.15, Math.min(10.0, z * zoomFactor)));
    forensicAudio.playTypewriter();
  };

  const startDraw = (e: any) => {
    if (tool === "pan" || e.button === 1 || e.spaceKey) {
      isPanning.current = true;
      panStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
      return;
    }

    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext("2d");
    if (!ctx) return;

    isDrawing.current = true;
    const coords = getCanvasCoords(e);
    startPos.current = coords;
    tempSnapshot.current = ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);

    if (tool === "pen" || tool === "brush" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = tool === "brush" ? size * 2.5 : size;

      if (tool === "eraser") {
        // Destination-out ONLY erases drawing annotations, leaving base image 100% untouched!
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1.0)";
        ctx.lineWidth = size * 2;
        ctx.globalAlpha = 1.0;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
        ctx.globalAlpha = tool === "brush" ? Math.min(0.5, opacity) : opacity;
      }
    }
  };

  const drawMove = (e: any) => {
    if (isPanning.current && panStart.current) {
      setPanOffset({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      });
      return;
    }

    if (!isDrawing.current || !startPos.current) return;
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoords(e);

    if (tool === "pen" || tool === "brush" || tool === "eraser") {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (tool === "line" || tool === "arrow" || tool === "rect" || tool === "circle") {
      if (tempSnapshot.current) {
        ctx.putImageData(tempSnapshot.current, 0, 0);
      }
      ctx.beginPath();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = "round";

      if (tool === "line") {
        ctx.moveTo(startPos.current.x, startPos.current.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      } else if (tool === "arrow") {
        const fromX = startPos.current.x;
        const fromY = startPos.current.y;
        const toX = coords.x;
        const toY = coords.y;

        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        // Arrowhead math
        const headlen = Math.max(12, size * 3);
        const angle = Math.atan2(toY - fromY, toX - fromX);
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      } else if (tool === "rect") {
        const w = coords.x - startPos.current.x;
        const h = coords.y - startPos.current.y;
        ctx.strokeRect(startPos.current.x, startPos.current.y, w, h);
      } else if (tool === "circle") {
        const rx = Math.abs(coords.x - startPos.current.x) / 2;
        const ry = Math.abs(coords.y - startPos.current.y) / 2;
        const cx = Math.min(startPos.current.x, coords.x) + rx;
        const cy = Math.min(startPos.current.y, coords.y) + ry;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };

  const endDraw = () => {
    if (isPanning.current) {
      isPanning.current = false;
      panStart.current = null;
      return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext("2d");
    if (!ctx) return;

    ctx.closePath();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1.0;
    saveToHistory();
  };

  const handleSave = () => {
    const bgCanvas = bgCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    if (!bgCanvas || !drawCanvas) return;

    // Lossless high quality composition
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = bgCanvas.width;
    exportCanvas.height = bgCanvas.height;
    const expCtx = exportCanvas.getContext("2d");
    if (!expCtx) return;

    expCtx.drawImage(bgCanvas, 0, 0);
    expCtx.drawImage(drawCanvas, 0, 0);

    const dataUrl = exportCanvas.toDataURL("image/png");
    forensicAudio.playCameraShutter();
    onSave(dataUrl);
    showToast("Çizim HD olarak kaydedildi!");
    setTimeout(() => onClose(), 300);
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[999999] flex flex-col bg-zinc-950/98 backdrop-blur-xl text-white font-sans select-none overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Top Navigation Bar */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 bg-zinc-900/95 px-5 select-none shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/20 text-pink-400 font-bold">🎨</span>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">{title}</h2>
            <p className="text-[10px] text-zinc-400">Yüksek Kalite (HD) Çizim & Katmanlı Düzenleme Modu</p>
          </div>
        </div>

        {/* Action Controls & Zoom Readout */}
        <div className="flex items-center gap-2">
          {/* Zoom & Pan Reset */}
          <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-white/10 mr-2">
            <span className="text-[10px] text-zinc-400 font-mono mr-1">🔍 {Math.round(zoom * 100)}%</span>
            <button
              onClick={() => {
                setZoom((z) => Math.max(0.15, z * 0.8));
                forensicAudio.playTypewriter();
              }}
              type="button"
              className="h-6 w-6 rounded bg-zinc-800 text-xs font-bold hover:bg-zinc-700 cursor-pointer"
              title="Uzaklaştır (-)"
            >
              -
            </button>
            <button
              onClick={() => {
                setZoom(1.0);
                setPanOffset({ x: 0, y: 0 });
                forensicAudio.playTypewriter();
              }}
              type="button"
              className="h-6 px-1.5 rounded bg-zinc-800 text-[10px] font-mono hover:bg-zinc-700 cursor-pointer"
              title="Sıfırla (1:1)"
            >
              Sıfırla
            </button>
            <button
              onClick={() => {
                setZoom((z) => Math.min(10.0, z * 1.25));
                forensicAudio.playTypewriter();
              }}
              type="button"
              className="h-6 w-6 rounded bg-zinc-800 text-xs font-bold hover:bg-zinc-700 cursor-pointer"
              title="Yakınlaştır (+)"
            >
              +
            </button>
          </div>

          <button
            onClick={handleUndo}
            disabled={history.length <= 1}
            type="button"
            className="flex h-8 items-center gap-1.5 px-3 rounded border border-white/10 bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>↶</span> Geri Al
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            type="button"
            className="flex h-8 items-center gap-1.5 px-3 rounded border border-white/10 bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>↷</span> İleri Al
          </button>
          <button
            onClick={handleClear}
            type="button"
            className="flex h-8 items-center gap-1.5 px-3 rounded border border-red-500/30 bg-red-500/10 text-xs text-red-400 hover:bg-red-500/20 cursor-pointer"
          >
            <span>🗑️</span> Çizimleri Temizle
          </button>

          <span className="h-5 w-px bg-white/10 mx-1" />

          <button
            onClick={onClose}
            type="button"
            className="flex h-8 items-center px-3 rounded border border-white/10 bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 cursor-pointer"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            type="button"
            className="flex h-8 items-center gap-1.5 px-4 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg cursor-pointer transition-colors"
          >
            <span>💾</span> Kaydet & Kapat
          </button>
        </div>
      </div>

      {/* Drawing Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-zinc-900/80 px-5 py-2 shrink-0">
        {/* Tools Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-zinc-400 mr-1">Araç:</span>
          {[
            { id: "pen", label: "Kalem", icon: "✏️" },
            { id: "brush", label: "Fırça", icon: "🖌️" },
            { id: "eraser", label: "Silgi", icon: "🧽" },
            { id: "line", label: "Çizgi", icon: "╱" },
            { id: "arrow", label: "Ok", icon: "➔" },
            { id: "rect", label: "Dikdörtgen", icon: "▭" },
            { id: "circle", label: "Daire", icon: "○" },
            { id: "pan", label: "Taşı / Kaydır", icon: "🖐️" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTool(t.id as any);
                forensicAudio.playTypewriter();
              }}
              type="button"
              className={`flex h-8 items-center gap-1.5 px-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                tool === t.id
                  ? "border-pink-500/50 bg-pink-500/20 text-pink-300 font-bold"
                  : "border-white/5 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Color Palette & Picker */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-zinc-400">Renk:</span>
          <div className="flex items-center gap-1.5">
            {["#38bdf8", "#ef4444", "#f59e0b", "#4ade80", "#a78bfa", "#f472b6", "#ffffff", "#000000", "#ffd700"].map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  forensicAudio.playTypewriter();
                }}
                type="button"
                style={{ backgroundColor: c }}
                className={`h-6 w-6 rounded-full border border-white/20 transition-transform cursor-pointer ${
                  color === c ? "scale-125 ring-2 ring-white" : "hover:scale-110"
                }`}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-7 w-7 rounded border border-white/20 bg-transparent cursor-pointer"
              title="Özel Renk Seç"
            />
          </div>
        </div>

        {/* Kalınlık (Stroke Thickness) Slider & Direct Numeric Input */}
        <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-[11px] font-semibold text-zinc-400">Kalınlık:</span>
          <input
            type="range"
            min="1"
            max="100"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-24 accent-pink-500 cursor-pointer"
          />
          <input
            type="number"
            min="1"
            max="100"
            value={size}
            onChange={(e) => setSize(Math.max(1, Math.min(100, Number(e.target.value))))}
            className="w-12 text-center rounded border border-white/20 bg-zinc-800 text-xs font-mono font-bold text-white outline-none"
          />
          <span className="text-[10px] text-zinc-400">px</span>
          <div className="flex items-center gap-1 ml-1 border-l border-white/10 pl-2">
            {[1, 3, 6, 12, 24, 48].map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                type="button"
                className={`h-5 px-1.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                  size === s ? "bg-pink-600 text-white font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Şeffaflık (Opacity) Slider & Display */}
        <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-[11px] font-semibold text-zinc-400">Şeffaflık:</span>
          <input
            type="range"
            min="1"
            max="100"
            value={Math.round(opacity * 100)}
            onChange={(e) => setOpacity(Number(e.target.value) / 100)}
            className="w-20 accent-cyan-400 cursor-pointer"
          />
          <span className="w-10 text-center text-xs font-mono font-bold text-cyan-300">
            %{Math.round(opacity * 100)}
          </span>
        </div>

        {/* Background Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-zinc-400">Arka Plan:</span>
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-white/10">
            {[
              { id: "dark", label: "Karanlık" },
              { id: "white", label: "Beyaz" },
              { id: "transparent", label: "Şeffaf" },
            ].map((bg) => (
              <button
                key={bg.id}
                onClick={() => {
                  setBgColor(bg.id as any);
                  forensicAudio.playTypewriter();
                }}
                type="button"
                className={`h-6 px-2 rounded text-[10px] transition-colors cursor-pointer ${
                  bgColor === bg.id ? "bg-zinc-700 text-white font-semibold" : "text-zinc-400 hover:text-white"
                }`}
              >
                {bg.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Interactive Canvas Area with Layering and Smooth Pan / Zooming */}
      <div 
        ref={containerRef}
        onWheel={handleWheel}
        className={`flex-1 flex items-center justify-center bg-[#09090b] p-6 overflow-hidden relative select-none ${
          tool === "pan" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
        }`}
      >
        {toastMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-2xl animate-fade-in">
            {toastMsg}
          </div>
        )}

        <div className="absolute bottom-4 left-4 z-50 text-[11px] text-zinc-400 bg-zinc-900/90 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur pointer-events-none flex items-center gap-2">
          <span>💡 İpucu: Fare tekerleği ile büyütüp küçültebilir, <b>🖐️ Taşı</b> aracı ile resmi serbestçe kaydırabilirsiniz.</span>
        </div>

        <div 
          style={{ 
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, 
            transformOrigin: "center center" 
          }}
          className="relative inline-block rounded-xl border border-white/10 bg-zinc-900 shadow-2xl overflow-hidden max-w-full max-h-full"
        >
          {/* Base Layer Canvas (Original image & background) */}
          <canvas
            ref={bgCanvasRef}
            className="block max-w-full max-h-[72vh] pointer-events-none"
          />

          {/* Drawing Overlay Layer Canvas (Strokes, shapes, eraser) */}
          <canvas
            ref={drawCanvasRef}
            onMouseDown={(e) => {
              updateCursorPos(e);
              startDraw(e);
            }}
            onMouseMove={(e) => {
              updateCursorPos(e);
              drawMove(e);
            }}
            onMouseUp={(e) => {
              updateCursorPos(e);
              endDraw();
            }}
            onMouseLeave={() => {
              setCursorPos(null);
              endDraw();
            }}
            onTouchStart={(e) => {
              updateCursorPos(e);
              startDraw(e);
            }}
            onTouchMove={(e) => {
              updateCursorPos(e);
              drawMove(e);
            }}
            onTouchEnd={endDraw}
            className={`absolute inset-0 w-full h-full ${
              tool === "pan" ? "cursor-grab active:cursor-grabbing" : "cursor-none"
            }`}
          />

          {/* Precision Custom Cursor Tip Indicator */}
          {cursorPos && tool !== "pan" && (
            <div
              style={{
                left: cursorPos.x,
                top: cursorPos.y,
                width: Math.max(6, (tool === "brush" ? size * 2.5 : tool === "eraser" ? size * 2 : size) * (cursorPos.scale || 0.5)),
                height: Math.max(6, (tool === "brush" ? size * 2.5 : tool === "eraser" ? size * 2 : size) * (cursorPos.scale || 0.5)),
                borderColor: tool === "eraser" ? "#ef4444" : color,
                backgroundColor: tool === "eraser" ? "rgba(239, 68, 68, 0.3)" : `${color}40`,
              }}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-md z-50 transition-none"
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
