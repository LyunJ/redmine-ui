import { useEffect, useRef } from "react";
import { useAuthStore } from "./stores/authStore";
import { useIssueStore } from "./stores/issueStore";
import { useSettingsStore } from "./stores/settingsStore";
import { usePersonalTaskStore } from "./stores/personalTaskStore";
import { useTodoStore } from "./stores/todoStore";
import { TitleBar } from "./components/layout/TitleBar";
import { LoginForm } from "./components/auth/LoginForm";
import { IssueList } from "./components/issues/IssueList";
import { IssueDetail } from "./components/issues/IssueDetail";
import { PersonalTaskDetail } from "./components/issues/PersonalTaskDetail";
import { IssueEditModal } from "./components/issues/IssueEditModal";
import { LoadingSpinner } from "./components/common/LoadingSpinner";
import "./styles/global.css";

function App() {
  const { isAuthenticated, isLoading: authLoading, loadSavedCredentials } = useAuthStore();
  const { fetchAllViews, loadLastSeen, selectedIssue, isLoadingDetail } = useIssueStore();
  const { initTheme, initPollInterval, initLanguage, pollIntervalMs } = useSettingsStore();
  const { loadTasks, selectedTask } = usePersonalTaskStore();
  const { loadTodoData } = useTodoStore();
  const initialized = useRef(false);

  // 앱 초기화 (store load를 직렬화하여 macOS WKWebView IPC 병목 방지)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    initTheme();
    initPollInterval();
    initLanguage();

    const init = async () => {
      await loadSavedCredentials();
      await loadLastSeen();
      await loadTodoData();
      await loadTasks();
    };
    init();
  }, [initTheme, initPollInterval, initLanguage, loadSavedCredentials, loadLastSeen, loadTodoData, loadTasks]);

  // 인증 후 일감 조회 + polling
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchAllViews();

    if (pollIntervalMs <= 0) return;

    const interval = setInterval(() => {
      fetchAllViews();
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchAllViews, pollIntervalMs]);

  const renderContent = () => {
    if (authLoading) return <LoadingSpinner />;
    if (!isAuthenticated) return <LoginForm />;
    if (selectedIssue || isLoadingDetail) return <IssueDetail />;
    if (selectedTask) return <PersonalTaskDetail />;
    return <IssueList />;
  };

  return (
    <>
      <TitleBar />
      {renderContent()}
      <IssueEditModal />
    </>
  );
}

export default App;
