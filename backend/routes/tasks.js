const express = require("express");
const Task = require("../models/Task");
const { createTaskSchema, updateTaskSchema } = require("../validators/task.schema");
const auth = require("../middleware/auth");

const router = express.Router();

/* ================= GET TASKS (DOAR ALE USERULUI) ================= */
router.get("/", auth, async (req, res) => {
  const tasks = await Task.find({ userId: req.user.uid }).sort({ createdAt: -1 });
  res.json(tasks);
});

/* ================= CREATE TASK ================= */
router.post("/", auth, async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error);
  }

  const task = await Task.create({
    ...parsed.data,
    userId: req.user.uid,
    deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
  });

  res.status(201).json(task);
});

/* ================= UPDATE TASK ================= */
router.patch("/:id", auth, async (req, res) => {
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error);
  }

  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.uid },
    parsed.data,
    { new: true }
  );

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  res.json(task);
});

/* ================= DELETE TASK ================= */
router.delete("/:id", auth, async (req, res) => {
  const task = await Task.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.uid,
  });

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  res.status(204).end();
});

module.exports = router;
