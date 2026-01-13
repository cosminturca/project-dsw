const express = require("express");
const Task = require("../models/Task");
const {
  createTaskSchema,
  updateTaskSchema,
} = require("../validators/task.schema");
const auth = require("../middleware/auth");

const router = express.Router();

/* ================= GET TASKS (DOAR ALE USERULUI) ================= */
router.get("/", auth, async (req, res) => {
  try {
    const tasks = await Task.find({
      userId: req.user.uid,
    }).sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

/* ================= CREATE TASK ================= */
router.post("/", auth, async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error);
  }

  try {
    const task = await Task.create({
      ...parsed.data,
      userId: req.user.uid, // 🔐 legat de user
      deadline: parsed.data.deadline
        ? new Date(parsed.data.deadline)
        : null,
    });

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: "Failed to create task" });
  }
});

/* ================= UPDATE TASK ================= */
router.patch("/:id", auth, async (req, res) => {
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error);
  }

  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.uid }, // 🔐 protecție
      parsed.data,
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: "Failed to update task" });
  }
});

/* ================= DELETE TASK ================= */
router.delete("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.uid, // 🔐 protecție
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: "Failed to delete task" });
  }
});

module.exports = router;
