import { useState, useEffect, useCallback, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { invoke } from "@tauri-apps/api/core";
import { Minus, X, Moon, Sun, LogOut, Maximize2, Minimize2, Pin, PinOff, RefreshCw, ChevronDown } from "lucide-react";
import { useSettingsStore, POLL_INTERVAL_OPTIONS } from "../../stores/settingsStore";
import { useAuthStore } from "../../stores/authStore";
import { useIssueStore } from "../../stores/issueStore";
import "./TitleBar.css";

export function TitleBar() {
  const { theme, toggleTheme, pollIntervalMs, setPollInterval } = useSettingsStore();
  const { isAuthenticated, currentUser, logout } = useAuthStore();
  const { fetchAllViews, isLoading } = useIssueStore();
  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(true);
  const [pollDropdownOpen, setPollDropdownOpen] = useState(false);
  const pollDropdownRef = useRef<HTMLDivElement>(null);
  const prevBounds = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

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

  useEffect(() => {
    // 초기 상태 확인
    appWindow.isMaximized().then(setIsMaximized);

    // 창 리사이즈 이벤트로 최대화 상태 추적
    const unlisten = appWindow.onResized(async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [appWindow]);

  const toggleMaximize = useCallback(async () => {
    const maximized = await appWindow.isMaximized();
    if (maximized) {
      // 이전 크기/위치로 복원
      if (prevBounds.current) {
        const { x, y, width, height } = prevBounds.current;
        await appWindow.unmaximize();
        await appWindow.setPosition(new LogicalPosition(x, y));
        await appWindow.setSize(new LogicalSize(width, height));
      } else {
        await appWindow.unmaximize();
      }
      setIsMaximized(false);
    } else {
      // 현재 크기/위치 저장
      const pos = await appWindow.outerPosition();
      const size = await appWindow.outerSize();
      const scaleFactor = await appWindow.scaleFactor();
      prevBounds.current = {
        x: pos.x / scaleFactor,
        y: pos.y / scaleFactor,
        width: size.width / scaleFactor,
        height: size.height / scaleFactor,
      };
      await appWindow.maximize();
      setIsMaximized(true);
    }
  }, [appWindow]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".titlebar-actions")) return;
    toggleMaximize();
  };

  return (
    <div className="titlebar" data-tauri-drag-region onDoubleClick={handleDoubleClick}>
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
        <button
          className="titlebar-btn"
          onClick={() => appWindow.minimize()}
          title="최소화"
        >
          <Minus size={14} />
        </button>
        <button
          className="titlebar-btn"
          onClick={toggleMaximize}
          title={isMaximized ? "이전 크기로" : "전체 화면"}
        >
          {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <button
          className="titlebar-btn titlebar-btn-close"
          onClick={() => invoke("quit_app")}
          title="종료"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
