import { create } from "zustand";
import type { Theme } from "../types/app";

export const POLL_INTERVAL_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "10s", value: 10000 },
  { label: "30s", value: 30000 },
  { label: "1m", value: 60000 },
  { label: "5m", value: 300000 },
  { label: "10m", value: 600000 },
] as const;

interface SettingsState {
  theme: Theme;
  pollIntervalMs: number;
  toggleTheme: () => void;
  initTheme: () => void;
  setPollInterval: (ms: number) => void;
  initPollInterval: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: "light",
  pollIntervalMs: 60000,

  toggleTheme: () => {
    const newTheme = get().theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    set({ theme: newTheme });
  },

  initTheme: () => {
    const saved = localStorage.getItem("theme") as Theme | null;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const theme = saved ?? (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },

  setPollInterval: (ms: number) => {
    localStorage.setItem("pollIntervalMs", ms.toString());
    set({ pollIntervalMs: ms });
  },

  initPollInterval: () => {
    const saved = localStorage.getItem("pollIntervalMs");
    if (saved !== null) {
      const ms = parseInt(saved, 10);
      if (!isNaN(ms)) set({ pollIntervalMs: ms });
    }
  },
}));
