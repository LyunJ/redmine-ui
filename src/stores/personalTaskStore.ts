import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import type { PersonalTask } from "../types/app";

const STORE_FILE = "personal_tasks.json";

interface PersonalTaskState {
  tasks: PersonalTask[];
  isModalOpen: boolean;
  selectedTask: PersonalTask | null;
  openModal: () => void;
  closeModal: () => void;
  loadTasks: () => Promise<void>;
  addTask: (subject: string, description: string, dueDate: string | null) => Promise<void>;
  updateTask: (id: string, subject: string, description: string, dueDate: string | null) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  restoreTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  selectTask: (id: string) => void;
  clearSelectedTask: () => void;
  getActiveTasks: () => PersonalTask[];
  getCompletedTasks: () => PersonalTask[];
}

async function saveTasks(tasks: PersonalTask[]) {
  const store = await load(STORE_FILE, { defaults: {} });
  await store.set("tasks", tasks);
  await store.save();
}

export const usePersonalTaskStore = create<PersonalTaskState>((set, get) => ({
  tasks: [],
  isModalOpen: false,
  selectedTask: null,

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),

  loadTasks: async () => {
    try {
      const store = await load(STORE_FILE, { defaults: {} });
      const tasks = await store.get<PersonalTask[]>("tasks");
      if (tasks) {
        set({ tasks });
      }
    } catch {
      // 저장된 데이터 없음
    }
  },

  addTask: async (subject: string, description: string, dueDate: string | null) => {
    const now = new Date().toISOString();
    const task: PersonalTask = {
      id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      subject,
      description,
      due_date: dueDate || null,
      completed: false,
      created_on: now,
      updated_on: now,
      completed_on: null,
    };
    const tasks = [...get().tasks, task];
    set({ tasks });
    await saveTasks(tasks);
  },

  updateTask: async (id: string, subject: string, description: string, dueDate: string | null) => {
    const now = new Date().toISOString();
    const tasks = get().tasks.map((t) =>
      t.id === id ? { ...t, subject, description, due_date: dueDate, updated_on: now } : t
    );
    const updated = tasks.find((t) => t.id === id) ?? null;
    set({ tasks, selectedTask: updated });
    await saveTasks(tasks);
  },

  completeTask: async (id: string) => {
    const now = new Date().toISOString();
    const tasks = get().tasks.map((t) =>
      t.id === id ? { ...t, completed: true, completed_on: now, updated_on: now } : t
    );
    set({ tasks });
    await saveTasks(tasks);
  },

  restoreTask: async (id: string) => {
    const now = new Date().toISOString();
    const tasks = get().tasks.map((t) =>
      t.id === id ? { ...t, completed: false, completed_on: null, updated_on: now } : t
    );
    set({ tasks });
    await saveTasks(tasks);
  },

  deleteTask: async (id: string) => {
    const tasks = get().tasks.filter((t) => t.id !== id);
    set({ tasks });
    await saveTasks(tasks);
  },

  selectTask: (id: string) => {
    const task = get().tasks.find((t) => t.id === id) ?? null;
    set({ selectedTask: task });
  },

  clearSelectedTask: () => {
    set({ selectedTask: null });
  },

  getActiveTasks: () => {
    return get().tasks.filter((t) => !t.completed);
  },

  getCompletedTasks: () => {
    return get().tasks.filter((t) => t.completed).sort((a, b) => (b.completed_on ?? "").localeCompare(a.completed_on ?? ""));
  },
}));
