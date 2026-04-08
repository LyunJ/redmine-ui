import { useIssueStore } from "../../stores/issueStore";
import { useTranslation } from "../../lib/i18n";
import type { ViewTab } from "../../types/app";
import "./ViewTabs.css";

export function ViewTabs() {
  const { currentView, setCurrentView } = useIssueStore();
  const { t } = useTranslation();

  const VIEW_OPTIONS: { tab: ViewTab; labelKey: string }[] = [
    { tab: "todo", labelKey: "tab.todo" },
    { tab: "assigned", labelKey: "tab.assigned" },
    { tab: "reported", labelKey: "tab.reported" },
    { tab: "completed", labelKey: "tab.completed" },
    { tab: "personal_completed", labelKey: "tab.personalCompleted" },
  ];

  return (
    <div className="view-tabs">
      {VIEW_OPTIONS.map(({ tab, labelKey }) => (
        <button
          key={tab}
          className={`view-tab ${currentView === tab ? "view-tab-active" : ""}`}
          onClick={() => setCurrentView(tab)}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
