import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import type { RedmineIssue, RedmineIssueDetail, RedmineIssueStatus } from "../types/redmine";
import type { SortField, SortDirection, ViewTab } from "../types/app";
import { useAuthStore } from "./authStore";

const SEEN_STORE_FILE = "last_seen.json";

interface IssueState {
  issues: RedmineIssue[];
  reportedIssues: RedmineIssue[];
  completedIssues: RedmineIssue[];
  currentView: ViewTab;
  isLoading: boolean;
  fetchedOnce: boolean;
  error: string | null;
  sortField: SortField;
  sortDirection: SortDirection;
  lastSeenMap: Record<number, string>; // issueId -> last seen updated_on
  statusMap: RedmineIssueStatus[];
  selectedIssue: RedmineIssueDetail | null;
  isLoadingDetail: boolean;
  setCurrentView: (view: ViewTab) => void;
  fetchIssues: () => Promise<void>;
  fetchReportedIssues: () => Promise<void>;
  fetchCompletedIssues: () => Promise<void>;
  fetchAllViews: () => Promise<void>;
  selectIssue: (issueId: number) => Promise<void>;
  clearSelectedIssue: () => void;
  setSortField: (field: SortField) => void;
  toggleSortDirection: () => void;
  markAsSeen: (issueId: number, updatedOn: string) => Promise<void>;
  loadLastSeen: () => Promise<void>;
  isUpdated: (issue: RedmineIssue) => boolean;
  getSortedIssues: () => RedmineIssue[];
  getCurrentViewIssues: () => RedmineIssue[];
}

export const useIssueStore = create<IssueState>((set, get) => ({
  issues: [],
  reportedIssues: [],
  completedIssues: [],
  currentView: "todo" as ViewTab,
  isLoading: false,
  fetchedOnce: false,
  error: null,
  sortField: "updated_on",
  sortDirection: "desc",
  lastSeenMap: {},
  statusMap: [],
  selectedIssue: null,
  isLoadingDetail: false,
  setCurrentView: (view: ViewTab) => {
    set({ currentView: view });
  },

  selectIssue: async (issueId: number) => {
    const client = useAuthStore.getState().client;
    if (!client) return;

    set({ isLoadingDetail: true });
    try {
      const detail = await client.getIssueDetail(issueId);
      set({ selectedIssue: detail, isLoadingDetail: false });

      // 상세 조회 시 읽음 처리
      const newMap = { ...get().lastSeenMap, [issueId]: detail.updated_on };
      set({ lastSeenMap: newMap });
      const store = await load(SEEN_STORE_FILE, { defaults: {} });
      await store.set("lastSeenMap", newMap);
      await store.save();
    } catch {
      set({ isLoadingDetail: false });
    }
  },

  clearSelectedIssue: () => {
    set({ selectedIssue: null });
  },

  fetchIssues: async () => {
    const client = useAuthStore.getState().client;
    if (!client) return;

    set({ isLoading: true, error: null });
    try {
      // status 목록 조회하여 "신규"/"진행" 상태 ID 찾기
      let { statusMap } = get();
      if (statusMap.length === 0) {
        statusMap = await client.getIssueStatuses();
        set({ statusMap });
      }

      const targetStatuses = statusMap.filter((s) => {
        const name = s.name.toLowerCase();
        return (
          name === "new" ||
          name === "in progress" ||
          name === "신규" ||
          name === "진행"
        );
      });
      const statusIds = targetStatuses.map((s) => s.id);

      if (statusIds.length === 0) {
        // fallback: 기본 Redmine ID 1, 2
        statusIds.push(1, 2);
      }

      const issues = await client.getMyIssues(statusIds);
      set({ issues, isLoading: false });
    } catch {
      set({ isLoading: false, error: "일감 조회 실패" });
    }
  },

  fetchReportedIssues: async () => {
    const client = useAuthStore.getState().client;
    if (!client) return;

    set({ isLoading: true, error: null });
    try {
      let { statusMap } = get();
      if (statusMap.length === 0) {
        statusMap = await client.getIssueStatuses();
        set({ statusMap });
      }

      const targetStatuses = statusMap.filter((s) => {
        const name = s.name.toLowerCase();
        return (
          name === "new" ||
          name === "in progress" ||
          name === "신규" ||
          name === "진행"
        );
      });
      const statusIds = targetStatuses.map((s) => s.id);
      if (statusIds.length === 0) statusIds.push(1, 2);

      const reportedIssues = await client.getReportedIssues(statusIds);
      set({ reportedIssues, isLoading: false });
    } catch {
      set({ isLoading: false, error: "보고한 일감 조회 실패" });
    }
  },

  fetchCompletedIssues: async () => {
    const client = useAuthStore.getState().client;
    if (!client) return;

    set({ isLoading: true, error: null });
    try {
      let { statusMap } = get();
      if (statusMap.length === 0) {
        statusMap = await client.getIssueStatuses();
        set({ statusMap });
      }

      const closedStatuses = statusMap.filter((s) => s.is_closed);
      const statusIds = closedStatuses.map((s) => s.id);
      if (statusIds.length === 0) statusIds.push(5); // fallback: 기본 Redmine "Closed" ID

      const completedIssues = await client.getCompletedIssues(statusIds);
      set({ completedIssues, isLoading: false });
    } catch {
      set({ isLoading: false, error: "완료된 일감 조회 실패" });
    }
  },

  fetchAllViews: async () => {
    const { fetchIssues, fetchReportedIssues, fetchCompletedIssues } = get();
    await Promise.all([fetchIssues(), fetchReportedIssues(), fetchCompletedIssues()]);
    set({ fetchedOnce: true });
  },

  setSortField: (field: SortField) => {
    const { sortField, sortDirection } = get();
    if (sortField === field) {
      // 같은 필드 클릭 시 방향 토글
      set({ sortDirection: sortDirection === "asc" ? "desc" : "asc" });
    } else {
      set({ sortField: field, sortDirection: "desc" });
    }
  },

  toggleSortDirection: () => {
    set({ sortDirection: get().sortDirection === "asc" ? "desc" : "asc" });
  },

  markAsSeen: async (issueId: number, updatedOn: string) => {
    const newMap = { ...get().lastSeenMap, [issueId]: updatedOn };
    set({ lastSeenMap: newMap });

    const store = await load(SEEN_STORE_FILE, { defaults: {} });
    await store.set("lastSeenMap", newMap);
    await store.save();
  },

  loadLastSeen: async () => {
    try {
      const store = await load(SEEN_STORE_FILE, { defaults: {} });
      const map = await store.get<Record<number, string>>("lastSeenMap");
      if (map) {
        set({ lastSeenMap: map });
      }
    } catch {
      // 저장된 데이터 없음
    }
  },

  isUpdated: (issue: RedmineIssue) => {
    const { lastSeenMap } = get();
    const lastSeen = lastSeenMap[issue.id];
    if (!lastSeen) return true; // 처음 보는 issue
    return issue.updated_on > lastSeen;
  },

  getSortedIssues: () => {
    const { issues, sortField, sortDirection } = get();
    const sorted = [...issues].sort((a, b) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });
    return sortDirection === "desc" ? sorted.reverse() : sorted;
  },

  getCurrentViewIssues: () => {
    const { currentView, issues, reportedIssues, completedIssues, sortField, sortDirection } = get();
    let source: RedmineIssue[];
    switch (currentView) {
      case "reported":
        source = reportedIssues;
        break;
      case "completed":
        source = completedIssues;
        break;
      default:
        source = issues;
    }
    const sorted = [...source].sort((a, b) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });
    return sortDirection === "desc" ? sorted.reverse() : sorted;
  },
}));
