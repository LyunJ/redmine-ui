import { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useIssueStore } from "../../stores/issueStore";
import { useTodoStore } from "../../stores/todoStore";
import { applyFilter } from "../../lib/filterUtils";
import type { CustomFilter, FilterCondition, FilterField, FilterOperator } from "../../types/app";
import type { RedmineNamedId } from "../../types/redmine";
import "./FilterEditor.css";

const FIELD_OPTIONS: { value: FilterField; label: string }[] = [
  { value: "status", label: "상태" },
  { value: "priority", label: "우선순위" },
  { value: "tracker", label: "트래커" },
  { value: "project", label: "프로젝트" },
  { value: "assigned_to", label: "담당자" },
  { value: "start_date", label: "시작일" },
  { value: "due_date", label: "완료예정일" },
  { value: "created_on", label: "등록일" },
  { value: "updated_on", label: "수정일" },
  { value: "done_ratio", label: "진행률" },
];

const NAMED_ID_FIELDS: FilterField[] = ["status", "priority", "tracker", "project", "assigned_to"];
const DATE_FIELDS: FilterField[] = ["start_date", "due_date", "created_on", "updated_on"];

function getOperatorLabel(op: FilterOperator, field: FilterField): string {
  if (DATE_FIELDS.includes(field) || field === "done_ratio") {
    switch (op) {
      case "eq": return "=";
      case "neq": return "≠";
      case "gte": return "≥";
      case "lte": return "≤";
    }
  }
  switch (op) {
    case "eq": return "=";
    case "neq": return "≠";
    default: return op;
  }
}

function getOperatorsForField(field: FilterField): FilterOperator[] {
  if (NAMED_ID_FIELDS.includes(field)) return ["eq", "neq"];
  return ["eq", "neq", "gte", "lte"];
}

interface FilterEditorProps {
  filter: CustomFilter | null; // null = 새 필터
  onClose: () => void;
}

export function FilterEditor({ filter, onClose }: FilterEditorProps) {
  const allVisibleIssues = useIssueStore((s) => s.allVisibleIssues);
  const { addFilter, updateFilter } = useTodoStore();

  const [name, setName] = useState(filter?.name ?? "");
  const [conditions, setConditions] = useState<FilterCondition[]>(filter?.conditions ?? []);
  const [includePersonalTasks, setIncludePersonalTasks] = useState(filter?.includePersonalTasks ?? true);

  // 전체 가시 일감에서 고유 값 추출
  const fieldOptions = useMemo(() => {
    const extract = (field: FilterField): RedmineNamedId[] => {
      const map = new Map<number, string>();
      for (const issue of allVisibleIssues) {
        let val: RedmineNamedId | undefined;
        switch (field) {
          case "status": val = issue.status; break;
          case "priority": val = issue.priority; break;
          case "tracker": val = issue.tracker; break;
          case "project": val = issue.project; break;
          case "assigned_to": val = issue.assigned_to; break;
        }
        if (val && !map.has(val.id)) {
          map.set(val.id, val.name);
        }
      }
      return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    };

    const result: Record<string, RedmineNamedId[]> = {};
    for (const field of NAMED_ID_FIELDS) {
      result[field] = extract(field);
    }
    return result;
  }, [allVisibleIssues]);

  // 실시간 미리보기: 현재 조건으로 필터링된 일감 목록
  const previewIssues = useMemo(() => {
    const validConditions = conditions.filter((c) => c.value !== "");
    return applyFilter(allVisibleIssues, validConditions);
  }, [allVisibleIssues, conditions]);

  const addCondition = () => {
    setConditions([...conditions, { field: "status", operator: "eq", value: "" }]);
  };

  const removeCondition = (idx: number) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const updateCondition = (idx: number, updates: Partial<FilterCondition>) => {
    setConditions(conditions.map((c, i) => {
      if (i !== idx) return c;
      const updated = { ...c, ...updates };
      // 필드 변경 시 operator와 value 초기화
      if (updates.field && updates.field !== c.field) {
        updated.operator = getOperatorsForField(updates.field)[0];
        updated.value = "";
      }
      return updated;
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (filter) {
      await updateFilter(filter.id, { name: name.trim(), conditions, includePersonalTasks });
    } else {
      await addFilter({ name: name.trim(), conditions, includePersonalTasks });
    }
    onClose();
  };

  const renderValueInput = (cond: FilterCondition, idx: number) => {
    if (NAMED_ID_FIELDS.includes(cond.field)) {
      const options = fieldOptions[cond.field] ?? [];
      return (
        <select
          className="filter-editor-select"
          value={cond.value}
          onChange={(e) => updateCondition(idx, { value: e.target.value })}
        >
          <option value="">선택</option>
          {options.map((opt) => (
            <option key={opt.id} value={String(opt.id)}>{opt.name}</option>
          ))}
        </select>
      );
    }

    if (DATE_FIELDS.includes(cond.field)) {
      return (
        <input
          type="date"
          className="filter-editor-input"
          value={cond.value}
          onChange={(e) => updateCondition(idx, { value: e.target.value })}
        />
      );
    }

    // done_ratio
    return (
      <input
        type="number"
        className="filter-editor-input"
        min="0"
        max="100"
        value={cond.value}
        onChange={(e) => updateCondition(idx, { value: e.target.value })}
        placeholder="0-100"
      />
    );
  };

  return (
    <div className="filter-editor-overlay" onClick={onClose}>
      <div className="filter-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="filter-editor-header">
          {filter ? "필터 편집" : "필터 추가"}
        </div>

        <div className="filter-editor-body">
          <div className="filter-editor-row">
            <label className="filter-editor-label">필터 이름</label>
            <input
              className="filter-editor-input filter-editor-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="필터 이름"
              autoFocus
            />
          </div>

          <div className="filter-editor-row">
            <label className="filter-editor-label">
              <input
                type="checkbox"
                checked={includePersonalTasks}
                onChange={(e) => setIncludePersonalTasks(e.target.checked)}
              />
              개인 작업 포함
            </label>
          </div>

          <div className="filter-editor-conditions">
            <div className="filter-editor-conditions-header">
              <span className="filter-editor-label">조건</span>
              <button className="filter-editor-add-btn" onClick={addCondition}>
                <Plus size={12} />
                조건 추가
              </button>
            </div>

            {conditions.length === 0 && (
              <div className="filter-editor-empty">조건 없음 (모든 일감 표시)</div>
            )}

            {conditions.map((cond, idx) => (
              <div key={idx} className="filter-editor-condition">
                <select
                  className="filter-editor-select"
                  value={cond.field}
                  onChange={(e) => updateCondition(idx, { field: e.target.value as FilterField })}
                >
                  {FIELD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <select
                  className="filter-editor-select filter-editor-op"
                  value={cond.operator}
                  onChange={(e) => updateCondition(idx, { operator: e.target.value as FilterOperator })}
                >
                  {getOperatorsForField(cond.field).map((op) => (
                    <option key={op} value={op}>{getOperatorLabel(op, cond.field)}</option>
                  ))}
                </select>

                {renderValueInput(cond, idx)}

                <button className="filter-editor-remove-btn" onClick={() => removeCondition(idx)}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* 실시간 미리보기 */}
          <div className="filter-editor-preview">
            <div className="filter-editor-preview-header">
              <span className="filter-editor-label">미리보기</span>
              <span className="filter-editor-preview-count">{previewIssues.length}건</span>
            </div>
            <div className="filter-editor-preview-list">
              {previewIssues.length === 0 ? (
                <div className="filter-editor-preview-empty">조건에 맞는 일감이 없습니다</div>
              ) : (
                previewIssues.slice(0, 50).map((issue) => (
                  <div key={issue.id} className="filter-editor-preview-item">
                    <span className="filter-editor-preview-id">#{issue.id}</span>
                    <span className="filter-editor-preview-subject">{issue.subject}</span>
                  </div>
                ))
              )}
              {previewIssues.length > 50 && (
                <div className="filter-editor-preview-more">
                  ...외 {previewIssues.length - 50}건
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="filter-editor-footer">
          <button className="filter-editor-cancel" onClick={onClose}>취소</button>
          <button
            className="filter-editor-save"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            {filter ? "저장" : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}
