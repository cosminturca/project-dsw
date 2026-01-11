import type { Task } from "../types/tasks";

export function clampTitle(title: string) {
  return title.trim().slice(0, 100);
}

export function isValidTask(t: Task) {
  return Boolean(t.id && t.title && t.category && t.repeat && t.priority);
}
