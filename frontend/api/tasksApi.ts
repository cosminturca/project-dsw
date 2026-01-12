import type { Task, NewTaskInput, TaskPatch } from "../src/types/tasks";
import { auth } from "../src/firebase";


/**
 * Backend base URL
 * - local: http://localhost:4000
 * - production: https://project-dsw.onrender.com
 */
const API_BASE_URL = import.meta.env.VITE_API_URL;
const API_URL = `${API_BASE_URL}/api/tasks`;

/* ================== AUTH HEADER ================== */
async function authHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};

  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

/* ================== RESPONSE HANDLER ================== */
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "API error");
  }
  return (await res.json()) as T;
}

/* ================== API CALLS ================== */

// 🔹 GET tasks
export async function fetchTasks(): Promise<Task[]> {
  const headers = await authHeaders();

  const res = await fetch(API_URL, {
    headers,
  });

  return handleResponse<Task[]>(res);
}

// 🔹 CREATE task
export async function createTask(input: NewTaskInput): Promise<Task> {
  const headers = await authHeaders();

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(input),
  });

  return handleResponse<Task>(res);
}

// 🔹 UPDATE task
export async function updateTask(
  id: string,
  patch: TaskPatch
): Promise<Task> {
  const headers = await authHeaders();

  const res = await fetch(`${API_URL}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(patch),
  });

  return handleResponse<Task>(res);
}

// 🔹 DELETE task
export async function deleteTaskApi(id: string): Promise<void> {
  const headers = await authHeaders();

  const res = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Delete failed");
  }
}
