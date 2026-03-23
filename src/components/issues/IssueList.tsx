import { useIssueStore } from "../../stores/issueStore";
import { usePersonalTaskStore } from "../../stores/personalTaskStore";
import { IssueItem } from "./IssueItem";
import { PersonalTaskItem } from "./PersonalTaskItem";
import { SortControls } from "./SortControls";
import { ViewTabs } from "./ViewTabs";
import { TodoView } from "./TodoView";
import { AddTaskModal } from "./AddTaskModal";
import { BottomBar } from "../layout/BottomBar";
import { Loader2, Inbox } from "lucide-react";
import "./IssueList.css";

const EMPTY_MESSAGES: Record<string, string> = {
  todo: "해야할 일이 없습니다",
  assigned: "진행할 일감이 없습니다",
  reported: "보고한 일감이 없습니다",
  completed: "완료된 일감이 없습니다",
  personal_completed: "완료된 개인 작업이 없습니다",
};

export function IssueList() {
  const { isLoading, error, getCurrentViewIssues, currentView } = useIssueStore();
  const { getCompletedTasks } = usePersonalTaskStore();

  const isTodoView = currentView === "todo";
  const isPersonalCompletedView = currentView === "personal_completed";

  const issues = isTodoView ? [] : getCurrentViewIssues();
  const completedTasks = isPersonalCompletedView ? getCompletedTasks() : [];

  const hasContent = isPersonalCompletedView
    ? completedTasks.length > 0
    : issues.length > 0;

  const showSortControls = !isPersonalCompletedView && !isTodoView;

  return (
    <div className="issue-list-container">
      <ViewTabs />
      {showSortControls && <SortControls />}

      <div className="issue-list-scroll">
        {isTodoView ? (
          <TodoView />
        ) : (
          <>
            {isLoading && !hasContent && (
              <div className="issue-list-empty">
                <Loader2 size={24} className="spin" />
                <span>일감을 불러오는 중...</span>
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
                <span>{EMPTY_MESSAGES[currentView]}</span>
              </div>
            )}

            {isPersonalCompletedView
              ? completedTasks.map((task) => (
                  <PersonalTaskItem key={task.id} task={task} />
                ))
              : issues.map((issue) => (
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
