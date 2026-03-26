import { useState } from "react";
import { Plus, X, Pencil } from "lucide-react";
import { useTodoStore } from "../../stores/todoStore";
import { FilterEditor } from "./FilterEditor";
import type { CustomFilter } from "../../types/app";
import "./FilterBar.css";

export function FilterBar() {
  const { filters, activeFilterId, setActiveFilter, deleteFilter } = useTodoStore();
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
                    title="필터 편집"
                  >
                    <Pencil size={10} />
                  </button>
                  <button
                    className="filter-chip-action"
                    onClick={(e) => { e.stopPropagation(); deleteFilter(filter.id); }}
                    title="필터 삭제"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
            </div>
          ))}
          <button className="filter-add-btn" onClick={handleAdd} title="필터 추가">
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
