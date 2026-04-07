import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { useIssueStore } from "../../stores/issueStore";
import { useTodoStore } from "../../stores/todoStore";
import { applyFilter } from "../../lib/filterUtils";
import type { CustomFilter, FilterCondition, FilterField, FilterOperator } from "../../types/app";
import "./FilterEditor.css";

interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function SearchableSelect({ options, value, onChange, placeholder = "선택" }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    const handleScroll = (e: Event) => {
      if (containerRef.current && containerRef.current.contains(e.target as Node)) return;
      setOpen(false);
      setQuery("");
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  const handleToggle = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 2,
        left: rect.left,
        width: Math.max(rect.width, 160),
        zIndex: 3000,
      });
    }
    setOpen((v) => !v);
    setQuery("");
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery("");
  };

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const selected = options.find((o) => o.value === value);

  return (
    <div className="filter-searchable-select" ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`filter-searchable-trigger${open ? " open" : ""}`}
        onClick={handleToggle}
      >
        <span className="filter-searchable-trigger-text">
          {selected ? selected.label : <span className="filter-searchable-placeholder">{placeholder}</span>}
        </span>
        <ChevronDown size={10} />
      </button>

      {open && (
        <div className="filter-searchable-dropdown" style={dropdownStyle}>
          <input
            type="text"
            className="filter-searchable-search"
            placeholder="검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="filter-searchable-list">
            <div
              className={`filter-searchable-item${value === "" ? " selected" : ""}`}
              onMouseDown={() => handleSelect("")}
            >
              {placeholder}
            </div>
            {filtered.map((opt) => (
              <div
                key={opt.value}
                className={`filter-searchable-item${opt.value === value ? " selected" : ""}`}
                onMouseDown={() => handleSelect(opt.value)}
              >
                {opt.label}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="filter-searchable-empty">검색 결과 없음</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  if (field.startsWith("cf_")) return ["eq", "neq", "gte", "lte"];
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

  // 전체 가시 일감에서 표준 필드 고유 값 추출
  const fieldOptions = useMemo(() => {
    const extract = (field: FilterField): SearchableSelectOption[] => {
      const map = new Map<number, string>();
      for (const issue of allVisibleIssues) {
        let val: { id: number; name: string } | undefined;
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
      return Array.from(map.entries()).map(([id, name]) => ({ value: String(id), label: name }));
    };

    const result: Record<string, SearchableSelectOption[]> = {};
    for (const field of NAMED_ID_FIELDS) {
      result[field] = extract(field);
    }

    return result;
  }, [allVisibleIssues]);

  // allVisibleIssues에서 userId → 이름 맵 구축 (커스텀 필드 user ID 해석용)
  const userNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const issue of allVisibleIssues) {
      if (issue.assigned_to) {
        map.set(String(issue.assigned_to.id), issue.assigned_to.name);
      }
    }
    return map;
  }, [allVisibleIssues]);

  // 커스텀 필드 메타(id, name) 및 고유 값 추출
  const { customFieldMeta, customFieldValues } = useMemo(() => {
    const metaMap = new Map<number, string>();
    const valuesMap = new Map<number, Set<string>>();

    for (const issue of allVisibleIssues) {
      for (const cf of issue.custom_fields ?? []) {
        if (!metaMap.has(cf.id)) metaMap.set(cf.id, cf.name);
        if (!valuesMap.has(cf.id)) valuesMap.set(cf.id, new Set());
        if (cf.value !== null) {
          const str = Array.isArray(cf.value) ? cf.value.join(",") : cf.value;
          if (str !== "") valuesMap.get(cf.id)!.add(str);
        }
      }
    }

    const customFieldMeta = Array.from(metaMap.entries()).map(([id, name]) => ({ id, name }));
    const customFieldValues: Record<string, string[]> = {};
    for (const [id, vals] of valuesMap.entries()) {
      customFieldValues[`cf_${id}`] = Array.from(vals).sort();
    }

    return { customFieldMeta, customFieldValues };
  }, [allVisibleIssues]);

  // 표준 필드 + 커스텀 필드 통합 목록
  const allFieldOptions = useMemo(() => {
    const cfOptions = customFieldMeta.map(({ id, name }) => ({
      value: `cf_${id}` as FilterField,
      label: name,
    }));
    return [...FIELD_OPTIONS, ...cfOptions];
  }, [customFieldMeta]);

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
        <SearchableSelect
          options={options}
          value={cond.value}
          onChange={(val) => updateCondition(idx, { value: val })}
        />
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

    if (cond.field.startsWith("cf_")) {
      const knownValues = customFieldValues[cond.field] ?? [];
      const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
      const isDateField = knownValues.length > 0 && knownValues.every((v) => DATE_PATTERN.test(v));
      if (isDateField) {
        return (
          <input
            type="date"
            className="filter-editor-input"
            value={cond.value}
            onChange={(e) => updateCondition(idx, { value: e.target.value })}
          />
        );
      }
      if (knownValues.length > 0) {
        const options: SearchableSelectOption[] = knownValues.map((v) => ({
          value: v,
          label: userNameMap.get(v) ?? v,
        }));
        return (
          <SearchableSelect
            options={options}
            value={cond.value}
            onChange={(val) => updateCondition(idx, { value: val })}
          />
        );
      }
      return (
        <input
          type="text"
          className="filter-editor-input"
          value={cond.value}
          onChange={(e) => updateCondition(idx, { value: e.target.value })}
          placeholder="값 입력"
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
                  {allFieldOptions.map((opt) => (
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
