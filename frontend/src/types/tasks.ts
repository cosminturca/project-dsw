export type TaskCategory = "Facultate" | "Personal" | "Shopping" | "Work";
export type TaskRepeat = "none" | "daily" | "weekly";
export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  category: TaskCategory;
  repeat: TaskRepeat;
  priority: TaskPriority;
  deadline: string | null; // ISO
  notes: string;
  tags: string[];
  completed: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  order: number;
};

export type NewTaskInput = {
  title: string;
  category: TaskCategory;
  repeat: TaskRepeat;
  priority: TaskPriority;
  deadline: string | null;
  notes?: string;
  tags?: string[];
};

export type TaskPatch = Partial<Omit<Task, "id" | "createdAt">>;
