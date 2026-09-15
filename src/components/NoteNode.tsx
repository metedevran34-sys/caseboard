/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Node } from "../types";
import { NodeWrap, Header, Tags, Resizer, NOTE_COLORS } from "./NodeBase";
import { forensicAudio } from "../utils/audio";

/**
 * Custom Simple Inline Markdown Tokenizer/View with dynamic brightness support
 */
export function inlineMD(text: string, isLight: boolean = false): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let rem = text;
  let k = 0;

  while (rem.length > 0) {
    const b = rem.match(/\*\*(.*?)\*\*/);
    const it = rem.match(/\*(.*?)\*/);
    const co = rem.match(/`(.*?)`/);
    const all = [b, it, co].filter((x): x is RegExpMatchArray => x !== null);

    if (!all.length) {
      parts.push(<span key={k++}>{rem}</span>);
      break;
    }

    // Capture the earliest markdown pattern found
    const f = all.reduce((a, x) => ((a.index ?? 0) <= (x.index ?? 0) ? a : x));
    const idx = f.index ?? 0;

    if (idx > 0) {
      parts.push(<span key={k++}>{rem.slice(0, idx)}</span>);
    }

    if (f === b) {
      parts.push(
        <strong key={k++} className={isLight ? "text-neutral-900 font-extrabold" : "text-amber-300 font-semibold"}>
          {f[1]}
        </strong>
      );
    } else if (f === it) {
      parts.push(
        <em key={k++} className={isLight ? "text-neutral-800 italic" : "text-zinc-300 italic"}>
          {f[1]}
        </em>
      );
    } else {
      parts.push(
        <code
          key={k++}
          className={`rounded px-1 py-[1.5px] font-mono text-[11px] ${
            isLight ? "bg-black/15 text-neutral-800" : "bg-white/10 text-teal-300"
          }`}
        >
          {f[1]}
        </code>
      );
    }

    rem = rem.slice(idx + f[0].length);
  }

  return parts;
}

interface MarkdownViewProps {
  text: string;
  isLight: boolean;
  onDblClick: () => void;
}

export function MarkdownView({ text, isLight, onDblClick }: MarkdownViewProps) {
  if (!text) {
    return (
      <span className={isLight ? "text-neutral-500 select-none italic" : "text-white/20 select-none italic"}>
        Yazmak için çift tıklayın...
      </span>
    );
  }

  const lines = text.split("\n");
  const parsedElements: React.ReactNode[] = [];
  let tableRows: string[][] = [];
  let isTable = false;

  const flushTable = (key: string) => {
    if (tableRows.length > 0) {
      const rows = [...tableRows];
      parsedElements.push(
        <div key={key} className="my-2 overflow-x-auto max-w-full rounded border border-neutral-300/30">
          <table className="w-full text-left font-sans text-[11px] border-collapse">
            <thead>
              <tr className={isLight ? "bg-black/10 border-b border-black/20" : "bg-white/10 border-b border-white/20"}>
                {rows[0].map((cell, cidx) => (
                  <th key={cidx} className="p-1.5 px-2.5 font-bold border-r border-neutral-400/20">{inlineMD(cell, isLight)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, ridx) => (
                <tr key={ridx} className={ridx % 2 === 0 ? (isLight ? "bg-black/5" : "bg-white/5") : "bg-transparent"}>
                  {row.map((cell, cidx) => (
                    <td key={cidx} className="p-1.5 px-2.5 border-r border-neutral-400/20 border-b border-neutral-400/10">{inlineMD(cell, isLight)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      isTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for tables
    if (line.startsWith("|") && line.endsWith("|")) {
      isTable = true;
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      const isDivider = cells.every((c) => c.match(/^[:\s\-]+$/));
      if (!isDivider) {
        tableRows.push(cells);
      }
      continue;
    } else {
      if (isTable) {
        flushTable(`table-${i}`);
      }
    }

    if (line.startsWith("# ")) {
      parsedElements.push(
        <h1 key={i} className={`text-[16px] font-bold mt-2.5 mb-1.5 tracking-wide leading-snug border-b pb-0.5 ${
          isLight ? "text-neutral-950 border-black/10" : "text-white border-white/10"
        }`}>
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      parsedElements.push(
        <h2 key={i} className={`text-[13.5px] font-bold mt-2 mb-1 tracking-wide ${
          isLight ? "text-neutral-900" : "text-zinc-200"
        }`}>
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("> ")) {
      parsedElements.push(
        <blockquote key={i} className={`border-l-4 px-3 py-1 my-1.5 italic rounded-r text-[11.5px] ${
          isLight ? "border-amber-600 bg-black/5 text-neutral-800" : "border-amber-500 bg-white/5 text-zinc-300"
        }`}>
          {inlineMD(line.slice(2), isLight)}
        </blockquote>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      parsedElements.push(
        <div key={i} className="flex gap-2 text-[12px] py-0.5 items-start">
          <span className="text-amber-500 font-bold select-none">•</span>
          <span className="flex-1">{inlineMD(line.slice(2), isLight)}</span>
        </div>
      );
    } else if (line.match(/^\d+\.\s/)) {
      const match = line.match(/^(\d+)\.\s(.*)/);
      parsedElements.push(
        <div key={i} className="flex gap-2 text-[12px] py-0.5 items-start">
          <span className="text-amber-500 font-mono font-bold select-none">{match?.[1]}.</span>
          <span className="flex-1">{inlineMD(match?.[2] || "", isLight)}</span>
        </div>
      );
    } else if (line === "") {
      parsedElements.push(<div key={i} className="h-1.5" />);
    } else {
      parsedElements.push(
        <div key={i} className="text-[12px] py-0.5 leading-relaxed">
          {inlineMD(lines[i], isLight)}
        </div>
      );
    }
  }

  // Flush remaining table
  if (isTable) {
    flushTable("table-end");
  }

  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDblClick();
      }}
      className="font-sans leading-relaxed select-text space-y-1"
    >
      {parsedElements}
    </div>
  );
}

interface NoteNodeProps {
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

export function NoteNode({
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
}: NoteNodeProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(node.text || "");
  const [title, setTitle] = useState(node.title || "Not");
  const [showColors, setShowColors] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
    }
  }, [editing]);

  // Read matching background color configs
  const colorConfig = NOTE_COLORS.find((c) => c.bg === node.bg);
  const textColor = colorConfig?.text || "#ffffff";
  const isLight = textColor === "#18181b" || textColor === "#1c1917" || textColor === "#1e3a8a" || textColor === "#064e3b" || textColor === "#7f1d1d" || textColor === "#831843" || textColor === "#4c1d95";

  return (
    <NodeWrap
      node={node}
      connecting={connecting}
      onConnectEnd={connEnd}
      onPortDragStart={portDragStart}
      accent="#ef4444"
      inGroup={inGroup}
    >
      <Header
        title={title}
        onTitle={(t) => {
          setTitle(t);
          upd({ id: node.id, title: t });
        }}
        onDrag={(e) => {
          if (editing) return;
          e.stopPropagation();
          drag(e, node.id);
        }}
        accent="#ef4444"
        icon="✍️"
        isConnSrc={connecting === node.id}
        onConnect={() => connStart(node.id)}
        onDel={() => del(node.id)}
        onDuplicate={onDuplicate}
        createdAt={node.createdAt}
        extra={
          <div className="flex gap-0.5 select-none items-center">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setShowColors(!showColors);
              }}
              type="button"
              className="flex h-[22px] w-6 items-center justify-center rounded border border-white/10 text-zinc-500 cursor-pointer hover:text-white"
            >
              🎨
            </button>
          </div>
        }
      />

      {/* Note Color Picker Bar */}
      {showColors && (
        <div
          className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-white/5 bg-black/15 select-none"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {NOTE_COLORS.map((c) => (
            <button
              key={c.bg}
              onClick={() => {
                upd({ id: node.id, bg: c.bg });
                setShowColors(false);
              }}
              type="button"
              style={{ backgroundColor: c.bg }}
              className={`h-[18px] w-[18px] rounded-full border cursor-pointer hover:scale-110 transition-transform ${
                node.bg === c.bg ? "border-amber-500 ring-2 ring-amber-500/35" : "border-white/15"
              }`}
            />
          ))}
        </div>
      )}

      {/* Main card write block area with adaptive text styling */}
      <div
        className={`px-3.5 py-2.5 pb-4 min-h-[110px] break-words ${editing ? "cursor-text select-text" : "cursor-grab select-none"}`}
        onDoubleClick={() => setEditing(true)}
        onMouseDown={(e) => {
          if (!editing) {
            e.stopPropagation();
            drag(e, node.id);
          }
        }}
        style={{ color: textColor }}
      >
        {editing ? (
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              upd({ id: node.id, text: e.target.value });
            }}
            onBlur={() => {
              setEditing(false);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ color: textColor }}
            placeholder="Yazmak için çift tıklayın..."
            className="w-full min-h-[110px] bg-transparent border-none outline-none font-sans text-[12px] leading-relaxed resize-none placeholder-zinc-500"
          />
        ) : (
          <p
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            className="font-sans text-[12px] leading-relaxed whitespace-pre-wrap select-none m-0"
          >
            {text || (
              <span className={isLight ? "text-neutral-500/50 select-none italic" : "text-white/20 select-none italic"}>
                Yazmak için çift tıklayın...
              </span>
            )}
          </p>
        )}
      </div>

      <Tags tags={node.tags || []} onChange={(tags) => upd({ id: node.id, tags })} />
      <Resizer id={node.id} x={node.x} y={node.y} w={node.w} h={node.h} onUpdate={upd} zoom={zoom} />
    </NodeWrap>
  );
}
