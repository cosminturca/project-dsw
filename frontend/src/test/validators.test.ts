import { describe, it, expect } from "vitest";
import { z } from "zod";

// exemplu simplu de validare, exact ce cere proiectul
const taskSchema = z.object({
  title: z.string().min(1).max(100),
});

describe("Task validation", () => {
  it("accepts a valid task title", () => {
    const result = taskSchema.safeParse({ title: "Cumpărături" });
    expect(result.success).toBe(true);
  });

  it("rejects empty task title", () => {
    const result = taskSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects task title longer than 100 chars", () => {
    const longTitle = "a".repeat(101);
    const result = taskSchema.safeParse({ title: longTitle });
    expect(result.success).toBe(false);
  });
});
