require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { z } = require("zod");

const app = express();

// ===== Middleware =====
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ===== Mongo =====
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in .env");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

// ===== Model =====
const TaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    category: {
      type: String,
      enum: ["Facultate", "Personal", "Shopping", "Work"],
      default: "Facultate",
    },
    repeat: {
      type: String,
      enum: ["none", "daily", "weekly"],
      default: "none",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    deadline: { type: Date, default: null },
    notes: { type: String, default: "" },
    tags: { type: [String], default: [] },
    completed: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", TaskSchema);

// ===== Validation (Zod) =====
const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  category: z.enum(["Facultate", "Personal", "Shopping", "Work"]),
  repeat: z.enum(["none", "daily", "weekly"]),
  priority: z.enum(["low", "medium", "high"]),
  deadline: z.string().nullable().optional(),
  notes: z.string().optional().default(""),
  tags: z.array(z.string().trim()).max(10).optional().default([]),
});

const taskPatchSchema = taskCreateSchema.partial().extend({
  completed: z.boolean().optional(),
  order: z.number().optional(),
});

// ===== Helpers =====
function toClient(doc) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    category: doc.category,
    repeat: doc.repeat,
    priority: doc.priority,
    deadline: doc.deadline ? doc.deadline.toISOString() : null,
    notes: doc.notes,
    tags: doc.tags,
    completed: doc.completed,
    order: doc.order,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// ===== Routes =====
app.get("/health", (req, res) => res.json({ ok: true }));

// GET all tasks
app.get("/api/tasks", async (req, res) => {
  const tasks = await Task.find().sort({ order: 1, createdAt: -1 });
  res.json(tasks.map(toClient));
});

// POST create task
app.post("/api/tasks", async (req, res) => {
  const parsed = taskCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const maxOrder = await Task.findOne().sort({ order: -1 }).select("order");
  const nextOrder = (maxOrder?.order ?? 0) + 1;

  const task = await Task.create({
    ...parsed.data,
    deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
    order: nextOrder,
  });

  res.status(201).json(toClient(task));
});

// PATCH update task
app.patch("/api/tasks/:id", async (req, res) => {
  const parsed = taskPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const updated = await Task.findByIdAndUpdate(
    req.params.id,
    {
      ...parsed.data,
      deadline:
        parsed.data.deadline !== undefined
          ? parsed.data.deadline
            ? new Date(parsed.data.deadline)
            : null
          : undefined,
    },
    { new: true }
  );

  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(toClient(updated));
});

// DELETE task
app.delete("/api/tasks/:id", async (req, res) => {
  const deleted = await Task.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// ===== Start =====
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
