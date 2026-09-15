/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Tamam",
  cancelLabel = "İptal",
  onConfirm,
  onCancel,
  danger,
}: ConfirmModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      role="presentation"
      onClick={(e) => {
        if (e.target === backdropRef.current) onCancel?.();
      }}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 backdrop-blur-md transition-all duration-200"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-[90vw] max-w-[400px] rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="modal-title"
          className="mb-2 font-mono text-base font-bold text-white tracking-wider"
        >
          {title}
        </h3>
        <p className="mb-6 font-mono text-xs text-zinc-400 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3 justify-end font-mono">
          <button
            onClick={onCancel}
            type="button"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs text-zinc-300 transition-colors hover:bg-white/10"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            type="button"
            className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition-all ${
              danger
                ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
