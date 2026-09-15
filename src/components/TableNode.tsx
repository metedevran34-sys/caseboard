/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Node, TableConfig, TableColumn, TableRow } from "../types";
import { NodeWrap, Header, Tags, Resizer, NOTE_COLORS } from "./NodeBase";
import { 
  Plus, 
  Trash2, 
  Maximize2, 
  Minimize2, 
  Search, 
  Download, 
  Upload, 
  ArrowUpDown, 
  Tag, 
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  Clock,
  PlayCircle,
  Copy,
  Clipboard,
  AlertCircle
} from "lucide-react";
import { forensicAudio } from "../utils/audio";

interface TableNodeProps {
  node: Node;
  upd: (fields: any) => void;
  del: (id: string) => void;
  drag: (e: React.DragEvent, id: string) => void;
  connStart: (id: string) => void;
  connecting: string | null;
  connEnd: (id: string) => void;
  portDragStart: (e: React.MouseEvent, id: string) => void;
  zoom: number;
  inGroup: boolean;
  onDuplicate?: () => void;
}

// Deterministic tag color helper
const getTagColorClass = (tag: any) => {
  if (!tag || typeof tag !== "string") {
    return "bg-zinc-800 text-zinc-400 border border-zinc-700/50";
  }
  const hash = tag.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const presets = [
    "bg-red-500/10 text-red-400 border border-red-500/20",
    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    "bg-pink-500/10 text-pink-400 border border-pink-500/20",
    "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
    "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  ];
  return presets[Math.abs(hash) % presets.length] || presets[0];
};

const INITIAL_TABLE_DATA: TableConfig = {
  columns: [
    { id: "col1", name: "Görev / Proje", type: "text", width: 160 },
    { id: "col2", name: "Durum", type: "status", width: 110 },
    { id: "col3", name: "Tarih", type: "date", width: 110 },
    { id: "col4", name: "Etiketler", type: "tag", width: 140 }
  ],
  rows: [
    { id: "row1", cells: { col1: "Proje Ön Görüşmesi", col2: "Tamamlandı", col3: "2026-06-11", col4: "Acil,Müşteri" } },
    { id: "row2", cells: { col1: "Sistem Tasarımı", col2: "Devam Ediyor", col3: "2026-06-12", col4: "Tasarım" } },
    { id: "row3", cells: { col1: "Beta Testleri", col2: "Bekliyor", col3: "2026-06-25", col4: "Test,Önemli" } }
  ]
};

export function TableNode({
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
}: TableNodeProps) {
  // Safe load of state
  const data: TableConfig = useMemo(() => {
    return node.tableData || INITIAL_TABLE_DATA;
  }, [node.tableData]);

  const [title, setTitle] = useState(node.title || "Tablo Kartı");
  const [fullscreen, setFullscreen] = useState(false);

  // Search & Filtering State
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // Sorting
  const [sortColId, setSortColId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Editing state
  const [activeCell, setActiveCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [activeValue, setActiveValue] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom inline/modal dialog states (keeps iframe preview 100% crash-free)
  const [colModal, setColModal] = useState<{
    show: boolean;
    name: string;
    type: "text" | "number" | "date" | "status" | "tag" | "link";
  } | null>(null);
  const [confirmDeleteCol, setConfirmDeleteCol] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Auto update title from external edits if any
  useEffect(() => {
    if (node.title !== undefined) {
      setTitle(node.title);
    }
  }, [node.title]);

  const saveTable = (updatedData: TableConfig) => {
    upd({
      id: node.id,
      tableData: updatedData,
    });
  };

  // --- ACTIONS ---
  const addRow = () => {
    forensicAudio.playTypewriter?.();
    const newRowId = `row_${Date.now()}`;
    const newCells: Record<string, any> = {};
    data.columns.forEach((col) => {
      newCells[col.id] = col.type === "tag" ? "" : "";
    });
    const updatedRows = [...data.rows, { id: newRowId, cells: newCells }];
    saveTable({ ...data, rows: updatedRows });
  };

  const deleteRow = (rowId: string) => {
    forensicAudio.playWarning?.();
    const updatedRows = data.rows.filter((r) => r.id !== rowId);
    if (activeCell?.rowId === rowId) setActiveCell(null);
    saveTable({ ...data, rows: updatedRows });
  };

  const addColumn = () => {
    forensicAudio.playTypewriter?.();
    setColModal({
      show: true,
      name: "Yeni Sütun",
      type: "text"
    });
  };

  const confirmAddColumn = () => {
    if (!colModal) return;
    const name = colModal.name.trim() || "Yeni Sütun";
    const type = colModal.type;
    const newColId = `col_${Date.now()}`;
    const newCol: TableColumn = {
      id: newColId,
      name,
      type,
      width: 130
    };

    const updatedRows = data.rows.map((row) => ({
      ...row,
      cells: {
        ...row.cells,
        [newColId]: ""
      }
    }));

    saveTable({
      ...data,
      columns: [...data.columns, newCol],
      rows: updatedRows
    });
    setColModal(null);
  };

  const deleteColumn = (colId: string) => {
    if (data.columns.length <= 1) {
      setAlertMsg("En az bir sütun kalmalıdır!");
      return;
    }
    setConfirmDeleteCol(colId);
  };

  const executeDeleteColumn = () => {
    if (!confirmDeleteCol) return;
    const colId = confirmDeleteCol;
    forensicAudio.playWarning?.();
    const updatedCols = data.columns.filter((c) => c.id !== colId);
    const updatedRows = data.rows.map((row) => {
      const nextCells = { ...row.cells };
      delete nextCells[colId];
      return { ...row, cells: nextCells };
    });
    if (activeCell?.colId === colId) setActiveCell(null);
    saveTable({ ...data, columns: updatedCols, rows: updatedRows });
    setConfirmDeleteCol(null);
  };

  // --- SORTING & FILTERING LOGIC ---
  const handleSort = (colId: string) => {
    forensicAudio.playTypewriter?.();
    if (sortColId === colId) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortColId(null); // Clear sort
      }
    } else {
      setSortColId(colId);
      setSortDir("asc");
    }
  };

  // Extract all tags in use for filtering list
  const allUsedTags = useMemo(() => {
    const tagsSet = new Set<string>();
    data.rows.forEach((row) => {
      data.columns.forEach((col) => {
        if (col.type === "tag") {
          const val = row.cells[col.id];
          if (val && typeof val === "string") {
            val.split(",").map((t) => t.trim()).forEach((t) => {
              if (t) tagsSet.add(t);
            });
          }
        }
      });
    });
    return Array.from(tagsSet);
  }, [data.rows, data.columns]);

  // Sort and filter rows
  const processedRows = useMemo(() => {
    let result = [...data.rows];

    // Filter by search query
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((row) => {
        return Object.values(row.cells).some((val) => {
          if (!val) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    // Filter by status
    if (filterStatus) {
      result = result.filter((row) => {
        return data.columns.some((col) => {
          if (col.type === "status") {
            return String(row.cells[col.id]) === filterStatus;
          }
          return false;
        });
      });
    }

    // Filter by tag
    if (filterTag) {
      result = result.filter((row) => {
        return data.columns.some((col) => {
          if (col.type === "tag") {
            const val = row.cells[col.id];
            if (val && typeof val === "string") {
              return val.split(",").map((t) => t.trim().toLowerCase()).includes(filterTag.toLowerCase());
            }
          }
          return false;
        });
      });
    }

    // Sort
    if (sortColId) {
      const col = data.columns.find((c) => c.id === sortColId);
      if (col) {
        result.sort((a, b) => {
          let valA = a.cells[sortColId];
          let valB = b.cells[sortColId];

          if (col.type === "number") {
            const numA = parseFloat(valA) || 0;
            const numB = parseFloat(valB) || 0;
            return sortDir === "asc" ? numA - numB : numB - numA;
          }

          const strA = String(valA || "").toLowerCase();
          const strB = String(valB || "").toLowerCase();

          if (sortDir === "asc") {
            return strA.localeCompare(strB, "tr");
          } else {
            return strB.localeCompare(strA, "tr");
          }
        });
      }
    }

    return result;
  }, [data.rows, data.columns, search, filterStatus, filterTag, sortColId, sortDir]);

  // --- EXCEL KEYBOARD FLOW ---
  const handleCellKeyDown = (
    e: React.KeyboardEvent,
    rowId: string,
    colId: string,
    rowIndex: number,
    colIndex: number
  ) => {
    if (e.key === "Tab") {
      e.preventDefault();
      // Commit current cell edit
      commitValue(rowId, colId);

      // Navigate to next cell in row
      const nextColIndex = e.shiftKey ? colIndex - 1 : colIndex + 1;
      if (nextColIndex >= 0 && nextColIndex < data.columns.length) {
        const nextCol = data.columns[nextColIndex];
        startEdit(rowId, nextCol.id);
      } else {
        // Go to next/prep row
        const nextRowIndex = e.shiftKey ? rowIndex - 1 : rowIndex + 1;
        if (nextRowIndex >= 0 && nextRowIndex < processedRows.length) {
          const nextRow = processedRows[nextRowIndex];
          const colTargetId = e.shiftKey ? data.columns[data.columns.length - 1].id : data.columns[0].id;
          startEdit(nextRow.id, colTargetId);
        }
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      commitValue(rowId, colId);

      // Move focus down to same column in next row
      const nextRowIndex = rowIndex + 1;
      if (nextRowIndex < processedRows.length) {
        const nextRow = processedRows[nextRowIndex];
        startEdit(nextRow.id, colId);
      } else {
        // Create new row automatically if at the end of screen
        const newRowId = `row_${Date.now()}`;
        const newCells: Record<string, any> = {};
        data.columns.forEach((col) => {
          newCells[col.id] = "";
        });
        const updatedRows = [...data.rows, { id: newRowId, cells: newCells }];
        setActiveCell({ rowId: newRowId, colId });
        setActiveValue("");
        saveTable({ ...data, rows: updatedRows });
      }
    }
  };

  const startEdit = (rowId: string, colId: string) => {
    const row = data.rows.find((r) => r.id === rowId);
    if (row) {
      setActiveCell({ rowId, colId });
      setActiveValue(String(row.cells[colId] || ""));
    }
  };

  const commitValue = (rowId: string, colId: string, valueToSave = activeValue) => {
    const updatedRows = data.rows.map((row) => {
      if (row.id === rowId) {
        return {
          ...row,
          cells: {
            ...row.cells,
            [colId]: valueToSave
          }
        };
      }
      return row;
    });
    saveTable({ ...data, rows: updatedRows });
  };

  // --- COPY-PASTE UTILS ---
  const copyRowToClipboard = (row: TableRow) => {
    const values = data.columns.map((col) => row.cells[col.id] || "").join("\t");
    navigator.clipboard.writeText(values);
    forensicAudio.playTypewriter?.();
  };

  const pasteRowFromClipboard = async (rowId: string) => {
    try {
      const text = await navigator.clipboard.readText();
      const cellsValues = text.split("\t");
      if (cellsValues.length > 0) {
        const updatedRows = data.rows.map((row) => {
          if (row.id === rowId) {
            const nextCells = { ...row.cells };
            data.columns.forEach((col, idx) => {
              if (idx < cellsValues.length) {
                nextCells[col.id] = cellsValues[idx].trim();
              }
            });
            return { ...row, cells: nextCells };
          }
          return row;
        });
        saveTable({ ...data, rows: updatedRows });
        forensicAudio.playTypewriter?.();
      }
    } catch (err) {
      setAlertMsg("Hata: Pano (Clipboard) erişim izni verilmedi.");
    }
  };

  // --- CSV IMPORT/EXPORT ---
  const exportToCSV = () => {
    const headersStr = data.columns.map((c) => `"${c.name.replace(/"/g, '""')}"`).join(",");
    const rowsStr = data.rows.map((row) => {
      return data.columns.map((col) => {
        const val = String(row.cells[col.id] || "").replace(/"/g, '""');
        return `"${val}"`;
      }).join(",");
    }).join("\n");

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(headersStr + "\n" + rowsStr);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `${title || "tablo"}_yedek.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    forensicAudio.playTypewriter?.();
  };

  const importFromCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
      if (lines.length < 1) return;

      // Extract Headers
      const extractCells = (line: string) => {
        // simple CSV splitter taking quotes into account
        const cells: string[] = [];
        let inQuotes = false;
        let token = "";
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            cells.push(token.trim());
            token = "";
          } else {
            token += char;
          }
        }
        cells.push(token.trim());
        return cells.map((cell) => cell.replace(/^"(.*)"$/, "$1"));
      };

      const originalHeaders = extractCells(lines[0]);
      
      // Map columns
      const importedColumns: TableColumn[] = originalHeaders.map((name, idx) => {
        let type: TableColumn["type"] = "text";
        const lower = name.toLowerCase();
        if (lower.includes("durum") || lower.includes("status")) type = "status";
        else if (lower.includes("tarih") || lower.includes("date")) type = "date";
        else if (lower.includes("etiket") || lower.includes("tag")) type = "tag";
        else if (lower.includes("sayi") || lower.includes("fiyat") || lower.includes("tutar") || lower.includes("number")) type = "number";
        else if (lower.includes("link") || lower.includes("url")) type = "link";

        return {
          id: `imp_col_${idx}_${Date.now()}`,
          name,
          type,
          width: 140
        };
      });

      const importedRows: TableRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const lineValues = extractCells(lines[i]);
        const cells: Record<string, any> = {};
        importedColumns.forEach((col, idx) => {
          cells[col.id] = lineValues[idx] || "";
        });
        importedRows.push({
          id: `imp_row_${i}_${Date.now()}`,
          cells
        });
      }

      saveTable({
        columns: importedColumns,
        rows: importedRows
      });
      setAlertMsg(`CSV Başarıyla İçe Aktarıldı: ${importedRows.length} satır yüklendi!`);
      forensicAudio.playTypewriter?.();
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Filter counters summary
  const summaryText = useMemo(() => {
    return `Toplam ${data.rows.length} satırdan ${processedRows.length} tanesi gösteriliyor.`;
  }, [data.rows.length, processedRows.length]);

  const renderOverlays = () => {
    return (
      <>
        {colModal && colModal.show && (
          <div 
            className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-[99999] select-none pointer-events-auto"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
          >
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl max-w-sm w-full flex flex-col shadow-2xl font-sans">
              <h3 className="text-sm font-bold text-zinc-200 mb-3 flex items-center gap-1.5">
                <span className="text-pink-400 font-extrabold">+</span> 
                <span>Yeni Sütun Oluştur</span>
              </h3>
              
              <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono font-bold mb-1">Sütun Adı</label>
              <input
                type="text"
                value={colModal.name}
                onChange={(e) => setColModal({ ...colModal, name: e.target.value })}
                className="bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-white outline-none mb-3 focus:border-pink-500 font-sans"
                autoFocus
              />

              <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono font-bold mb-1">Veri Tipi</label>
              <select
                value={colModal.type}
                onChange={(e) => setColModal({ ...colModal, type: e.target.value as any })}
                className="bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-white outline-none mb-4 cursor-pointer focus:border-pink-500 font-sans font-semibold"
              >
                <option value="text">Metin (Yazı)</option>
                <option value="number">Sayı (Rapor)</option>
                <option value="date">Tarih</option>
                <option value="status">Süreç Durumu</option>
                <option value="tag">Etiketler (Çoklu)</option>
                <option value="link">Bağlantı (URL)</option>
              </select>

              <div className="flex gap-2 justify-end text-xs font-bold">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setColModal(null); }}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); confirmAddColumn(); }}
                  className="px-4 py-1.5 bg-pink-600 hover:bg-pink-550 text-white rounded transition-colors"
                >
                  Oluştur
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmDeleteCol && (
          <div 
            className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-[99999] select-none text-center pointer-events-auto"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
          >
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl max-w-sm flex flex-col items-center shadow-2xl font-sans">
              <span className="text-red-500 text-2xl mb-1 mt-1 font-bold">🗑️</span>
              <h3 className="text-sm font-bold text-zinc-200 mb-1.5">Sütunu Sil</h3>
              <p className="text-xs text-zinc-400 mb-4 px-2">
                Bu sütun ve sütuna ait tüm hücre verileri kalıcı olarak silinecektir. Emin misiniz?
              </p>
              <div className="flex gap-2 text-xs font-bold w-full justify-center">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteCol(null); }}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors w-24"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); executeDeleteColumn(); }}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded transition-colors w-24"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        )}

        {alertMsg && (
          <div 
            className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-[99999] select-none text-center pointer-events-auto"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
          >
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg max-w-sm flex flex-col items-center shadow-2xl font-sans">
              <span className="text-pink-500 text-2xl mb-2">⚠️</span>
              <p className="text-xs text-zinc-200 mb-4 px-1">{alertMsg}</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setAlertMsg(null); }}
                className="px-4 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded transition-colors"
              >
                Anladım
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <NodeWrap
        node={node}
        connecting={connecting}
        onConnectEnd={connEnd}
        onConnectStart={connStart}
        onPortDragStart={portDragStart}
        accent="#ec4899"
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
          accent="#ec4899"
          icon="📊"
          isConnSrc={connecting === node.id}
          onConnect={() => connStart(node.id)}
          onDel={() => del(node.id)}
          onDuplicate={onDuplicate}
          createdAt={node.createdAt}
          extra={
            <div className="flex gap-1 select-none items-center mr-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  forensicAudio.playTypewriter?.();
                  setFullscreen(true);
                }}
                title="Tam Ekranda Düzenle"
                className="flex h-6 items-center gap-1 cursor-pointer rounded bg-pink-600/20 hover:bg-pink-600/40 text-[10px] font-extrabold text-pink-300 px-2 transition-colors border border-pink-500/10"
              >
                <Maximize2 className="h-3 w-3" />
                <span>Tam Ekran</span>
              </button>
            </div>
          }
        />

        {/* COMPACT VIEW (Displays clean grid inside Board node) */}
        <div 
          onDoubleClick={(e) => {
            e.stopPropagation();
            setFullscreen(true);
          }}
          className="flex h-full w-full flex-col bg-zinc-900 border-t border-zinc-800 text-zinc-200 select-text outline-none text-xs"
          style={{ height: node.h ? node.h - 40 : 300 }}
        >
          {/* Quick Toolbar */}
          <div className="flex items-center justify-between p-2 pb-1 border-b border-zinc-800 bg-zinc-950/40 select-none">
            <span className="text-[10px] text-zinc-400 italic">
              *Çift tıklayarak tam ekran düzenleyin.
            </span>
            <div className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); addRow(); }}
                className="flex items-center gap-1 cursor-pointer bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded text-[10px] py-0.5 px-1.5 transition-all"
              >
                <Plus className="h-2.5 w-2.5" /> Satır
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); addColumn(); }}
                className="flex items-center gap-1 cursor-pointer bg-zinc-805 hover:bg-zinc-750 text-zinc-300 rounded text-[10px] py-0.5 px-1.5 transition-all"
              >
                <Plus className="h-2.5 w-2.5" /> Sütun
              </button>
            </div>
          </div>

          {/* Miniature Grid Display (Scrollable) */}
          <div className="flex-1 overflow-auto mini-scroll select-text">
            <table className="w-full text-left border-collapse table-fixed select-text">
              <thead className="sticky top-0 bg-zinc-955 select-none z-10 shadow-[0_1px_0_rgba(255,255,255,0.05)] text-[10.5px]">
                <tr className="bg-zinc-950/90 text-zinc-400 border-b border-zinc-800">
                  {data.columns.map((col, cIndex) => (
                    <th 
                      key={col.id} 
                      style={{ width: col.width || 135 }}
                      className="p-1 px-2 border-r border-zinc-800/80 font-semibold"
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{col.name}</span>
                        <span className="text-[9px] px-1 bg-zinc-800 rounded opacity-60 text-zinc-300">
                          {col.type === "status" ? "Durum" : col.type === "tag" ? "Etiket" : col.type === "link" ? "Link" : col.type === "number" ? "Sayı" : col.type === "date" ? "Tarih" : "Metin"}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="w-10 text-center p-1 font-semibold text-zinc-500">Sil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/50">
                {processedRows.map((row, rIndex) => (
                  <tr key={row.id} className="hover:bg-zinc-800/30 text-[11px] group">
                    {data.columns.map((col, cIndex) => {
                      const val = row.cells[col.id] || "";
                      const isEditing = activeCell?.rowId === row.id && activeCell?.colId === col.id;

                      return (
                        <td 
                          key={col.id}
                          className="p-1 px-2 border-r border-zinc-800/60 truncate relative min-w-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(row.id, col.id);
                          }}
                        >
                          {isEditing ? (
                            <input
                              value={activeValue}
                              onChange={(e) => setActiveValue(e.target.value)}
                              onBlur={() => {
                                commitValue(row.id, col.id);
                                setActiveCell(null);
                              }}
                              onKeyDown={(e) => handleCellKeyDown(e, row.id, col.id, rIndex, cIndex)}
                              autoFocus
                              className="absolute inset-0 w-full h-full bg-pink-950 text-white px-2 outline-none font-sans text-xs border border-pink-500"
                            />
                          ) : (
                            <div className="w-full truncate">
                              {col.type === "status" && val ? (
                                <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${
                                  val === "Tamamlandı" 
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : val === "Devam Ediyor"
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                }`}>
                                  {val}
                                </span>
                              ) : col.type === "tag" && val ? (
                                <div className="flex gap-1 overflow-hidden max-w-full">
                                  {String(val).split(",").map((t, tIdx) => {
                                    const cleaned = t.trim();
                                    if (!cleaned) return null;
                                    return (
                                      <span key={tIdx} className={`px-1 rounded text-[9px] whitespace-nowrap truncate max-w-[80px] ${getTagColorClass(cleaned)}`}>
                                        {cleaned}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : col.type === "link" && val ? (
                                <a 
                                  href={String(val).startsWith("http") ? String(val) : `https://${val}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  onClick={(ev) => ev.stopPropagation()}
                                  className="text-sky-400 hover:underline flex items-center gap-0.5"
                                >
                                  <ExternalLink className="h-2.5 w-2.5 inline shrink-0" />
                                  <span className="truncate">{val}</span>
                                </a>
                              ) : col.type === "number" ? (
                                <span className="font-mono">{val}</span>
                              ) : col.type === "date" ? (
                                <span className="font-mono text-zinc-400">{val}</span>
                              ) : (
                                <span>{val || <span className="text-zinc-600 block italic leading-none">boş</span>}</span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center font-sans">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteRow(row.id); }}
                        className="text-zinc-500 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 py-0.5 px-1.5 transition-opacity"
                        title="Satırı Sil"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
                {processedRows.length === 0 && (
                  <tr>
                    <td colSpan={data.columns.length + 1} className="p-8 text-center text-zinc-500 italic font-sans font-sans">
                      Tablo boş veya arama kriteriyle eşleşen satır yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-1.5 px-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-400 select-none font-mono">
            <span>{summaryText}</span>
            <span>📊 {data.columns.length} Sütun</span>
          </div>
        </div>
        {renderOverlays()}
      </NodeWrap>

      {/* FULLSCREEN EDITOR MODAL OVERLAY */}
      {fullscreen && (
        <div 
          className="fixed inset-0 z-[10000] bg-zinc-950/95 backdrop-blur-md flex flex-col justify-center items-center p-4 md:p-8 font-sans select-text"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setFullscreen(false);
            }
          }}
        >
          {/* Main frame container */}
          <div className="w-full max-w-7xl h-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden select-text">
            
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 gap-3 bg-gradient-to-r from-zinc-950 to-zinc-900 border-b border-zinc-800 select-none">
              <div className="flex items-center gap-3">
                <span className="text-xl">📊</span>
                <div>
                  <h2 className="text-base font-extrabold text-zinc-100 tracking-tight flex items-center gap-1.5">
                    <input
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        upd({ id: node.id, title: e.target.value });
                      }}
                      className="bg-transparent border-b border-dashed border-zinc-700 focus:border-pink-500 outline-none text-zinc-100 font-extrabold"
                    />
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-normal">Tam Ekran</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Proje, süreç ve veri matrisinizi konforlu şekilde düzenleyin.</p>
                </div>
              </div>

              {/* Close Fullscreen & Save */}
              <button
                onClick={() => {
                  forensicAudio.playTypewriter?.();
                  setFullscreen(false);
                }}
                className="flex items-center gap-1.5 self-start sm:self-center cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 rounded-lg py-1.5 px-4 text-xs font-bold transition-all shadow-md hover:brightness-110"
              >
                <Minimize2 className="h-3.5 w-3.5 text-zinc-300" />
                <span>Kapat (ESC)</span>
              </button>
            </div>

            {/* Controlling & Action Panel */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 px-6 bg-zinc-950/70 border-b border-zinc-800 select-none">
              
              {/* Search and Columns Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Tabloda ara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-48 bg-zinc-900 text-zinc-200 pl-8 pr-3 py-1.5 rounded-lg text-xs border border-zinc-800 focus:border-colors-focus focus:outline-none placeholder-zinc-500 font-sans"
                  />
                  {search && (
                    <button 
                      onClick={() => setSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 px-2 text-xs">
                  <span className="text-zinc-500">Durum:</span>
                  <select
                    value={filterStatus || ""}
                    onChange={(e) => setFilterStatus(e.target.value || null)}
                    className="bg-transparent text-zinc-300 border-none outline-none text-xs font-bold pr-1 cursor-pointer"
                  >
                    <option value="">Tümü</option>
                    <option value="Tamamlandı">Tamamlandı</option>
                    <option value="Devam Ediyor">Devam Ediyor</option>
                    <option value="Bekliyor">Bekliyor</option>
                  </select>
                </div>

                {/* Tag Filter */}
                {allUsedTags.length > 0 && (
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 px-2 text-xs">
                    <span className="text-zinc-500">Etiket:</span>
                    <select
                      value={filterTag || ""}
                      onChange={(e) => setFilterTag(e.target.value || null)}
                      className="bg-transparent text-zinc-300 border-none outline-none text-xs font-bold pr-1 cursor-pointer"
                    >
                      <option value="">Tümü</option>
                      {allUsedTags.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(filterStatus || filterTag || search) && (
                  <button
                    onClick={() => {
                      setFilterStatus(null);
                      setFilterTag(null);
                      setSearch("");
                    }}
                    className="text-xs text-pink-400 hover:text-pink-300 hover:underline px-1 cursor-pointer font-semibold font-sans"
                  >
                    Filtreleri Temizle
                  </button>
                )}
              </div>

              {/* Data Modifiers & Core Tools */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Add Row Button */}
                <button
                  onClick={addRow}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-600/90 text-white rounded-lg text-xs font-bold transition-all shadow-md border border-emerald-600/25 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Yeni Satır Ekle</span>
                </button>

                {/* Add Column Button */}
                <button
                  onClick={addColumn}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-700/80 hover:bg-indigo-600/90 text-white rounded-lg text-xs font-bold transition-all shadow-md border border-indigo-600/25 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Yeni Sütun Ekle</span>
                </button>

                {/* Spacing pipe */}
                <span className="w-px h-5 bg-zinc-800 mx-1" />

                {/* CSV Import */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                  title="Metin tabanlı CSV dosyasından tablo verilerini içe aktar"
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer border border-zinc-700 transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>CSV İçe Aktar</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={importFromCSV}
                />

                {/* CSV Export */}
                <button
                  onClick={exportToCSV}
                  type="button"
                  title="Tablodaki verileri yedeklemek için CSV olarak dışa aktar"
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer border border-zinc-700 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV Dışa Aktar</span>
                </button>
              </div>
            </div>

            {/* FULL SPREADSHEET TABLE GRID CONTAINER */}
            <div className="flex-1 overflow-auto bg-zinc-900 select-text p-2 scrollbar-thin">
              <table className="w-full text-left border-collapse table-fixed min-w-[700px] select-text">
                <thead className="sticky top-0 bg-zinc-955 font-mono select-none z-10 text-xs">
                  <tr className="bg-zinc-950/95 text-zinc-400 border-b border-zinc-800">
                    {data.columns.map((col, colIndex) => {
                      const isSorted = sortColId === col.id;
                      return (
                        <th 
                          key={col.id} 
                          style={{ width: col.width || 140 }}
                          className="p-3 border-r border-zinc-800/80 font-bold tracking-tight select-none relative group/header text-zinc-300"
                        >
                          <div className="flex items-center justify-between">
                            <span 
                              onClick={() => handleSort(col.id)}
                              className="cursor-pointer hover:text-white flex items-center gap-1 truncate select-none w-full font-sans"
                              title="Tıklayarak Sıralayın"
                            >
                              <span className="truncate">{col.name}</span>
                              <span className="shrink-0 text-zinc-500">
                                {isSorted ? (sortDir === "asc" ? "▲" : "▼") : <ArrowUpDown className="h-3 w-3 inline text-zinc-650 opacity-40 hover:opacity-100" />}
                              </span>
                            </span>

                            {/* Options on Column (e.g., delete) */}
                            <div className="hidden group-hover/header:flex items-center gap-1 shrink-0 ml-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteColumn(col.id); }}
                                className="text-zinc-500 hover:text-red-400 bg-zinc-900 hover:bg-zinc-800 rounded p-1 transition-all"
                                title="Bu Sütunu Sil"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <div className="text-[9px] mt-1 text-zinc-500 opacity-80 uppercase tracking-widest font-mono">
                            {col.type === "status" ? "Durum" : col.type === "tag" ? "Etiket" : col.type === "link" ? "Link" : col.type === "number" ? "Sayı" : col.type === "date" ? "Tarih" : "Metin"}
                          </div>
                        </th>
                      );
                    })}
                    <th className="w-24 text-center p-3 font-semibold text-zinc-500 select-none font-sans">Hızlı İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850/80 select-text">
                  {processedRows.map((row, rIndex) => (
                    <tr key={row.id} className="hover:bg-zinc-800/45 text-xs group/row select-text font-sans">
                      {data.columns.map((col, cIndex) => {
                        const val = row.cells[col.id] || "";
                        const isEditing = activeCell?.rowId === row.id && activeCell?.colId === col.id;

                        return (
                          <td 
                            key={col.id}
                            className={`p-2 px-3 border-r border-zinc-805 truncate relative min-w-0 select-text ${
                              isEditing ? "p-0" : "cursor-text"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(row.id, col.id);
                            }}
                          >
                            {isEditing ? (
                              col.type === "status" ? (
                                <select
                                  value={activeValue}
                                  onChange={(e) => {
                                    setActiveValue(e.target.value);
                                    commitValue(row.id, col.id, e.target.value);
                                    setActiveCell(null);
                                  }}
                                  onBlur={() => setActiveCell(null)}
                                  className="absolute inset-0 w-full h-full bg-zinc-950 text-white px-2 focus:outline-none text-xs border border-pink-500 font-sans font-bold"
                                  autoFocus
                                >
                                  <option value="">Seçin...</option>
                                  <option value="Tamamlandı">Tamamlandı</option>
                                  <option value="Devam Ediyor">Devam Ediyor</option>
                                  <option value="Bekliyor">Bekliyor</option>
                                </select>
                              ) : (
                                <input
                                  value={activeValue}
                                  onChange={(e) => setActiveValue(e.target.value)}
                                  onBlur={() => {
                                    commitValue(row.id, col.id);
                                    setActiveCell(null);
                                  }}
                                  onKeyDown={(e) => handleCellKeyDown(e, row.id, col.id, rIndex, cIndex)}
                                  autoFocus
                                  placeholder={col.type === "tag" ? "Örneğin: Acil, Tasarım, Önemli..." : col.type === "link" ? "https://example.com" : ""}
                                  className="absolute inset-0 w-full h-full bg-zinc-950 text-white px-3 focus:outline-none font-sans text-xs border border-pink-500 shadow-inner"
                                />
                              )
                            ) : (
                              <div className="w-full truncate min-h-[22px] flex items-center select-text">
                                {col.type === "status" && val ? (
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold shadow-sm ${
                                    val === "Tamamlandı" 
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : val === "Devam Ediyor"
                                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                      : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      val === "Tamamlandı" ? "bg-emerald-400" : val === "Devam Ediyor" ? "bg-blue-400" : "bg-amber-400"
                                    }`}></span>
                                    {val}
                                  </span>
                                ) : col.type === "tag" && val ? (
                                  <div className="flex flex-wrap gap-1 items-center max-w-full overflow-hidden">
                                    {String(val).split(",").map((t, tIdx) => {
                                      const cleaned = t.trim();
                                      if (!cleaned) return null;
                                      return (
                                        <span key={tIdx} className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap truncate max-w-[110px] ${getTagColorClass(cleaned)}`}>
                                          {cleaned}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : col.type === "link" && val ? (
                                  <a 
                                    href={String(val).startsWith("http") ? String(val) : `https://${val}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    onClick={(ev) => ev.stopPropagation()}
                                    className="text-sky-400 hover:underline inline-flex items-center gap-1 max-w-full"
                                  >
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{val}</span>
                                  </a>
                                ) : col.type === "number" ? (
                                  <span className="font-mono font-bold text-zinc-300">{val}</span>
                                ) : col.type === "date" ? (
                                  <span className="font-mono text-zinc-400">{val}</span>
                                ) : (
                                  <span className="text-zinc-200">{val || <span className="text-zinc-705 italic block select-none leading-none">Çift tıkla...</span>}</span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-2 text-center select-none font-mono">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                          {/* Copy line */}
                          <button
                            onClick={() => copyRowToClipboard(row)}
                            className="bg-zinc-850 hover:bg-zinc-750 text-zinc-400 hover:text-white p-1 rounded cursor-pointer"
                            title="Satırı Kopyala"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          
                          {/* Paste line */}
                          <button
                            onClick={() => pasteRowFromClipboard(row.id)}
                            className="bg-zinc-850 hover:bg-zinc-750 text-zinc-405 hover:text-white p-1 rounded cursor-pointer"
                            title="Satıra Yapıştır"
                          >
                            <Clipboard className="h-3 w-3" />
                          </button>

                          {/* Delete line */}
                          <button
                            onClick={() => deleteRow(row.id)}
                            className="bg-red-950 hover:bg-red-900 text-red-400 hover:text-red-300 p-1 rounded border border-red-900/40 cursor-pointer"
                            title="Satırı Tamamen Sil"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {processedRows.length === 0 && (
                    <tr>
                      <td colSpan={data.columns.length + 1} className="p-16 text-center text-zinc-500 italic font-sans">
                        Filtrelere veya arama sorgusuna uyan veri satırı bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom notification & stats info bar */}
            <div className="p-4 px-6 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-zinc-400 gap-2 select-none">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{summaryText}</span>
              </div>
              <div className="flex items-center gap-4 text-zinc-500 font-mono text-[10.5px]">
                <span>📋 Hücreye yazılıp geçmek için TAB, alt satıra geçmek için ENTER kullanın.</span>
                <span>🔒 Verileriniz yerel depolama altında anlık güvendedir.</span>
              </div>
            </div>

            {renderOverlays()}
          </div>
        </div>
      )}
    </>
  );
}
