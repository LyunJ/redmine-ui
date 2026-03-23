import type { RedmineIssue } from "../../types/redmine";
import { PriorityBadge } from "./PriorityBadge";
import { ProgressBar } from "./ProgressBar";
import { useIssueStore } from "../../stores/issueStore";
import "./IssueItem.css";

interface Props {
  issue: RedmineIssue;
}

export function IssueItem({ issue }: Props) {
  const { isUpdated, selectIssue } = useIssueStore();
  const updated = isUpdated(issue);

  const handleClick = () => {
    selectIssue(issue.id);
  };

  return (
    <div
      className={`issue-item ${updated ? "issue-updated" : ""}`}
      onClick={handleClick}
    >
      <div className="issue-header">
        <div className="issue-title-row">
          {updated && <span className="issue-dot" />}
          <span className="issue-badge">일감</span>
          <span className="issue-id">#{issue.id}</span>
          <span className="issue-subject">{issue.subject}</span>
        </div>
        <PriorityBadge priority={issue.priority} />
      </div>

      <div className="issue-meta">
        <span className="issue-assignee">
          {issue.assigned_to?.name ?? "-"}
        </span>
        <ProgressBar startDate={issue.start_date} dueDate={issue.due_date} />
      </div>
    </div>
  );
}
