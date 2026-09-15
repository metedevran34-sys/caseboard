/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Node, TimelinePost, TimelinePostMedia } from "../types";
import { NodeWrap, Header, Resizer } from "./NodeBase";
import { 
  Heart, 
  MessageSquare, 
  Bookmark, 
  Pin, 
  Trash2, 
  Repeat, 
  Link2, 
  CornerDownRight, 
  MoreHorizontal, 
  Image as ImageIcon, 
  Send, 
  CheckCircle, 
  ExternalLink,
  ChevronUp,
  ChevronDown
} from "lucide-react";

const TL_COLORS = [
  { id: "none", label: "—", accent: "#6b7280" },
  { id: "critical", label: "Kritik", accent: "#ef4444" },
  { id: "review",   label: "İnceleme", accent: "#f59e0b" },
  { id: "solution", label: "Çözüm", accent: "#4ade80" },
  { id: "idea",     label: "Fikir", accent: "#38bdf8" },
  { id: "info",     label: "Bilgi", accent: "#a78bfa" },
];

function fmtDate(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "az önce";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}dk`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}sa`;
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
}

function fmtFull(ts: number): string {
  return ts
    ? new Date(ts).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
}

function parseTags(text: string): string[] {
  return (text.match(/#[\w\u00C0-\u024F]+/g) || []).map((t) => t.slice(1));
}

// ─── POST MEDIA PREVIEW ──────────────────────────────────────────
interface PostMediaProps {
  media?: TimelinePostMedia[];
  onLightbox?: (m: TimelinePostMedia) => void;
}

function PostMediaPreview({ media, onLightbox }: PostMediaProps) {
  if (!media || media.length === 0) return null;
  const images = media.filter((m) => m.type === "image");
  const videos = media.filter((m) => m.type === "video");
  const files  = media.filter((m) => m.type === "file");
  const links  = media.filter((m) => m.type === "link");

  return (
    <div
      className="mt-1.5 flex flex-col gap-1 select-none"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {images.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {images.map((m) => (
            <img
              key={m.id}
              src={m.data}
              alt={m.name}
              role="presentation"
              onDoubleClick={() => onLightbox?.(m)}
              className="max-h-[120px] rounded-lg border border-white/10 object-cover cursor-zoom-in hover:scale-[1.02] transition-transform"
              style={{ maxWidth: images.length === 1 ? "100%" : "110px" }}
            />
          ))}
        </div>
      )}
      {videos.map((m) => (
        <video
          key={m.id}
          src={m.data}
          controls
          className="max-h-[140px] w-full max-w-full rounded-lg"
        />
      ))}
      {files.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-1.5 rounded-md border border-amber-500/18 bg-amber-500/8 p-1.5 font-mono text-[11px]"
        >
          <span className="text-amber-500">📎</span>
          <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-zinc-300">
            {m.name}
          </span>
        </div>
      ))}
      {links.map((m) => (
        <a
          key={m.id}
          href={m.url}
          target="_blank"
          rel="noopener noreferrer"
          onMouseDown={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 rounded-md border border-sky-500/18 bg-sky-500/6 p-1.5 font-mono text-[11px] text-sky-400 no-underline hover:bg-sky-500/12"
        >
          <span className="text-sky-500">🔗</span>
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {m.label || m.url}
          </span>
        </a>
      ))}
    </div>
  );
}

// ─── POST DETAY MODAL ────────────────────────────────────────────
interface DetailModalProps {
  post: TimelinePost;
  allPosts: TimelinePost[];
  allNodes: Node[];
  onClose: () => void;
  onUpdate: (pid: string, fields: Partial<TimelinePost>) => void;
  onDelete: (pid: string) => void;
}

function PostDetailModal({
  post,
  allPosts,
  allNodes,
  onClose,
  onUpdate,
  onDelete,
}: DetailModalProps) {
  const replies = allPosts.filter((p) => p.parentId === post.id);
  const colorDef = TL_COLORS.find((c) => c.id === (post.colorId || "none")) || TL_COLORS[0];
  const [showLightbox, setShowLightbox] = useState<TimelinePostMedia | null>(null);
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const addComment = () => {
    if (!commentText.trim()) return;
    onUpdate(post.id, {
      comments: [
        ...(post.comments || []),
        { id: `c${Date.now()}`, text: commentText.trim(), time: Date.now() },
      ],
    });
    setCommentText("");
  };

  const saveEditedComment = (cid: string) => {
    if (!editingCommentText.trim()) return;
    onUpdate(post.id, {
      comments: (post.comments || []).map((c) => c.id === cid ? { ...c, text: editingCommentText.trim() } : c)
    });
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-md"
    >
      {showLightbox && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 select-none"
          onClick={() => setShowLightbox(null)}
        >
          <div className="relative max-w-full max-h-full p-4" onClick={(e) => e.stopPropagation()}>
            {showLightbox.type === "image" && (
              <img
                src={showLightbox.data}
                alt=""
                className="max-h-[85vh] max-w-[88vw] rounded-xl shadow-2xl border border-white/10"
              />
            )}
            {showLightbox.type === "video" && (
              <video
                src={showLightbox.data}
                controls
                autoPlay
                className="max-h-[85vh] max-w-[88vw] rounded-xl shadow-2xl border border-white/10"
              />
            )}
            <button
              onClick={() => setShowLightbox(null)}
              type="button"
              className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white hover:bg-red-600 transition-colors cursor-pointer border-0 shadow-lg"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <div
        className="max-h-[85vh] w-[95vw] max-w-[520px] overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl font-sans text-sm select-text"
        style={{ borderTop: `4px solid ${colorDef.accent}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Gönderi Detay Grafiği</span>
          <button
            onClick={onClose}
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>

        {post.title && (
          <div className="mb-2 text-base font-bold text-zinc-100 tracking-tight">
            {post.title}
          </div>
        )}

        <div className="mb-4 text-[13.5px] text-zinc-300 leading-relaxed whitespace-pre-wrap break-words font-sans">
          {post.text}
        </div>

        {(post.tags || []).length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1 select-none">
            {(post.tags || []).map((t) => (
              <span
                key={t}
                className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs text-purple-300 border border-purple-500/15"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <PostMediaPreview media={post.media} onLightbox={setShowLightbox} />

        <div className="mt-4 flex gap-4 border-y border-white/5 py-3 text-xs text-zinc-500 font-medium">
          <span className="text-zinc-400 font-semibold">{fmtFull(post.time)}</span>
          <span className="text-zinc-600">|</span>
          <span className="flex items-center gap-1"><span className="text-rose-500 font-bold">{post.likes || 0}</span> Beğeni</span>
          <span className="flex items-center gap-1"><span className="text-zinc-300 font-bold">{(post.comments || []).length}</span> Yorum</span>
        </div>

        {/* Comment input inline inside detail */}
        <div className="mt-4 flex gap-2">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addComment()}
            placeholder="Düşünceni paylaş..."
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-purple-500/30 transition-colors"
          />
          <button
            onClick={addComment}
            type="button"
            className="rounded-xl bg-purple-600 text-zinc-100 hover:bg-purple-500 transition-colors px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Send className="h-3 w-3" />
            <span>Gönder</span>
          </button>
        </div>

        {/* Existing comments */}
        {(post.comments || []).length > 0 ? (
          <div className="mt-5 space-y-3 pt-2">
            <div className="text-[10px] font-bold text-zinc-500 tracking-wider">YORUMLAR</div>
            <div className="space-y-2.5">
              {(post.comments || []).map((cm) => (
                <div key={cm.id} className="group relative flex flex-col gap-2 rounded-xl bg-white/[0.02] p-3 border border-white/5">
                  {editingCommentId === cm.id ? (
                    <div className="flex gap-2 w-full">
                      <input
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEditedComment(cm.id)}
                        className="flex-1 rounded-lg border border-purple-550/30 bg-black px-2 py-1 text-xs text-zinc-200 outline-none"
                      />
                      <button
                        onClick={() => saveEditedComment(cm.id)}
                        type="button"
                        className="rounded bg-purple-600 px-3 py-1 text-xs font-bold text-white cursor-pointer"
                      >
                        Kaydet
                      </button>
                      <button
                        onClick={() => setEditingCommentId(null)}
                        type="button"
                        className="text-zinc-400 text-xs hover:text-white px-2"
                      >
                        İptal
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-600 font-mono">{fmtDate(cm.time)}</span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingCommentId(cm.id);
                              setEditingCommentText(cm.text);
                            }}
                            type="button"
                            className="text-zinc-500 hover:text-purple-400 text-xs shrink-0 cursor-pointer"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() =>
                              onUpdate(post.id, {
                                comments: (post.comments || []).filter((c) => c.id !== cm.id),
                              })
                            }
                            type="button"
                            className="text-zinc-500 hover:text-red-400 text-xs shrink-0 cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans break-words">{cm.text}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 text-center py-6 text-xs text-zinc-600 italic">
            Bu gönderiye henüz yorum yapılmamış.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SINGLE POST CARD ───
interface PostCardProps {
  post: TimelinePost;
  allPosts: TimelinePost[];
  allNodes: Node[];
  nodeId: string;
  onUpdate: (pid: string, fields: Partial<TimelinePost>) => void;
  onDelete: (pid: string) => void;
  onOpenDetail: (pid: string) => void;
  onReply: (pid: string) => void;
  onToggleLike: (pid: string) => void;
  onToggleSave: (pid: string) => void;
  onRepost: (pid: string) => void;
}

const PostCard = React.memo<PostCardProps>(function PostCard({
  post,
  allPosts,
  allNodes,
  nodeId,
  onUpdate,
  onDelete,
  onOpenDetail,
  onReply,
  onToggleLike,
  onToggleSave,
  onRepost,
}) {
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showLightbox, setShowLightbox] = useState<TimelinePostMedia | null>(null);
  const [showAddMedia, setShowAddMedia] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const addMediaFileRef = useRef<HTMLInputElement>(null);

  const [hideAllComments, setHideAllComments] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyText, setEditingReplyText] = useState("");

  const colorDef = TL_COLORS.find((c) => c.id === (post.colorId || "none")) || TL_COLORS[0];
  const replies = allPosts.filter((p) => p.parentId === post.id);
  const linkedNodes = (allNodes || []).filter((n) => (post.linkedNodes || []).includes(n.id));

  const addComment = () => {
    const txt = commentText.trim();
    if (!txt) return;
    onUpdate(post.id, {
      comments: [...(post.comments || []), { id: `c${Date.now()}`, text: txt, time: Date.now() }],
    });
    setCommentText("");
    setShowCommentBox(false);
  };

  const saveEditedComment = (cid: string) => {
    if (!editingCommentText.trim()) return;
    onUpdate(post.id, {
      comments: (post.comments || []).map((c) => c.id === cid ? { ...c, text: editingCommentText.trim() } : c)
    });
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const saveEditedReply = (rid: string) => {
    if (!editingReplyText.trim()) return;
    onUpdate(rid, { text: editingReplyText.trim() });
    setEditingReplyId(null);
    setEditingReplyText("");
  };

  const addMediaFile = (f: File) => {
    if (!f) return;
    const isImg = f.type.startsWith("image/");
    const isVid = f.type.startsWith("video/");
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        onUpdate(post.id, {
          media: [
            ...(post.media || []),
            {
              id: `m${Date.now()}`,
              type: isImg ? "image" : isVid ? "video" : "file",
              data: ev.target.result as string,
              name: f.name,
            },
          ],
        });
      }
    };
    reader.readAsDataURL(f);
  };

  const addLink = () => {
    const u = linkInput.trim();
    if (!u) return;
    onUpdate(post.id, {
      media: [...(post.media || []), { id: `m${Date.now()}`, type: "link", url: u, label: u }],
    });
    setLinkInput("");
    setShowAddMedia(false);
  };

  // Deterministic styling for user avatar based on title or post ID
  const avatarDetails = useMemo(() => {
    const sum = post.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const textColors = ["#f87171", "#fb923c", "#fbbf24", "#34d399", "#60a5fa", "#c084fc", "#f472b6"];
    const textInitials = ["A", "🕵️", "S", "G", "N", "M", "Y", "D", "C"];
    const color = textColors[sum % textColors.length];
    const initial = textInitials[sum % textInitials.length];
    return { color, initial };
  }, [post.id]);

  const textWithTags = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(#[\w\u00C0-\u024F]+)/g);
    return parts.map((p, i) =>
      p.startsWith("#") ? (
        <span 
          key={i} 
          onClick={(e) => {
            e.stopPropagation();
            // Dispatches global hashtag selection event
            window.dispatchEvent(new CustomEvent("timeline-hashtag-click", { detail: { hashtag: p.slice(1) } }));
          }}
          className="cursor-pointer font-bold hover:underline" 
          style={{ color: avatarDetails.color }}
        >
          {p}
        </span>
      ) : (
        <span key={i}>{p}</span>
      )
    );
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("tlPostId", post.id);
        e.dataTransfer.setData("tlNodeId", nodeId);
        e.dataTransfer.effectAllowed = "copy";
      }}
      className="mb-3.5 overflow-hidden rounded-2xl border border-white/6 bg-[#0f0e17] shadow-xl hover:bg-[#13111f] transition-all duration-200 select-none group/card"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {showLightbox && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md"
          onClick={() => setShowLightbox(null)}
        >
          <div className="relative max-w-full max-h-full p-4" onClick={(e) => e.stopPropagation()}>
            {showLightbox.type === "image" && (
              <img
                src={showLightbox.data}
                alt=""
                className="max-h-[85vh] max-w-[88vw] rounded-xl shadow-2xl border border-white/10"
              />
            )}
            {showLightbox.type === "video" && (
              <video
                src={showLightbox.data}
                controls
                autoPlay
                className="max-h-[85vh] max-w-[88vw] rounded-xl border border-white/10 shadow-2xl"
              />
            )}
            <button
              onClick={() => setShowLightbox(null)}
              type="button"
              className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white hover:bg-red-600 transition-colors cursor-pointer border-0 shadow-lg"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Pinned Tweet style layout banner */}
      {post.pinned && (
        <div className="flex items-center gap-1.5 px-3.5 pt-2 pb-0.5 text-zinc-500 text-[10px] font-bold select-none">
          <Pin className="h-3 w-3 text-amber-500 fill-amber-500" />
          <span>Sabitlenmiş Not</span>
        </div>
      )}

      <div className="p-3.5 pb-2">
        {/* Simple Header with Category Tag and Timestamp, no identities */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
            {post.colorId && post.colorId !== "none" && (
              <span 
                style={{ backgroundColor: colorDef.accent }} 
                className="h-2 w-2 rounded-full inline-block animate-pulse shrink-0" 
                title={colorDef.label} 
              />
            )}
            <span className="font-semibold uppercase tracking-wider text-[9px] text-zinc-550 mr-1">
              {post.colorId && post.colorId !== "none" ? colorDef.label : "Kişisel Not"}
            </span>
            <span className="text-zinc-650 font-sans">&#8226;</span>
            <span title={fmtFull(post.time)}>{fmtDate(post.time)}</span>
          </div>
          
          {/* Delete trigger top-right */}
          <button
            onClick={() => onDelete(post.id)}
            type="button"
            className="opacity-0 group-hover/card:opacity-100 text-zinc-700 hover:text-red-500 transition-opacity p-1 rounded-full hover:bg-red-500/10 cursor-pointer"
            title="Gönderiyi Sil"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        <div>
          {post.title && (
            <div className="text-[12px] font-bold text-zinc-200 leading-tight mb-1 select-text">
              {post.title}
            </div>
          )}

          {/* Post Message body text */}
          <div
            onClick={() => onOpenDetail(post.id)}
            className="cursor-pointer text-[12.5px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-words mb-2 font-sans select-text hover:text-zinc-200"
          >
            {textWithTags(post.text)}
          </div>

            {(post.tags || []).length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1 select-none">
                {(post.tags || []).map((t) => (
                  <span
                    key={t}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent("timeline-hashtag-click", { detail: { hashtag: t } }));
                    }}
                    className="rounded-full bg-purple-500/5 hover:bg-purple-500/12 px-2 py-0.5 text-[9px] text-purple-400 border border-purple-500/10 cursor-pointer transition-colors"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Media embeds */}
            <PostMediaPreview media={post.media} onLightbox={setShowLightbox} />

            {/* Embedded Dragged Connection Cards */}
            {linkedNodes.length > 0 && (
              <div className="mt-2 space-y-1 select-none" onMouseDown={(e) => e.stopPropagation()}>
                {linkedNodes.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3 py-1.5 transition-all text-xs text-zinc-300 hover:bg-white/8 cursor-pointer group/link"
                  >
                    <Link2 className="h-3.5 w-3.5 text-purple-400 group-hover/link:animate-pulse" />
                    <span className="font-semibold text-zinc-200 flex-1 truncate">{n.title || n.type}</span>
                    <span className="text-[8.5px] uppercase tracking-wider font-bold text-zinc-600 bg-zinc-900 border border-white/5 py-0.5 px-1.5 rounded-md">{n.type}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden expandable attach resource tool */}
            {showAddMedia && (
              <div className="mt-2 border border-white/5 rounded-xl bg-black/40 p-2 select-none" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex gap-1.5 items-center">
                  <button
                    onClick={() => addMediaFileRef.current?.click()}
                    type="button"
                    className="rounded-lg bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1.5 font-sans text-[10px] text-amber-500 font-bold transition-colors cursor-pointer"
                  >
                    📷 Galeri Görseli / Video
                  </button>
                  <input
                    ref={addMediaFileRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) addMediaFile(f);
                      e.target.value = "";
                      setShowAddMedia(false);
                    }}
                  />
                  <input
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addLink()}
                    placeholder="URL ekle..."
                    className="flex-1 rounded-lg border border-sky-500/25 bg-[#08070d] px-2 py-1 text-[10px] text-sky-400 outline-none"
                  />
                  <button
                    onClick={addLink}
                    type="button"
                    className="rounded-lg bg-sky-500/12 hover:bg-sky-500/20 px-2 py-1 text-xs text-sky-400 font-bold cursor-pointer"
                  >
                    ekle
                  </button>
                  <button
                    onClick={() => setShowAddMedia(false)}
                    type="button"
                    className="text-zinc-500 hover:text-white transition-colors p-1"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Micro Interactive Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-t border-white/5 px-4 py-1.5 text-[10.5px]">
        {/* Like action */}
        <button
          onClick={() => onToggleLike(post.id)}
          type="button"
          className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-all cursor-pointer ${
            post.liked
              ? "text-rose-500 bg-rose-500/10 font-bold scale-[1.03]"
              : "text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 transition-transform duration-200 ${post.liked ? "fill-rose-500 scale-115" : "scale-100"}`} />
          <span>{post.likes || 0}</span>
        </button>

        {/* Comment count */}
        <button
          onClick={() => setShowCommentBox(!showCommentBox)}
          type="button"
          className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-all cursor-pointer ${
            showCommentBox
              ? "text-purple-400 bg-purple-500/10 font-bold"
              : "text-zinc-500 hover:text-purple-400 hover:bg-purple-500/5"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{(post.comments || []).length || 0}</span>
        </button>

        {/* Nested Thread Action */}
        <button
          onClick={() => onReply(post.id)}
          type="button"
          className="flex items-center gap-1.5 py-1 px-2 rounded-lg text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/5 cursor-pointer transition-colors"
          title="Thread Yanıt Ekle"
        >
          <CornerDownRight className="h-3.5 w-3.5" />
          <span>{replies.length || 0}</span>
        </button>

        {/* Hide / Show comments toggle button */}
        {((post.comments || []).length > 0 || replies.length > 0) && (
          <button
            onClick={() => setHideAllComments(!hideAllComments)}
            type="button"
            className={`flex items-center gap-1 py-1 px-2 rounded-lg transition-all cursor-pointer ${
              hideAllComments
                ? "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                : "text-indigo-400 bg-indigo-500/10 font-bold"
            }`}
            title={hideAllComments ? "Yorumları Göster" : "Yorumları Gizle"}
          >
            <span>{hideAllComments ? "👁️ Göster" : "🙈 Gizle"}</span>
          </button>
        )}

        {/* Save Bookmark action */}
        <button
          onClick={() => onToggleSave(post.id)}
          type="button"
          className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-all cursor-pointer ${
            post.saved
              ? "text-amber-500 bg-amber-500/10 font-bold"
              : "text-zinc-500 hover:text-amber-400 hover:bg-amber-500/5"
          }`}
          title="Kaydet ve Göster"
        >
          <Bookmark className={`h-3.5 w-3.5 ${post.saved ? "fill-amber-500" : ""}`} />
        </button>

        {/* Pin action */}
        <button
          onClick={() => onUpdate(post.id, { pinned: !post.pinned })}
          type="button"
          className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-all cursor-pointer ${
            post.pinned
              ? "text-amber-400 bg-amber-400/10 font-bold"
              : "text-zinc-500 hover:text-amber-400 hover:bg-amber-400/5"
          }`}
          title="Gönderiyi Üste Sabitle"
        >
          <Pin className={`h-3.5 w-3.5 ${post.pinned ? "fill-amber-400" : ""}`} />
        </button>

        {/* Media popup trigger */}
        <button
          onClick={() => setShowAddMedia(!showAddMedia)}
          type="button"
          className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-all cursor-pointer ${
            showAddMedia
              ? "text-cyan-400 bg-cyan-500/10 font-bold"
              : "text-zinc-500 hover:text-cyan-400 hover:bg-cyan-500/5"
          }`}
          title="Medya Ekle veya Link"
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expandable Comment Composer popup */}
      {showCommentBox && (
        <div className="flex gap-1.5 px-3.5 pb-3 pt-1" onMouseDown={(e) => e.stopPropagation()}>
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addComment()}
            placeholder="Yorum ekle... (Enter)"
            autoFocus
            className="flex-1 rounded-xl border border-white/8 bg-[#0a090e] px-3 py-1.5 text-xs text-zinc-300 outline-none focus:border-purple-500/30 transition-colors"
          />
          <button
            onClick={addComment}
            type="button"
            className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 text-xs text-purple-400 font-bold hover:bg-purple-500/20 transition-all cursor-pointer"
          >
            Gönder
          </button>
        </div>
      )}

      {/* Styled inline comments/replies of Twitter thread style */}
      {!hideAllComments && (post.comments || []).length > 0 && (
        <div className="border-t border-white/4 px-4 py-2 bg-black/10 select-text text-xs space-y-1.5 max-h-[140px] overflow-y-auto scrollbar-thin">
          {(post.comments || []).map((cm) => (
            <div key={cm.id} className="relative flex flex-col gap-1 rounded-lg border border-white/5 bg-white/5 p-2">
              {editingCommentId === cm.id ? (
                <div className="flex gap-1.5 w-full" onMouseDown={(e) => e.stopPropagation()}>
                  <input
                    value={editingCommentText}
                    onChange={(e) => setEditingCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEditedComment(cm.id)}
                    className="flex-1 rounded border border-purple-500/30 bg-black px-2 py-0.5 text-[11px] text-zinc-200 outline-none"
                  />
                  <button
                    onClick={() => saveEditedComment(cm.id)}
                    type="button"
                    className="rounded bg-purple-600 px-2.5 py-0.5 text-[10px] font-bold text-white cursor-pointer"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={() => setEditingCommentId(null)}
                    type="button"
                    className="text-zinc-400 text-xs hover:text-white px-1"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-start gap-1">
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] text-zinc-650 font-mono block mb-0.5">{fmtDate(cm.time)}</span>
                    <p className="text-zinc-300 leading-relaxed font-sans break-words">{cm.text}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setEditingCommentId(cm.id);
                        setEditingCommentText(cm.text);
                      }}
                      type="button"
                      className="text-zinc-550 hover:text-purple-400 text-[10px] cursor-pointer"
                      title="Yorumu Düzenle"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() =>
                        onUpdate(post.id, {
                          comments: (post.comments || []).filter((c) => c.id !== cm.id),
                        })
                      }
                      type="button"
                      className="text-zinc-600 hover:text-red-400 text-[11px] cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Vertical Thread connectivity bar representation */}
      {!hideAllComments && replies.length > 0 && (
        <div className="border-t border-white/4 px-4 py-2 bg-[#06050a]/40 flex flex-col gap-1.5 select-text max-h-[140px] overflow-y-auto scrollbar-thin">
          {replies.map((r) => (
            <div
              key={r.id}
              className="relative border-l border-zinc-800 pl-3 text-xs text-zinc-300 flex flex-col gap-1 py-1 group/reply"
            >
              {editingReplyId === r.id ? (
                <div className="flex gap-1.5 w-full" onMouseDown={(e) => e.stopPropagation()}>
                  <input
                    value={editingReplyText}
                    onChange={(e) => setEditingReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEditedReply(r.id)}
                    className="flex-1 rounded border border-purple-500/30 bg-black px-2 py-0.5 text-[11px] text-zinc-200 outline-none"
                  />
                  <button
                    onClick={() => saveEditedReply(r.id)}
                    type="button"
                    className="rounded bg-purple-600 px-2.5 py-0.5 text-[10px] font-bold text-white cursor-pointer"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={() => setEditingReplyId(null)}
                    type="button"
                    className="text-zinc-400 text-xs hover:text-white px-1"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-start gap-1">
                  <div className="flex-1 min-w-0 font-sans">
                    <span className="text-[9px] text-zinc-600 font-mono block mb-0.5">{fmtDate(r.time)}</span>
                    <div className="leading-relaxed whitespace-pre-wrap text-zinc-300 break-words">{r.text}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 select-none" onMouseDown={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setEditingReplyId(r.id);
                        setEditingReplyText(r.text || "");
                      }}
                      type="button"
                      className="text-zinc-550 hover:text-purple-400 text-[10px] cursor-pointer"
                      title="Yorumu Düzenle"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDelete(r.id)}
                      type="button"
                      className="text-[#ef4444]/60 hover:text-[#ef4444] text-xs cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ─── TIMELINE NODE ───────────────────────────────────────────────
interface TimelineNodeProps {
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
  allNodes: Node[];
  onDuplicate?: () => void;
}

export function TimelineNode({
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
  allNodes,
  onDuplicate,
}: TimelineNodeProps) {
  const posts = node.posts || [];

  // Composer states
  const [composerText, setComposerText] = useState("");
  const [composerTitle, setComposerTitle] = useState("");
  const [composerTags, setComposerTags] = useState("");
  const [composerColor, setComposerColor] = useState("none");
  const [composerMedia, setComposerMedia] = useState<any[]>([]);
  const [composerLink, setComposerLink] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [showMediaOnly, setShowMediaOnly] = useState(false);

  // States
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Grab to scroll states on double click
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [dragScrollActive, setDragScrollActive] = useState(false);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const isDraggingList = useRef(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showComposer && taRef.current) {
      taRef.current.focus();
    }
  }, [showComposer]);

  useEffect(() => {
    const handleHashtag = (e: Event) => {
      const customEvent = e as CustomEvent<{ hashtag: string }>;
      if (customEvent.detail && customEvent.detail.hashtag) {
        setFilterTag(customEvent.detail.hashtag);
      }
    };
    window.addEventListener("timeline-hashtag-click", handleHashtag);
    return () => window.removeEventListener("timeline-hashtag-click", handleHashtag);
  }, []);

  const updatePost = useCallback(
    (pid: string, changes: Partial<TimelinePost>) => {
      upd({
        id: node.id,
        posts: posts.map((p) => (p.id === pid ? { ...p, ...changes } : p)),
      });
    },
    [posts, node.id, upd]
  );

  const deletePost = useCallback(
    (pid: string) => {
      const toRemove = new Set<string>();
      const collect = (id: string) => {
        toRemove.add(id);
        posts.filter((p) => p.parentId === id).forEach((p) => collect(p.id));
      };
      collect(pid);
      upd({
        id: node.id,
        posts: posts.filter((p) => !toRemove.has(p.id)),
      });
      if (detailPostId === pid) setDetailPostId(null);
    },
    [posts, node.id, upd, detailPostId]
  );

  const toggleLike = useCallback(
    (pid: string) => {
      const p = posts.find((x) => x.id === pid);
      if (!p) return;
      updatePost(pid, {
        liked: !p.liked,
        likes: p.liked ? Math.max(0, (p.likes || 0) - 1) : (p.likes || 0) + 1,
      });
    },
    [posts, updatePost]
  );

  const toggleSave = useCallback(
    (pid: string) => {
      const p = posts.find((x) => x.id === pid);
      if (!p) return;
      updatePost(pid, { saved: !p.saved });
    },
    [posts, updatePost]
  );

  const repost = useCallback(
    (pid: string) => {
      const p = posts.find((x) => x.id === pid);
      if (!p) return;
      const clone: TimelinePost = {
        ...p,
        id: `p${Date.now()}`,
        time: Date.now(),
        parentId: null,
        likes: 0,
        liked: false,
        saved: false,
        reposts: 0,
        repostedFrom: pid,
      };
      updatePost(pid, { reposts: (p.reposts || 0) + 1 });
      upd({ id: node.id, posts: [...posts, clone] });
    },
    [posts, node.id, upd, updatePost]
  );

  const handleReply = useCallback((pid: string) => {
    setReplyTo(pid);
    setShowComposer(true);
    setComposerText("");
    setComposerTitle("");
    setComposerTags("");
  }, []);

  const submitPost = () => {
    const txt = composerText.trim();
    if (!txt) return;

    const tags = Array.from(
      new Set([
        ...composerTags
          .split(/[\s,]+/)
          .map((x) => x.replace(/^#/, "").trim())
          .filter(Boolean),
        ...parseTags(txt),
      ])
    );

    const mediaList = [...composerMedia];
    if (composerLink.trim()) {
      mediaList.push({
        id: `m${Date.now()}`,
        type: "link",
        url: composerLink.trim(),
        label: composerLink.trim(),
      });
    }

    const newPost: TimelinePost = {
      id: `p${Date.now()}`,
      text: txt,
      title: composerTitle.trim() || null,
      tags,
      colorId: composerColor,
      time: Date.now(),
      pinned: false,
      comments: [],
      media: mediaList,
      parentId: replyTo || null,
      likes: 0,
      liked: false,
      saved: false,
      reposts: 0,
    };

    upd({ id: node.id, posts: [...posts, newPost] });
    setComposerText("");
    setComposerTitle("");
    setComposerTags("");
    setComposerColor("none");
    setComposerMedia([]);
    setComposerLink("");
    setReplyTo(null);
    setShowComposer(false);
  };

  const addComposerMedia = (f: File) => {
    if (!f) return;
    const isImg = f.type.startsWith("image/");
    const isVid = f.type.startsWith("video/");
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setComposerMedia((prev) => [
          ...prev,
          {
            id: `m${Date.now()}`,
            type: isImg ? "image" : isVid ? "video" : "file",
            data: ev.target.result as string,
            name: f.name,
          },
        ]);
      }
    };
    reader.readAsDataURL(f);
  };

  const topPosts = useMemo(() => posts.filter((p) => !p.parentId), [posts]);
  const allTags = useMemo(() => {
    return Array.from(new Set(posts.flatMap((p) => p.tags || [])));
  }, [posts]);

  const filtered = useMemo(() => {
    let list = topPosts;
    if (filterTag) list = list.filter((p) => (p.tags || []).includes(filterTag));
    if (showSavedOnly) list = list.filter((p) => p.saved);
    if (showMediaOnly) list = list.filter((p) => (p.media || []).length > 0);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.text.toLowerCase().includes(q) ||
          (p.title || "").toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.includes(q))
      );
    }
    const pinned = list.filter((p) => p.pinned).sort((a, b) => b.time - a.time);
    const rest = list.filter((p) => !p.pinned).sort((a, b) => (sortDesc ? b.time - a.time : a.time - b.time));
    return [...pinned, ...rest];
  }, [topPosts, filterTag, showSavedOnly, showMediaOnly, search, sortDesc]);

  const detailPost = detailPostId ? posts.find((p) => p.id === detailPostId) : null;

  return (
    <NodeWrap
      node={{ ...node, bg: "#0b0a10" }}
      connecting={connecting}
      onConnectEnd={connEnd}
      onPortDragStart={portDragStart}
      accent="#a78bfa"
      inGroup={inGroup}
    >
      {detailPost && (
        <PostDetailModal
          post={detailPost}
          allPosts={posts}
          allNodes={allNodes}
          onClose={() => setDetailPostId(null)}
          onUpdate={updatePost}
          onDelete={deletePost}
        />
      )}

      <Header
        title={node.title || "Çizelge & Çetele"}
        onTitle={(t) => upd({ id: node.id, title: t })}
        onDrag={(e) => {
          e.stopPropagation();
          drag(e, node.id);
        }}
        accent="#a78bfa"
        icon="📅"
        isConnSrc={connecting === node.id}
        onConnect={() => connStart(node.id)}
        onDel={() => del(node.id)}
        onDuplicate={onDuplicate}
        createdAt={node.createdAt}
      />

      {/* Timeline Controls */}
      <div
        className="flex flex-wrap gap-1 border-b border-purple-500/10 px-2 py-1.5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ara..."
          className="flex-1 rounded border border-white/8 bg-white/4 px-1.5 py-1 font-mono text-[10px] text-zinc-300 outline-none"
        />
        <button
          onClick={() => setSortDesc(!sortDesc)}
          type="button"
          title={sortDesc ? "Yeni → Eski" : "Eski → Yeni"}
          className="rounded border border-white/8 bg-white/4 px-1.5 text-[9px] font-mono text-zinc-500 cursor-pointer"
        >
          {sortDesc ? "↓ Yeni" : "↑ Eski"}
        </button>
        <button
          onClick={() => setShowSavedOnly(!showSavedOnly)}
          type="button"
          title="Kaydedilenler"
          className={`rounded border px-2 text-[10px] cursor-pointer ${
            showSavedOnly ? "border-amber-500/35 bg-amber-500/15 text-amber-500" : "border-white/8 bg-white/4"
          }`}
        >
          🔖
        </button>
        <button
          onClick={() => setShowMediaOnly(!showMediaOnly)}
          type="button"
          title="Görselliller"
          className={`rounded border px-2 text-[10px] cursor-pointer ${
            showMediaOnly ? "border-purple-500/35 bg-purple-500/15 text-purple-400" : "border-white/8 bg-white/4"
          }`}
        >
          🖼️
        </button>
        <button
          onClick={() => {
            setShowComposer(!showComposer);
            setReplyTo(null);
          }}
          type="button"
          className="rounded border border-purple-500/30 bg-purple-500/10 px-2 py-1 font-mono text-[10px] font-bold text-purple-400 cursor-pointer"
        >
          {showComposer ? "✕" : "+ Gönderi"}
        </button>
      </div>

      {allTags.length > 0 && (
        <div
          className="flex flex-wrap gap-1 border-b border-white/5 px-2.5 py-1"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {filterTag && (
            <button
              onClick={() => setFilterTag("")}
              type="button"
              className="px-1 font-mono text-[9px] text-zinc-500 hover:text-white cursor-pointer"
            >
              × temizle
            </button>
          )}
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setFilterTag(t === filterTag ? "" : t)}
              type="button"
              className={`rounded-full px-1.5 py-0.5 font-mono text-[9px] cursor-pointer ${
                t === filterTag
                  ? "bg-purple-500/15 border border-purple-500/40 text-purple-400"
                  : "bg-purple-500/5 border border-transparent text-purple-400/60"
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {/* Composer interface */}
      {showComposer && (
        <div
          className="border-b border-purple-500/10 bg-purple-500/[0.03] p-2.5 select-text font-mono"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {replyTo && (
            <div className="mb-1.5 flex items-center gap-1.5 rounded border border-purple-500/18 bg-purple-500/8 px-2 py-1">
              <span className="flex-1 text-[10px] text-purple-400">
                ↩ replies "{(posts.find((p) => p.id === replyTo)?.text || "").slice(0, 32)}..."
              </span>
              <button
                onClick={() => setReplyTo(null)}
                type="button"
                className="text-xs text-zinc-500 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}
          <input
            value={composerTitle}
            onChange={(e) => setComposerTitle(e.target.value)}
            placeholder="Başlık girin (isteğe bağlı)"
            className="mb-1.5 w-full rounded border border-white/8 bg-white/4 px-2 py-1 text-[11px] text-zinc-300 outline-none focus:border-purple-500/20"
          />
          <textarea
            ref={taRef}
            value={composerText}
            rows={2}
            onChange={(e) => setComposerText(e.target.value)}
            placeholder="Yazın... (Enter = Gönder)"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitPost();
              }
            }}
            className="mb-1.5 w-full rounded border border-purple-500/15 bg-white/4 px-2 py-1 text-[11px] text-white outline-none resize-none focus:border-purple-500/30"
          />
          <div className="mb-1.5 flex items-center gap-1.5">
            <input
              value={composerTags}
              onChange={(e) => setComposerTags(e.target.value)}
              placeholder="#etiket..."
              className="flex-1 rounded border border-purple-500/15 bg-purple-500/5 px-2 py-1 text-[10px] text-purple-300 outline-none"
            />
            <div className="flex gap-1 select-none">
              {TL_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setComposerColor(c.id)}
                  type="button"
                  title={c.label}
                  style={{ backgroundColor: c.accent }}
                  className={`h-3 w-3 rounded-full cursor-pointer ${
                    composerColor === c.id ? "scale-110 border border-white" : ""
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="mb-2 flex items-center gap-1.5 select-none text-[10px]">
            <button
              onClick={() => mediaInputRef.current?.click()}
              type="button"
              className="rounded border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 text-amber-500 cursor-pointer"
            >
              📷 Medya
            </button>
            <input
              ref={mediaInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) addComposerMedia(f);
                e.target.value = "";
              }}
            />
            <input
              value={composerLink}
              onChange={(e) => setComposerLink(e.target.value)}
              placeholder="Harici Link..."
              className="flex-1 rounded border border-sky-500/15 bg-sky-500/4 px-2 py-0.5 text-sky-400 outline-none"
            />
          </div>

          {composerMedia.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1 select-none">
              {composerMedia.map((m, i) => (
                <div key={m.id} className="relative">
                  {m.type === "image" ? (
                    <img
                      src={m.data}
                      alt=""
                      className="h-10 w-12 rounded border border-white/10 object-cover"
                    />
                  ) : (
                    <span className="rounded bg-amber-500/10 border border-amber-500/15 px-1.5 py-1 text-[9px] text-amber-500">
                      {m.name?.slice(0, 10) || m.type}
                    </span>
                  )}
                  <button
                    onClick={() => setComposerMedia((prev) => prev.filter((_, j) => j !== i))}
                    type="button"
                    className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black/90 text-[8px] text-red-500 cursor-pointer p-0"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={submitPost}
            type="button"
            className="w-full rounded bg-purple-500/20 border border-purple-500/40 py-1.5 text-center text-xs font-bold text-purple-400 cursor-pointer"
          >
            {replyTo ? "↩ Thread ekle" : "📡 Paylaş"}
          </button>
        </div>
      )}

      {/* Timeline core feed */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);

          // Accepts standard node dragging onto the feed!
          const nid = e.dataTransfer.getData("linkedNodeId");
          if (!nid) return;

          const match = allNodes.find((n) => n.id === nid);
          if (!match) return;

          upd({
            id: node.id,
            posts: [
              ...posts,
              {
                id: `p${Date.now()}`,
                text: `Referans Kartı: ${match.title || match.type}`,
                title: null,
                tags: [],
                colorId: "none",
                time: Date.now(),
                pinned: false,
                comments: [],
                media: [],
                parentId: null,
                likes: 0,
                liked: false,
                saved: false,
                reposts: 0,
                linkedNodes: [nid],
              },
            ],
          });
        }}
        ref={listContainerRef}
        style={{
          height: node.h ? Math.max(120, node.h - (showComposer ? 280 : 105)) : 355,
          maxHeight: "none",
        }}
        className={`overflow-y-auto px-2.5 py-1.5 scrollbar-thin transition-colors duration-150 select-text ${
          isDragOver ? "bg-purple-500/[0.05]" : "bg-transparent"
        } ${dragScrollActive ? "select-none !cursor-grab active:!cursor-grabbing" : ""}`}
        onDoubleClick={(e) => {
          e.stopPropagation();
          const nextState = !dragScrollActive;
          setDragScrollActive(nextState);
          if (nextState) {
            setIsDraggingState(true);
            isDraggingList.current = true;
            startY.current = e.clientY;
            startScrollTop.current = listContainerRef.current?.scrollTop || 0;
          } else {
            setIsDraggingState(false);
            isDraggingList.current = false;
          }
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          if (!dragScrollActive) return;
          setIsDraggingState(true);
          isDraggingList.current = true;
          startY.current = e.clientY;
          startScrollTop.current = listContainerRef.current?.scrollTop || 0;
        }}
        onMouseMove={(e) => {
          if (!isDraggingList.current || !listContainerRef.current) return;
          e.preventDefault();
          e.stopPropagation();
          const dy = e.clientY - startY.current;
          listContainerRef.current.scrollTop = startScrollTop.current - dy;
        }}
        onMouseUp={(e) => {
          if (isDraggingList.current) {
            e.stopPropagation();
            isDraggingList.current = false;
            setIsDraggingState(false);
          }
        }}
        onMouseLeave={() => {
          if (isDraggingList.current) {
            isDraggingList.current = false;
            setIsDraggingState(false);
          }
        }}
      >
        {dragScrollActive && (
          <div 
            onClick={(e) => { e.stopPropagation(); setDragScrollActive(false); }}
            className="sticky top-0 z-[100] mb-2 text-center select-none py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded text-[9.5px] font-bold tracking-wider shadow-lg cursor-pointer animate-pulse hover:brightness-110"
          >
            🖱️ SÜRÜKLE-KAYDIR AKTİF (Normal seçim için çift tıkla / buraya dokun)
          </div>
        )}
        {isDragOver && (
          <div className="mb-2 rounded border border-dashed border-purple-500/40 bg-purple-500/8 py-2 text-center text-[10px] text-purple-400">
            Kartı buraya bırakarak post olarak iliştirin
          </div>
        )}
        {filtered.length === 0 && !isDragOver && (
          <div className="py-8 text-center text-[11px] text-zinc-600 select-none">
            {search || filterTag || showSavedOnly || showMediaOnly
              ? "Herhangi bir gönderi bulunamadı"
              : "Henüz bir paylaşım yok — + Gönderi butonuna tıklayarak ilk paylaşımı yapabilirsiniz."}
          </div>
        )}
        {filtered.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            allPosts={posts}
            allNodes={allNodes}
            nodeId={node.id}
            onUpdate={updatePost}
            onDelete={deletePost}
            onOpenDetail={setDetailPostId}
            onReply={handleReply}
            onToggleLike={toggleLike}
            onToggleSave={toggleSave}
            onRepost={repost}
          />
        ))}
      </div>

      <div className="flex justify-between items-center px-3 py-1 bg-black/10 text-[9px] text-zinc-600 font-mono select-none">
        <span>{topPosts.length} gönderi</span>
        <span>
          {posts.filter((p) => p.pinned).length > 0 && `📌 ${posts.filter((p) => p.pinned).length}`}
          {posts.filter((p) => p.saved).length > 0 && ` 🔖 ${posts.filter((p) => p.saved).length}`}
        </span>
      </div>

      <Resizer id={node.id} x={node.x} y={node.y} w={node.w} h={node.h} onUpdate={upd} zoom={zoom} />
    </NodeWrap>
  );
}
export { PostCard, PostDetailModal };
