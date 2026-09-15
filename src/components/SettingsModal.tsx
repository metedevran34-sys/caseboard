import React, { useState, useEffect } from "react";
import {
  X,
  Settings,
  Globe,
  Volume2,
  Layout,
  Shield,
  Download,
  Cpu,
  RotateCcw,
  Check,
  Moon,
  Sun,
  Sliders,
  Grid,
  Lock,
  FileText,
  VolumeX,
  Bell,
  Eye,
  Maximize2
} from "lucide-react";
import { forensicAudio } from "../utils/audio";

export interface AppSettings {
  // 1. General & Language
  language: "tr" | "en" | "de" | "es";
  themeMode: "dark" | "light";
  accentColor: string;
  boardTheme: "cork" | "grid" | "slate";
  defaultOpeningBoard: string;

  // 2. Audio & Notifications
  soundEnabled: boolean;
  soundVolume: number; // 0 to 100
  typewriterClicks: boolean;
  yarnStretchSounds: boolean;
  desktopNotifications: boolean;

  // 3. Canvas & Editing
  snapToGrid: boolean;
  gridSize: number; // 10, 20, 30, 50
  dragSensitivity: "precise" | "normal" | "fast";
  showMinimap: boolean;
  maxZoomScale: number; // 200, 300, 400
  invertZoomScroll: boolean;
  doubleClickAction: "addNote" | "openMenu" | "none";
  defaultPenSize: number;

  // 4. Data & Security
  autoSaveInterval: number; // 0 (instant), 5, 30, 60
  maxBackupsCount: number; // 5, 10, 20
  showWatermark: boolean;
  watermarkText: string;
  securityPin: string;
  autoLockTimeout: number; // 0 (never), 5, 15, 30
  confirmDeletions: boolean;

  // 5. Export & Formats
  exportPngQuality: "1x" | "2x" | "4x";
  exportTransparentBg: boolean;
  exportPdfLayout: "portrait" | "landscape" | "auto";
  appendDateToExport: boolean;

  // 6. Desktop & Hardware
  hardwareAcceleration: boolean;
  defaultFileOpener: "tauri" | "system" | "preview";
  darkTitleBar: boolean;
  minimizeToTrayOnClose: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: "tr",
  themeMode: "dark",
  accentColor: "#ef4444",
  boardTheme: "cork",
  defaultOpeningBoard: "b1",

  soundEnabled: true,
  soundVolume: 80,
  typewriterClicks: true,
  yarnStretchSounds: true,
  desktopNotifications: true,

  snapToGrid: true,
  gridSize: 20,
  dragSensitivity: "normal",
  showMinimap: true,
  maxZoomScale: 300,
  invertZoomScroll: false,
  doubleClickAction: "addNote",
  defaultPenSize: 3,

  autoSaveInterval: 0,
  maxBackupsCount: 10,
  showWatermark: false,
  watermarkText: "",
  securityPin: "",
  autoLockTimeout: 0,
  confirmDeletions: true,

  exportPngQuality: "2x",
  exportTransparentBg: false,
  exportPdfLayout: "auto",
  appendDateToExport: true,

  hardwareAcceleration: true,
  defaultFileOpener: "tauri",
  darkTitleBar: true,
  minimizeToTrayOnClose: false,
};

const SETTINGS_KEY = "cb_app_settings_v1";

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettingsToStorage(settings: AppSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  darkMode: boolean;
}

export default function SettingsModal({
  open,
  onClose,
  settings,
  onUpdateSettings,
  darkMode,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"general" | "audio" | "canvas" | "security" | "export" | "desktop">("general");
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!open) return null;

  const update = <K extends keyof AppSettings>(key: K, val: AppSettings[K]) => {
    const next = { ...localSettings, [key]: val };
    setLocalSettings(next);
    onUpdateSettings(next);
    saveSettingsToStorage(next);
    forensicAudio.playTypewriter();
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
    onUpdateSettings(DEFAULT_SETTINGS);
    saveSettingsToStorage(DEFAULT_SETTINGS);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const TABS = [
    { id: "general", label: "Genel & Dil", icon: Globe, count: 5 },
    { id: "audio", label: "Ses & Bildirim", icon: Volume2, count: 5 },
    { id: "canvas", label: "Kanvas & Izgara", icon: Grid, count: 8 },
    { id: "security", label: "Güvenlik & Kayıt", icon: Shield, count: 6 },
    { id: "export", label: "Dışa Aktarım", icon: Download, count: 4 },
    { id: "desktop", label: "Masaüstü & GPU", icon: Cpu, count: 4 },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm select-none"
      onClick={onClose}
    >
      <div
        className="relative flex h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl text-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar Navigation */}
        <div className="w-56 shrink-0 border-r border-white/10 bg-zinc-900/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 px-2 pb-4 mb-2 border-b border-white/10">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <Settings className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">Uygulama Ayarları</h2>
                <p className="text-[10px] text-zinc-400">32 Özellik & Yapılandırma</p>
              </div>
            </div>

            <nav className="space-y-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      forensicAudio.playTypewriter();
                    }}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm"
                        : "text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? "text-sky-400" : "text-zinc-400"}`} />
                      <span>{tab.label}</span>
                    </div>
                    <span className="text-[10px] opacity-60 bg-white/10 px-1.5 py-0.5 rounded-full font-mono">
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-3 border-t border-white/10 space-y-2">
            <button
              onClick={handleReset}
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Sıfırla
            </button>
            <p className="text-[9px] text-center text-zinc-500 font-mono">
              Ayarlar anında kaydedilir
            </p>
          </div>
        </div>

        {/* Right Content View */}
        <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden">
          {/* Top Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-900/40 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {TABS.find((t) => t.id === activeTab)?.label}
                {savedToast && (
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 font-normal">
                    ✓ Kaydedildi
                  </span>
                )}
              </h3>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. GENERAL & LANGUAGE */}
            {activeTab === "general" && (
              <div className="space-y-5">
                {/* 1. Language */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">1. Uygulama Dili (Language)</label>
                    <span className="text-[11px] text-zinc-400">Arayüz metinleri ve menülerin varsayılan dili</span>
                  </div>
                  <select
                    value={localSettings.language}
                    onChange={(e) => update("language", e.target.value as any)}
                    className="rounded-lg border border-white/15 bg-zinc-800 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                  >
                    <option value="tr">🇹🇷 Türkçe</option>
                    <option value="en">🇬🇧 English</option>
                    <option value="de">🇩🇪 Deutsch</option>
                    <option value="es">🇪🇸 Español</option>
                  </select>
                </div>

                {/* 2. Theme Mode */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">2. Görünüm Teması</label>
                    <span className="text-[11px] text-zinc-400">Gözü yormayan karanlık veya aydınlık mod</span>
                  </div>
                  <div className="flex gap-1.5 bg-zinc-800 p-1 rounded-lg border border-white/10">
                    <button
                      onClick={() => update("themeMode", "dark")}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md font-semibold cursor-pointer transition-all ${
                        localSettings.themeMode === "dark" ? "bg-sky-500 text-white" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Moon className="h-3.5 w-3.5" /> Karanlık
                    </button>
                    <button
                      onClick={() => update("themeMode", "light")}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md font-semibold cursor-pointer transition-all ${
                        localSettings.themeMode === "light" ? "bg-sky-500 text-white" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Sun className="h-3.5 w-3.5" /> Aydınlık
                    </button>
                  </div>
                </div>

                {/* 3. Accent Color */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">3. Vurgu Rengi (Accent Color)</label>
                    <span className="text-[11px] text-zinc-400">Ana menü, ip ve detay simgesi renk paleti</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[
                      { name: "Kırmızı", code: "#ef4444" },
                      { name: "Mavi", code: "#38bdf8" },
                      { name: "Yeşil", code: "#2ea043" },
                      { name: "Amber", code: "#f59e0b" },
                      { name: "Mor", code: "#a78bfa" },
                    ].map((c) => (
                      <button
                        key={c.code}
                        onClick={() => update("accentColor", c.code)}
                        style={{ backgroundColor: c.code }}
                        className={`h-6 w-6 rounded-full border-2 transition-transform cursor-pointer ${
                          localSettings.accentColor === c.code ? "scale-125 border-white shadow-lg" : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* 4. Board Background */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">4. Pano Arka Plan Stili</label>
                    <span className="text-[11px] text-zinc-400">Çalışma alanı dokusu ve zemin görünümü</span>
                  </div>
                  <select
                    value={localSettings.boardTheme}
                    onChange={(e) => update("boardTheme", e.target.value as any)}
                    className="rounded-lg border border-white/15 bg-zinc-800 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                  >
                    <option value="cork">📌 Mantar Pano (Corkboard)</option>
                    <option value="grid">📐 Teknik Izgara (Blueprint Grid)</option>
                    <option value="slate">🖤 Koyu Ardeş (Dark Slate)</option>
                  </select>
                </div>

                {/* 5. Default Opening Board */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">5. Varsayılan Başlangıç Panosu</label>
                    <span className="text-[11px] text-zinc-400">Uygulama her açıldığında varsayılan olarak yüklenecek dosya</span>
                  </div>
                  <input
                    type="text"
                    value={localSettings.defaultOpeningBoard}
                    onChange={(e) => update("defaultOpeningBoard", e.target.value)}
                    className="w-28 rounded-lg border border-white/15 bg-zinc-800 px-2.5 py-1 text-xs text-white text-center font-mono outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}

            {/* 2. AUDIO & NOTIFICATIONS */}
            {activeTab === "audio" && (
              <div className="space-y-5">
                {/* 6. Sound Effects Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">6. Ses Efektleri (Audio Feedback)</label>
                    <span className="text-[11px] text-zinc-400">Kart ekleme, bağlama ve dokunsal tık sesleri</span>
                  </div>
                  <button
                    onClick={() => update("soundEnabled", !localSettings.soundEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      localSettings.soundEnabled ? "bg-sky-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.soundEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* 7. Sound Volume */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">7. Ses Seviyesi (%{localSettings.soundVolume})</label>
                    <span className="text-[11px] text-zinc-400">Tüm ses efektlerinin genel ses şiddeti</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={localSettings.soundVolume}
                    onChange={(e) => update("soundVolume", Number(e.target.value))}
                    className="w-36 accent-sky-500 cursor-pointer"
                  />
                </div>

                {/* 8. Typewriter Clicks */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">8. Daktilo Yazım Sesi</label>
                    <span className="text-[11px] text-zinc-400">Not kartlarında metin düzenlerken mekanik daktilo sesi</span>
                  </div>
                  <button
                    onClick={() => update("typewriterClicks", !localSettings.typewriterClicks)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      localSettings.typewriterClicks ? "bg-sky-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.typewriterClicks ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* 9. Yarn Stretch Sound */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">9. Kırmızı İp Çekme Sesi</label>
                    <span className="text-[11px] text-zinc-400">Kartlar arasında adli bağlantı çizgisi çekerken ip gerilme efekti</span>
                  </div>
                  <button
                    onClick={() => update("yarnStretchSounds", !localSettings.yarnStretchSounds)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      localSettings.yarnStretchSounds ? "bg-sky-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.yarnStretchSounds ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* 10. Desktop Notifications */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">10. Masaüstü Sistem Bildirimleri</label>
                    <span className="text-[11px] text-zinc-400">Otomatik yedekleme ve dışa aktarım bittiğinde Windows bildirimi gönder</span>
                  </div>
                  <button
                    onClick={() => update("desktopNotifications", !localSettings.desktopNotifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      localSettings.desktopNotifications ? "bg-sky-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.desktopNotifications ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* 3. CANVAS & GRID */}
            {activeTab === "canvas" && (
              <div className="space-y-5">
                {/* 11. Snap to Grid */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">11. Izgaraya Otomatik Hizalama (Snap to Grid)</label>
                    <span className="text-[11px] text-zinc-400">Sürüklenen kartların koordinatlarını düzenli izgara adımlarına oturt</span>
                  </div>
                  <button
                    onClick={() => update("snapToGrid", !localSettings.snapToGrid)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      localSettings.snapToGrid ? "bg-sky-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.snapToGrid ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* 12. Grid Size */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">12. Izgara Hizalama Adımı (Grid Size)</label>
                    <span className="text-[11px] text-zinc-400">Kartların yapışacağı piksel aralığı</span>
                  </div>
                  <select
                    value={localSettings.gridSize}
                    onChange={(e) => update("gridSize", Number(e.target.value))}
                    className="rounded-lg border border-white/15 bg-zinc-800 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                  >
                    <option value={10}>10 px (Çok Hassas)</option>
                    <option value={20}>20 px (Standart)</option>
                    <option value={30}>30 px (Geniş)</option>
                    <option value={50}>50 px (Blok)</option>
                  </select>
                </div>

                {/* 13. Drag Sensitivity */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">13. Kart Sürükleme Hassasiyeti</label>
                    <span className="text-[11px] text-zinc-400">Fare ile taşırken kayma ve ivme çarpanı</span>
                  </div>
                  <select
                    value={localSettings.dragSensitivity}
                    onChange={(e) => update("dragSensitivity", e.target.value as any)}
                    className="rounded-lg border border-white/15 bg-zinc-800 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                  >
                    <option value="precise">Hassas (1x)</option>
                    <option value="normal">Normal (1.5x)</option>
                    <option value="fast">Hızlı (2x)</option>
                  </select>
                </div>

                {/* 14. Minimap */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">14. Kuşbakışı Mini Harita (Minimap)</label>
                    <span className="text-[11px] text-zinc-400">Sağ alt köşede genel pano haritası ve hızlı gezinme radarı</span>
                  </div>
                  <button
                    onClick={() => update("showMinimap", !localSettings.showMinimap)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      localSettings.showMinimap ? "bg-sky-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.showMinimap ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* 15. Max Zoom */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">15. Maksimum Yakınlaştırma Sınırı (%{localSettings.maxZoomScale})</label>
                    <span className="text-[11px] text-zinc-400">Kanvasta zum yapılabilecek en yüksek yakınlaştırma oranı</span>
                  </div>
                  <select
                    value={localSettings.maxZoomScale}
                    onChange={(e) => update("maxZoomScale", Number(e.target.value))}
                    className="rounded-lg border border-white/15 bg-zinc-800 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                  >
                    <option value={200}>%200 (Yakin)</option>
                    <option value={300}>%300 (Standart)</option>
                    <option value={400}>%400 (Ultra Detay)</option>
                  </select>
                </div>

                {/* 16. Invert Zoom Scroll */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">16. Tersi Yakınlaştırma (Invert Scroll Zoom)</label>
                    <span className="text-[11px] text-zinc-400">Fare tekerleğinin zum yönünü tersine çevir</span>
                  </div>
                  <button
                    onClick={() => update("invertZoomScroll", !localSettings.invertZoomScroll)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      localSettings.invertZoomScroll ? "bg-sky-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.invertZoomScroll ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* 17. Double Click Action */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">17. Boş Alana Çift Tıklama Eylemi</label>
                    <span className="text-[11px] text-zinc-400">Kanvasın boş yerine iki kez basıldığında tetiklenen işlem</span>
                  </div>
                  <select
                    value={localSettings.doubleClickAction}
                    onChange={(e) => update("doubleClickAction", e.target.value as any)}
                    className="rounded-lg border border-white/15 bg-zinc-800 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                  >
                    <option value="addNote">✍️ Hızlı Metin Notu Ekle</option>
                    <option value="openMenu">⚙️ Hızlı Araç Menüsü Aç</option>
                    <option value="none">Eylem Yok</option>
                  </select>
                </div>

                {/* 18. Default Pen Size */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">18. Varsayılan Çizim Kalemi Kalınlığı ({localSettings.defaultPenSize}px)</label>
                    <span className="text-[11px] text-zinc-400">Serbest çizim modunda başlangıç çizgi kalınlığı</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={localSettings.defaultPenSize}
                    onChange={(e) => update("defaultPenSize", Number(e.target.value))}
                    className="w-32 accent-sky-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 4. SECURITY & SAVE */}
            {activeTab === "security" && (
              <div className="space-y-5">
                {/* 19. Auto Save Interval */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">19. Otomatik Kayıt Sıklığı</label>
                    <span className="text-[11px] text-zinc-400">Değişikliklerin yerel diske otomatik yazılma periyodu</span>
                  </div>
                  <select
                    value={localSettings.autoSaveInterval}
                    onChange={(e) => update("autoSaveInterval", Number(e.target.value))}
                    className="rounded-lg border border-white/15 bg-zinc-800 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                  >
                    <option value={0}>⚡ Anlık (Her Değişiklikte)</option>
                    <option value={5}>⏱️ 5 Saniyede Bir</option>
                    <option value={30}>⏱️ 30 Saniyede Bir</option>
                    <option value={60}>⏱️ 1 Dakikada Bir</option>
                  </select>
                </div>

                {/* 20. Max Backups Count */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">20. Saklanacak Max Yerel Kurtarma Yedegi</label>
                    <span className="text-[11px] text-zinc-400">Olası çökme durumlarına karşı tutulacak yedek sürüm sayısı</span>
                  </div>
                  <select
                    value={localSettings.maxBackupsCount}
                    onChange={(e) => update("maxBackupsCount", Number(e.target.value))}
                    className="rounded-lg border border-white/15 bg-zinc-800 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                  >
                    <option value={5}>5 Sürüm</option>
                    <option value={10}>10 Sürüm (Önerilen)</option>
                    <option value={20}>20 Sürüm (Geniş Arşiv)</option>
                  </select>
                </div>

                {/* 21. Watermark Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">21. Adli Tıp Filigranı (Watermark)</label>
                    <span className="text-[11px] text-zinc-400">Pano köşesinde gizlilik/adli vaka damgası göster</span>
                  </div>
                  <button
                    onClick={() => update("showWatermark", !localSettings.showWatermark)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      localSettings.showWatermark ? "bg-sky-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.showWatermark ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* 22. Watermark Text */}
                {localSettings.showWatermark && (
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                    <div>
                      <label className="text-xs font-bold text-white block">22. Filigran Metni</label>
                      <span className="text-[11px] text-zinc-400">Ekran ve yazıcı çıktılarında gözükecek güvenlik yazısı</span>
                    </div>
                    <input
                      type="text"
                      value={localSettings.watermarkText}
                      onChange={(e) => update("watermarkText", e.target.value)}
                      className="w-56 rounded-lg border border-white/15 bg-zinc-800 px-3 py-1 text-xs text-amber-400 font-mono outline-none focus:border-sky-500"
                    />
                  </div>
                )}

                {/* 23. Security PIN */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">23. Güvenlik PIN Kilidi</label>
                    <span className="text-[11px] text-zinc-400">Uygulama açılırken sorulacak 4 haneli güvenlik şifresi (Boş ise şifresiz)</span>
                  </div>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="****"
                    value={localSettings.securityPin}
                    onChange={(e) => update("securityPin", e.target.value)}
                    className="w-24 rounded-lg border border-white/15 bg-zinc-800 px-3 py-1 text-xs text-center text-white font-mono outline-none focus:border-sky-500"
                  />
                </div>

                {/* 24. Confirm Deletions */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">24. Kart Silmelerinde Onay İste</label>
                    <span className="text-[11px] text-zinc-400">Kart, pano veya ilişki grubu silerken doğrulama penceresi göster</span>
                  </div>
                  <button
                    onClick={() => update("confirmDeletions", !localSettings.confirmDeletions)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      localSettings.confirmDeletions ? "bg-sky-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.confirmDeletions ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* 5. EXPORT & FORMATS */}
            {activeTab === "export" && (
              <div className="space-y-5">
                {/* 25. PNG Resolution */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">25. PNG Görsel Dışa Aktarım Kalitesi</label>
                    <span className="text-[11px] text-zinc-400">Çıktı alınacak PNG görselinin piksel çözünürlüğü</span>
                  </div>
                  <select
                    value={localSettings.exportPngQuality}
                    onChange={(e) => update("exportPngQuality", e.target.value as any)}
                    className="rounded-lg border border-white/15 bg-zinc-800 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                  >
                    <option value="1x">1x (Ekran Çözünürlüğü)</option>
                    <option value="2x">2x HD (Yüksek Netlik - Önerilen)</option>
                    <option value="4x">4x Ultra (Baskı Kalitesi)</option>
                  </select>
                </div>

                {/* 26. Transparent PNG */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">26. Şeffaf PNG Arka Planı</label>
                    <span className="text-[11px] text-zinc-400">PNG resim çıktısında mantar/ızgara arka planını kaldırıp şeffaf yap</span>
                  </div>
                  <button
                    onClick={() => update("exportTransparentBg", !localSettings.exportTransparentBg)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      localSettings.exportTransparentBg ? "bg-sky-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.exportTransparentBg ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* 27. PDF Layout */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">27. PDF Rapor Sayfa Yerleşimi</label>
                    <span className="text-[11px] text-zinc-400">PDF rapor çıktısında A4 sayfa yönelimi</span>
                  </div>
                  <select
                    value={localSettings.exportPdfLayout}
                    onChange={(e) => update("exportPdfLayout", e.target.value as any)}
                    className="rounded-lg border border-white/15 bg-zinc-800 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                  >
                    <option value="auto">🔄 Otomatik (İçeriğe Göre)</option>
                    <option value="landscape">🖼️ A4 Yatay (Landscape)</option>
                    <option value="portrait">📄 A4 Dikey (Portrait)</option>
                  </select>
                </div>

                {/* 28. Append Date to Export */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">28. Dosya İsimlerine Zaman Damgası Ekle</label>
                    <span className="text-[11px] text-zinc-400">İndirilen JSON ve görsellerin sonuna otomatik tarih ekle</span>
                  </div>
                  <button
                    onClick={() => update("appendDateToExport", !localSettings.appendDateToExport)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      localSettings.appendDateToExport ? "bg-sky-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.appendDateToExport ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* 6. DESKTOP & GPU */}
            {activeTab === "desktop" && (
              <div className="space-y-5">
                {/* 29. Hardware Acceleration */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">29. Donanım Hızlandırma (GPU Render Boost)</label>
                    <span className="text-[11px] text-zinc-400">60 FPS akıcı kanvas ve GPU hızlandırmalı ip çizim işleme</span>
                  </div>
                  <button
                    onClick={() => update("hardwareAcceleration", !localSettings.hardwareAcceleration)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      localSettings.hardwareAcceleration ? "bg-sky-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.hardwareAcceleration ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* 30. Default File Opener */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">30. Varsayılan Dosya Açıcı Entegrasyonu</label>
                    <span className="text-[11px] text-zinc-400">Dosya kartlarına basıldığında işletim sisteminde yürütülecek araç</span>
                  </div>
                  <select
                    value={localSettings.defaultFileOpener}
                    onChange={(e) => update("defaultFileOpener", e.target.value as any)}
                    className="rounded-lg border border-white/15 bg-zinc-800 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                  >
                    <option value="tauri">⚡ Tauri v2 Native Plugin Opener</option>
                    <option value="system">🖥️ Sistem Varsayılan Uygulaması</option>
                    <option value="preview">🔍 Dahili Önizleme Penceresi</option>
                  </select>
                </div>

                {/* 31. Dark Title Bar */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">31. Siyah Windows Başlık Çerçevesi (Dark Window Frame)</label>
                    <span className="text-[11px] text-zinc-400">Windows pencere üst çubuğunu koyu siyah renkte tut</span>
                  </div>
                  <button
                    onClick={() => update("darkTitleBar", !localSettings.darkTitleBar)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      localSettings.darkTitleBar ? "bg-sky-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.darkTitleBar ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* 32. Minimize to Tray */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/50">
                  <div>
                    <label className="text-xs font-bold text-white block">32. Kapatılınca Tepsiye Küçült (Tray Minimal)</label>
                    <span className="text-[11px] text-zinc-400">X butonuna basıldığında uygulamayı kapatmak yerine sistem tepsisine at</span>
                  </div>
                  <button
                    onClick={() => update("minimizeToTrayOnClose", !localSettings.minimizeToTrayOnClose)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      localSettings.minimizeToTrayOnClose ? "bg-sky-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.minimizeToTrayOnClose ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Save / Close button */}
          <div className="px-6 py-3.5 border-t border-white/10 bg-zinc-900/80 flex items-center justify-between shrink-0">
            <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
              <span className="text-sky-400 font-bold">Ayarlar Durumu:</span> Otomatik Uygulandı
            </div>
            <button
              onClick={onClose}
              type="button"
              className="rounded-xl border border-sky-500/40 bg-sky-500/20 px-6 py-2 text-xs font-bold text-sky-300 hover:bg-sky-500/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" />
              Tamam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
