import { useMemo, useRef, useState, useEffect } from "react";
import { useTasks } from "../context/TasksContext";
import type {
  Task,
  TaskCategory,
  TaskRepeat,
  TaskPriority,
  NewTaskInput,
} from "../types/tasks";
import { Header } from "./Header";
import {
  saveOfflineTask,
  getOfflineTasks,
  clearOfflineTasks,
} from "../lib/indexedDb";

import {
  ArrowUpDown,
  CalendarClock,
  Download,
  FileSpreadsheet,
  FileText,
  GripVertical,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import Papa from "papaparse";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";

const CATEGORIES: TaskCategory[] = [
  "Facultate",
  "Personal",
  "Shopping",
  "Work",
];
const REPEATS: { value: TaskRepeat; label: string }[] = [
  { value: "none", label: "Fără" },
  { value: "daily", label: "Zilnic" },
  { value: "weekly", label: "Săptămânal" },
];

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

function isoToDateInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10); // YYYY-MM-DD
}

function dateInputToIso(val: string) {
  if (!val) return null;
  const [y, m, d] = val.split("-").map(Number);
  const local = new Date(y, m - 1, d); // local midnight
  return local.toISOString();
}

function openNativeDatePicker(el: HTMLInputElement | null) {
  if (!el) return;
  const anyEl = el as HTMLInputElement & { showPicker?: () => void };
  if (typeof anyEl.showPicker === "function") anyEl.showPicker();
  else el.focus(); // fallback (Firefox)
}

function fmtDateShort(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d
    .toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
}

function isOverdue(t: Task) {
  if (!t.deadline || t.completed) return false;
  const end = new Date(t.deadline).getTime();
  const now = Date.now();
  return end < now;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function reorder<T>(list: T[], start: number, end: number) {
  const copy = Array.from(list);
  const [removed] = copy.splice(start, 1);
  copy.splice(end, 0, removed);
  return copy;
}

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function priorityScore(p: TaskPriority) {
  if (p === "high") return 3;
  if (p === "medium") return 2;
  return 1;
}

export default function TaskBoard() {
  const {
    tasks,
    selectedId,
    setSelectedId,
    addTask,
    patchTask,
    toggleDone,
    deleteTask,
    setTasksDirect,
  } = useTasks();
  const [syncOk] = useState(true); // când legăm backend, îl facem real

  // composer state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TaskCategory>("Facultate");
  const [repeat, setRepeat] = useState<TaskRepeat>("none");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [deadline, setDeadline] = useState<string>(""); // YYYY-MM-DD
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // list state
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "done">("all");
  const [catFilter, setCatFilter] = useState<TaskCategory | "all">("all");
  const [prioFilter, setPrioFilter] = useState<TaskPriority | "all">("all");
  const [sort, setSort] = useState<
    "manual" | "created" | "deadline" | "priority"
  >("created");
  const [groupByDue, setGroupByDue] = useState(true);
  const fileCsvRef = useRef<HTMLInputElement | null>(null);

  // calendar refs
  const createDeadlineRef = useRef<HTMLInputElement | null>(null);
  const editDeadlineRef = useRef<HTMLInputElement | null>(null);
  const selected = useMemo(
    () => tasks.find((t) => t.id === selectedId) ?? null,
    [tasks, selectedId]
  );

  useEffect(() => {
    if (!selected) return;
    setEditTags(selected.tags.join(", "));
    setEditNotes(selected.notes ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.completed).length;
    const overdue = tasks.filter((t) => isOverdue(t)).length;
    return { total, done, pending: total - done, overdue };
  }, [tasks]);

  async function submitNew() {
    const t = title.trim();
    if (!t) return;

    const input: NewTaskInput = {
      title: t,
      category,
      repeat,
      priority,
      deadline: dateInputToIso(deadline),
      notes: notes.trim(),
      tags: parseTags(tagsInput),
    };

    try {
      await addTask(input); // ONLINE
    } catch {
      // OFFLINE
      await saveOfflineTask(input);
      alert("Task salvat offline. Se va sincroniza când revii online.");
    }

    setTitle("");
    setDeadline("");
    setNotes("");
    setTagsInput("");
    setRepeat("none");
    setPriority("medium");
  }

  useEffect(() => {
    async function syncOfflineTasks() {
      if (!navigator.onLine) return;
      const offlineTasks = await getOfflineTasks();
      if (offlineTasks.length === 0) return;
      for (const task of offlineTasks) {
        await addTask(task);
      }
      await clearOfflineTasks();
    }
    window.addEventListener("online", syncOfflineTasks);
    return () => window.removeEventListener("online", syncOfflineTasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = [...tasks];

    // filters
    if (q) {
      list = list.filter((t) => {
        const inTitle = t.title.toLowerCase().includes(q);
        const inNotes = t.notes.toLowerCase().includes(q);
        const inTags = t.tags.join(" ").toLowerCase().includes(q);
        return inTitle || inNotes || inTags;
      });
    }

    if (status !== "all") {
      list = list.filter((t) =>
        status === "done" ? t.completed : !t.completed
      );
    }

    if (catFilter !== "all") {
      list = list.filter((t) => t.category === catFilter);
    }

    if (prioFilter !== "all") {
      list = list.filter((t) => t.priority === prioFilter);
    }

    // sort
    if (sort === "manual") {
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } else if (sort === "created") {
      list.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    } else if (sort === "deadline") {
      list.sort((a, b) =>
        (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999")
      );
    } else {
      list.sort(
        (a, b) => priorityScore(b.priority) - priorityScore(a.priority)
      );
    }

    return list;
  }, [tasks, query, status, catFilter, prioFilter, sort]);

  const dragEnabled = sort === "manual" && !groupByDue;

  function onDragEnd(result: DropResult) {
    if (!dragEnabled) return;
    if (!result.destination) return;

    const manual = [...tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const moved = reorder(
      manual,
      result.source.index,
      result.destination.index
    );
    const normalized = moved.map((t, idx) => ({ ...t, order: idx }));
    setTasksDirect(normalized);
  }

  // ===== Export / Import =====
  function exportJSON() {
    downloadBlob(
      "tasks.json",
      new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" })
    );
  }

  function exportCSV() {
    const rows = tasks.map((t) => ({
      title: t.title,
      category: t.category,
      repeat: t.repeat,
      priority: t.priority,
      completed: t.completed ? "true" : "false",
      deadline: t.deadline ?? "",
      tags: t.tags.join(", "),
      notes: t.notes,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    downloadBlob(
      "tasks.csv",
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
  }

  function exportExcel() {
    const rows = tasks.map((t) => ({
      title: t.title,
      category: t.category,
      repeat: t.repeat,
      priority: t.priority,
      completed: t.completed,
      deadline: t.deadline ?? "",
      tags: t.tags.join(", "),
      notes: t.notes,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });

    downloadBlob(
      "tasks.xlsx",
      new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
    );
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Task Manager - Export", 14, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    let y = 28;
    filteredSorted.forEach((t, i) => {
      const line = `${i + 1}. ${t.title} | ${
        t.category
      } | ${t.priority.toUpperCase()} | ${t.repeat} | ${
        t.completed ? "DONE" : isOverdue(t) ? "OVERDUE" : "PENDING"
      } | ${t.deadline ? fmtDateShort(t.deadline) : "-"}`;
      doc.text(line, 14, y);
      y += 6;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save("tasks.pdf");
  }

  function clickImportCsv() {
    fileCsvRef.current?.click();
  }

  type CsvRow = {
    title?: string;
    category?: string;
    repeat?: string;
    priority?: string;
    deadline?: string;
    tags?: string;
    notes?: string;
  };

  async function importFromCSV(file: File) {
    const text = await file.text();
    const parsed = Papa.parse<CsvRow>(text, {
      header: true,
      skipEmptyLines: true,
    });

    const imported = parsed.data
      .map((r): NewTaskInput | null => {
        const rawTitle = (r.title ?? "").trim();
        if (!rawTitle) return null;

        const cat = (r.category ?? "Facultate").trim() as TaskCategory;
        const rep = (r.repeat ?? "none").trim() as TaskRepeat;
        const pr = (r.priority ?? "medium").trim() as TaskPriority;

        const safeCat: TaskCategory = CATEGORIES.includes(cat)
          ? cat
          : "Facultate";
        const safeRep: TaskRepeat =
          rep === "daily" || rep === "weekly" || rep === "none" ? rep : "none";
        const safePr: TaskPriority =
          pr === "low" || pr === "medium" || pr === "high" ? pr : "medium";

        const dl = (r.deadline ?? "").trim();
        const iso = dl
          ? new Date(dl.includes("T") ? dl : `${dl}T00:00:00`).toISOString()
          : null;

        return {
          title: rawTitle,
          category: safeCat,
          repeat: safeRep,
          priority: safePr,
          deadline: iso,
          tags: parseTags(r.tags ?? ""),
          notes: (r.notes ?? "").trim(),
        };
      })
      .filter((x): x is NewTaskInput => x !== null);

    imported.reverse().forEach((t) => addTask(t));
    if (fileCsvRef.current) fileCsvRef.current.value = "";
  }

  // ===== Grouping by due =====
  const grouped = useMemo(() => {
    if (!groupByDue) return null;

    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();

    function bucket(t: Task): "Overdue" | "Today" | "Upcoming" | "Someday" {
      if (!t.deadline) return "Someday";
      if (isOverdue(t)) return "Overdue";
      const dt = new Date(t.deadline);
      if (dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d)
        return "Today";
      return "Upcoming";
    }

    const map: Record<string, Task[]> = {
      Overdue: [],
      Today: [],
      Upcoming: [],
      Someday: [],
    };
    filteredSorted.forEach((t) => map[bucket(t)].push(t));
    return map as Record<"Overdue" | "Today" | "Upcoming" | "Someday", Task[]>;
  }, [filteredSorted, groupByDue]);

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-6xl px-4 pb-16">
        <Header syncOk={syncOk} />

        {/* header */}
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">
              Task Studio
            </h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-semibold shadow-sm dark:bg-slate-900">
                Total: {stats.total}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-semibold shadow-sm dark:bg-slate-900">
                Pending: {stats.pending}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-semibold shadow-sm dark:bg-slate-900">
                Done: {stats.done}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-semibold shadow-sm dark:bg-slate-900">
                Overdue: {stats.overdue}
              </span>
            </div>
          </div>

          <div className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Caută în titlu / notes / tags..."
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(e.target.value)
              }
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* main grid */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr_360px]">
          {/* Composer */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              <h2 className="text-lg font-extrabold">Task nou</h2>
            </div>

            <div className="mt-4 grid gap-3">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-800 dark:bg-slate-950"
                placeholder="Titlu (max 100 caractere)"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTitle(e.target.value)
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950"
                  value={category}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setCategory(e.target.value as TaskCategory)
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950"
                  value={priority}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setPriority(e.target.value as TaskPriority)
                  }
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950"
                  value={repeat}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setRepeat(e.target.value as TaskRepeat)
                  }
                >
                  {REPEATS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>

                {/* Create calendar (icon + click input opens picker) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      openNativeDatePicker(createDeadlineRef.current)
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                    title="Alege data"
                  >
                    <CalendarClock className="h-4 w-4" />
                  </button>

                  <input
                    ref={createDeadlineRef}
                    type="date"
                    lang="ro"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none dark:border-slate-800 dark:bg-slate-950"
                    value={deadline}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDeadline(e.target.value)
                    }
                    onFocus={(e) => openNativeDatePicker(e.currentTarget)}
                    onClick={(e) => openNativeDatePicker(e.currentTarget)}
                  />
                </div>
              </div>

              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950"
                placeholder="Tags (ex: exam, urgent, casa) separate prin virgulă"
                value={tagsInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTagsInput(e.target.value)
                }
              />

              <textarea
                className="min-h-40 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950"
                placeholder="Notes (opțional)"
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setNotes(e.target.value)
                }
              />

              <button
                onClick={submitNew}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-extrabold text-white shadow-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Adaugă
              </button>
            </div>
          </section>

          {/* List */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5" />
                <h2 className="text-lg font-extrabold">Listă</h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                  value={status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setStatus(e.target.value as "all" | "pending" | "done")
                  }
                >
                  <option value="all">Toate</option>
                  <option value="pending">Pending</option>
                  <option value="done">Done</option>
                </select>

                <select
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                  value={catFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setCatFilter(e.target.value as TaskCategory | "all")
                  }
                >
                  <option value="all">Toate categoriile</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                  value={prioFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setPrioFilter(e.target.value as TaskPriority | "all")
                  }
                >
                  <option value="all">Toate prioritățile</option>
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>

                <select
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                  value={sort}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setSort(
                      e.target.value as
                        | "manual"
                        | "created"
                        | "deadline"
                        | "priority"
                    )
                  }
                >
                  <option value="created">Sort: Recente</option>
                  <option value="deadline">Sort: Deadline</option>
                  <option value="priority">Sort: Prioritate</option>
                  <option value="manual">Sort: Manual (drag)</option>
                </select>

                <button
                  onClick={() => setGroupByDue((v) => !v)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800"
                  title="Grupare după deadline"
                >
                  {groupByDue ? "Grouped" : "Flat"}
                </button>
              </div>
            </div>

            <div className="mt-4">
              {dragEnabled ? (
                <div className="mb-2 text-xs text-slate-500 dark:text-slate-300">
                  Drag & drop activ (sort manual).
                </div>
              ) : (
                <div className="mb-2 text-xs text-slate-500 dark:text-slate-300">
                  Drag & drop doar pe <b>Sort: Manual</b> și când <b>Flat</b>.
                </div>
              )}

              {grouped ? (
                <div className="grid gap-5">
                  {(["Overdue", "Today", "Upcoming", "Someday"] as const).map(
                    (k) => (
                      <div key={k}>
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-sm font-extrabold">{k}</div>
                          <div className="text-xs text-slate-500">
                            {grouped[k].length}
                          </div>
                        </div>

                        <div className="grid gap-2">
                          {grouped[k].map((t) => (
                            <button
                              key={t.id}
                              onClick={() => setSelectedId(t.id)}
                              className={`w-full rounded-2xl border px-4 py-3 text-left shadow-sm transition ${
                                selectedId === t.id
                                  ? "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-slate-800"
                                  : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div
                                    className={`truncate font-semibold ${
                                      t.completed
                                        ? "line-through text-slate-400"
                                        : ""
                                    }`}
                                  >
                                    {t.title}
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-100">
                                      {t.category}
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-100">
                                      {t.priority.toUpperCase()}
                                    </span>
                                    {t.deadline && (
                                      <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                          isOverdue(t)
                                            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200"
                                            : "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                        }`}
                                      >
                                        {fmtDateShort(t.deadline)}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={t.completed}
                                    onChange={() => toggleDone(t.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-5 w-5"
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteTask(t.id);
                                    }}
                                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                    title="Șterge"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </button>
                                </div>
                              </div>
                            </button>
                          ))}

                          {grouped[k].length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                              Nimic aici.
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="list">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="grid gap-3"
                      >
                        {filteredSorted.map((t, idx) => (
                          <Draggable
                            key={t.id}
                            draggableId={t.id}
                            index={idx}
                            isDragDisabled={!dragEnabled}
                          >
                            {(p) => (
                              <div
                                ref={p.innerRef}
                                {...p.draggableProps}
                                className={`rounded-2xl border px-4 py-4 shadow-sm ${
                                  selectedId === t.id
                                    ? "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-slate-800"
                                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    {...p.dragHandleProps}
                                    className="text-slate-400"
                                  >
                                    <GripVertical className="h-5 w-5" />
                                  </div>

                                  <input
                                    type="checkbox"
                                    className="h-5 w-5"
                                    checked={t.completed}
                                    onChange={() => toggleDone(t.id)}
                                  />

                                  <button
                                    onClick={() => setSelectedId(t.id)}
                                    className="min-w-0 flex-1 text-left"
                                    title="Deschide detalii"
                                  >
                                    <div
                                      className={`truncate font-semibold ${
                                        t.completed
                                          ? "line-through text-slate-400"
                                          : ""
                                      }`}
                                    >
                                      {t.title}
                                    </div>

                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-100">
                                        {t.category}
                                      </span>
                                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-100">
                                        {t.priority.toUpperCase()}
                                      </span>
                                      {t.repeat !== "none" && (
                                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                                          {t.repeat.toUpperCase()}
                                        </span>
                                      )}
                                      {t.deadline && (
                                        <span
                                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                            isOverdue(t)
                                              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200"
                                              : "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                          }`}
                                        >
                                          {fmtDateShort(t.deadline)}
                                        </span>
                                      )}
                                    </div>
                                  </button>

                                  <button
                                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                    onClick={() => deleteTask(t.id)}
                                    title="Șterge"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>

            {/* Data management */}
            <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                <div className="text-sm font-extrabold">Export / Import</div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <button
                  onClick={exportPDF}
                  className="rounded-2xl border bg-white p-4 text-center hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <FileText className="mx-auto h-6 w-6" />
                  <div className="mt-2 text-xs font-bold">PDF</div>
                </button>

                <button
                  onClick={exportExcel}
                  className="rounded-2xl border bg-white p-4 text-center hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <FileSpreadsheet className="mx-auto h-6 w-6" />
                  <div className="mt-2 text-xs font-bold">EXCEL</div>
                </button>

                <button
                  onClick={exportCSV}
                  className="rounded-2xl border bg-white p-4 text-center hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <FileSpreadsheet className="mx-auto h-6 w-6" />
                  <div className="mt-2 text-xs font-bold">CSV</div>
                </button>

                <button
                  onClick={exportJSON}
                  className="rounded-2xl border bg-white p-4 text-center hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <FileText className="mx-auto h-6 w-6" />
                  <div className="mt-2 text-xs font-bold">JSON</div>
                </button>
              </div>

              <div className="mt-5">
                <input
                  ref={fileCsvRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const f = e.target.files?.[0];
                    if (f) void importFromCSV(f);
                  }}
                />

                <button
                  onClick={clickImportCsv}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black py-4 text-sm font-extrabold text-white shadow-xl hover:bg-slate-900"
                >
                  <Upload className="h-4 w-4" />
                  Importă CSV
                </button>

                <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  CSV recomandat:{" "}
                  <b>
                    title, category, repeat, priority, deadline, tags, notes
                  </b>
                </div>
              </div>
            </div>
          </section>

          {/* Details */}
          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="text-lg font-extrabold">Detalii</div>
              {selected && (
                <button
                  onClick={() => setSelectedId(null)}
                  className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                  title="Închide"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {!selected ? (
              <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                Selectează un task din listă ca să îl editezi.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                <div className="text-xl font-extrabold">{selected.title}</div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-950 dark:text-slate-100">
                    {selected.category}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-950 dark:text-slate-100">
                    {selected.priority.toUpperCase()}
                  </span>
                  {selected.deadline && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isOverdue(selected)
                          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      }`}
                    >
                      {fmtDateShort(selected.deadline)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                    value={selected.category}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      patchTask(selected.id, {
                        category: e.target.value as TaskCategory,
                      })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <select
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                    value={selected.priority}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      patchTask(selected.id, {
                        priority: e.target.value as TaskPriority,
                      })
                    }
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <select
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                  value={selected.repeat}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    patchTask(selected.id, {
                      repeat: e.target.value as TaskRepeat,
                    })
                  }
                >
                  {REPEATS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>

                {/* Edit calendar (icon + click input opens picker) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      openNativeDatePicker(editDeadlineRef.current)
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                    title="Alege data"
                  >
                    <CalendarClock className="h-4 w-4" />
                  </button>

                  <input
                    ref={editDeadlineRef}
                    type="date"
                    lang="ro"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 pl-10 text-sm dark:border-slate-800 dark:bg-slate-950"
                    value={isoToDateInput(selected.deadline)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      patchTask(selected.id, {
                        deadline: dateInputToIso(e.target.value),
                      })
                    }
                    onFocus={(e) => openNativeDatePicker(e.currentTarget)}
                    onClick={(e) => openNativeDatePicker(e.currentTarget)}
                  />
                </div>

                <input
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                  placeholder="tags (comma separated)"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  onBlur={() =>
                    patchTask(selected.id, { tags: parseTags(editTags) })
                  }
                />

                <textarea
                  className="min-h-40 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950"
                  placeholder="Notes..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  onBlur={() => patchTask(selected.id, { notes: editNotes })}
                />

                <div className="text-xs text-slate-500 dark:text-slate-300">
                  Creat: {fmtDateShort(selected.createdAt)} • Update:{" "}
                  {fmtDateShort(selected.updatedAt)}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
