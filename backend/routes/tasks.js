const express = require("express");
const Task = require("../models/Task");
const { createTaskSchema, updateTaskSchema } = require("../validators/task.schema");

const router = express.Router();

const auth = require("../middleware/auth");

router.get("/", auth, async (req, res) => {
  const tasks = await Task.find({ userId: req.user.uid });
  res.json(tasks);
});


/** GET all tasks */
router.get("/", async (req, res) => {
  const tasks = await Task.find().sort({ createdAt: -1 });
  res.json(tasks);
});

/** CREATE task */
router.post("/", async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error);
  }

  const task = await Task.create({
    ...parsed.data,
    deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
  });

  res.status(201).json(task);
});

/** UPDATE task */
router.patch("/:id", async (req, res) => {
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error);
  }

  const task = await Task.findByIdAndUpdate(
    req.params.id,
    parsed.data,
    { new: true }
  );

  res.json(task);
});

/** DELETE task */
router.delete("/:id", async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

module.exports = router;
