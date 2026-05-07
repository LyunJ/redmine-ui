import { useState, useEffect, useRef, useMemo } from "react";
import { X, Loader2 } from "lucide-react";
import { useIssueStore } from "../../stores/issueStore";
import { useAuthStore } from "../../stores/authStore";
import { useTranslation } from "../../lib/i18n";
import { SearchableSelect } from "./FilterEditor";
import { MarkupEditor } from "../common/MarkupEditor";
import type {
  RedmineIssueStatus,
  RedmineIssuePriority,
  RedmineProject,
  RedmineTracker,
  RedmineMember,
  RedmineCustomFieldDef,
} from "../../types/redmine";
import "./IssueEditModal.css";

function renderCustomFieldInput(
  def: RedmineCustomFieldDef,
  value: string | string[] | undefined,
  onChange: (val: string | string[]) => void,
  assigneeOptions?: Array<{ value: string; label: string }>,
): React.ReactNode {
  const strValue = Array.isArray(value) ? "" : (value ?? "");
  const arrValue = Array.isArray(value) ? value : (value ? [value] : []);

  switch (def.field_format) {
    case "date":
      return (
        <input
          className="issue-edit-input"
          type="date"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "bool":
      return (
        <div className="issue-edit-bool-field">
          <input
            type="checkbox"
            checked={strValue === "1"}
            onChange={(e) => onChange(e.target.checked ? "1" : "0")}
            id={`cf-bool-${def.id}`}
          />
          <label htmlFor={`cf-bool-${def.id}`}>{def.name}</label>
        </div>
      );
    case "int":
      return (
        <input
          className="issue-edit-input"
          type="number"
          step="1"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "float":
      return (
        <input
          className="issue-edit-input"
          type="number"
          step="any"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "text":
      return (
        <textarea
          className="issue-edit-textarea"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      );
    case "list":
      if (def.multiple) {
        return (
          <div className="issue-edit-multi-check">
            {(def.possible_values ?? []).map((pv) => (
              <label key={pv.value} className="issue-edit-check-item">
                <input
                  type="checkbox"
                  checked={arrValue.includes(pv.value)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...arrValue, pv.value]
                      : arrValue.filter((v) => v !== pv.value);
                    onChange(next);
                  }}
                />
                {pv.value}
              </label>
            ))}
          </div>
        );
      }
      return (
        <select
          className="issue-edit-select"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">-</option>
          {(def.possible_values ?? []).map((pv) => (
            <option key={pv.value} value={pv.value}>{pv.value}</option>
          ))}
        </select>
      );
    case "user":
      if (def.multiple) {
        return (
          <select
            className="issue-edit-select"
            multiple
            value={arrValue}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
              onChange(selected);
            }}
          >
            {(assigneeOptions ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      }
      return (
        <SearchableSelect
          options={assigneeOptions ?? []}
          value={strValue}
          onChange={(v) => onChange(v)}
          placeholder="-"
        />
      );
    default:
      return (
        <input
          className="issue-edit-input"
          type="text"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export function IssueEditModal() {
  const { isCreateModalOpen, editingIssueId, closeEditModal, createIssue, updateIssue, selectedIssue, statusMap } = useIssueStore();
  const allVisibleIssues = useIssueStore((s) => s.allVisibleIssues);
  const { client } = useAuthStore();
  const { t } = useTranslation();

  const isEdit = editingIssueId !== null;
  const issue = isEdit ? selectedIssue : null;

  // Form state
  const [projectId, setProjectId] = useState("");
  const [trackerId, setTrackerId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [doneRatio, setDoneRatio] = useState("");

  // Loaded options
  const [projects, setProjects] = useState<RedmineProject[]>([]);
  const [trackers, setTrackers] = useState<RedmineTracker[]>([]);
  const [priorities, setPriorities] = useState<RedmineIssuePriority[]>([]);
  const [statuses, setStatuses] = useState<RedmineIssueStatus[]>([]);
  const [members, setMembers] = useState<RedmineMember[]>([]);

  // Custom fields
  const [customFieldDefs, setCustomFieldDefs] = useState<RedmineCustomFieldDef[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<number, string | string[]>>({});

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjectRef = useRef<HTMLInputElement>(null);

  // Load base data when modal opens
  useEffect(() => {
    if (!isCreateModalOpen || !client) return;

    setError(null);
    setIsSaving(false);
    setIsLoadingData(true);

    const load = async () => {
      try {
        const [fetchedProjects, fetchedTrackers, fetchedPriorities, fetchedCustomFieldDefs] = await Promise.all([
          client.getProjects(),
          client.getTrackers(),
          client.getIssuePriorities(),
          client.getCustomFieldDefs(),
        ]);
        setProjects(fetchedProjects);
        setTrackers(fetchedTrackers);
        setPriorities(fetchedPriorities);
        setStatuses(statusMap);
        setCustomFieldDefs(fetchedCustomFieldDefs);

        const cfValues: Record<number, string | string[]> = {};

        if (isEdit && issue) {
          // 수정 모드: 기존 값으로 채우기
          setProjectId(String(issue.project.id));
          setTrackerId(String(issue.tracker.id));
          setSubject(issue.subject);
          setDescription(issue.description ?? "");
          setStatusId(String(issue.status.id));
          setPriorityId(String(issue.priority.id));
          setAssigneeId(issue.assigned_to ? String(issue.assigned_to.id) : "");
          setStartDate(issue.start_date ?? "");
          setDueDate(issue.due_date ?? "");
          setDoneRatio(String(issue.done_ratio ?? 0));

          // 프로젝트 멤버 로드
          const fetchedMembers = await client.getProjectMembers(issue.project.id);
          if (issue.assigned_to && !fetchedMembers.some((m) => m.user.id === issue.assigned_to!.id)) {
            fetchedMembers.push({ id: 0, user: issue.assigned_to });
          }
          setMembers(fetchedMembers);

          // 기존 커스텀 필드 값
          for (const cf of (issue.custom_fields ?? [])) {
            cfValues[cf.id] = cf.value ?? "";
          }
        } else {
          // 생성 모드: 기본값
          setSubject("");
          setDescription("");
          setStartDate("");
          setDueDate("");
          setDoneRatio("0");
          setAssigneeId("");
          setMembers([]);

          if (fetchedProjects.length > 0) setProjectId(String(fetchedProjects[0].id));
          if (fetchedTrackers.length > 0) setTrackerId(String(fetchedTrackers[0].id));
          if (fetchedPriorities.length > 0) {
            const def = fetchedPriorities.find((p) => p.is_default) ?? fetchedPriorities[0];
            setPriorityId(String(def.id));
          }
          const openStatus = statusMap.find((s) => {
            const n = s.name.toLowerCase();
            return n === "new" || n === "신규";
          }) ?? statusMap[0];
          if (openStatus) setStatusId(String(openStatus.id));

          // 커스텀 필드 기본값
          for (const def of fetchedCustomFieldDefs) {
            if (def.default_value) {
              cfValues[def.id] = def.default_value;
            } else if (def.field_format === "bool") {
              cfValues[def.id] = "0";
            } else if (def.multiple) {
              cfValues[def.id] = [];
            }
          }
        }

        setCustomFieldValues(cfValues);
      } catch (e) {
        setError(String(e));
      } finally {
        setIsLoadingData(false);
        setTimeout(() => subjectRef.current?.focus(), 80);
      }
    };

    load();
  }, [isCreateModalOpen]);

  // 프로젝트 변경 시 멤버 재로드 (생성 모드)
  useEffect(() => {
    if (!isCreateModalOpen || !client || !projectId || isEdit) return;
    client.getProjectMembers(Number(projectId))
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [projectId, isCreateModalOpen, isEdit]);

  // 담당자 옵션: 프로젝트 멤버 + allVisibleIssues의 담당자 병합
  const assigneeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      map.set(String(m.user.id), m.user.name);
    }
    for (const iss of allVisibleIssues) {
      if (iss.assigned_to && !map.has(String(iss.assigned_to.id))) {
        map.set(String(iss.assigned_to.id), iss.assigned_to.name);
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [members, allVisibleIssues]);

  // 현재 트래커/프로젝트에 적용되는 커스텀 필드
  const visibleCustomFields = useMemo((): RedmineCustomFieldDef[] => {
    const numTrackerId = Number(trackerId);
    const numProjectId = Number(projectId);

    let defs: RedmineCustomFieldDef[];

    if (customFieldDefs.length > 0) {
      defs = customFieldDefs;
    } else {
      // /custom_fields.json 접근 불가(비관리자)시 이슈 데이터에서 파생
      // 알려진 유저 ID 집합으로 user 타입 필드 추론
      const knownUserIds = new Set<string>();
      for (const m of members) knownUserIds.add(String(m.user.id));
      for (const iss of allVisibleIssues) {
        if (iss.assigned_to) knownUserIds.add(String(iss.assigned_to.id));
      }

      // 가시 이슈 전체 + 현재 이슈에서 각 필드 값이 유저 ID인지 확인
      const fieldIsUser = new Map<number, boolean>();
      const scanIssues = issue ? [...allVisibleIssues, issue] : allVisibleIssues;
      for (const iss of scanIssues) {
        for (const cf of (iss.custom_fields ?? [])) {
          if (fieldIsUser.has(cf.id)) continue;
          const val = String(cf.value ?? "");
          if (val && knownUserIds.has(val)) fieldIsUser.set(cf.id, true);
        }
      }

      const sourceIssue = issue ?? allVisibleIssues.find((i) => (i.custom_fields?.length ?? 0) > 0);
      defs = (sourceIssue?.custom_fields ?? []).map((cf) => ({
        id: cf.id,
        name: cf.name,
        customized_type: "issue",
        field_format: fieldIsUser.get(cf.id) ? "user" : "string",
        is_required: false,
        multiple: false,
        default_value: null,
        possible_values: [],
        tracker_ids: [],
        project_ids: [],
      }));
    }

    return defs.filter((def) => {
      const tids = def.tracker_ids ?? [];
      const pids = def.project_ids ?? [];
      if (tids.length > 0 && numTrackerId > 0 && !tids.includes(numTrackerId)) return false;
      if (pids.length > 0 && numProjectId > 0 && !pids.includes(numProjectId)) return false;
      return true;
    });
  }, [customFieldDefs, trackerId, projectId, issue, allVisibleIssues, members]);

  const hasRequiredCustomFieldEmpty = visibleCustomFields.some((def) => {
    if (!def.is_required) return false;
    if (def.field_format === "bool") return false;
    const val = customFieldValues[def.id];
    if (def.multiple) return !val || (Array.isArray(val) && val.length === 0);
    return !val || val === "";
  });

  const handleClose = () => {
    if (isSaving) return;
    closeEditModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !projectId || !trackerId) return;

    const descBody = description.trim() || undefined;

    const customFieldsPayload = visibleCustomFields.length > 0
      ? visibleCustomFields.map((def) => ({
          id: def.id,
          value: customFieldValues[def.id] !== undefined
            ? customFieldValues[def.id]
            : (def.multiple ? [] : ""),
        }))
      : undefined;

    setIsSaving(true);
    setError(null);

    try {
      if (isEdit && editingIssueId !== null) {
        await updateIssue(editingIssueId, {
          subject: subject.trim(),
          description: descBody,
          status_id: statusId ? Number(statusId) : undefined,
          priority_id: priorityId ? Number(priorityId) : undefined,
          assigned_to_id: assigneeId ? Number(assigneeId) : null,
          start_date: startDate || undefined,
          due_date: dueDate || undefined,
          done_ratio: doneRatio !== "" ? Number(doneRatio) : undefined,
          custom_fields: customFieldsPayload,
        });
      } else {
        await createIssue({
          project_id: Number(projectId),
          tracker_id: Number(trackerId),
          subject: subject.trim(),
          description: descBody,
          status_id: statusId ? Number(statusId) : undefined,
          priority_id: priorityId ? Number(priorityId) : undefined,
          assigned_to_id: assigneeId ? Number(assigneeId) : undefined,
          start_date: startDate || undefined,
          due_date: dueDate || undefined,
          done_ratio: doneRatio !== "" ? Number(doneRatio) : undefined,
          custom_fields: customFieldsPayload,
        });
      }
      closeEditModal();
    } catch (e) {
      setError(String(e));
      setIsSaving(false);
    }
  };

  if (!isCreateModalOpen) return null;

  return (
    <div className="issue-edit-overlay" onClick={handleClose}>
      <div className="issue-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="issue-edit-header">
          <span className="issue-edit-title">
            {isEdit ? t("issueEdit.editTitle") : t("issueEdit.createTitle")}
          </span>
          <button className="issue-edit-close" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        {isLoadingData ? (
          <div className="issue-edit-loading">
            <Loader2 size={20} className="spin" />
            <span>{t("issueEdit.loadingData")}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="issue-edit-form">
            <div className="issue-edit-scroll">
              {/* 프로젝트 + 트래커 */}
              <div className="issue-edit-row-2">
                <div className="issue-edit-field">
                  <label className="issue-edit-label">{t("issueEdit.project")} *</label>
                  <select
                    className="issue-edit-select"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    disabled={isEdit}
                    required
                  >
                    <option value="">{t("issueEdit.select")}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="issue-edit-field">
                  <label className="issue-edit-label">{t("issueEdit.tracker")} *</label>
                  <select
                    className="issue-edit-select"
                    value={trackerId}
                    onChange={(e) => setTrackerId(e.target.value)}
                    required
                  >
                    <option value="">{t("issueEdit.select")}</option>
                    {trackers.map((tr) => (
                      <option key={tr.id} value={tr.id}>{tr.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 제목 */}
              <div className="issue-edit-field">
                <label className="issue-edit-label">{t("issueEdit.subject")} *</label>
                <input
                  ref={subjectRef}
                  className="issue-edit-input"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t("issueEdit.subjectPlaceholder")}
                  required
                />
              </div>

              {/* 설명 */}
              <div className="issue-edit-field">
                <label className="issue-edit-label">{t("issueEdit.description")}</label>
                <MarkupEditor
                  value={description}
                  onChange={setDescription}
                  placeholder={t("issueEdit.descriptionPlaceholder")}
                />
              </div>

              {/* 상태 + 우선순위 */}
              <div className="issue-edit-row-2">
                <div className="issue-edit-field">
                  <label className="issue-edit-label">{t("issueEdit.status")}</label>
                  <select
                    className="issue-edit-select"
                    value={statusId}
                    onChange={(e) => setStatusId(e.target.value)}
                  >
                    <option value="">{t("issueEdit.select")}</option>
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="issue-edit-field">
                  <label className="issue-edit-label">{t("issueEdit.priority")}</label>
                  <select
                    className="issue-edit-select"
                    value={priorityId}
                    onChange={(e) => setPriorityId(e.target.value)}
                  >
                    <option value="">{t("issueEdit.select")}</option>
                    {priorities.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 담당자 */}
              <div className="issue-edit-field">
                <label className="issue-edit-label">{t("issueEdit.assignee")}</label>
                <SearchableSelect
                  options={assigneeOptions}
                  value={assigneeId}
                  onChange={setAssigneeId}
                  placeholder={t("issueEdit.unassigned")}
                  searchPlaceholder={t("filterEditor.search")}
                  noResultsText={t("filterEditor.noResults")}
                />
              </div>

              {/* 시작일 + 완료예정일 */}
              <div className="issue-edit-row-2">
                <div className="issue-edit-field">
                  <label className="issue-edit-label">{t("issueEdit.startDate")}</label>
                  <input
                    className="issue-edit-input"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="issue-edit-field">
                  <label className="issue-edit-label">{t("issueEdit.dueDate")}</label>
                  <input
                    className="issue-edit-input"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* 진행률 */}
              <div className="issue-edit-field">
                <label className="issue-edit-label">{t("issueEdit.doneRatio")}</label>
                <input
                  className="issue-edit-input"
                  type="number"
                  min="0"
                  max="100"
                  value={doneRatio}
                  onChange={(e) => setDoneRatio(e.target.value)}
                  placeholder="0"
                />
              </div>

              {/* 커스텀 필드 */}
              {visibleCustomFields
                .filter((def) => def.field_format !== "bool")
                .map((def) => (
                  <div key={def.id} className="issue-edit-field">
                    <label className="issue-edit-label">
                      {def.name}{def.is_required ? " *" : ""}
                    </label>
                    {renderCustomFieldInput(
                      def,
                      customFieldValues[def.id],
                      (val) => setCustomFieldValues((prev) => ({ ...prev, [def.id]: val })),
                      assigneeOptions,
                    )}
                  </div>
                ))}

              {/* bool 타입 커스텀 필드 */}
              {visibleCustomFields
                .filter((def) => def.field_format === "bool")
                .map((def) => (
                  <div key={def.id} className="issue-edit-field">
                    {renderCustomFieldInput(
                      def,
                      customFieldValues[def.id],
                      (val) => setCustomFieldValues((prev) => ({ ...prev, [def.id]: val })),
                      assigneeOptions,
                    )}
                  </div>
                ))}

              {error && <div className="issue-edit-error">{error}</div>}
            </div>

            <div className="issue-edit-footer">
              <button
                type="button"
                className="issue-edit-btn issue-edit-btn-cancel"
                onClick={handleClose}
                disabled={isSaving}
              >
                {t("issueEdit.cancel")}
              </button>
              <button
                type="submit"
                className="issue-edit-btn issue-edit-btn-submit"
                disabled={isSaving || !subject.trim() || !projectId || !trackerId || hasRequiredCustomFieldEmpty}
              >
                {isSaving ? (
                  <><Loader2 size={13} className="spin" /> {t("issueEdit.saving")}</>
                ) : isEdit ? t("issueEdit.save") : t("issueEdit.create")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
