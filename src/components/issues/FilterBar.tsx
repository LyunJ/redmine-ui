import { useState } from "react";
import { Plus, X, Pencil } from "lucide-react";
import { useTodoStore } from "../../stores/todoStore";
import { FilterEditor } from "./FilterEditor";
import { useTranslation } from "../../lib/i18n";
import type { CustomFilter } from "../../types/app";
import "./FilterBar.css";

export function FilterBar() {
  const { filters, activeFilterId, setActiveFilter, deleteFilter } = useTodoStore();
  const { t } = useTranslation();
  const [showEditor, setShowEditor] = useState(false);
  const [editingFilter, setEditingFilter] = useState<CustomFilter | null>(null);

  const handleEdit = (filter: CustomFilter) => {
    if (filter.id === "default") return;
    setEditingFilter(filter);
    setShowEditor(true);
  };

  const handleAdd = () => {
    setEditingFilter(null);
    setShowEditor(true);
  };

  return (
    <>
      <div className="filter-bar">
        <div className="filter-bar-list">
          {filters.map((filter) => (
            <div
              key={filter.id}
              className={`filter-chip ${activeFilterId === filter.id ? "filter-chip-active" : ""}`}
            >
              <button
                className="filter-chip-label"
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.name}
              </button>
              {filter.id !== "default" && activeFilterId === filter.id && (
                <div className="filter-chip-actions">
                  <button
                    className="filter-chip-action"
                    onClick={(e) => { e.stopPropagation(); handleEdit(filter); }}
                    title={t("filter.edit")}
                  >
                    <Pencil size={10} />
                  </button>
                  <button
                    className="filter-chip-action"
                    onClick={(e) => { e.stopPropagation(); deleteFilter(filter.id); }}
                    title={t("filter.delete")}
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
            </div>
          ))}
          <button className="filter-add-btn" onClick={handleAdd} title={t("filter.add")}>
            <Plus size={12} />
          </button>
        </div>
      </div>

      {showEditor && (
        <FilterEditor
          filter={editingFilter}
          onClose={() => { setShowEditor(false); setEditingFilter(null); }}
        />
      )}
    </>
  );
}
