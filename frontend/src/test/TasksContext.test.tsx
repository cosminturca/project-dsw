import React from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TasksProvider, useTasks } from "../context/TasksContext";
import type { Task, NewTaskInput } from "../types/tasks";

/**
 * Mock pentru API – NU apelăm backend-ul în unit tests
 */
vi.mock("../../api/tasksApi", () => {
  return {
    fetchTasks: vi.fn().mockResolvedValue([]),

    createTask: vi.fn(
      async (input: NewTaskInput): Promise<Task> => ({
        id: "test-id",
        title: input.title,
        category: input.category,
        repeat: input.repeat,
        priority: input.priority,
        deadline: input.deadline ?? null,
        notes: input.notes ?? "",
        tags: input.tags ?? [],
        completed: false,
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    ),

    updateTask: vi.fn(),
    deleteTaskApi: vi.fn(),
  };
});

describe("TasksContext", () => {
  it("adds a task correctly", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TasksProvider>{children}</TasksProvider>
    );

    const { result } = renderHook(() => useTasks(), { wrapper });

    await act(async () => {
      await result.current.addTask({
        title: "Test task",
        category: "Work",
        repeat: "none",
        priority: "medium",
        deadline: null,
        notes: "",
        tags: [],
      });
    });

    expect(result.current.tasks.length).toBe(1);
    expect(result.current.tasks[0].title).toBe("Test task");
  });

  it("throws error when title is empty", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TasksProvider>{children}</TasksProvider>
    );

    const { result } = renderHook(() => useTasks(), { wrapper });

    // addTask aruncă, deci verificăm că aruncă și că nu s-a adăugat nimic
    await expect(
      act(async () => {
        await result.current.addTask({
          title: "   ",
          category: "Work",
          repeat: "none",
          priority: "medium",
          deadline: null,
          notes: "",
          tags: [],
        });
      })
    ).rejects.toThrow("Title is required");

    expect(result.current.tasks.length).toBe(0);
  });
});
