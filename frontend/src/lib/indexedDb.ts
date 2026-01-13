import { openDB } from "idb";
import type { NewTaskInput } from "../types/tasks";

const DB_NAME = "task-studio-db";
const STORE_NAME = "offlineTasks";

export const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, {
        keyPath: "id",
        autoIncrement: true,
      });
    }
  },
});

export async function saveOfflineTask(task: NewTaskInput) {
  const db = await dbPromise;
  await db.add(STORE_NAME, task);
}

export async function getOfflineTasks(): Promise<NewTaskInput[]> {
  const db = await dbPromise;
  return db.getAll(STORE_NAME);
}

export async function clearOfflineTasks() {
  const db = await dbPromise;
  await db.clear(STORE_NAME);
}
