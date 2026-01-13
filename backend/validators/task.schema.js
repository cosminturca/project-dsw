const { z } = require("zod");

exports.createTaskSchema = z.object({
  title: z.string().min(1).max(100),
  category: z.enum(["Facultate", "Personal", "Shopping", "Work"]),
  priority: z.enum(["low", "medium", "high"]),
  repeat: z.enum(["none", "daily", "weekly"]),
  deadline: z.string().nullable().optional(),
  tags: z.array(z.string()).max(10).optional(),
  notes: z.string().optional(),
});

exports.updateTaskSchema = createTaskSchema.partial();
