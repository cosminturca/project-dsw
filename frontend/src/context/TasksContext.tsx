/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from "react";
import type { Task, NewTaskInput, TaskPatch } from "../types/tasks";
import { useAuth } from "../context/useAuth";

import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTaskApi,
} from "../../api/tasksApi";

/* ================== TYPES ================== */

type TasksContextValue = {
  tasks: Task[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;

  addTask: (input: NewTaskInput) => Promise<Task>;
  patchTask: (id: string, patch: TaskPatch) => Promise<void>;
  toggleDone: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  setTasksDirect: (next: Task[]) => void;
};

type TaskFromApi = Partial<Task> & { _id?: string };

/* ================== CONTEXT ================== */

const TasksContext = createContext<TasksContextValue | null>(null);

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used inside <TasksProvider />");
  return ctx;
}

/* ================== HELPERS ================== */

function normalizeTask(raw: TaskFromApi): Task {
  const id = raw.id ?? raw._id ?? "";
  return { ...(raw as Task), id };
}

/* ================== PROVIDER ================== */

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* ========= LOAD TASKS PER USER ========= */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (loading) return;

      // 🔹 user delogat → reset state
      if (!user) {
        setTasks([]);
        setSelectedId(null);
        return;
      }

      try {
        const data = await fetchTasks();
        if (cancelled) return;

        const normalized = (data ?? []).map(normalizeTask);
        setTasks(normalized);
        setSelectedId(normalized[0]?.id ?? null);
      } catch (err) {
        console.error("fetchTasks failed:", err);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  /* ================== ACTIONS ================== */

  async function addTask(input: NewTaskInput) {
    const title = input.title.trim();
    if (!title) throw new Error("Title is required");

    const createdRaw = await createTask({ ...input, title });
    const created = normalizeTask(createdRaw);

    setTasks((prev) => [created, ...prev]);
    setSelectedId(created.id);

    return created;
  }

  async function patchTask(id: string, patch: TaskPatch) {
    const updatedRaw = await updateTask(id, patch);
    const updated = normalizeTask(updatedRaw);

    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function toggleDone(id: string) {
    const current = tasks.find((t) => t.id === id);
    if (!current) return;

    await patchTask(id, { completed: !current.completed });
  }

  async function deleteTask(id: string) {
    await deleteTaskApi(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }

  function setTasksDirect(next: Task[]) {
    const normalized = next.map(normalizeTask);
    setTasks(normalized);
    setSelectedId(normalized[0]?.id ?? null);
  }

  return (
    <TasksContext.Provider
      value={{
        tasks,
        selectedId,
        setSelectedId,
        addTask,
        patchTask,
        toggleDone,
        deleteTask,
        setTasksDirect,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
}
