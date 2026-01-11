import type { Task, NewTaskInput, TaskPatch } from "../src/types/tasks";


const API_URL = "http://localhost:4000/api/tasks";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "API error");
  }
  return (await res.json()) as T;
}

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(API_URL);
  return handleResponse<Task[]>(res);
}

export async function createTask(input: NewTaskInput): Promise<Task> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<Task>(res);
}

export async function updateTask(id: string, patch: TaskPatch): Promise<Task> {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return handleResponse<Task>(res);
}

export async function deleteTaskApi(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Delete failed");
}
