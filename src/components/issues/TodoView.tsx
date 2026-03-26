import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useIssueStore } from "../../stores/issueStore";
import { usePersonalTaskStore } from "../../stores/personalTaskStore";
import { useTodoStore, SECTION_COLORS } from "../../stores/todoStore";
import type { SectionSortMode } from "../../stores/todoStore";
import { applyFilter } from "../../lib/filterUtils";
import { IssueItem } from "./IssueItem";
import { PersonalTaskItem } from "./PersonalTaskItem";
import { Inbox, X, GripVertical, ArrowUpDown, ChevronRight, ChevronDown } from "lucide-react";
import type { RedmineIssue } from "../../types/redmine";
import type { PersonalTask } from "../../types/app";
import "./TodoView.css";

interface DragState {
  itemKey: string;
  startY: number;
  offsetY: number;
  el: HTMLElement;
  placeholder: HTMLElement | null;
}

export function TodoView() {
  const myIssues = useIssueStore((s) => s.issues);
  const allVisibleIssues = useIssueStore((s) => s.allVisibleIssues);
  const fetchedOnce = useIssueStore((s) => s.fetchedOnce);
  const error = useIssueStore((s) => s.error);
  const isUpdated = useIssueStore((s) => s.isUpdated);
  const tasks = usePersonalTaskStore((s) => s.tasks);
  const { sections, sectionItems, loaded: todoLoaded, syncItems, moveItem, updateSectionColor, updateSectionName, updateSectionSort, toggleSectionCollapse, deleteSection, filters, activeFilterId } =
    useTodoStore();

  // 활성 필터 조건 적용
  // 기본 필터: assigned_to=me 일감 (issues), 커스텀 필터: 전체 가시 일감에서 조건 적용
  const activeFilter = filters.find((f) => f.id === activeFilterId);
  const issues = useMemo(() => {
    if (!activeFilter || activeFilter.id === "default") return myIssues;
    if (activeFilter.conditions.length === 0) return allVisibleIssues;
    return applyFilter(allVisibleIssues, activeFilter.conditions);
  }, [myIssues, allVisibleIssues, activeFilter]);

  const includePersonalTasks = activeFilter?.includePersonalTasks ?? true;
  const activeTasks = includePersonalTasks ? tasks.filter((t) => !t.completed) : [];

  // Item lookup maps
  const issueMap = new Map<string, RedmineIssue>(issues.map((i) => [`issue:${i.id}`, i]));
  const taskMap = new Map<string, PersonalTask>(activeTasks.map((t) => [`task:${t.id}`, t]));

  // todoStore 로드 완료 + 일감이 최소 한 번 fetch된 후에만 sync
  useEffect(() => {
    if (!todoLoaded || !fetchedOnce) return;
    const allKeys = [...issues.map((i) => `issue:${i.id}`), ...activeTasks.map((t) => `task:${t.id}`)];
    syncItems(allKeys);
  }, [issues, tasks, syncItems, todoLoaded, fetchedOnce, activeFilterId]);

  // Mouse-based drag and drop
  const dragState = useRef<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<{ sectionId: string; index: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);

  const handleGripMouseDown = useCallback((e: React.MouseEvent, itemKey: string) => {
    e.preventDefault();
    e.stopPropagation();

    const itemEl = (e.currentTarget as HTMLElement).closest(".todo-item-wrap") as HTMLElement;
    if (!itemEl) return;

    const rect = itemEl.getBoundingClientRect();

    // placeholder 생성
    const placeholder = document.createElement("div");
    placeholder.className = "todo-drag-placeholder";
    placeholder.style.height = `${rect.height}px`;

    // 드래그 중인 요소 스타일
    itemEl.style.position = "fixed";
    itemEl.style.width = `${rect.width}px`;
    itemEl.style.left = `${rect.left}px`;
    itemEl.style.top = `${rect.top}px`;
    itemEl.style.zIndex = "1000";
    itemEl.style.pointerEvents = "none";
    itemEl.style.opacity = "0.85";
    itemEl.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)";
    itemEl.classList.add("todo-dragging-active");

    // placeholder를 원래 자리에 삽입
    itemEl.parentNode?.insertBefore(placeholder, itemEl);

    dragState.current = {
      itemKey,
      startY: e.clientY,
      offsetY: e.clientY - rect.top,
      el: itemEl,
      placeholder,
    };
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const ds = dragState.current;
      if (!ds) return;

      ds.el.style.top = `${e.clientY - ds.offsetY}px`;

      // 드롭 대상 결정
      const viewEl = viewRef.current;
      if (!viewEl) return;

      const allItems = viewEl.querySelectorAll(".todo-item-wrap:not(.todo-dragging-active)");
      const allSectionBodies = viewEl.querySelectorAll(".todo-section-body");

      let found = false;

      // 아이템 위에 있는지 확인
      for (const item of allItems) {
        const rect = item.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;

        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          const sectionId = item.getAttribute("data-section") ?? "";
          const idx = parseInt(item.getAttribute("data-index") ?? "0", 10);
          const targetIdx = e.clientY < midY ? idx : idx + 1;
          setDropTarget({ sectionId, index: targetIdx });
          found = true;
          break;
        }
      }

      // 빈 섹션 body 위에 있는지 확인
      if (!found) {
        for (const body of allSectionBodies) {
          const rect = body.getBoundingClientRect();
          if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
            const sectionId = body.getAttribute("data-section") ?? "";
            setDropTarget({ sectionId, index: 0 });
            found = true;
            break;
          }
        }
      }

      if (!found) {
        setDropTarget(null);
      }
    };

    const handleMouseUp = async () => {
      const ds = dragState.current;
      if (!ds) return;

      // 원래 스타일 복원
      ds.el.style.position = "";
      ds.el.style.width = "";
      ds.el.style.left = "";
      ds.el.style.top = "";
      ds.el.style.zIndex = "";
      ds.el.style.pointerEvents = "";
      ds.el.style.opacity = "";
      ds.el.style.boxShadow = "";
      ds.el.classList.remove("todo-dragging-active");

      // placeholder 제거
      ds.placeholder?.remove();

      const target = dropTarget;
      dragState.current = null;
      setIsDragging(false);
      setDropTarget(null);

      if (target) {
        await moveItem(ds.itemKey, target.sectionId, target.index);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dropTarget, moveItem]);

  // Section name editing
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingSectionId) editInputRef.current?.focus();
  }, [editingSectionId]);

  const commitRename = useCallback(() => {
    if (editingSectionId && editName.trim()) {
      updateSectionName(editingSectionId, editName.trim());
    }
    setEditingSectionId(null);
  }, [editingSectionId, editName, updateSectionName]);

  // Color picker
  const [colorPickerSectionId, setColorPickerSectionId] = useState<string | null>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!colorPickerSectionId) return;
    const handleClick = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setColorPickerSectionId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [colorPickerSectionId]);

  const totalItems = issues.length + activeTasks.length;
  const hasSections = sections.length > 1; // default 외 추가 섹션 존재

  if (error) {
    return (
      <div className="issue-list-empty">
        <span className="issue-list-error">{error}</span>
      </div>
    );
  }

  if (totalItems === 0 && !hasSections) {
    return (
      <div className="issue-list-empty">
        <Inbox size={32} />
        <span>해야할 일이 없습니다</span>
      </div>
    );
  }

  const getCreatedOn = (key: string): string => {
    if (key.startsWith("issue:")) {
      const issue = issueMap.get(key);
      return issue?.created_on ?? "";
    }
    const task = taskMap.get(key);
    return task?.created_on ?? "";
  };

  const sortItems = (keys: string[], sortMode: SectionSortMode): string[] => {
    if (sortMode === "manual") return keys;
    return [...keys].sort((a, b) => {
      const aDate = getCreatedOn(a);
      const bDate = getCreatedOn(b);
      return aDate.localeCompare(bDate);
    });
  };

  const renderItem = (key: string) => {
    if (key.startsWith("issue:")) {
      const issue = issueMap.get(key);
      return issue ? <IssueItem issue={issue} /> : null;
    }
    const task = taskMap.get(key);
    return task ? <PersonalTaskItem task={task} /> : null;
  };

  // 드롭 인디케이터 위치 계산
  const getDropIndicator = (sectionId: string, idx: number) => {
    if (!dropTarget) return false;
    return dropTarget.sectionId === sectionId && dropTarget.index === idx;
  };

  return (
    <div className="todo-view" ref={viewRef}>
      {sections.map((section) => {
        const rawItems = sectionItems[section.id] ?? [];
        const items = sortItems(rawItems, section.sortMode);
        return (
          <div key={section.id} className="todo-section">
            <div className="todo-section-header" style={{ borderLeftColor: section.color }}>
              <div className="todo-section-left">
                <button
                  className="todo-section-toggle"
                  onClick={() => toggleSectionCollapse(section.id)}
                  title={section.collapsed ? "섹션 펼치기" : "섹션 접기"}
                >
                  {section.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
                <div className="todo-color-picker-wrap" ref={colorPickerSectionId === section.id ? colorPickerRef : null}>
                  <button
                    className="todo-color-dot"
                    style={{ background: section.color }}
                    onClick={() => setColorPickerSectionId(colorPickerSectionId === section.id ? null : section.id)}
                  />
                  {colorPickerSectionId === section.id && (
                    <div className="todo-color-palette">
                      {SECTION_COLORS.map((c) => (
                        <button
                          key={c}
                          className={`todo-color-option ${c === section.color ? "todo-color-active" : ""}`}
                          style={{ background: c }}
                          onClick={() => {
                            updateSectionColor(section.id, c);
                            setColorPickerSectionId(null);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {editingSectionId === section.id ? (
                  <input
                    ref={editInputRef}
                    className="todo-section-name-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setEditingSectionId(null);
                    }}
                  />
                ) : (
                  <span
                    className="todo-section-name"
                    onDoubleClick={() => {
                      setEditingSectionId(section.id);
                      setEditName(section.name);
                    }}
                  >
                    {section.name}
                  </span>
                )}
                <span className="todo-section-count">{items.length}</span>
                {(() => {
                  const updatedCount = items.filter((key) => {
                    if (!key.startsWith("issue:")) return false;
                    const issue = issueMap.get(key);
                    return issue && isUpdated(issue);
                  }).length;
                  return updatedCount > 0 ? (
                    <span className="todo-section-updated-count">{updatedCount}</span>
                  ) : null;
                })()}
              </div>
              <button
                className={`todo-section-sort ${section.sortMode !== "manual" ? "todo-section-sort-active" : ""}`}
                onClick={() => updateSectionSort(section.id, section.sortMode === "manual" ? "created_on" : "manual")}
                title={section.sortMode === "manual" ? "등록일 순 정렬" : "정렬 없음 (수동)"}
              >
                <ArrowUpDown size={12} />
              </button>
              {section.id !== "default" && (
                <button className="todo-section-delete" onClick={() => deleteSection(section.id)} title="섹션 삭제">
                  <X size={12} />
                </button>
              )}
            </div>

            {!section.collapsed && (
              <div className="todo-section-body" data-section={section.id}>
                {getDropIndicator(section.id, 0) && items.length === 0 && (
                  <div className="todo-drop-indicator" />
                )}
                {items.length === 0 && !isDragging && (
                  <div className="todo-section-empty">항목이 없습니다</div>
                )}
                {items.length === 0 && isDragging && !getDropIndicator(section.id, 0) && (
                  <div className="todo-section-drop-zone">여기에 놓기</div>
                )}
                {items.map((key, idx) => (
                  <div key={key}>
                    {getDropIndicator(section.id, idx) && (
                      <div className="todo-drop-indicator" />
                    )}
                    <div className="todo-item-wrap" data-section={section.id} data-index={idx}>
                      {section.sortMode === "manual" ? (
                        <div
                          className="todo-drag-handle"
                          onMouseDown={(e) => handleGripMouseDown(e, key)}
                        >
                          <GripVertical size={14} />
                        </div>
                      ) : (
                        <div className="todo-drag-handle-spacer" />
                      )}
                      <div className="todo-item-content">
                        {renderItem(key)}
                      </div>
                    </div>
                  </div>
                ))}
                {getDropIndicator(section.id, items.length) && items.length > 0 && (
                  <div className="todo-drop-indicator" />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
