import { useState, useCallback, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Moon, Sun, LogOut, Pin, PinOff, RefreshCw, ChevronDown, Globe } from "lucide-react";
import { useSettingsStore, POLL_INTERVAL_OPTIONS } from "../../stores/settingsStore";
import { useAuthStore } from "../../stores/authStore";
import { useIssueStore } from "../../stores/issueStore";
import "./TitleBar.css";

export function TitleBar() {
  const { theme, toggleTheme, pollIntervalMs, setPollInterval } = useSettingsStore();
  const { isAuthenticated, currentUser, logout, baseUrl } = useAuthStore();
  const { fetchAllViews, isLoading } = useIssueStore();
  const appWindow = getCurrentWindow();
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(true);
  const [pollDropdownOpen, setPollDropdownOpen] = useState(false);
  const pollDropdownRef = useRef<HTMLDivElement>(null);

  const currentPollLabel = POLL_INTERVAL_OPTIONS.find(o => o.value === pollIntervalMs)?.label ?? "1m";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pollDropdownRef.current && !pollDropdownRef.current.contains(e.target as Node)) {
        setPollDropdownOpen(false);
      }
    }
    if (pollDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [pollDropdownOpen]);

  const toggleAlwaysOnTop = useCallback(async () => {
    const next = !isAlwaysOnTop;
    await appWindow.setAlwaysOnTop(next);
    setIsAlwaysOnTop(next);
  }, [appWindow, isAlwaysOnTop]);

  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <span className="titlebar-title">Redmine UI</span>
        {isAuthenticated && currentUser && (
          <span className="titlebar-user">{currentUser.login}</span>
        )}
      </div>
      <div className="titlebar-actions">
        {isAuthenticated && (
          <>
            <button
              className="titlebar-btn"
              onClick={() => baseUrl && openUrl(baseUrl)}
              title="레드마인 웹에서 열기"
            >
              <Globe size={14} />
            </button>
            <button
              className={`titlebar-btn titlebar-refresh-btn ${isLoading ? "titlebar-refreshing" : ""}`}
              onClick={() => fetchAllViews()}
              title="새로고침"
            >
              <RefreshCw size={13} />
            </button>
            <div className="titlebar-poll-wrapper" ref={pollDropdownRef}>
              <button
                className={`titlebar-btn titlebar-poll-btn ${pollDropdownOpen ? "titlebar-btn-active" : ""}`}
                onClick={() => setPollDropdownOpen(!pollDropdownOpen)}
                title="갱신 주기"
              >
                <span className="titlebar-poll-label">{currentPollLabel}</span>
                <ChevronDown size={10} />
              </button>
              {pollDropdownOpen && (
                <div className="titlebar-poll-dropdown">
                  {POLL_INTERVAL_OPTIONS.map(({ label, value }) => (
                    <button
                      key={value}
                      className={`titlebar-poll-option ${value === pollIntervalMs ? "titlebar-poll-option-active" : ""}`}
                      onClick={() => {
                        setPollInterval(value);
                        setPollDropdownOpen(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className="titlebar-btn"
              onClick={logout}
              title="로그아웃"
            >
              <LogOut size={14} />
            </button>
          </>
        )}
        <button
          className="titlebar-btn"
          onClick={toggleTheme}
          title={theme === "light" ? "다크 모드" : "라이트 모드"}
        >
          {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
        </button>
        <button
          className={`titlebar-btn${isAlwaysOnTop ? " titlebar-btn-active" : ""}`}
          onClick={toggleAlwaysOnTop}
          title={isAlwaysOnTop ? "항상 위 해제" : "항상 위 고정"}
        >
          {isAlwaysOnTop ? <Pin size={14} /> : <PinOff size={14} />}
        </button>
      </div>
    </div>
  );
}
