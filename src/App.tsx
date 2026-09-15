/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useReducer, useState, useEffect, useCallback, useMemo } from "react";
import { BoardState, BoardAction, BoardReference } from "./types";
import Board from "./components/Board";
import Sidebar from "./components/Sidebar";
import ConfirmModal from "./components/ConfirmModal";
import { PhotosLightbox } from "./components/AttachmentNodes";
import MiniCalendar from "./components/MiniCalendar";
import SettingsModal, { loadSettings, AppSettings } from "./components/SettingsModal";
import { forensicAudio } from "./utils/audio";
import {
  isTauri,
  sendNotification,
  saveFileNative,
  openFileNative,
  persistBackup,
  restoreBackup,
} from "./lib/tauriBridge";
import {
  fetchBoards as fetchBoardsDB,
  fetchBoardState as fetchBoardStateDB,
  saveBoardState as saveBoardStateDB,
  saveBoardStateDebounced,
  createBoardInDB,
  deleteBoardFromDB,
  renameBoardInDB,
} from "./lib/supabaseClient";

const SK = "cb_v7";
const BK = "cb_boards_v7";

const loadBoardsLocal = (): BoardReference[] => {
  try {
    const r = localStorage.getItem(BK);
    if (r) return JSON.parse(r);
  } catch {}
  return [{ id: "b1", name: "Ana Pano" }];
};

const preseededState = (id: string): BoardState => {
  if (id !== "b1") {
    return {
      nodes: [],
      connections: [],
      groups: [],
      texts: [],
      drawings: [],
      shapes: [],
      nextId: 1,
    };
  }

  return {
    nodes: [
      {
        id: "n_report",
        type: "note",
        title: "📜 Soruşturma Özeti",
        text: "# VAKA DOSYASI: 2026-F985\n\n**Olay:** Küresel Teknoloji Merkezindeki ana veri tabanına siber müdahale davası.\n\n- **Birincil Hedef:** Ana veri tabanının yedek diskleri\n- **Zaman Dilimi:** Gözetleme raporlarına göre saat 23:40\n\n**Soruşturma Raporu:**\nŞüpheli, olay yerinden uzaklaşırken kameralara takıldı. Giriş kartının izleri sistem günlüğünden doğrulandı. Tüm deliller analiz ediliyor.",
        x: 140,
        y: 110,
        w: 250,
        h: 220,
        z: 10,
        bg: "#20222a",
        markdown: true,
        tags: ["rapor", "aktif"]
      },
      {
        id: "n_suspect",
        type: "image",
        title: "🕵️ Şüpheli Profil Kartı",
        img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 100 100' style='background:%23dedbc8'><circle cx='50' cy='38' r='16' fill='%231f2229' /><path d='M25,85 C25,62 38,55 50,55 C62,55 75,62 75,85 Z' fill='%231f2229' /><path d='M43,44 L57,44 L55,50 L45,50 L43,44 M43,36 C45,36 45,34 50,34 C55,34 55,36 57,36' stroke='%23fff' stroke-width='1.2' fill='none' /><rect x='10' y='10' width='80' height='80' fill='none' stroke='%2330363d' stroke-width='1' stroke-dasharray='2,2'/><text x='15' y='22' font-family='monospace' font-size='4.5' fill='%2330363d'>SORGU ARŞİVİ: SH-802</text></svg>",
        lang: "SUSPECT",
        x: 520,
        y: 110,
        w: 240,
        h: 240,
        z: 12,
        tags: ["şüpheli", "kodadı"]
      },
      {
        id: "n_evidence",
        type: "image",
        title: "🔑 Bulgu: Giriş Kartı",
        img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 100 100' style='background:%23eae6ca'><rect x='28' y='18' width='44' height='64' rx='4' fill='%23161a20' stroke='%232ea043' stroke-width='2'/><rect x='34' y='23' width='32' height='12' fill='%2330363d'/><circle cx='60' cy='46' r='3' fill='%232ea043'/><line x1='34' y1='55' x2='50' y2='55' stroke='%23fff' stroke-width='1.5'/><line x1='34' y1='62' x2='64' y2='62' stroke='%23fff' stroke-width='1.5'/><text x='34' y='73' font-family='monospace' font-size='5.5' fill='%23888'>SECURE KEY</text></svg>",
        lang: "EVIDENCE",
        x: 420,
        y: 430,
        w: 240,
        h: 240,
        z: 11,
        tags: ["delil", "kart"]
      },
      {
        id: "n_todo",
        type: "todo",
        title: "📋 Dosya İş Planı",
        todos: [
          { id: 1, text: "MOBESE Kamera Kayıtlarını Topla", done: true },
          { id: 2, text: "Şüphelinin Alibisini Doğrula", done: false },
          { id: 3, text: "Olay Yeri Parmak İzlerini Eşleştir", done: false },
          { id: 4, text: "Siber Adli Tıp Raporunu İste", done: false }
        ],
        x: 140,
        y: 430,
        w: 250,
        h: 210,
        z: 9,
        bg: "#20222a",
        tags: ["görevler"]
      },
      {
        id: "n_clock",
        type: "clock",
        title: "🕒 Olay Saati Tahmini",
        x: 820,
        y: 110,
        w: 220,
        h: 160,
        z: 6,
        bg: "#20222a",
        tags: ["zaman"]
      }
    ],
    connections: [
      {
        id: "c_s1",
        from: "n_suspect",
        to: "n_evidence",
        style: "thread",
        color: "#ef4444",
        label: "Onun odasında bulundu",
        locked: false
      },
      {
        id: "c_s2",
        from: "n_report",
        to: "n_suspect",
        style: "thread",
        color: "#f59e0b",
        label: "Birincil Eşleşme",
        locked: false
      }
    ],
    groups: [
      {
        id: "g_main",
        name: "1. DERECE ODAK ALANI",
        colorId: "red",
        nodeIds: ["n_report", "n_suspect", "n_evidence"],
        x: 100,
        y: 50,
        w: 700,
        h: 650,
        z: 1,
        collapsed: false
      }
    ],
    texts: [],
    drawings: [],
    shapes: [],
    nextId: 10
  };
};

const loadStateLocal = (id: string): BoardState => {
  try {
    const r = localStorage.getItem(`${SK}_${id}`);
    if (r) {
      const parsed = JSON.parse(r);
      return {
        nodes: [],
        connections: [],
        groups: [],
        texts: [],
        drawings: [],
        shapes: [],
        nextId: 1,
        ...parsed,
      };
    }
  } catch {}

  const recoveryState = restoreBackup(id);
  if (recoveryState) {
    return recoveryState;
  }

  return preseededState(id);
};

const persistLocal = (id: string, st: BoardState) => {
  try {
    localStorage.setItem(`${SK}_${id}`, JSON.stringify(st));
    persistBackup(id, st);
  } catch {}
};

// ─── STATE REDUCER ENGINE ─────────────────────────────────────────
function reducer(state: BoardState, action: BoardAction): BoardState {
  const groups = state.groups || [];
  const texts = state.texts || [];
  const drawings = state.drawings || [];
  const shapes = state.shapes || [];

  switch (action.type) {
    case "ADD":
      return {
        ...state,
        nodes: [...state.nodes, { createdAt: Date.now(), title: "", text: "", code: "", bg: "#1e1e2e", ...action.p }],
        nextId: state.nextId + 1,
      };

    case "DUPLICATE": {
      const src = state.nodes.find((n) => n.id === action.p);
      if (!src) return state;
      const clone = {
        ...src,
        id: `n${Date.now()}`,
        x: (src.x || 0) + 32,
        y: (src.y || 0) + 32,
        z: Date.now(),
        createdAt: Date.now(),
      };
      return {
        ...state,
        nodes: [...state.nodes, clone],
        nextId: state.nextId + 1,
      };
    }

    case "UPD":
      return {
        ...state,
        nodes: state.nodes.map((n) => (n.id === action.p.id ? { ...n, ...action.p } : n)),
      };

    case "DEL": {
      const id = action.p;
      return {
        ...state,
        nodes: state.nodes.filter((n) => n.id !== id),
        connections: state.connections.filter((c) => c.from !== id && c.to !== id),
        groups: groups.map((g) => ({
          ...g,
          nodeIds: (g.nodeIds || []).filter((x) => x !== id),
        })),
      };
    }

    case "CONN": {
      if (action.p.from === action.p.to) return state;
      if (state.connections.some((c) => c.from === action.p.from && c.to === action.p.to)) {
        return state;
      }
      return {
        ...state,
        connections: [
          ...state.connections,
          {
            id: `c${Date.now()}`,
            style: "thread",
            color: "#ef4444",
            locked: false,
            label: "",
            ...action.p,
          },
        ],
      };
    }

    case "UPD_CONN":
      return {
        ...state,
        connections: state.connections.map((c) => (c.id === action.p.id ? { ...c, ...action.p } : c)),
      };

    case "DEL_CONN": {
      const conn = state.connections.find((c) => c.id === action.p);
      if (conn && conn.locked) return state;
      return {
        ...state,
        connections: state.connections.filter((c) => c.id !== action.p),
      };
    }

    case "ADD_GROUP":
      return {
        ...state,
        groups: [...groups, action.p],
        nextId: state.nextId + 1,
      };

    case "UPD_GROUP":
      return {
        ...state,
        groups: groups.map((g) => (g.id === action.p.id ? { ...g, ...action.p } : g)),
      };

    case "DEL_GROUP":
      return {
        ...state,
        groups: groups.filter((g) => g.id !== action.p),
      };

    case "ADD_TEXT":
      return {
        ...state,
        texts: [...texts, { createdAt: Date.now(), content: "", color: "#ffffff", fontSize: 18, ...action.p }],
      };

    case "DUP_TEXT": {
      const src = texts.find((t) => t.id === action.p);
      if (!src) return state;
      return {
        ...state,
        texts: [
          ...texts,
          {
            ...src,
            id: `tx${Date.now()}`,
            x: (src.x || 0) + 32,
            y: (src.y || 0) + 32,
            z: Date.now(),
            createdAt: Date.now(),
          },
        ],
      };
    }

    case "UPD_TEXT":
      return {
        ...state,
        texts: texts.map((t) => (t.id === action.p.id ? { ...t, ...action.p } : t)),
      };

    case "DEL_TEXT":
      return {
        ...state,
        texts: texts.filter((t) => t.id !== action.p),
      };

    case "ADD_DRAWING":
      return {
        ...state,
        drawings: [...drawings, action.p],
      };

    case "DEL_DRAWING":
      return {
        ...state,
        drawings: drawings.filter((d) => d.id !== action.p),
      };

    case "ERASE_AT": {
      const { bx, by, r } = action.p;
      const r2 = r * r;

      const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
        const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
        if (l2 === 0) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        const projX = x1 + t * (x2 - x1);
        const projY = y1 + t * (y2 - y1);
        return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
      };

      const pointInBox = (px: number, py: number, sx: number, sy: number, sw: number, sh: number, pad: number) => {
        return px >= sx - pad && px <= sx + sw + pad && py >= sy - pad && py <= sy + sh + pad;
      };

      return {
        ...state,
        drawings: drawings
          .map((s) => {
            const kept = s.points.filter((p) => (p.x - bx) * (p.x - bx) + (p.y - by) * (p.y - by) >= r2);
            return kept.length > 1 ? { ...s, points: kept } : null;
          })
          .filter((x): x is any => x !== null),
        shapes: shapes.filter((s) => {
          if (s.kind === "line" || s.kind === "arrow") {
            const x1 = s.x1 !== undefined ? s.x1 : s.x || 0;
            const y1 = s.y1 !== undefined ? s.y1 : s.y || 0;
            const x2 = s.x2 !== undefined ? s.x2 : (s.x || 0) + (s.w || 50);
            const y2 = s.y2 !== undefined ? s.y2 : (s.y || 0) + (s.h || 50);
            const d = distToSegment(bx, by, x1, y1, x2, y2);
            return d > Math.max(12, r);
          }
          const sx = s.x || 0;
          const sy = s.y || 0;
          const sw = s.w || 100;
          const sh = s.h || 100;
          return !pointInBox(bx, by, sx, sy, sw, sh, Math.max(8, r));
        }),
      };
    }

    case "ADD_SHAPE":
      return {
        ...state,
        shapes: [...shapes, action.p],
      };

    case "UPD_SHAPE":
      return {
        ...state,
        shapes: shapes.map((s) => (s.id === action.p.id ? { ...s, ...action.p } : s)),
      };

    case "DEL_SHAPE":
      return {
        ...state,
        shapes: shapes.filter((s) => s.id !== action.p),
      };

    case "SET_DRAW_STATE":
      return {
        ...state,
        drawings: action.p.drawings || [],
        shapes: action.p.shapes || [],
      };

    case "CLEAR_DRAWINGS":
      return { ...state, drawings: [] };

    case "CLEAR_SHAPES":
      return { ...state, shapes: [] };

    case "CLEAR":
      return {
        nodes: [],
        connections: [],
        groups: [],
        texts: [],
        drawings: [],
        shapes: [],
        nextId: 1,
      };

    case "LOAD":
      return {
        groups: [],
        texts: [],
        drawings: [],
        shapes: [],
        ...action.p,
      } as BoardState;

    default:
      return state;
  }
}

// ─── MAIN DRIVER CONTROLLER ───────────────────────────────────────
export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [appSettings, setAppSettings] = useState<AppSettings>(loadSettings);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMinimap, setShowMinimap] = useState(() => loadSettings().showMinimap);
  const [showCalendar, setShowCalendar] = useState(false);
  const [boards, setBoards] = useState<BoardReference[]>(loadBoardsLocal);
  const [activeBoardId, setActiveBoardId] = useState<string>(() => loadBoardsLocal()[0]?.id || "b1");
  const [state, rawDispatch] = useReducer(reducer, null, () => loadStateLocal(loadBoardsLocal()[0]?.id || "b1"));
  const [dbReady, setDbReady] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => loadSettings().soundEnabled);

  useEffect(() => {
    forensicAudio.toggleEffects(appSettings.soundEnabled);
  }, [appSettings.soundEnabled]);

  const handleUpdateSettings = useCallback((next: AppSettings) => {
    setAppSettings(next);
    setSoundEnabled(next.soundEnabled);
    setDarkMode(next.themeMode === "dark");
    setThemeColor(next.accentColor);
    setBoardTheme(next.boardTheme);
    setShowMinimap(next.showMinimap);
    forensicAudio.toggleEffects(next.soundEnabled);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("cb_sound_enabled", String(next));
      } catch {}
      forensicAudio.toggleEffects(next);
      if (next) {
        forensicAudio.playPinPing();
      }
      return next;
    });
  }, []);

  const dispatch = useCallback((action: BoardAction) => {
    // Elegant, decoupled audio synthesizer controller executing completely offline
    if (action.type === "ADD" || action.type === "DUPLICATE" || action.type === "ADD_GROUP" || action.type === "ADD_TEXT" || action.type === "ADD_SHAPE") {
      forensicAudio.playPinPing();
    } else if (action.type === "CONN") {
      forensicAudio.playYarnStretch();
    } else if (action.type === "DEL" || action.type === "DEL_CONN" || action.type === "DEL_GROUP" || action.type === "DEL_TEXT" || action.type === "DEL_SHAPE" || action.type === "CLEAR") {
      forensicAudio.playWarning();
    } else if (action.type === "UPD" || action.type === "UPD_CONN" || action.type === "UPD_TEXT" || action.type === "UPD_SHAPE") {
      // Small typing click to simulate retro typewriter active forensic recording
      forensicAudio.playTypewriter();
    }
    rawDispatch(action);
  }, []);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem("cb_theme") !== "light";
    } catch {
      return true;
    }
  });

  const [drawMode, setDrawMode] = useState(false);
  const [drawColor, setDrawColor] = useState("#ef4444");
  const [drawSize, setDrawSize] = useState(3);
  const [shapeTool, setShapeTool] = useState("pen");
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));
  const [projectPath, setProjectPath] = useState<string | null>(null);

  const [themeColor, setThemeColor] = useState<string>(() => {
    try {
      return localStorage.getItem("cb_theme_color") || "#ef4444";
    } catch {
      return "#ef4444";
    }
  });

  // Modal alert controls
  const [modal, setModal] = useState<{ type: string; id?: string; groupId?: string; groupName?: string } | null>(null);
  const isElectron = isTauri();

  // Full-screen native Windows Photos simulator state tracker
  const [lightboxData, setLightboxData] = useState<{
    id: string | null;
    img: string | null;
    title: string;
    imgPath?: string;
  } | null>(null);

  const [boardTheme, setBoardTheme] = useState<"cork" | "grid" | "slate">(() => {
    try {
      return (localStorage.getItem("cb_board_theme") as any) || "cork";
    } catch {
      return "cork";
    }
  });

  const changeBoardTheme = useCallback((theme: "cork" | "grid" | "slate") => {
    setBoardTheme(theme);
    try {
      localStorage.setItem("cb_board_theme", theme);
    } catch {}
    forensicAudio.playTypewriter();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setLightboxData({
          id: customEvent.detail.id,
          img: customEvent.detail.img,
          title: customEvent.detail.title,
          imgPath: customEvent.detail.imgPath
        });
      }
    };
    window.addEventListener("open-windows-photos", handler);
    return () => window.removeEventListener("open-windows-photos", handler);
  }, []);

  const allImageNodes = useMemo(() => {
    return state.nodes
      .filter((n) => n.type === "image" && n.img)
      .map((n) => ({
        id: n.id,
        img: n.img!,
        title: n.title || "Görsel",
        imgPath: n.imgPath
      }));
  }, [state.nodes]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  useEffect(() => {
    try {
      localStorage.setItem("cb_boards_v7", JSON.stringify(boards));
    } catch {}
  }, [boards]);

  useEffect(() => {
    try {
      localStorage.setItem("cb_theme", darkMode ? "dark" : "light");
    } catch {}
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem("cb_theme_color", themeColor);
    } catch {}
  }, [themeColor]);

  // Load boards from Supabase on mount
  useEffect(() => {
    (async () => {
      const dbBoards = await fetchBoardsDB();
      if (dbBoards.length > 0) {
        setBoards(dbBoards);
        const firstId = dbBoards[0].id;
        setActiveBoardId(firstId);
        const dbState = await fetchBoardStateDB(firstId);
        if (dbState) {
          dispatch({ type: "LOAD", p: dbState });
        } else {
          dispatch({ type: "LOAD", p: loadStateLocal(firstId) });
        }
        setDbReady(true);
      } else {
        // No boards in DB — seed with default board
        const defaultBoards = loadBoardsLocal();
        for (const b of defaultBoards) {
          const st = loadStateLocal(b.id);
          await createBoardInDB(b.id, b.name, st);
        }
        setBoards(defaultBoards);
        setDbReady(true);
      }
    })();
  }, []);

  // Performs auto-saving — localStorage + Supabase (debounced)
  useEffect(() => {
    persistLocal(activeBoardId, state);
    if (dbReady) {
      saveBoardStateDebounced(activeBoardId, state);
    }
  }, [state, activeBoardId, dbReady]);

  const switchBoard = useCallback((id: string) => {
    setActiveBoardId(id);
    // Try Supabase first, fall back to localStorage
    (async () => {
      const dbState = await fetchBoardStateDB(id);
      if (dbState) {
        dispatch({ type: "LOAD", p: dbState });
      } else {
        dispatch({ type: "LOAD", p: loadStateLocal(id) });
      }
    })();
    setSearch("");
    setFilterTag(null);
  }, []);

  const newBoard = useCallback(() => {
    const index = boards.length + 1;
    const name = `Pano ${index}`;
    const id = "b" + Date.now();
    const entry = { id, name };
    const empty: BoardState = {
      nodes: [],
      connections: [],
      groups: [],
      texts: [],
      drawings: [],
      shapes: [],
      nextId: 1,
    };
    persistLocal(id, empty);
    createBoardInDB(id, name, empty);
    setBoards((prev) => {
      const updated = [...prev, entry];
      try {
        localStorage.setItem(BK, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setActiveBoardId(id);
    dispatch({ type: "LOAD", p: empty });
    setSearch("");
    setFilterTag(null);
    sendNotification("Yeni Dosya", `"${name}" başarıyla oluşturuldu.`);
  }, [boards]);

  const delBoard = useCallback((id: string) => {
    setModal({ type: "deleteBoard", id });
  }, []);

  const confirmModal = useCallback(() => {
    if (!modal) return;
    if (modal.type === "deleteBoard" && modal.id) {
      setBoards((prev) => prev.filter((b) => b.id !== modal.id));
      try {
        localStorage.removeItem(`${SK}_${modal.id}`);
      } catch {}
      deleteBoardFromDB(modal.id);
      const rem = boards.filter((b) => b.id !== modal.id);
      if (modal.id === activeBoardId && rem.length > 0) {
        switchBoard(rem[0].id);
      }
      sendNotification("Dosya Kaldırıldı", "Seçili pano silindi.");
    } else if (modal.type === "clearBoard") {
      const empty: BoardState = {
        nodes: [],
        connections: [],
        groups: [],
        texts: [],
        drawings: [],
        shapes: [],
        nextId: 1,
      };
      dispatch({ type: "CLEAR" });
      persistLocal(activeBoardId, empty);
      if (dbReady) saveBoardStateDB(activeBoardId, empty);
      sendNotification("Pano Temizlendi", "Beyaz tahta yapısı boşaltıldı.");
    } else if (modal.type === "deleteGroup" && modal.groupId) {
      dispatch({ type: "DEL_GROUP", p: modal.groupId });
    }
    setModal(null);
  }, [modal, activeBoardId, boards, switchBoard]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    state.nodes.forEach((n) => (n.tags || []).forEach((t) => s.add(t)));
    return Array.from(s);
  }, [state.nodes]);

  const doExport = useCallback(() => {
    const payload = JSON.stringify(
      {
        v: 5,
        boardId: activeBoardId,
        date: new Date().toISOString(),
        state,
      },
      null,
      2
    );
    saveFileNative(`caseboard-${activeBoardId}-${Date.now()}.json`, payload).then((ok) => {
      if (ok) sendNotification("Yedekleme", "Dosya başarıyla yedeklendi.");
    });
  }, [state, activeBoardId]);

  const addGroup = useCallback(() => {
    dispatch({
      type: "ADD_GROUP",
      p: {
        id: `g${Date.now()}`,
        name: "Yeni İlişki Grubu",
        colorId: "blue",
        nodeIds: [],
        x: 200 + Math.random() * 150,
        y: 180 + Math.random() * 100,
        w: 340,
        h: 280,
        collapsed: false,
        z: Date.now(),
      },
    });
  }, []);

  const active = boards.find((b) => b.id === activeBoardId);

  return (
    <div
      style={{
        backgroundColor: darkMode ? "#0f1115" : "#f3f4f6",
      }}
      className="flex h-screen w-screen overflow-hidden relative font-sans"
    >
      {modal && (
        <ConfirmModal
          open={!!modal}
          title={
            modal.type === "deleteBoard"
              ? "Panoyu Sil"
              : modal.type === "clearBoard"
              ? "Panoyu Temizle"
              : "Grubu Sil"
          }
          message={
            modal.type === "deleteBoard"
              ? "Seçilen pano ve ekli tüm kartlar kalıcı olarak silinecektir. Devam etmek istiyor musunuz?"
              : modal.type === "clearBoard"
              ? "Tüm kartlar, bağlantılar ve çizimler tamamen temizlenecektir. Devam edilsin mi?"
              : `"${modal.groupName || "İlişki Grubu"}" kaldırılacaktır. Onaylıyor musunuz?`
          }
          confirmLabel="Onayla ve Sil"
          cancelLabel="İptal"
          danger
          onConfirm={confirmModal}
          onCancel={() => setModal(null)}
        />
      )}

      {isMobile && sidebarOpen && (
        <div
          role="presentation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-25 bg-black/50"
        />
      )}

      {sidebarOpen && (
        <Sidebar
          open={sidebarOpen}
          onDragStart={(e, type) => {
            e.dataTransfer.setData("nodeType", type);
            e.dataTransfer.setData("nodetype", type);
            e.dataTransfer.setData("text/plain", type);
            e.dataTransfer.effectAllowed = "copy";
          }}
          onClear={() => setModal({ type: "clearBoard" })}
          onAddGroup={addGroup}
          soundEnabled={soundEnabled}
          onSoundToggle={toggleSound}
          nodeCount={state.nodes.length}
          boards={boards}
          activeBoardId={activeBoardId}
          onBoard={(id) => {
            switchBoard(id);
            if (isMobile) setSidebarOpen(false);
          }}
          onNewBoard={newBoard}
          onDelBoard={delBoard}
          onRenameBoard={(id, name) => {
            setBoards((prev) => {
              const updated = prev.map((b) => (b.id === id ? { ...b, name } : b));
              try {
                localStorage.setItem(BK, JSON.stringify(updated));
              } catch {}
              return updated;
            });
            renameBoardInDB(id, name);
          }}
          search={search}
          onSearch={setSearch}
          filterTag={filterTag}
          onFilterTag={setFilterTag}
          allTags={allTags}
          onExport={doExport}
          onExportPng={null}
          onExportPdf={null}
          onImport={(raw) => {
            try {
              const d = JSON.parse(raw);
              const imp = d.state || d;
              if (imp.nodes) {
                dispatch({
                  type: "LOAD",
                  p: { groups: [], texts: [], drawings: [], shapes: [], ...imp },
                });
                persistLocal(activeBoardId, imp);
                if (dbReady) saveBoardStateDB(activeBoardId, imp as BoardState);
                sendNotification("İçe Aktarma", "Dosya başarıyla yüklendi.");
              } else {
                alert("Geçersiz yedekleme dosyası yapısı");
              }
            } catch {
              alert("İçe aktarma hatası: Geçersiz JSON");
            }
          }}
          darkMode={darkMode}
          onTheme={() => setDarkMode(!darkMode)}
          drawMode={drawMode}
          onToggleDraw={() => setDrawMode(!drawMode)}
          themeColor={themeColor}
          onThemeColor={setThemeColor}
          isMobile={isMobile}
          onClose={() => setSidebarOpen(false)}
          isElectron={isElectron}
          onOpenSettings={() => setShowSettingsModal(true)}
        />
      )}

      {/* Hamburger Toggle Controls with modern layouts */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        type="button"
        className={`absolute top-2.5 z-40 flex h-8 w-8 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border bg-zinc-950/90 shadow transition-all hover:bg-zinc-900 ${
          sidebarOpen ? "left-[228px]" : "left-2.5"
        } ${darkMode ? "border-white/10" : "border-black/15"}`}
      >
        {sidebarOpen ? (
          <span className="text-white text-xs leading-none">✕</span>
        ) : (
          <div className="flex flex-col gap-1">
            {[1, 2, 3].map((i) => (
              <span key={i} className="h-0.5 w-4 rounded-full bg-zinc-400 block" />
            ))}
          </div>
        )}
      </button>

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Upper file-selection sub-headers segment */}
        <div
          className={`flex h-10 shrink-0 items-center gap-1.5 pl-14 pr-3.5 border-b overflow-x-auto select-none ${
            darkMode ? "border-brand-border bg-brand-sidebar" : "border-black/8 bg-zinc-200"
          }`}
        >
          {boards.map((b) => (
            <button
              key={b.id}
              onClick={() => switchBoard(b.id)}
              type="button"
              style={{
                backgroundColor: b.id === activeBoardId ? (darkMode ? "rgba(0,120,212,0.12)" : "rgba(0,120,212,0.06)") : "transparent",
                borderColor: b.id === activeBoardId ? "rgba(0,120,212,0.35)" : "transparent",
              }}
              className={`h-[28px] shrink-0 rounded px-3.5 font-sans text-[11px] border cursor-pointer transition-all ${
                b.id === activeBoardId
                  ? "text-brand-accent font-bold"
                  : darkMode
                  ? "text-brand-text-dim hover:text-white"
                  : "text-zinc-600 hover:text-black"
              }`}
            >
              📂 {b.name}
            </button>
          ))}
          <button
            onClick={newBoard}
            type="button"
            title="Yeni Dosya"
            className="h-[26px] shrink-0 rounded border border-dashed border-zinc-500/20 bg-transparent px-2.5 font-sans text-xs text-zinc-500 cursor-pointer hover:text-white"
          >
            +
          </button>
          <div className="flex-1 min-w-2" />
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            type="button"
            className={`shrink-0 rounded border px-3 py-1 font-sans text-[10px] cursor-pointer transition-colors mr-1.5 ${
              showCalendar
                ? "border-amber-500/40 bg-amber-500/10 text-amber-500 font-bold"
                : darkMode
                ? "border-brand-border bg-transparent text-brand-text-dim hover:text-white"
                : "border-black/15 bg-transparent text-zinc-500 hover:text-black"
            }`}
          >
            📅 {showCalendar ? "Takvimi Kapat" : "Takvimi Aç"}
          </button>
          <button
            onClick={() => setShowMinimap(!showMinimap)}
            type="button"
            className={`shrink-0 rounded border px-3 py-1 font-sans text-[10px] cursor-pointer transition-colors mr-1.5 ${
              showMinimap
                ? "border-brand-accent/40 bg-brand-accent/10 text-brand-accent"
                : darkMode
                ? "border-brand-border bg-transparent text-brand-text-dim hover:text-white"
                : "border-black/15 bg-transparent text-zinc-500 hover:text-black"
            }`}
          >
            {showMinimap ? "Haritayı Kapat" : "Haritayı Aç"}
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            type="button"
            className={`shrink-0 rounded border px-3 py-1 font-sans text-[10px] cursor-pointer transition-colors ${
              showSettingsModal
                ? "border-sky-500/40 bg-sky-500/10 text-sky-400 font-bold"
                : darkMode
                ? "border-brand-border bg-transparent text-brand-text-dim hover:text-white"
                : "border-black/15 bg-transparent text-zinc-500 hover:text-black"
            }`}
          >
            ⚙️ Ayarlar
          </button>
          {!isMobile && (
            <span className="shrink-0 font-sans text-[10px] text-brand-text-dim italic ml-1">
              * otomatik kaydedilir
            </span>
          )}
        </div>

        <Board
          state={state}
          dispatch={dispatch}
          search={search}
          filterTag={filterTag}
          darkMode={darkMode}
          boardId={activeBoardId}
          showMinimap={showMinimap}
          drawMode={drawMode}
          onToggleDraw={() => setDrawMode(!drawMode)}
          drawColor={drawColor}
          setDrawColor={setDrawColor}
          drawSize={drawSize}
          setDrawSize={setDrawSize}
          eraseMode={false}
          shapeTool={shapeTool}
          setShapeTool={setShapeTool}
          onRequestDeleteGroup={(gid, gname) =>
            setModal({ type: "deleteGroup", groupId: gid, groupName: gname })
          }
          boardTheme={boardTheme}
          onBoardTheme={changeBoardTheme}
        />
      </div>

      {lightboxData && (
        <PhotosLightbox
          id={lightboxData.id}
          imgSrc={lightboxData.img}
          imgTitle={lightboxData.title}
          imgPath={lightboxData.imgPath}
          allImageNodes={allImageNodes}
          onClose={() => setLightboxData(null)}
          onSaveImage={(id, newImg) => {
            dispatch({ type: "UPD", p: { id, img: newImg } });
          }}
          onSelectImage={(id) => {
            const match = allImageNodes.find((n) => n.id === id);
            if (match) {
              setLightboxData({
                id: match.id,
                img: match.img,
                title: match.title,
                imgPath: match.imgPath
              });
            }
          }}
        />
      )}

      {showCalendar && (
        <MiniCalendar
          nodes={state.nodes}
          onUpdateNode={(fields) => dispatch({ type: "UPD", p: fields })}
          onFocusNode={(id) => window.dispatchEvent(new CustomEvent("focus-board-node", { detail: { id } }))}
          darkMode={darkMode}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {appSettings.showWatermark && appSettings.watermarkText && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none select-none rounded-full border border-amber-500/25 bg-black/60 px-3 py-1 font-mono text-[10px] text-amber-400/80 backdrop-blur-sm tracking-widest shadow-lg">
          🔒 {appSettings.watermarkText}
        </div>
      )}

      <SettingsModal
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={appSettings}
        onUpdateSettings={handleUpdateSettings}
        darkMode={darkMode}
      />
    </div>
  );
}
