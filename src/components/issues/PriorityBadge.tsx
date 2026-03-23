import type { RedmineNamedId } from "../../types/redmine";
import "./PriorityBadge.css";

interface Props {
  priority: RedmineNamedId;
}

function getPriorityClass(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("urgent") || lower === "긴급") return "priority-urgent";
  if (lower.includes("high") || lower === "높음") return "priority-high";
  if (lower.includes("low") || lower === "낮음") return "priority-low";
  return "priority-normal";
}

export function PriorityBadge({ priority }: Props) {
  return (
    <span className={`priority-badge ${getPriorityClass(priority.name)}`}>
      {priority.name}
    </span>
  );
}
