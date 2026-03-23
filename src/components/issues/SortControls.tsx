import { useState, useRef, useEffect } from "react";
import { ArrowUpDown, RefreshCw, ChevronDown } from "lucide-react";
import { useIssueStore } from "../../stores/issueStore";
import { useSettingsStore, POLL_INTERVAL_OPTIONS } from "../../stores/settingsStore";
import type { SortField } from "../../types/app";
import "./SortControls.css";

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: "created_on", label: "등록일" },
  { field: "updated_on", label: "수정일" },
  { field: "due_date", label: "완료예정일" },
];

export function SortControls() {
  const { sortField, sortDirection, setSortField, fetchAllViews, isLoading } = useIssueStore();
  const { pollIntervalMs, setPollInterval } = useSettingsStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLabel = POLL_INTERVAL_OPTIONS.find(o => o.value === pollIntervalMs)?.label ?? "1m";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

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

      <div className="refresh-controls" ref={dropdownRef}>
        <button
          className={`sort-btn refresh-btn ${isLoading ? "refreshing" : ""}`}
          onClick={() => fetchAllViews()}
          title="새로고침"
        >
          <RefreshCw size={13} />
        </button>
        <button
          className={`sort-btn interval-btn ${dropdownOpen ? "sort-btn-active" : ""}`}
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <span className="interval-label">{currentLabel}</span>
          <ChevronDown size={11} />
        </button>
        {dropdownOpen && (
          <div className="interval-dropdown">
            {POLL_INTERVAL_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                className={`interval-option ${value === pollIntervalMs ? "interval-option-active" : ""}`}
                onClick={() => {
                  setPollInterval(value);
                  setDropdownOpen(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
