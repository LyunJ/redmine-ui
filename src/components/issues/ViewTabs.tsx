import { useIssueStore } from "../../stores/issueStore";
import type { ViewTab } from "../../types/app";
import "./ViewTabs.css";

const VIEW_OPTIONS: { tab: ViewTab; label: string }[] = [
  { tab: "todo", label: "해야할 일" },
  { tab: "assigned", label: "담당 일감" },
  { tab: "reported", label: "보고한 일감" },
  { tab: "completed", label: "완료된 일감" },
  { tab: "personal_completed", label: "완료된 개인 작업" },
];

export function ViewTabs() {
  const { currentView, setCurrentView } = useIssueStore();

  return (
    <div className="view-tabs">
      {VIEW_OPTIONS.map(({ tab, label }) => (
        <button
          key={tab}
          className={`view-tab ${currentView === tab ? "view-tab-active" : ""}`}
          onClick={() => setCurrentView(tab)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
