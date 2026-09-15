/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Node } from "../types";
import {
  Calendar as CalendarIcon,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Bell,
  Target,
  ArrowRight,
  Save,
  Play,
  Pause,
  RotateCcw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Tag,
  Activity,
  CheckSquare,
  BookOpen,
  Timer
} from "lucide-react";

interface MiniCalendarProps {
  nodes: Node[];
  onUpdateNode: (fields: Partial<Node> & { id: string }) => void;
  onFocusNode: (id: string) => void;
  darkMode: boolean;
  onClose: () => void;
}

interface CalendarTask {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
  completed: boolean;
  hour?: string; // e.g., "14:00"
}

interface PersonalGoal {
  id: string;
  text: string;
  completed: boolean;
}

interface CalendarReminder {
  id: string;
  date: string;
  time: string; // HH:MM
  text: string;
  recurring: "none" | "daily" | "weekly";
  active: boolean;
}

export default function MiniCalendar({
  nodes,
  onUpdateNode,
  onFocusNode,
  darkMode,
  onClose,
}: MiniCalendarProps) {
  // Navigation State
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${today.getFullYear()}-${mm}-${dd}`;
  });

  const [activeTab, setActiveTab] = useState<"calendar" | "timeline" | "pomodoro" | "goals" | "board">("calendar");

  // State populated from LocalStorage for durability (Module 9-17)
  const [tasks, setTasks] = useState<CalendarTask[]>(() => {
    const raw = localStorage.getItem("cb_cal_tasks");
    return raw ? JSON.parse(raw) : [
      { id: "t1", date: new Date().toISOString().split("T")[0], text: "İlk Proje Sunumunu Hazırla", completed: false, hour: "10:00" },
      { id: "t2", date: new Date().toISOString().split("T")[0], text: "Zaman Çizelgesi Verilerini Analiz Et", completed: true, hour: "14:30" }
    ];
  });

  const [dailyNotes, setDailyNotes] = useState<Record<string, string>>(() => {
    const raw = localStorage.getItem("cb_cal_notes");
    return raw ? JSON.parse(raw) : {};
  });

  const [goals, setGoals] = useState<{ daily: PersonalGoal[]; weekly: PersonalGoal[]; monthly: PersonalGoal[] }>(() => {
    const raw = localStorage.getItem("cb_cal_goals");
    return raw ? JSON.parse(raw) : {
      daily: [
        { id: "g1", text: "2 Saat Odaklı Çalışma", completed: false },
        { id: "g2", text: "30 Dakika Kitap Oku", completed: true }
      ],
      weekly: [
        { id: "gw1", text: "CaseBoard Proje Aşamasını Bitir", completed: false },
        { id: "gw2", text: "Spor Yap (3 Gün)", completed: false }
      ],
      monthly: [
        { id: "gm1", text: "15 Yeni Dosya Analizini Tamamla", completed: false }
      ]
    };
  });

  const [reminders, setReminders] = useState<CalendarReminder[]>(() => {
    const raw = localStorage.getItem("cb_cal_reminders");
    return raw ? JSON.parse(raw) : [
      { id: "r1", date: new Date().toISOString().split("T")[0], time: "18:00", text: "Günlük Raporu Gönder", recurring: "daily", active: true }
    ];
  });

  // Pomodoro & Stopwatch Trackers State (Module 14)
  const [pomoMode, setPomoMode] = useState<"focus" | "break">("focus");
  const [pomoActive, setPomoActive] = useState(false);
  const [pomoSeconds, setPomoSeconds] = useState(25 * 60);
  const [workSessionsCount, setWorkSessionsCount] = useState(0);

  const [stopwatchActive, setStopwatchActive] = useState(false);
  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [loggedHoursToday, setLoggedHoursToday] = useState<number>(() => {
    return Number(localStorage.getItem("cb_hours_today") || "0.8");
  });

  // Sound notification option toggle
  const [soundChime, setSoundChime] = useState(true);

  // Quick inputs
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskHour, setNewTaskHour] = useState("12:00");
  const [newGoalText, setNewGoalText] = useState("");
  const [newGoalType, setNewGoalType] = useState<"daily" | "weekly" | "monthly">("daily");

  const [newReminderText, setNewReminderText] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("09:00");
  const [newReminderRecur, setNewReminderRecur] = useState<"none" | "daily" | "weekly">("none");

  // Notifications alerts block in UI
  const [triggeredNotifications, setTriggeredNotifications] = useState<string[]>([]);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem("cb_cal_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("cb_cal_notes", JSON.stringify(dailyNotes));
  }, [dailyNotes]);

  useEffect(() => {
    localStorage.setItem("cb_cal_goals", JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem("cb_cal_reminders", JSON.stringify(reminders));
  }, [reminders]);

  // Pomodoro effect
  useEffect(() => {
    let interval: any = null;
    if (pomoActive) {
      interval = setInterval(() => {
        setPomoSeconds((prev) => {
          if (prev <= 1) {
            // Alarm triggered!
            setPomoActive(false);
            if (pomoMode === "focus") {
              setPomoMode("break");
              setWorkSessionsCount((c) => c + 1);
              setLoggedHoursToday((prevHours) => {
                const total = prevHours + 25 / 60;
                localStorage.setItem("cb_hours_today", String(total));
                return total;
              });
              setTriggeredNotifications((prev) => [...prev, "Odaklanma seansı bitti! 5 dakika mola saati."]);
              return 5 * 60;
            } else {
              setPomoMode("focus");
              setTriggeredNotifications((prev) => [...prev, "Mola bitti! Hadi tekrar odaklanalım."]);
              return 25 * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [pomoActive, pomoMode, soundChime]);

  // Stopwatch effect
  useEffect(() => {
    let interval: any = null;
    if (stopwatchActive) {
      interval = setInterval(() => {
        setStopwatchMs((prev) => prev + 100);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [stopwatchActive]);

  // Reminder Checker effect
  useEffect(() => {
    const checker = setInterval(() => {
      const now = new Date();
      const currentH = String(now.getHours()).padStart(2, "0");
      const currentM = String(now.getMinutes()).padStart(2, "0");
      const timeStr = `${currentH}:${currentM}`;
      const dayStr = now.toISOString().split("T")[0];

      reminders.forEach((r) => {
        if (r.active && r.time === timeStr) {
          // Verify trigger criteria
          let shouldTrigger = false;
          if (r.recurring === "none" && r.date === dayStr) {
            shouldTrigger = true;
          } else if (r.recurring === "daily") {
            shouldTrigger = true;
          } else if (r.recurring === "weekly") {
            const rDate = new Date(r.date);
            if (rDate.getDay() === now.getDay()) {
              shouldTrigger = true;
            }
          }

          if (shouldTrigger) {
            // Deactivate single alarms to avoid spamming
            if (r.recurring === "none") {
              setReminders((prev) => prev.map((item) => item.id === r.id ? { ...item, active: false } : item));
            }
            // Trigger visual overlay notification
            setTriggeredNotifications((prev) => {
              if (prev.includes(r.text)) return prev;
              return [...prev, `🔔 Alarm: ${r.text} (${r.time})`];
            });
          }
        }
      });
    }, 30000); // Check half-minute
    return () => clearInterval(checker);
  }, [reminders, soundChime]);

  // Calendar Calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ];

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const startDayOfWeek = useMemo(() => {
    const idx = new Date(year, month, 1).getDay();
    return idx === 0 ? 6 : idx - 1; // Mon relative
  }, [year, month]);
  const prevMonthDays = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);

  const calendarCells = useMemo(() => {
    const cells: { day: number; dateString: string; isCurrentMonth: boolean }[] = [];

    // Prev month days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      cells.push({
        day: d,
        dateString: `${prevY}-${String(prevM + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        dateString: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        isCurrentMonth: true,
      });
    }

    // Next month days
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      cells.push({
        day: d,
        dateString: `${nextY}-${String(nextM + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [year, month, daysInMonth, startDayOfWeek, prevMonthDays]);

  // Group scheduled board nodes on this day
  const boardNodesOnSelectedDate = useMemo(() => {
    return nodes.filter((n) => n.eventDate === selectedDateStr);
  }, [nodes, selectedDateStr]);

  const allScheduledNodes = useMemo(() => {
    return nodes.filter((n) => n.eventDate);
  }, [nodes]);

  const unscheduledNodes = useMemo(() => {
    return nodes.filter((n) => !n.eventDate);
  }, [nodes]);

  // Tasks on selected date
  const tasksOnSelectedDate = useMemo(() => {
    return tasks.filter((t) => t.date === selectedDateStr).sort((a, b) => (a.hour || "00:00").localeCompare(b.hour || "00:00"));
  }, [tasks, selectedDateStr]);

  // Daily objectives calculations
  const goalProgress = useMemo(() => {
    const totalD = goals.daily.length;
    const completedD = goals.daily.filter((g) => g.completed).length;
    const pctD = totalD > 0 ? Math.round((completedD / totalD) * 100) : 0;

    const totalW = goals.weekly.length;
    const completedW = goals.weekly.filter((g) => g.completed).length;
    const pctW = totalW > 0 ? Math.round((completedW / totalW) * 100) : 0;

    const totalM = goals.monthly.length;
    const completedM = goals.monthly.filter((g) => g.completed).length;
    const pctM = totalM > 0 ? Math.round((completedM / totalM) * 100) : 0;

    return { pctD, pctW, pctM };
  }, [goals]);

  // Task Handlers
  const handleAddTask = () => {
    const txt = newTaskText.trim();
    if (!txt) return;
    const item: CalendarTask = {
      id: `task-${Date.now()}`,
      date: selectedDateStr,
      text: txt,
      completed: false,
      hour: newTaskHour
    };
    setTasks((prev) => [...prev, item]);
    setNewTaskText("");
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleDragStartTask = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("calendarTaskId", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDropOnDay = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    // Case 1: Dragging a task of the calendar to another day
    const taskId = e.dataTransfer.getData("calendarTaskId");
    if (taskId) {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, date: targetDateStr } : t));
      return;
    }

    // Case 2: Dragging a node of the board to a day in the calendar
    const nodeId = e.dataTransfer.getData("linkedNodeId") || e.dataTransfer.getData("nodeId");
    if (nodeId) {
      onUpdateNode({ id: nodeId, eventDate: targetDateStr });
    }
  };

  // Goal handlers
  const handleAddGoal = () => {
    const val = newGoalText.trim();
    if (!val) return;
    const tItem: PersonalGoal = { id: `g-${Date.now()}`, text: val, completed: false };
    setGoals((prev) => ({
      ...prev,
      [newGoalType]: [...prev[newGoalType], tItem]
    }));
    setNewGoalText("");
  };

  const handleToggleGoal = (type: "daily" | "weekly" | "monthly", id: string) => {
    setGoals((prev) => ({
      ...prev,
      [type]: prev[type].map((g) => g.id === id ? { ...g, completed: !g.completed } : g)
    }));
  };

  const handleDeleteGoal = (type: "daily" | "weekly" | "monthly", id: string) => {
    setGoals((prev) => ({
      ...prev,
      [type]: prev[type].filter((g) => g.id !== id)
    }));
  };

  // Reminder handlers
  const handleAddReminder = () => {
    const val = newReminderText.trim();
    if (!val) return;
    const item: CalendarReminder = {
      id: `rem-${Date.now()}`,
      date: selectedDateStr,
      time: newReminderTime,
      text: val,
      recurring: newReminderRecur,
      active: true
    };
    setReminders((prev) => [...prev, item]);
    setNewReminderText("");
  };

  const handleDeleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  // Send a task/event from calendar directly to the Board as a physical card! (Module 16)
  const handleSendToBoard = (title: string, date: string, type: "note" | "todo" | "file" | "clock" = "note", extraContent = "") => {
    const ev = new CustomEvent("add-node-from-sidebar", {
      detail: {
        type,
        title: `${title} (${date})`,
        eventDate: date,
        extra: {
          text: extraContent || `Takvimden Aktarıldı:\nTarih: ${date}\nGörev Detayları: ${title}`,
          todoItems: type === "todo" ? [{ id: "it1", text: title, done: false }] : undefined
        }
      }
    });
    window.dispatchEvent(ev);
    setTriggeredNotifications((prev) => [...prev, `"${title}" kartı Başarıyla Panoya Aktarıldı!`]);
  };

  // Format Helper for Stopwatch
  const formatStopwatch = (timeMs: number) => {
    const sStr = String(Math.floor((timeMs / 1000) % 60)).padStart(2, "0");
    const mStr = String(Math.floor((timeMs / 60000) % 60)).padStart(2, "0");
    const hStr = String(Math.floor(timeMs / 3600000)).padStart(2, "0");
    return `${hStr}:${mStr}:${sStr}`;
  };

  const getDayIcon = (type: string) => {
    switch (type) {
      case "note": return "✍️";
      case "code": return "💻";
      case "todo": return "✅";
      case "image": return "🖼️";
      case "file": return "📎";
      case "link": return "🔗";
      default: return "📄";
    }
  };

  return (
    <div
      style={{
        borderColor: darkMode ? "#30363d" : "rgba(0,0,0,0.1)",
      }}
      className={`fixed right-0 top-0 bottom-0 z-40 flex w-[430px] flex-col border-l font-sans select-none shadow-2xl transition-all duration-300 ${
        darkMode ? "bg-zinc-950 text-zinc-100" : "bg-neutral-50 text-zinc-800"
      }`}
    >
      {/* Calendar Header with premium glowing action */}
      <div
        className={`flex items-center justify-between border-b p-4 ${
          darkMode ? "border-zinc-800 bg-zinc-900/80" : "border-black/5 bg-zinc-100"
        }`}
      >
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-5 w-5 text-indigo-400 select-none" />
          <div className="flex flex-col">
            <span className={`text-xs font-bold uppercase tracking-widest ${darkMode ? "text-white" : "text-zinc-950"}`}>
              Gelişmiş Verimlilik & Zaman İstasyonu
            </span>
            <span className="text-[9px] font-mono text-zinc-500">M9-M17 Entegre Çözüm</span>
          </div>
        </div>
        <button
          onClick={onClose}
          type="button"
          className={`flex h-7 w-7 items-center justify-center rounded border text-xs cursor-pointer transition-colors ${
            darkMode ? "border-zinc-800 hover:bg-white/5 text-zinc-400" : "border-black/15 hover:bg-black/5 text-zinc-600"
          }`}
        >
          ✕
        </button>
      </div>

      {/* Floating alarm alerts banner stacked inside panel */}
      {triggeredNotifications.length > 0 && (
        <div className="bg-indigo-950/95 border-b border-indigo-500/30 p-2.5 px-4 flex flex-col gap-1.5 animate-pulse shrink-0">
          {triggeredNotifications.map((notif, nidx) => (
            <div key={nidx} className="flex items-center justify-between gap-2 text-[10px] font-mono text-amber-300">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3 inline text-amber-400" />
                {notif}
              </span>
              <button
                onClick={() => setTriggeredNotifications((prev) => prev.filter((_, i) => i !== nidx))}
                className="text-white hover:text-red-400 font-bold px-1.5 cursor-pointer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Primary Tab Bar Menu navigation */}
      <div className={`flex border-b text-[10px] font-mono leading-none font-bold uppercase shrink-0 ${
        darkMode ? "border-zinc-800 bg-zinc-950" : "border-black/5 bg-neutral-200/50"
      }`}>
        {[
          { id: "calendar", label: "Takvim & Görev", icon: "📅" },
          { id: "timeline", label: "Çizelge Günü", icon: "🕒" },
          { id: "pomodoro", label: "Pomodoro", icon: "⏱️" },
          { id: "goals", label: "Hedef & Alarm", icon: "🎯" },
          { id: "board", label: "Pano Link", icon: "🔗" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 text-center border-b-2 font-mono tracking-tight transition-all cursor-pointer ${
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-400 bg-white/[0.02]"
                : "border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.01]"
            }`}
          >
            <div className="mb-1 text-xs">{tab.icon}</div>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Core Tabs Content Wrapper scrolling */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        
        {/* TAB 1: CALENDAR & TASKS */}
        {activeTab === "calendar" && (
          <div className="flex flex-col gap-4 select-none animate-fadeIn">
            {/* Month Control Header Line */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                className="p-1 px-2.5 rounded border border-zinc-800 hover:bg-white/5 shrink-0 text-xs text-zinc-400 cursor-pointer"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <div className="text-center font-bold tracking-widest text-[#0078d4] font-mono text-xs uppercase">
                {monthNames[month]} {year}
              </div>
              <button
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                className="p-1 px-2.5 rounded border border-zinc-800 hover:bg-white/5 shrink-0 text-xs text-zinc-400 cursor-pointer"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {/* Grid 7 Columns labels */}
            <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-zinc-500 tracking-wider">
              {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid cells rendering */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell, idx) => {
                const isSelected = selectedDateStr === cell.dateString;
                const dateTasks = tasks.filter((t) => t.date === cell.dateString);
                const dateNodes = nodes.filter((n) => n.eventDate === cell.dateString);
                const hasEntities = dateTasks.length > 0 || dateNodes.length > 0;
                
                return (
                  <div
                    key={`${cell.dateString}-${idx}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnDay(e, cell.dateString)}
                    onClick={() => setSelectedDateStr(cell.dateString)}
                    className={`relative flex flex-col rounded p-1 h-12 border cursor-pointer select-none transition-all group/cell ${
                      cell.isCurrentMonth
                        ? darkMode
                          ? isSelected
                            ? "bg-zinc-800/80 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                            : "bg-zinc-900/50 border-zinc-900 hover:border-zinc-700 text-zinc-300"
                          : isSelected
                          ? "bg-indigo-50/80 border-indigo-500 text-indigo-900"
                          : "bg-white border-zinc-200/80 hover:border-zinc-400 text-zinc-800"
                        : darkMode
                        ? "bg-zinc-950/20 border-transparent text-zinc-650 opacity-40 hover:border-zinc-800"
                        : "bg-zinc-100/50 border-transparent text-zinc-400 opacity-40 hover:border-zinc-200"
                    } ${hasEntities && !isSelected ? "ring-1 ring-amber-500/30" : ""}`}
                  >
                    <span className="text-[10px] font-mono font-bold leading-none">{cell.day}</span>
                    
                    {/* Micro items rendering under cell */}
                    <div className="mt-1 flex flex-wrap gap-0.5 overflow-hidden max-h-4">
                      {dateTasks.map((t) => (
                        <span
                          key={t.id}
                          className={`w-1.5 h-1.5 rounded-full block ${t.completed ? "bg-indigo-500" : "bg-red-500"}`}
                          title={t.text}
                        />
                      ))}
                      {dateNodes.map((n) => (
                        <span
                          key={n.id}
                          className="w-1.5 h-1.5 rounded-full bg-amber-500 block"
                          title={n.title || n.type}
                        />
                      ))}
                    </div>

                    {/* Compact Day Floating Hover detail tooltip */}
                    {hasEntities && (
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-[115%] mb-1 pointer-events-none opacity-0 group-hover/cell:opacity-100 transition-opacity min-w-[150px] bg-zinc-950 border border-zinc-800 p-2 rounded shadow-2xl z-[999] font-mono text-[9px] text-zinc-200">
                        <div className="font-bold border-b border-white/10 pb-1 mb-1 text-center font-sans">
                          {cell.day} {monthNames[month]} Verileri
                        </div>
                        {dateTasks.map(t => (
                          <div key={t.id} className="truncate select-none py-0.5">
                            {t.completed ? "✅" : "❌"} {t.text}
                          </div>
                        ))}
                        {dateNodes.map(n => (
                          <div key={n.id} className="truncate select-none py-0.5">
                            {getDayIcon(n.type)} {n.title || n.type}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected day task summary panel & quick creation */}
            <div className={`rounded-xl border p-3.5 flex flex-col gap-3 ${
              darkMode ? "bg-zinc-900/60 border-zinc-900" : "bg-white border-zinc-200 shadow-sm"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-mono">
                    {selectedDateStr} Planlaması
                  </span>
                  <span className="text-[9px] text-zinc-500">Görevleri Sürükleyip Başka Güne Kaydırın</span>
                </div>
                <span className="rounded bg-indigo-500/10 text-indigo-400 font-mono text-[9px] font-bold px-2 py-0.5">
                  {tasksOnSelectedDate.length} Görev
                </span>
              </div>

              {/* Tasks List */}
              <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                {tasksOnSelectedDate.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => handleDragStartTask(e, t.id)}
                    className={`flex items-center justify-between p-2 rounded border text-xs cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all ${
                      darkMode
                        ? "bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900"
                        : "bg-neutral-50 border-zinc-200/80 hover:border-zinc-300 hover:bg-neutral-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <button
                        onClick={() => handleToggleTask(t.id)}
                        className={`text-xs p-0.5 rounded cursor-pointer transition-colors hover:bg-black/10`}
                      >
                        {t.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-zinc-500 shrink-0" />
                        )}
                      </button>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className={`font-semibold truncate ${t.completed ? "line-through text-zinc-500" : ""}`}>
                          {t.text}
                        </span>
                        {t.hour && (
                          <span className="text-[8.5px] font-mono text-amber-500 flex items-center gap-1 mt-0.5">
                            <Clock className="h-2 w-2 text-amber-500" />
                            {t.hour}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0 ml-1.5" onMouseDown={(e) => e.stopPropagation()}>
                      {/* Send to board action trigger (Module 16) */}
                      <button
                        onClick={() => handleSendToBoard(t.text, t.date, "todo")}
                        type="button"
                        title="Bu Görevi Panoya Gönder (Todo Kartı)"
                        className="p-1 hover:bg-indigo-500/15 rounded text-indigo-400 cursor-pointer"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        type="button"
                        className="p-1 hover:bg-red-500/10 rounded text-red-400 font-bold cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {tasksOnSelectedDate.length === 0 && (
                  <div className="text-center py-4 flex flex-col items-center justify-center text-zinc-500 text-xs italic">
                    <span>Bu gün için planlanmış görev bulunmuyor.</span>
                  </div>
                )}
              </div>

              {/* Add New Task control row */}
              <div className="flex gap-1.5 mt-1 border-t border-zinc-800/40 pt-2.5">
                <input
                  value={newTaskHour}
                  type="time"
                  onChange={(e) => setNewTaskHour(e.target.value)}
                  className="w-[75px] shrink-0 font-mono text-xs rounded border border-zinc-800 bg-black/40 px-2.5 py-1.5 outline-none placeholder-zinc-650"
                />
                <input
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Yeni Görev..."
                  onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                  className="flex-1 min-w-0 font-sans text-xs rounded border border-zinc-800 bg-black/40 px-3 py-1.5 outline-none placeholder-zinc-500 focus:border-indigo-500"
                />
                <button
                  onClick={handleAddTask}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 rounded text-xs shrink-0 cursor-pointer transition-colors font-semibold"
                >
                  Ekle
                </button>
              </div>
            </div>

            {/* Daily note scratchpad (Module 12) */}
            <div className={`rounded-xl border p-3.5 flex flex-col gap-2 ${
              darkMode ? "bg-zinc-900/60 border-zinc-900" : "bg-white border-zinc-200 shadow-sm"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa] font-mono">
                    📝 Günlük Çalışma & Not Defteri
                  </span>
                </div>
                <span className="font-mono text-[9px] text-zinc-500">{selectedDateStr} gününe özel</span>
              </div>
              <textarea
                value={dailyNotes[selectedDateStr] || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setDailyNotes((prev) => ({ ...prev, [selectedDateStr]: val }));
                }}
                placeholder="Bu güne dair özel notlar, çalışma raporu veya hızlı karalamaları buraya yazabilirsiniz..."
                className="w-full h-18 text-xs font-sans rounded border border-zinc-800 bg-black/35 p-2 px-2.5 outline-none placeholder-zinc-650 resize-y leading-relaxed focus:border-indigo-500"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => handleSendToBoard("Günlük Not", selectedDateStr, "note", dailyNotes[selectedDateStr] || "Boş Not")}
                  className="text-[9px] font-mono border border-indigo-500/25 bg-indigo-500/5 px-2.5 py-1 text-indigo-400 rounded hover:bg-indigo-500/12 transition-colors cursor-pointer"
                >
                  Panoya Not Kartı Yap
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DAILY TIMELINE & HOURLY SCHEDULE */}
        {activeTab === "timeline" && (
          <div className="flex flex-col gap-3 font-mono animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-zinc-400 font-mono tracking-wider">
                  SAATLİK ZAMAN ÇİZELGESİ
                </span>
                <span className="text-[9px] text-[#0078d4] font-semibold tracking-wide">
                  Seçilen Gün: {selectedDateStr}
                </span>
              </div>
              <span className="text-[9px] text-zinc-600 italic">Planınızı Saate Göre Ayarlayın</span>
            </div>

            {/* List of times of day mapped inside hourly grid */}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[380px] bg-black/15 p-2 rounded-xl border border-zinc-900 pr-1 select-none">
              {["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "22:00"].map((hourSlot) => {
                const hourTask = tasksOnSelectedDate.find((t) => {
                  const tHour = t.hour || "12:00";
                  return tHour.split(":")[0] === hourSlot.split(":")[0];
                });
                
                return (
                  <div
                    key={hourSlot}
                    className={`flex items-start gap-3 p-1.5 rounded border transition-all ${
                      hourTask
                        ? "bg-indigo-950/30 border-indigo-500/20"
                        : "bg-transparent border-zinc-900/50 hover:border-zinc-800/80"
                    }`}
                  >
                    <div className="w-[45px] font-mono text-[10px] text-zinc-500 font-bold leading-none py-1 border-r border-zinc-900/50 text-right pr-2">
                      {hourSlot}
                    </div>
                    <div className="flex-1 min-w-0">
                      {hourTask ? (
                        <div className="flex items-center justify-between gap-1.5">
                          <span className={`text-[11px] font-sans truncate font-semibold leading-relaxed ${
                            hourTask.completed ? "line-through text-zinc-500" : "text-white"
                          }`}>
                            {hourTask.text}
                          </span>
                          <span className={`text-[8px] px-1 rounded ${
                            hourTask.completed ? "bg-zinc-800 text-zinc-500" : "bg-indigo-500/20 text-indigo-400 font-bold"
                          }`}>
                            {hourTask.completed ? "Bitti" : "Planlı"}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            const val = prompt(`${hourSlot} slotu için yeni bir görev yazın:`);
                            if (val && val.trim()) {
                              setTasks((prev) => [
                                ...prev,
                                {
                                  id: `task-${Date.now()}`,
                                  date: selectedDateStr,
                                  text: val.trim(),
                                  completed: false,
                                  hour: hourSlot
                                }
                              ]);
                            }
                          }}
                          className="w-full text-left text-zinc-650 text-[10px] py-1 hover:text-indigo-400 rounded transition-colors italic cursor-pointer font-sans"
                        >
                          + Buraya Görev Planlayın
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick help indicator box info */}
            <div className="p-3 bg-indigo-950/20 border border-indigo-500/15 rounded-lg text-[10px] leading-relaxed text-indigo-300">
              💡 Saatlik zaman planlaması, günlük disiplininizi korumanıza yardımcı olur. Buraya girilen veriler otomatik olarak "Takvim & Görevler" sekmesiyle senkronize edilir.
            </div>
          </div>
        )}

        {/* TAB 3: WORK HOURS, STOPWATCH & POMODORO TIMER */}
        {activeTab === "pomodoro" && (
          <div className="flex flex-col gap-4 text-center font-mono animate-fadeIn">
            {/* Split layout block: Pomodoro vs Stopwatch */}
            <div className="grid grid-cols-2 gap-3.5 mt-1 select-none">
              
              {/* Pomodoro Timer widget Card Frame */}
              <div className={`p-4 rounded-xl border flex flex-col items-center gap-1.5 ${
                pomoMode === "focus"
                  ? "bg-red-950/15 border-red-500/20 text-red-200"
                  : "bg-teal-950/15 border-teal-500/20 text-teal-200"
              }`}>
                <span className="text-[10px] font-bold block bg-red-500/10 px-2 py-0.5 rounded leading-none">
                  {pomoMode === "focus" ? "🎯 ODAKLANMA" : "🌸 MOLA SAATİ"}
                </span>
                
                {/* Visual Timer Display */}
                <div className="font-mono text-2xl font-black tracking-widest my-2 select-none">
                  {String(Math.floor(pomoSeconds / 60)).padStart(2, "0")}:{String(pomoSeconds % 60).padStart(2, "0")}
                </div>

                {/* Pomodoro Action Buttons bar */}
                <div className="flex gap-1.5 shrink-0 justify-center">
                  <button
                    onClick={() => setPomoActive(!pomoActive)}
                    className="p-1 px-3.5 bg-zinc-900 border border-zinc-800 text-xs rounded hover:bg-zinc-800 flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    {pomoActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-emerald-400" />}
                    {pomoActive ? "Durdur" : "Başlat"}
                  </button>
                  <button
                    onClick={() => {
                      setPomoActive(false);
                      setPomoSeconds(pomoMode === "focus" ? 25 * 60 : 5 * 60);
                    }}
                    className="p-1 px-1 text-xs bg-zinc-900 border border-zinc-800 rounded hover:bg-zinc-800 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
                
                <span className="text-[8.5px] text-zinc-500 mt-1">Tamamlanan: {workSessionsCount} Seans</span>
              </div>

              {/* Stopwatch stopwatch Widget frame */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col items-center gap-1.5 text-zinc-100">
                <span className="text-[10px] font-bold block bg-zinc-800 px-2 py-0.5 rounded leading-none text-zinc-400 uppercase">
                  ⏱️ KRONOMETRE
                </span>

                <div className="font-mono text-lg font-bold my-2 min-h-[28px] select-none text-teal-400 tracking-wider">
                  {formatStopwatch(stopwatchMs)}
                </div>

                <div className="flex gap-1.5 shrink-0 justify-center">
                  <button
                    onClick={() => setStopwatchActive(!stopwatchActive)}
                    className="p-1 px-3 rounded bg-zinc-950 border border-zinc-800 text-xs hover:bg-zinc-800 flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    {stopwatchActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 text-teal-400" />}
                    {stopwatchActive ? "Duraklat" : "Başlat"}
                  </button>
                  <button
                    onClick={() => {
                      setStopwatchActive(false);
                      setStopwatchMs(0);
                    }}
                    className="p-1 px-1 bg-zinc-950 border border-zinc-800 rounded hover:bg-zinc-800 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>

                <span className="text-[8.5px] text-zinc-500 mt-1">Özgür Zaman Ölçümü</span>
              </div>
            </div>

            {/* Work Time Summary Dashboard reports block */}
            <div className={`p-4 rounded-xl border text-left flex flex-col gap-3 ${
              darkMode ? "bg-zinc-900/40 border-zinc-900" : "bg-white border-zinc-200"
            }`}>
              <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase font-mono">
                  <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
                  Günlük Odaklanma Verimliliği
                </span>
                <span className="text-[9px] font-mono text-zinc-500">{new Date().toLocaleDateString("tr-TR")}</span>
              </div>

              {/* Progress visual bar with live calculator */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-zinc-500">Çalışılan Toplam Süre Hedefi (4 Saat)</span>
                  <span className="text-emerald-400 font-bold">{loggedHoursToday.toFixed(1)} / 4.0 Saat</span>
                </div>
                <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-900">
                  <div
                    style={{ width: `${Math.min(100, (loggedHoursToday / 4) * 100)}%` }}
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="p-2 border border-zinc-900 bg-black/15 rounded flex flex-col gap-1 text-center">
                  <span className="text-[9px] text-zinc-500 font-bold">POMODORO SEANSI</span>
                  <span className="text-lg font-bold text-red-400">{workSessionsCount} x 25dk</span>
                </div>
                <div className="p-2 border border-zinc-900 bg-black/15 rounded flex flex-col gap-1 text-center">
                  <span className="text-[9px] text-zinc-500 font-bold">KAZANDIĞIN SAAT</span>
                  <span className="text-lg font-bold text-teal-400">+{loggedHoursToday.toFixed(1)} saat</span>
                </div>
              </div>

              {/* sound Alarm Options */}
              <div className="flex justify-between items-center text-[10px] mt-1 border-t border-zinc-900/40 pt-3 text-zinc-400">
                <span>Mekanik Alarm Sesi Aktif</span>
                <button
                  onClick={() => setSoundChime(!soundChime)}
                  className={`p-1 px-3 rounded border text-[9px] font-bold cursor-pointer transition-colors ${
                    soundChime
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-500"
                  }`}
                >
                  {soundChime ? "SES AÇIK (🔊)" : "SES KAPALI (🔇)"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REMINDER ALARMS & TARGETS */}
        {activeTab === "goals" && (
          <div className="flex flex-col gap-4 animate-fadeIn select-none font-mono">
            {/* SECTION 1: Hedef Giriş ve Yüzde Değerleri */}
            <div className={`p-3.5 rounded-xl border flex flex-col gap-3 ${
              darkMode ? "bg-zinc-900/60 border-zinc-900" : "bg-white border-zinc-200"
            }`}>
              <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 font-mono uppercase">
                  <Target className="h-4 w-4 text-emerald-400 inline" />
                  Hedef Sistemi & İlerleme Oranları
                </span>
                <span className="font-mono text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">
                  Disiplin İzleyici
                </span>
              </div>

              {/* Progress percentages bar map */}
              {[
                { label: "Günlük Hedefler", pct: goalProgress.pctD, color: "bg-emerald-500" },
                { label: "Haftalık Hedefler", pct: goalProgress.pctW, color: "bg-blue-500" },
                { label: "Aylık Hedefler", pct: goalProgress.pctM, color: "bg-purple-500" }
              ].map((prog, pidx) => (
                <div key={pidx} className="flex flex-col gap-1 font-mono">
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-zinc-500">{prog.label}</span>
                    <span className="text-white font-bold">{prog.pct}% Tamamlandı</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-900">
                    <div
                      style={{ width: `${prog.pct}%` }}
                      className={`${prog.color} h-full rounded-full transition-all duration-300`}
                    />
                  </div>
                </div>
              ))}

              {/* Objectives List Collapsible Accordions */}
              <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1 text-xs font-mono mt-1 border-t border-zinc-900/40 pt-2">
                {/* Mapped sections */}
                {(["daily", "weekly", "monthly"] as const).map((type) => (
                  <div key={type} className="flex flex-col gap-1">
                    <div className="text-[8.5px] font-bold text-[#0078d4] uppercase tracking-wider mt-1 opacity-70">
                      • {type === "daily" ? "GÜNLÜK" : type === "weekly" ? "HAFTALIK" : "AYLIK"} LİSTE:
                    </div>
                    {goals[type].map((g) => (
                      <div key={g.id} className="flex items-center justify-between p-1 px-2 border border-zinc-900 rounded bg-black/10">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <button
                            onClick={() => handleToggleGoal(type, g.id)}
                            className="p-0.5 rounded hover:bg-white/5 cursor-pointer text-zinc-400"
                          >
                            {g.completed ? "☑️" : "⬜"}
                          </button>
                          <span className={`truncate text-[10.5px] ${g.completed ? "line-through text-zinc-650 italic" : "text-zinc-300"}`}>
                            {g.text}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteGoal(type, g.id)}
                          className="text-red-500 hover:text-red-400 text-[10px] px-1 shrink-0 font-bold cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Add New Goal input controls */}
              <div className="flex gap-1 border-t border-zinc-800/40 pt-2.5">
                <select
                  value={newGoalType}
                  onChange={(e) => setNewGoalType(e.target.value as any)}
                  className="rounded border border-zinc-800 bg-zinc-950 font-mono text-[10px] p-1 px-1.5 outline-none text-[#0078d4] font-bold"
                >
                  <option value="daily">Gün</option>
                  <option value="weekly">Hafta</option>
                  <option value="monthly">Ay</option>
                </select>
                <input
                  value={newGoalText}
                  onChange={(e) => setNewGoalText(e.target.value)}
                  placeholder="Yeni Hedef..."
                  onKeyDown={(e) => e.key === "Enter" && handleAddGoal()}
                  className="flex-1 min-w-0 rounded border border-zinc-800 bg-black/30 p-1 px-2 font-mono text-[11px] outline-none placeholder-zinc-500"
                />
                <button
                  onClick={handleAddGoal}
                  className="rounded bg-indigo-600 hover:bg-indigo-500 px-3 py-1 font-mono text-[10px] text-white shrink-0 font-bold cursor-pointer transition-colors"
                >
                  Ekle
                </button>
              </div>
            </div>

            {/* SECTION 2: Hatırlatıcı Kurulum Panel */}
            <div className={`p-3.5 rounded-xl border flex flex-col gap-3 ${
              darkMode ? "bg-zinc-900/60 border-zinc-900" : "bg-white border-zinc-200"
            }`}>
              <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 font-mono uppercase">
                  <Bell className="h-4 w-4 text-amber-500 inline shrink-0" />
                  Alarmlar & Hatırlatıcı Kurulumu
                </span>
                <span className="text-[9px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded leading-none">
                  {reminders.length} Alarm Kurulmuş
                </span>
              </div>

              {/* Reminders mapped list */}
              <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-1">
                {reminders.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded border border-zinc-900 bg-zinc-950/40">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[11px] font-bold text-yellow-300 truncate">{r.text}</span>
                      <span className="text-[8.5px] font-mono text-zinc-500 flex items-center gap-1.5">
                        ⏰ {r.time} {r.recurring !== "none" ? `(${r.recurring === "daily" ? "Günlük" : "Haftalık"})` : `@ ${r.date}`}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteReminder(r.id)}
                      className="text-red-500 hover:text-red-400 font-bold p-1 text-xs cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {reminders.length === 0 && (
                  <span className="text-center py-4 text-zinc-500 text-xs italic">Hiç alarm veya hatırlatıcı bulunmuyor.</span>
                )}
              </div>

              {/* Quick Add Alarm */}
              <div className="flex flex-col gap-1.5 border-t border-zinc-800/40 pt-2.5 text-xs font-mono">
                <div className="flex gap-1.5">
                  <input
                    value={newReminderTime}
                    type="time"
                    onChange={(e) => setNewReminderTime(e.target.value)}
                    className="rounded border border-zinc-800 bg-black/40 p-1 px-1.5 font-mono text-[11px] outline-none"
                  />
                  <select
                    value={newReminderRecur}
                    onChange={(e) => setNewReminderRecur(e.target.value as any)}
                    className="rounded border border-zinc-800 bg-black/40 font-mono text-[10px] p-1 px-1.5 outline-none text-zinc-400 cursor-pointer"
                  >
                    <option value="none">Tek Sefer</option>
                    <option value="daily">Her Gün</option>
                    <option value="weekly">Her Hafta</option>
                  </select>
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={newReminderText}
                    onChange={(e) => setNewReminderText(e.target.value)}
                    placeholder="Görev/Hatırlatıcı başlığı..."
                    onKeyDown={(e) => e.key === "Enter" && handleAddReminder()}
                    className="flex-1 min-w-0 rounded border border-zinc-800 bg-black/40 p-1 px-2 text-[11px] outline-none placeholder-zinc-500"
                  />
                  <button
                    onClick={handleAddReminder}
                    className="rounded bg-[#0078d4] hover:bg-[#0078d4]/80 px-3 py-1 font-mono text-[10px] font-bold text-white cursor-pointer transition-colors"
                  >
                    Alarm Kur
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CALENDAR BOARD LINK MATRIX */}
        {activeTab === "board" && (
          <div className="flex flex-col gap-4.5 font-mono animate-fadeIn select-none">
            {/* Direct scheduler list of board nodes */}
            <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
              darkMode ? "bg-zinc-900/60 border-zinc-900" : "bg-white border-zinc-200"
            }`}>
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                <span className="text-[11px] font-bold text-[#f59e0b] font-mono uppercase tracking-wider">
                  ⚠️ Panodan Takvime Atanmış Kartlar ({allScheduledNodes.length})
                </span>
                <span className="text-[9px] font-mono text-zinc-500">Çift Yönlü Link</span>
              </div>

              <div className="flex flex-col gap-1.5 max-h-[170px] overflow-y-auto pr-1">
                {allScheduledNodes.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => onFocusNode(n.id)}
                    className="flex items-center justify-between p-2 rounded border border-zinc-900 bg-zinc-950/30 cursor-pointer hover:border-[#0078d4] transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0 leading-none">
                      <span className="text-sm shrink-0">{getDayIcon(n.type)}</span>
                      <div className="flex flex-col min-w-0 leading-none">
                        <span className="text-[11.5px] font-sans font-bold text-white truncate">
                          {n.title || "Başlıksız Kart"}
                        </span>
                        <span className="text-[8.5px] text-[#f59e0b] font-mono mt-1">
                          📅 {n.eventDate}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateNode({ id: n.id, eventDate: undefined });
                      }}
                      className="text-red-500 hover:text-red-400 font-bold p-1 text-xs cursor-pointer ml-2"
                      title="Takvim Tarihini Kaldır"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {allScheduledNodes.length === 0 && (
                  <span className="text-center py-5 text-zinc-500 italic text-[11px]">Takvime atanmış pano kartı bulunmuyor.</span>
                )}
              </div>
            </div>

            {/* Unscheduled nodes that can be scheduled instantly or dragged */}
            <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
              darkMode ? "bg-zinc-900/60 border-zinc-900" : "bg-white border-zinc-200"
            }`}>
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                <span className="text-[11px] font-bold text-zinc-300 font-mono uppercase tracking-wider">
                  Unscheduled Pano Kartları ({unscheduledNodes.length})
                </span>
                <span className="text-[8.5px] font-semibold text-zinc-500 tracking-wide">
                  Sürükleyin veya Klikleyip Planlayın
                </span>
              </div>

              <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                {unscheduledNodes.map((n) => (
                  <div
                    key={n.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("nodeId", n.id);
                      e.dataTransfer.setData("linkedNodeId", n.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => {
                      // Schedule on currently selectedDateStr instantly
                      onUpdateNode({ id: n.id, eventDate: selectedDateStr });
                      setTriggeredNotifications((prev) => [...prev, `"${n.title || n.type}" kartı ${selectedDateStr} gününe atandı!`]);
                    }}
                    className="flex items-center justify-between p-2 rounded border border-zinc-900 bg-zinc-950/30 cursor-grab hover:border-indigo-500 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm shrink-0">{getDayIcon(n.type)}</span>
                      <span className="text-[11.5px] font-sans font-bold text-zinc-300 truncate">
                        {n.title || n.type}
                      </span>
                    </div>
                    <div className="text-[8.5px] font-mono text-zinc-650 italic tracking-tight shrink-0">PLANLA</div>
                  </div>
                ))}

                {unscheduledNodes.length === 0 && (
                  <span className="text-center py-5 text-zinc-500 italic text-[11px]">Bütün pano kartları planlandı!</span>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
