const { z } = require("zod");

/* ================= CREATE ================= */
const createTaskSchema = z.object({
  title: z.string().min(1).max(100),
  category: z.enum(["Facultate", "Personal", "Shopping", "Work"]),
  priority: z.enum(["low", "medium", "high"]),
  repeat: z.enum(["none", "daily", "weekly"]),
  deadline: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

/* ================= UPDATE ================= */
const updateTaskSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  category: z.enum(["Facultate", "Personal", "Shopping", "Work"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  repeat: z.enum(["none", "daily", "weekly"]).optional(),
  deadline: z.string().nullable().optional(),
  completed: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  order: z.number().optional(),
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
};
