const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true,
    },

    category: {
      type: String,
      enum: ["Facultate", "Personal", "Shopping", "Work"],
      default: "Personal",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    repeat: {
      type: String,
      enum: ["none", "daily", "weekly"],
      default: "none",
    },

    deadline: {
      type: Date,
      default: null,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    tags: {
      type: [String],
      default: [],
    },

    notes: {
      type: String,
      default: "",
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", TaskSchema);
