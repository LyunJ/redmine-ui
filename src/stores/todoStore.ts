import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import type { CustomFilter } from "../types/app";

const STORE_FILE = "todo_sections.json";
const DEFAULT_SECTION_ID = "default";
const DEFAULT_FILTER_ID = "default";

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

const DEFAULT_SECTION: TodoSection = {
  id: DEFAULT_SECTION_ID,
  name: "미분류",
  color: "#6b7280",
  sortMode: "manual",
  collapsed: false,
};

const DEFAULT_FILTER: CustomFilter = {
  id: DEFAULT_FILTER_ID,
  name: "내 일감",
  conditions: [],
  includePersonalTasks: true,
};

interface TodoState {
  // 필터 관리
  filters: CustomFilter[];
  activeFilterId: string;

  // 필터별 섹션 데이터
  filterSections: Record<string, TodoSection[]>;       // filterId → sections
  filterSectionItems: Record<string, Record<string, string[]>>; // filterId → sectionId → itemKeys

  loaded: boolean;

  // 활성 필터의 sections/sectionItems (computed getter 역할)
  sections: TodoSection[];
  sectionItems: Record<string, string[]>;

  // 필터 관련
  setActiveFilter: (filterId: string) => void;
  addFilter: (filter: Omit<CustomFilter, "id">) => Promise<void>;
  updateFilter: (id: string, updates: Partial<Omit<CustomFilter, "id">>) => Promise<void>;
  deleteFilter: (id: string) => Promise<void>;

  // 기존 섹션 관련 (활성 필터 기준)
  loadTodoData: () => Promise<void>;
  addSection: (name: string, color: string) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  updateSectionColor: (id: string, color: string) => Promise<void>;
  updateSectionName: (id: string, name: string) => Promise<void>;
  updateSectionSort: (id: string, sortMode: SectionSortMode) => Promise<void>;
  toggleSectionCollapse: (id: string) => Promise<void>;
  moveItem: (itemKey: string, toSectionId: string, toIndex: number) => Promise<void>;
  syncItems: (allItemKeys: string[]) => Promise<void>;
}

async function saveAllData(
  filters: CustomFilter[],
  activeFilterId: string,
  filterSections: Record<string, TodoSection[]>,
  filterSectionItems: Record<string, Record<string, string[]>>,
) {
  const store = await load(STORE_FILE, { defaults: {} });
  await store.set("filters", filters);
  await store.set("activeFilterId", activeFilterId);
  await store.set("filterSections", filterSections);
  await store.set("filterSectionItems", filterSectionItems);
  await store.save();
}

function getActiveSections(filterSections: Record<string, TodoSection[]>, filterId: string): TodoSection[] {
  return filterSections[filterId] ?? [{ ...DEFAULT_SECTION }];
}

function getActiveSectionItems(filterSectionItems: Record<string, Record<string, string[]>>, filterId: string): Record<string, string[]> {
  return filterSectionItems[filterId] ?? {};
}

export const useTodoStore = create<TodoState>((set, get) => ({
  filters: [DEFAULT_FILTER],
  activeFilterId: DEFAULT_FILTER_ID,
  filterSections: { [DEFAULT_FILTER_ID]: [{ ...DEFAULT_SECTION }] },
  filterSectionItems: {},
  loaded: false,

  // 활성 필터의 computed 데이터
  sections: [{ ...DEFAULT_SECTION }],
  sectionItems: {},

  loadTodoData: async () => {
    try {
      const store = await load(STORE_FILE, { defaults: {} });

      // 새 형식 확인
      const filters = await store.get<CustomFilter[]>("filters");

      if (filters && filters.length > 0) {
        // 새 형식
        const activeFilterId = (await store.get<string>("activeFilterId")) ?? DEFAULT_FILTER_ID;
        const filterSections = (await store.get<Record<string, TodoSection[]>>("filterSections")) ?? {};
        const filterSectionItems = (await store.get<Record<string, Record<string, string[]>>>("filterSectionItems")) ?? {};

        // sortMode, collapsed 마이그레이션
        for (const fid of Object.keys(filterSections)) {
          filterSections[fid] = filterSections[fid].map((s) => ({
            ...s,
            sortMode: s.sortMode ?? "manual" as SectionSortMode,
            collapsed: s.collapsed ?? false,
          }));
        }

        set({
          filters,
          activeFilterId,
          filterSections,
          filterSectionItems,
          sections: getActiveSections(filterSections, activeFilterId),
          sectionItems: getActiveSectionItems(filterSectionItems, activeFilterId),
          loaded: true,
        });
      } else {
        // 구 형식 마이그레이션 시도
        const oldSections = await store.get<TodoSection[]>("sections");
        const oldSectionItems = await store.get<Record<string, string[]>>("sectionItems");

        if (oldSections && oldSections.length > 0) {
          const migrated = oldSections.map((s) => ({
            ...s,
            sortMode: s.sortMode ?? "manual" as SectionSortMode,
            collapsed: s.collapsed ?? false,
          }));

          const newFilterSections = { [DEFAULT_FILTER_ID]: migrated };
          const newFilterSectionItems = { [DEFAULT_FILTER_ID]: oldSectionItems ?? {} };
          const newFilters = [DEFAULT_FILTER];

          set({
            filters: newFilters,
            activeFilterId: DEFAULT_FILTER_ID,
            filterSections: newFilterSections,
            filterSectionItems: newFilterSectionItems,
            sections: migrated,
            sectionItems: oldSectionItems ?? {},
            loaded: true,
          });

          // 새 형식으로 저장 + 구 키 제거
          await saveAllData(newFilters, DEFAULT_FILTER_ID, newFilterSections, newFilterSectionItems);
          await store.delete("sections");
          await store.delete("sectionItems");
          await store.save();
        } else {
          set({ loaded: true });
        }
      }
    } catch {
      set({ loaded: true });
    }
  },

  // 필터 관련
  setActiveFilter: (filterId: string) => {
    const { filterSections, filterSectionItems } = get();
    set({
      activeFilterId: filterId,
      sections: getActiveSections(filterSections, filterId),
      sectionItems: getActiveSectionItems(filterSectionItems, filterId),
    });
  },

  addFilter: async (filterData) => {
    const id = `filter-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const filter: CustomFilter = { ...filterData, id };
    const filters = [...get().filters, filter];
    const filterSections = { ...get().filterSections, [id]: [{ ...DEFAULT_SECTION }] };
    const filterSectionItems = { ...get().filterSectionItems, [id]: {} };

    set({
      filters,
      activeFilterId: id,
      filterSections,
      filterSectionItems,
      sections: getActiveSections(filterSections, id),
      sectionItems: getActiveSectionItems(filterSectionItems, id),
    });

    await saveAllData(filters, id, filterSections, filterSectionItems);
  },

  updateFilter: async (id, updates) => {
    const filters = get().filters.map((f) => (f.id === id ? { ...f, ...updates } : f));
    set({ filters });
    await saveAllData(filters, get().activeFilterId, get().filterSections, get().filterSectionItems);
  },

  deleteFilter: async (id) => {
    if (id === DEFAULT_FILTER_ID) return;
    const filters = get().filters.filter((f) => f.id !== id);
    const filterSections = { ...get().filterSections };
    const filterSectionItems = { ...get().filterSectionItems };
    delete filterSections[id];
    delete filterSectionItems[id];

    const activeFilterId = get().activeFilterId === id ? DEFAULT_FILTER_ID : get().activeFilterId;

    set({
      filters,
      activeFilterId,
      filterSections,
      filterSectionItems,
      sections: getActiveSections(filterSections, activeFilterId),
      sectionItems: getActiveSectionItems(filterSectionItems, activeFilterId),
    });

    await saveAllData(filters, activeFilterId, filterSections, filterSectionItems);
  },

  // 섹션 관련 (활성 필터 기준)
  addSection: async (name: string, color: string) => {
    const { activeFilterId, filterSections, filterSectionItems } = get();
    const id = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const section: TodoSection = { id, name, color, sortMode: "manual", collapsed: false };

    const currentSections = [...(filterSections[activeFilterId] ?? [{ ...DEFAULT_SECTION }]), section];
    const currentItems = { ...(filterSectionItems[activeFilterId] ?? {}), [id]: [] };

    const newFilterSections = { ...filterSections, [activeFilterId]: currentSections };
    const newFilterSectionItems = { ...filterSectionItems, [activeFilterId]: currentItems };

    set({
      filterSections: newFilterSections,
      filterSectionItems: newFilterSectionItems,
      sections: currentSections,
      sectionItems: currentItems,
    });

    await saveAllData(get().filters, activeFilterId, newFilterSections, newFilterSectionItems);
  },

  deleteSection: async (id: string) => {
    if (id === DEFAULT_SECTION_ID) return;
    const { activeFilterId, filterSections, filterSectionItems } = get();
    const currentItems = filterSectionItems[activeFilterId] ?? {};
    const itemsToMove = currentItems[id] ?? [];
    const defaultItems = [...(currentItems[DEFAULT_SECTION_ID] ?? []), ...itemsToMove];
    const newItems: Record<string, string[]> = { ...currentItems, [DEFAULT_SECTION_ID]: defaultItems };
    delete newItems[id];

    const currentSections = (filterSections[activeFilterId] ?? []).filter((s) => s.id !== id);

    const newFilterSections = { ...filterSections, [activeFilterId]: currentSections };
    const newFilterSectionItems = { ...filterSectionItems, [activeFilterId]: newItems };

    set({
      filterSections: newFilterSections,
      filterSectionItems: newFilterSectionItems,
      sections: currentSections,
      sectionItems: newItems,
    });

    await saveAllData(get().filters, activeFilterId, newFilterSections, newFilterSectionItems);
  },

  updateSectionColor: async (id: string, color: string) => {
    const { activeFilterId, filterSections, filterSectionItems } = get();
    const currentSections = (filterSections[activeFilterId] ?? []).map((s) => (s.id === id ? { ...s, color } : s));
    const newFilterSections = { ...filterSections, [activeFilterId]: currentSections };

    set({ filterSections: newFilterSections, sections: currentSections });
    await saveAllData(get().filters, activeFilterId, newFilterSections, filterSectionItems);
  },

  updateSectionName: async (id: string, name: string) => {
    const { activeFilterId, filterSections, filterSectionItems } = get();
    const currentSections = (filterSections[activeFilterId] ?? []).map((s) => (s.id === id ? { ...s, name } : s));
    const newFilterSections = { ...filterSections, [activeFilterId]: currentSections };

    set({ filterSections: newFilterSections, sections: currentSections });
    await saveAllData(get().filters, activeFilterId, newFilterSections, filterSectionItems);
  },

  updateSectionSort: async (id: string, sortMode: SectionSortMode) => {
    const { activeFilterId, filterSections, filterSectionItems } = get();
    const currentSections = (filterSections[activeFilterId] ?? []).map((s) => (s.id === id ? { ...s, sortMode } : s));
    const newFilterSections = { ...filterSections, [activeFilterId]: currentSections };

    set({ filterSections: newFilterSections, sections: currentSections });
    await saveAllData(get().filters, activeFilterId, newFilterSections, filterSectionItems);
  },

  toggleSectionCollapse: async (id: string) => {
    const { activeFilterId, filterSections, filterSectionItems } = get();
    const currentSections = (filterSections[activeFilterId] ?? []).map((s) => (s.id === id ? { ...s, collapsed: !s.collapsed } : s));
    const newFilterSections = { ...filterSections, [activeFilterId]: currentSections };

    set({ filterSections: newFilterSections, sections: currentSections });
    await saveAllData(get().filters, activeFilterId, newFilterSections, filterSectionItems);
  },

  moveItem: async (itemKey: string, toSectionId: string, toIndex: number) => {
    const { activeFilterId, filterSections, filterSectionItems } = get();
    const currentItems = filterSectionItems[activeFilterId] ?? {};

    const newItems: Record<string, string[]> = {};
    for (const [key, val] of Object.entries(currentItems)) {
      newItems[key] = val.filter((k) => k !== itemKey);
    }
    if (!newItems[toSectionId]) newItems[toSectionId] = [];
    newItems[toSectionId].splice(toIndex, 0, itemKey);

    const newFilterSectionItems = { ...filterSectionItems, [activeFilterId]: newItems };

    set({ filterSectionItems: newFilterSectionItems, sectionItems: newItems });
    await saveAllData(get().filters, activeFilterId, filterSections, newFilterSectionItems);
  },

  syncItems: async (allItemKeys: string[]) => {
    const { activeFilterId, filterSections, filterSectionItems, sections } = get();
    const currentItems = filterSectionItems[activeFilterId] ?? {};
    const allKeySet = new Set(allItemKeys);
    const assignedKeys = new Set<string>();
    let changed = false;

    const newItems: Record<string, string[]> = {};

    for (const section of sections) {
      const items = currentItems[section.id] ?? [];
      const filtered = items.filter((key) => allKeySet.has(key));
      if (filtered.length !== items.length) changed = true;
      newItems[section.id] = filtered;
      filtered.forEach((key) => assignedKeys.add(key));
    }

    const unassigned = allItemKeys.filter((key) => !assignedKeys.has(key));
    if (unassigned.length > 0) {
      changed = true;
      newItems[DEFAULT_SECTION_ID] = [
        ...(newItems[DEFAULT_SECTION_ID] ?? []),
        ...unassigned,
      ];
    }

    if (changed) {
      const newFilterSectionItems = { ...filterSectionItems, [activeFilterId]: newItems };
      set({ filterSectionItems: newFilterSectionItems, sectionItems: newItems });
      await saveAllData(get().filters, activeFilterId, filterSections, newFilterSectionItems);
    }
  },
}));
