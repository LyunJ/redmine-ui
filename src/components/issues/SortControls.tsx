import { ArrowUpDown } from "lucide-react";
import { useIssueStore } from "../../stores/issueStore";
import type { SortField } from "../../types/app";
import "./SortControls.css";

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: "created_on", label: "등록일" },
  { field: "updated_on", label: "수정일" },
  { field: "due_date", label: "완료예정일" },
];

export function SortControls() {
  const { sortField, sortDirection, setSortField } = useIssueStore();

  return (
    <div className="sort-controls">
      <div className="sort-controls-left">
        {SORT_OPTIONS.map(({ field, label }) => (
          <button
            key={field}
            className={`sort-btn ${sortField === field ? "sort-btn-active" : ""}`}
            onClick={() => setSortField(field)}
          >
            {label}
            {sortField === field && (
              <ArrowUpDown
                size={12}
                className={sortDirection === "asc" ? "sort-icon-asc" : ""}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
