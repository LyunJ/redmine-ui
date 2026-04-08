import { useIssueStore } from "../../stores/issueStore";
import { usePersonalTaskStore } from "../../stores/personalTaskStore";
import { IssueItem } from "./IssueItem";
import { PersonalTaskItem } from "./PersonalTaskItem";
import { SortControls } from "./SortControls";
import { ViewTabs } from "./ViewTabs";
import { FilterBar } from "./FilterBar";
import { TodoView } from "./TodoView";
import { AddTaskModal } from "./AddTaskModal";
import { BottomBar } from "../layout/BottomBar";
import { useTranslation } from "../../lib/i18n";
import { Loader2, Inbox } from "lucide-react";
import "./IssueList.css";

export function IssueList() {
  const { isLoading, error, getCurrentViewIssues, currentView } = useIssueStore();
  const { getCompletedTasks } = usePersonalTaskStore();
  const { t } = useTranslation();

  const EMPTY_KEYS: Record<string, string> = {
    todo: "empty.todo",
    assigned: "empty.assigned",
    reported: "empty.reported",
    completed: "empty.completed",
    personal_completed: "empty.personalCompleted",
  };

  const isTodoView = currentView === "todo";
  const isPersonalCompletedView = currentView === "personal_completed";
  const isRedmineView = !isTodoView && !isPersonalCompletedView;

  const issues = isRedmineView ? getCurrentViewIssues() : [];
  const completedTasks = isPersonalCompletedView ? getCompletedTasks() : [];

  const hasContent = isPersonalCompletedView
    ? completedTasks.length > 0
    : issues.length > 0;

  const showSortControls = isRedmineView;

  return (
    <div className="issue-list-container">
      <ViewTabs />
      {isTodoView && <FilterBar />}
      {showSortControls && <SortControls />}

      <div className="issue-list-scroll">
        {isTodoView ? (
          <TodoView />
        ) : isPersonalCompletedView ? (
          <>
            {!hasContent && (
              <div className="issue-list-empty">
                <Inbox size={32} />
                <span>{t(EMPTY_KEYS[currentView])}</span>
              </div>
            )}
            {completedTasks.map((task) => (
              <PersonalTaskItem key={task.id} task={task} />
            ))}
          </>
        ) : (
          <>
            {isLoading && !hasContent && (
              <div className="issue-list-empty">
                <Loader2 size={24} className="spin" />
                <span>{t("loading.issues")}</span>
              </div>
            )}

            {error && (
              <div className="issue-list-empty">
                <span className="issue-list-error">{error}</span>
              </div>
            )}

            {!isLoading && !error && !hasContent && (
              <div className="issue-list-empty">
                <Inbox size={32} />
                <span>{t(EMPTY_KEYS[currentView])}</span>
              </div>
            )}

            {issues.map((issue) => (
              <IssueItem key={issue.id} issue={issue} />
            ))}
          </>
        )}
      </div>

      <BottomBar />
      <AddTaskModal />
    </div>
  );
}
