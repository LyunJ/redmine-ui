import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import type { RedmineIssue, RedmineIssueDetail, RedmineIssueStatus, IssueCreatePayload, IssueUpdatePayload } from "../types/redmine";
import type { SortField, SortDirection, ViewTab } from "../types/app";
import { useAuthStore } from "./authStore";

const SEEN_STORE_FILE = "last_seen.json";

interface IssueState {
  issues: RedmineIssue[];
  reportedIssues: RedmineIssue[];
  completedIssues: RedmineIssue[];
  allVisibleIssues: RedmineIssue[];
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
  isCreateModalOpen: boolean;
  editingIssueId: number | null;
  setCurrentView: (view: ViewTab) => void;
  fetchIssues: () => Promise<void>;
  fetchReportedIssues: () => Promise<void>;
  fetchCompletedIssues: () => Promise<void>;
  fetchAllVisibleIssues: () => Promise<void>;
  fetchAllViews: () => Promise<void>;
  selectIssue: (issueId: number) => Promise<void>;
  refreshSelectedIssue: () => Promise<void>;
  clearSelectedIssue: () => void;
  setSortField: (field: SortField) => void;
  toggleSortDirection: () => void;
  markAsSeen: (issueId: number, updatedOn: string) => Promise<void>;
  loadLastSeen: () => Promise<void>;
  isUpdated: (issue: RedmineIssue) => boolean;
  getSortedIssues: () => RedmineIssue[];
  getCurrentViewIssues: () => RedmineIssue[];
  openCreateModal: () => void;
  openEditModal: (issueId: number) => void;
  closeEditModal: () => void;
  createIssue: (payload: IssueCreatePayload) => Promise<RedmineIssueDetail>;
  updateIssue: (issueId: number, payload: IssueUpdatePayload) => Promise<void>;
  addComment: (issueId: number, notes: string) => Promise<void>;
}

export const useIssueStore = create<IssueState>((set, get) => ({
  issues: [],
  reportedIssues: [],
  completedIssues: [],
  allVisibleIssues: [],
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
  isCreateModalOpen: false,
  editingIssueId: null,
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

  refreshSelectedIssue: async () => {
    const { selectedIssue } = get();
    if (!selectedIssue) return;
    const client = useAuthStore.getState().client;
    if (!client) return;
    try {
      const detail = await client.getIssueDetail(selectedIssue.id);
      set({ selectedIssue: detail });
    } catch {
      // 상세 새로고침 실패 시 무시
    }
  },

  clearSelectedIssue: () => {
    set({ selectedIssue: null });
  },

  openCreateModal: () => {
    set({ isCreateModalOpen: true, editingIssueId: null });
  },

  openEditModal: (issueId: number) => {
    set({ isCreateModalOpen: true, editingIssueId: issueId });
  },

  closeEditModal: () => {
    set({ isCreateModalOpen: false, editingIssueId: null });
  },

  createIssue: async (payload: IssueCreatePayload) => {
    const client = useAuthStore.getState().client;
    if (!client) throw new Error("Not authenticated");
    const created = await client.createIssue(payload);
    // 생성 후 전체 뷰 새로고침
    get().fetchAllViews();
    return created;
  },

  updateIssue: async (issueId: number, payload: IssueUpdatePayload) => {
    const client = useAuthStore.getState().client;
    if (!client) throw new Error("Not authenticated");
    await client.updateIssue(issueId, payload);
    // 수정 후 상세 + 전체 뷰 새로고침
    await get().refreshSelectedIssue();
    get().fetchAllViews();
  },

  addComment: async (issueId: number, notes: string) => {
    const client = useAuthStore.getState().client;
    if (!client) throw new Error("Not authenticated");
    await client.addComment(issueId, notes);
    await get().refreshSelectedIssue();
  },

  fetchIssues: async () => {
    const client = useAuthStore.getState().client;
    if (!client) return;

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

      if (statusIds.length === 0) {
        // fallback: 기본 Redmine ID 1, 2
        statusIds.push(1, 2);
      }

      const issues = await client.getMyIssues(statusIds);
      set({ issues });
    } catch (e) {
      console.error("[fetchIssues]", e);
      set({ error: "일감 조회 실패" });
    }
  },

  fetchReportedIssues: async () => {
    const client = useAuthStore.getState().client;
    if (!client) return;

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
      set({ reportedIssues });
    } catch (e) {
      console.error("[fetchReportedIssues]", e);
      set({ error: "보고한 일감 조회 실패" });
    }
  },

  fetchCompletedIssues: async () => {
    const client = useAuthStore.getState().client;
    if (!client) return;

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
      set({ completedIssues });
    } catch (e) {
      console.error("[fetchCompletedIssues]", e);
      set({ error: "완료된 일감 조회 실패" });
    }
  },

  fetchAllVisibleIssues: async () => {
    const client = useAuthStore.getState().client;
    if (!client) return;

    try {
      let { statusMap } = get();
      if (statusMap.length === 0) {
        statusMap = await client.getIssueStatuses();
        set({ statusMap });
      }

      const openStatuses = statusMap.filter((s) => !s.is_closed);
      const statusIds = openStatuses.map((s) => s.id);
      if (statusIds.length === 0) statusIds.push(1, 2);

      const allVisibleIssues = await client.getAllVisibleIssues(statusIds);
      set({ allVisibleIssues });
    } catch (e) {
      console.error("[fetchAllVisibleIssues]", e);
      set({ error: "전체 일감 조회 실패" });
    }
  },

  fetchAllViews: async () => {
    const client = useAuthStore.getState().client;
    if (!client) return;

    set({ isLoading: true, error: null });

    try {
      let { statusMap } = get();
      if (statusMap.length === 0) {
        statusMap = await client.getIssueStatuses();
      }

      const activeStatuses = statusMap.filter((s) => {
        const name = s.name.toLowerCase();
        return name === "new" || name === "in progress" || name === "신규" || name === "진행";
      });
      const closedStatuses = statusMap.filter((s) => s.is_closed);
      const openStatuses = statusMap.filter((s) => !s.is_closed);

      const activeStatusIds = activeStatuses.length > 0 ? activeStatuses.map((s) => s.id) : [1, 2];
      const closedStatusIds = closedStatuses.length > 0 ? closedStatuses.map((s) => s.id) : [5];
      const openStatusIds = openStatuses.length > 0 ? openStatuses.map((s) => s.id) : [1, 2];

      const [issues, reportedIssues, completedIssues, allVisibleIssues] = await Promise.all([
        client.getMyIssues(activeStatusIds),
        client.getReportedIssues(activeStatusIds),
        client.getCompletedIssues(closedStatusIds),
        client.getAllVisibleIssues(openStatusIds),
      ]);

      // 단일 atomic set()으로 모든 상태를 한 번에 업데이트
      set({ issues, reportedIssues, completedIssues, allVisibleIssues, statusMap, isLoading: false, fetchedOnce: true });
    } catch (e) {
      console.error("[fetchAllViews]", e);
      set({ error: "일감 조회 실패", isLoading: false });
    }
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
