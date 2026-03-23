import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import { RedmineClient } from "../lib/redmineClient";
import type { RedmineUser } from "../types/redmine";

const STORE_FILE = "credentials.json";

interface AuthState {
  baseUrl: string | null;
  apiKey: string | null;
  currentUser: RedmineUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  client: RedmineClient | null;
  login: (baseUrl: string, apiKey: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSavedCredentials: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  baseUrl: null,
  apiKey: null,
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  client: null,

  login: async (baseUrl: string, apiKey: string) => {
    set({ isLoading: true, error: null });
    try {
      const client = new RedmineClient(baseUrl, apiKey);
      const user = await client.getCurrentUser();

      // credential 저장
      const store = await load(STORE_FILE, { defaults: {} });
      await store.set("baseUrl", baseUrl);
      await store.set("apiKey", apiKey);
      await store.save();

      set({
        baseUrl,
        apiKey,
        currentUser: user,
        isAuthenticated: true,
        isLoading: false,
        client,
      });
    } catch {
      set({
        isLoading: false,
        error: "연결 실패. URL과 API Key를 확인하세요.",
      });
    }
  },

  logout: async () => {
    const store = await load(STORE_FILE, { defaults: {} });
    await store.clear();
    await store.save();

    set({
      baseUrl: null,
      apiKey: null,
      currentUser: null,
      isAuthenticated: false,
      client: null,
      error: null,
    });
  },

  loadSavedCredentials: async () => {
    try {
      const store = await load(STORE_FILE, { defaults: {} });
      const baseUrl = await store.get<string>("baseUrl");
      const apiKey = await store.get<string>("apiKey");

      if (baseUrl && apiKey) {
        await get().login(baseUrl, apiKey);
      }
    } catch {
      // 저장된 credential이 없거나 유효하지 않음
    }
  },
}));
