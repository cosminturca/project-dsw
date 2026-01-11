/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from "react";
import type { Task, NewTaskInput, TaskPatch } from "../types/tasks";

import { fetchTasks, createTask, updateTask, deleteTaskApi } from "../../api/tasksApi";

type TasksContextValue = {
  tasks: Task[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;

  addTask: (input: NewTaskInput) => Promise<Task>;         // <- returnează created ca să poți await-ui din UI
  patchTask: (id: string, patch: TaskPatch) => Promise<void>;
  toggleDone: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  setTasksDirect: (next: Task[]) => void;
};

const TasksContext = createContext<TasksContextValue | null>(null);

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used inside <TasksProvider />");
  return ctx;
}
type TaskFromApi = Partial<Task> & { _id?: string };

function normalizeTask(raw: TaskFromApi): Task {
  const id = raw.id ?? raw._id ?? "";
  return { ...(raw as Task), id };
}

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // LOAD inițial
  useEffect(() => {
    let cancelled = false;

    fetchTasks()
      .then((data) => {
        if (cancelled) return;

        const normalized = (data ?? []).map(normalizeTask);

        // IMPORTANT: dacă între timp s-a creat un task, nu suprascriem lista
        setTasks((prev) => (prev.length > 0 ? prev : normalized));
        setSelectedId((prev) => prev ?? normalized[0]?.id ?? null);
      })
      .catch((err) => {
        console.error("fetchTasks failed:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function addTask(input: NewTaskInput) {
    const title = input.title.trim();
    if (!title) throw new Error("Title is required");

    try {
      const createdRaw = await createTask({ ...input, title });
      const created = normalizeTask(createdRaw);

      setTasks((prev) => [created, ...prev]);
      setSelectedId(created.id);

      return created;
    } catch (err) {
      console.error("createTask failed:", err);
      throw err; // lăsăm UI-ul să decidă ce face (nu resetăm form-ul)
    }
  }

  async function patchTask(id: string, patch: TaskPatch) {
    const updatedRaw = await updateTask(id, patch);
    const updated = normalizeTask(updatedRaw);

    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function toggleDone(id: string) {
    // evităm stale state: găsim task-ul din prev
    const current = tasks.find((x) => x.id === id);
    if (!current) return;
    await patchTask(id, { completed: !current.completed });
  }

  async function deleteTask(id: string) {
    await deleteTaskApi(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }

  function setTasksDirect(next: Task[]) {
    // asigurăm id și aici
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
