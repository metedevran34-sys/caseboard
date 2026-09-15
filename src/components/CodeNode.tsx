/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Node } from "../types";
import { NodeWrap, Header, Tags, Resizer } from "./NodeBase";

interface HighlightPattern {
  re: RegExp;
  c: string;
}

const PATTERNS: Record<string, HighlightPattern[]> = {
  javascript: [
    { re: /(\/\/[^\n]*)/, c: "#6272a4" },
    { re: /(\/\*[\s\S]*?\*\/)/, c: "#6272a4" },
    { re: /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/, c: "#f1fa8c" },
    { re: /\b(const|let|var|function|return|if|else|for|while|class|import|export|default|new|this|async|await|try|catch|throw|null|undefined|true|false|typeof)\b/, c: "#ff79c6" },
    { re: /\b([A-Z][a-zA-Z0-9_]*)(?=\s*\()/, c: "#50fa7b" },
    { re: /\b(\d+\.?\d*)\b/, c: "#bd93f9" },
  ],
  python: [
    { re: /(#[^\n]*)/, c: "#6272a4" },
    { re: /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/, c: "#f1fa8c" },
    { re: /\b(def|class|return|if|elif|else|for|while|import|from|as|with|try|except|raise|pass|None|True|False|and|or|not|in|is|lambda|yield)\b/, c: "#ff79c6" },
    { re: /\b(\d+\.?\d*)\b/, c: "#bd93f9" },
  ],
  typescript: [
    { re: /(\/\/[^\n]*)/, c: "#6272a4" },
    { re: /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/, c: "#f1fa8c" },
    { re: /\b(const|let|var|function|return|if|else|for|while|class|interface|type|import|export|extends|async|await|null|undefined|true|false|string|number|boolean|void|any)\b/, c: "#ff79c6" },
    { re: /\b(\d+\.?\d*)\b/, c: "#bd93f9" },
  ],
  html: [
    { re: /(<!--[\s\S]*?-->)/, c: "#6272a4" },
    { re: /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/, c: "#f1fa8c" },
    { re: /(<\/?[a-zA-Z][a-zA-Z0-9]*)/, c: "#ff79c6" },
    { re: /\b([a-zA-Z-]+)(?=\s*=)/, c: "#50fa7b" },
  ],
  css: [
    { re: /(\/\*[\s\S]*?\*\/)/, c: "#6272a4" },
    { re: /([.#][a-zA-Z][a-zA-Z0-9_-]*)/, c: "#50fa7b" },
    { re: /\b([a-zA-Z-]+)(?=\s*:)/, c: "#8be9fd" },
    { re: /(#[0-9a-fA-F]{3,6}|rgba?\([^)]+\))/, c: "#bd93f9" },
  ],
  bash: [
    { re: /(#[^\n]*)/, c: "#6272a4" },
    { re: /("(?:\\.|[^"\\])*"|'[^']*')/, c: "#f1fa8c" },
    { re: /\b(if|then|else|fi|for|while|do|done|function|echo|export|cd|ls|grep|awk|sed)\b/, c: "#ff79c6" },
    { re: /(\$[a-zA-Z_][a-zA-Z0-9_]*)/, c: "#8be9fd" },
  ],
  json: [
    { re: /("(?:\\.|[^"\\])*"\s*:)/, c: "#8be9fd" },
    { re: /("(?:\\.|[^"\\])*")/, c: "#f1fa8c" },
    { re: /\b(true|false|null)\b/, c: "#ff79c6" },
    { re: /\b(\d+\.?\d*)\b/, c: "#bd93f9" },
  ],
  sql: [
    { re: /(--[^\n]*)/, c: "#6272a4" },
    { re: /('(?:\\.|[^'\\])*')/, c: "#f1fa8c" },
    { re: /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|DROP|TABLE|JOIN|LEFT|RIGHT|INNER|ON|AND|OR|NOT|NULL|AS|GROUP|BY|ORDER|HAVING|LIMIT|INTO|VALUES|SET|PRIMARY|KEY)\b/i, c: "#ff79c6" },
    { re: /\b(\d+\.?\d*)\b/, c: "#bd93f9" },
  ],
};

const LANGS = ["javascript", "typescript", "python", "html", "css", "bash", "json", "sql"];

interface Token {
  t: string;
  c: string;
}

function tokenizeLine(line: string, lang: string): (string | Token)[] {
  const pats = PATTERNS[lang] || PATTERNS.javascript;
  let parts: (string | Token)[] = [line];

  for (const { re, c } of pats) {
    const next: (string | Token)[] = [];
    for (const part of parts) {
      if (typeof part !== "string") {
        next.push(part);
        continue;
      }
      const m = part.match(re);
      if (!m || m.index === undefined) {
        next.push(part);
        continue;
      }
      if (m.index > 0) next.push(part.slice(0, m.index));
      next.push({ t: m[0], c });
      const rest = part.slice(m.index + m[0].length);
      if (rest) next.push(rest);
    }
    parts = next;
  }
  return parts;
}

interface CodeHighlightProps {
  code: string;
  lang: string;
}

function CodeHighlight({ code, lang }: CodeHighlightProps) {
  return (
    <div className="font-mono text-[12px] leading-relaxed select-text tracking-wide font-medium">
      {(code || "").split("\n").map((line, li) => (
        <div key={li} className="flex min-h-[20px] hover:bg-white/[0.02]">
          <span className="w-8 shrink-0 select-none pr-3 text-right text-[10px] text-zinc-600 leading-[20px]">
            {li + 1}
          </span>
          <span className="flex-1 whitespace-pre-wrap break-all leading-[20px]">
            {tokenizeLine(line, lang).map((p, i) =>
              typeof p === "string" ? (
                <span key={i} className="text-zinc-200">
                  {p}
                </span>
              ) : (
                <span key={i} style={{ color: p.c }}>
                  {p.t}
                </span>
              )
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

interface CodeNodeProps {
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

export function CodeNode({
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
}: CodeNodeProps) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(node.code || "");
  const [title, setTitle] = useState(node.title || "Kod");
  const [lang, setLang] = useState(node.lang || "javascript");
  const [copied, setCopied] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
      taRef.current.setSelectionRange(taRef.current.value.length, taRef.current.value.length);
    }
  }, [editing]);

  return (
    <NodeWrap
      node={{ ...node, bg: "#282a36" }}
      connecting={connecting}
      onConnectEnd={connEnd}
      onPortDragStart={portDragStart}
      accent="#8be9fd"
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
        accent="#8be9fd"
        icon="💻"
        isConnSrc={connecting === node.id}
        onConnect={() => connStart(node.id)}
        onDel={() => del(node.id)}
        onDuplicate={onDuplicate}
        createdAt={node.createdAt}
        extra={
          <select
            value={lang}
            onChange={(e) => {
              const v = e.target.value;
              setLang(v);
              upd({ id: node.id, lang: v });
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="h-[22px] rounded border border-white/12 bg-zinc-900 px-1 font-mono text-[9px] text-[#8be9fd] cursor-pointer outline-none"
          >
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        }
      />
      <div className="bg-zinc-900/90 select-none">
        <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5">
          <div className="flex gap-1.5">
            {["#ff5555", "#f1fa8c", "#50fa7b"].map((c) => (
              <span key={c} style={{ backgroundColor: c }} className="h-2.5 w-2.5 rounded-full block" />
            ))}
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="text-[#6272a4]">{lang}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(code).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                });
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={`rounded border px-2.5 py-0.5 cursor-pointer transition-colors ${
                copied
                  ? "border-[#50fa7b]/40 bg-[#50fa7b]/15 text-[#50fa7b]"
                  : "border-white/10 bg-white/5 text-[#6272a4] hover:text-white hover:bg-white/10"
              }`}
            >
              {copied ? "Kopyalandı" : "Kopyala"}
            </button>
            <button
              onClick={() => setEditing(!editing)}
              onMouseDown={(e) => e.stopPropagation()}
              className={`rounded border px-2.5 py-0.5 cursor-pointer transition-colors ${
                editing
                  ? "border-[#8be9fd]/40 bg-[#8be9fd]/15 text-[#8be9fd]"
                  : "border-white/10 bg-white/5 text-[#6272a4] hover:text-[#8be9fd] hover:bg-[#8be9fd]/10"
              }`}
            >
              {editing ? "Tamam" : "Düzenle"}
            </button>
          </div>
        </div>
        <div
          className="max-h-[380px] min-h-[100px] overflow-auto py-3 select-text"
          onMouseDown={(e) => {
            if (!editing) {
              e.stopPropagation();
              drag(e, node.id);
            }
          }}
        >
          {editing ? (
            <div className="flex font-mono text-[12px] leading-relaxed">
              <div className="w-8 shrink-0 select-none pr-3 text-right text-[10px] text-zinc-600">
                {code.split("\n").map((_, i) => (
                  <div key={i} className="min-h-[20px]">
                    {i + 1}
                  </div>
                ))}
              </div>
              <textarea
                ref={taRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onBlur={() => {
                  setEditing(false);
                  upd({ id: node.id, code });
                }}
                onMouseDown={(e) => e.stopPropagation()}
                spellCheck={false}
                style={{ tabSize: 2 }}
                className="flex-1 border-none bg-transparent text-[#f8f8f2] outline-none resize-none font-mono min-h-[100px] p-0"
              />
            </div>
          ) : code ? (
            <div className="pr-3">
              <CodeHighlight code={code} lang={lang} />
            </div>
          ) : (
            <div
              className="px-3 py-2 font-mono text-xs text-[#6272a4] cursor-text italic select-none"
              onDoubleClick={() => setEditing(true)}
            >
              // Kod yazmak için çift tıklayın...
            </div>
          )}
        </div>
      </div>
      <Tags tags={node.tags || []} onChange={(tags) => upd({ id: node.id, tags })} />
      <Resizer id={node.id} x={node.x} y={node.y} w={node.w} h={node.h} onUpdate={upd} zoom={zoom} />
    </NodeWrap>
  );
}
