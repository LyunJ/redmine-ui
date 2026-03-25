import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";

const STORE_FILE = "todo_sections.json";
const DEFAULT_SECTION_ID = "default";

export type SectionSortMode = "manual" | "created_on";

export interface TodoSection {
  id: string;
  name: string;
  color: string;
  sortMode: SectionSortMode;
  collapsed: boolean;
}

export const SECTION_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#6b7280",
];

interface TodoState {
  sections: TodoSection[];
  sectionItems: Record<string, string[]>; // sectionId → itemKey[]
  loaded: boolean;
  loadTodoData: () => Promise<void>;
  addSection: (name: string, color: string) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  updateSectionColor: (id: string, color: string) => Promise<void>;
  updateSectionName: (id: string, name: string) => Promise<void>;
  updateSectionSort: (id: string, sortMode: SectionSortMode) => Promise<void>;
  toggleSectionCollapse: (id: string) => Promise<void>;
  moveItem: (itemKey: string, toSectionId: string, toIndex: number) => Promise<void>;
  syncItems: (allItemKeys: string[]) => void;
}

async function saveData(sections: TodoSection[], sectionItems: Record<string, string[]>) {
  const store = await load(STORE_FILE, { defaults: {} });
  await store.set("sections", sections);
  await store.set("sectionItems", sectionItems);
  await store.save();
}

export const useTodoStore = create<TodoState>((set, get) => ({
  sections: [{ id: DEFAULT_SECTION_ID, name: "미분류", color: "#6b7280", sortMode: "manual" as SectionSortMode, collapsed: false }],
  sectionItems: {},
  loaded: false,

  loadTodoData: async () => {
    try {
      const store = await load(STORE_FILE, { defaults: {} });
      const sections = await store.get<TodoSection[]>("sections");
      const sectionItems = await store.get<Record<string, string[]>>("sectionItems");
      if (sections && sections.length > 0) {
        const migrated = sections.map((s) => ({ ...s, sortMode: s.sortMode ?? "manual" as SectionSortMode, collapsed: s.collapsed ?? false }));
        set({ sections: migrated, sectionItems: sectionItems ?? {}, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  addSection: async (name: string, color: string) => {
    const id = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const section: TodoSection = { id, name, color, sortMode: "manual", collapsed: false };
    const sections = [...get().sections, section];
    const sectionItems = { ...get().sectionItems, [id]: [] };
    set({ sections, sectionItems });
    await saveData(sections, sectionItems);
  },

  deleteSection: async (id: string) => {
    if (id === DEFAULT_SECTION_ID) return;
    const { sectionItems } = get();
    const itemsToMove = sectionItems[id] ?? [];
    const defaultItems = [...(sectionItems[DEFAULT_SECTION_ID] ?? []), ...itemsToMove];
    const newSectionItems: Record<string, string[]> = { ...sectionItems, [DEFAULT_SECTION_ID]: defaultItems };
    delete newSectionItems[id];
    const sections = get().sections.filter((s) => s.id !== id);
    set({ sections, sectionItems: newSectionItems });
    await saveData(sections, newSectionItems);
  },

  updateSectionColor: async (id: string, color: string) => {
    const sections = get().sections.map((s) => (s.id === id ? { ...s, color } : s));
    set({ sections });
    await saveData(sections, get().sectionItems);
  },

  updateSectionName: async (id: string, name: string) => {
    const sections = get().sections.map((s) => (s.id === id ? { ...s, name } : s));
    set({ sections });
    await saveData(sections, get().sectionItems);
  },

  updateSectionSort: async (id: string, sortMode: SectionSortMode) => {
    const sections = get().sections.map((s) => (s.id === id ? { ...s, sortMode } : s));
    set({ sections });
    await saveData(sections, get().sectionItems);
  },

  toggleSectionCollapse: async (id: string) => {
    const sections = get().sections.map((s) => (s.id === id ? { ...s, collapsed: !s.collapsed } : s));
    set({ sections });
    await saveData(sections, get().sectionItems);
  },

  moveItem: async (itemKey: string, toSectionId: string, toIndex: number) => {
    const sectionItems: Record<string, string[]> = {};
    // Deep copy
    for (const [key, val] of Object.entries(get().sectionItems)) {
      sectionItems[key] = val.filter((k) => k !== itemKey);
    }
    // Insert at target
    if (!sectionItems[toSectionId]) sectionItems[toSectionId] = [];
    sectionItems[toSectionId].splice(toIndex, 0, itemKey);
    set({ sectionItems });
    await saveData(get().sections, sectionItems);
  },

  syncItems: (allItemKeys: string[]) => {
    const { sectionItems, sections } = get();
    const allKeySet = new Set(allItemKeys);
    const assignedKeys = new Set<string>();
    let changed = false;

    const newSectionItems: Record<string, string[]> = {};

    for (const section of sections) {
      const items = sectionItems[section.id] ?? [];
      const filtered = items.filter((key) => allKeySet.has(key));
      if (filtered.length !== items.length) changed = true;
      newSectionItems[section.id] = filtered;
      filtered.forEach((key) => assignedKeys.add(key));
    }

    const unassigned = allItemKeys.filter((key) => !assignedKeys.has(key));
    if (unassigned.length > 0) {
      changed = true;
      newSectionItems[DEFAULT_SECTION_ID] = [
        ...(newSectionItems[DEFAULT_SECTION_ID] ?? []),
        ...unassigned,
      ];
    }

    if (changed) {
      set({ sectionItems: newSectionItems });
      saveData(sections, newSectionItems);
    }
  },
}));
