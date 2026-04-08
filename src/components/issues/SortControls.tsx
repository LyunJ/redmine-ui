import { ArrowUpDown } from "lucide-react";
import { useIssueStore } from "../../stores/issueStore";
import { useTranslation } from "../../lib/i18n";
import type { SortField } from "../../types/app";
import "./SortControls.css";

export function SortControls() {
  const { sortField, sortDirection, setSortField } = useIssueStore();
  const { t } = useTranslation();

  const SORT_OPTIONS: { field: SortField; labelKey: string }[] = [
    { field: "created_on", labelKey: "sort.createdOn" },
    { field: "updated_on", labelKey: "sort.updatedOn" },
    { field: "due_date", labelKey: "sort.dueDate" },
  ];

  return (
    <div className="sort-controls">
      <div className="sort-controls-left">
        {SORT_OPTIONS.map(({ field, labelKey }) => (
          <button
            key={field}
            className={`sort-btn ${sortField === field ? "sort-btn-active" : ""}`}
            onClick={() => setSortField(field)}
          >
            {t(labelKey)}
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
