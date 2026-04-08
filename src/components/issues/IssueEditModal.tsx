import { useState, useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import { useIssueStore } from "../../stores/issueStore";
import { useAuthStore } from "../../stores/authStore";
import { useTranslation } from "../../lib/i18n";
import type {
  RedmineIssueStatus,
  RedmineIssuePriority,
  RedmineProject,
  RedmineTracker,
  RedmineMember,
} from "../../types/redmine";
import "./IssueEditModal.css";

export function IssueEditModal() {
  const { isCreateModalOpen, editingIssueId, closeEditModal, createIssue, updateIssue, selectedIssue, statusMap } = useIssueStore();
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

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjectRef = useRef<HTMLInputElement>(null);

  // Load base data when modal opens
  useEffect(() => {
    if (!isCreateModalOpen || !client) return;

    setError(null);
    setIsLoadingData(true);

    const load = async () => {
      try {
        const [fetchedProjects, fetchedTrackers, fetchedPriorities] = await Promise.all([
          client.getProjects(),
          client.getTrackers(),
          client.getIssuePriorities(),
        ]);
        setProjects(fetchedProjects);
        setTrackers(fetchedTrackers);
        setPriorities(fetchedPriorities);
        setStatuses(statusMap);

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
          setMembers(fetchedMembers);
        } else {
          // 생성 모드: 기본값
          setSubject("");
          setDescription("");
          setStartDate("");
          setDueDate("");
          setDoneRatio("0");
          setAssigneeId("");
          setMembers([]);

          // 첫 번째 프로젝트/트래커/우선순위를 기본값으로
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
        }
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

  const handleClose = () => {
    if (isSaving) return;
    closeEditModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !projectId || !trackerId) return;

    setIsSaving(true);
    setError(null);

    try {
      if (isEdit && editingIssueId !== null) {
        await updateIssue(editingIssueId, {
          subject: subject.trim(),
          description: description.trim() || undefined,
          status_id: statusId ? Number(statusId) : undefined,
          priority_id: priorityId ? Number(priorityId) : undefined,
          assigned_to_id: assigneeId ? Number(assigneeId) : null,
          start_date: startDate || undefined,
          due_date: dueDate || undefined,
          done_ratio: doneRatio !== "" ? Number(doneRatio) : undefined,
        });
      } else {
        await createIssue({
          project_id: Number(projectId),
          tracker_id: Number(trackerId),
          subject: subject.trim(),
          description: description.trim() || undefined,
          status_id: statusId ? Number(statusId) : undefined,
          priority_id: priorityId ? Number(priorityId) : undefined,
          assigned_to_id: assigneeId ? Number(assigneeId) : undefined,
          start_date: startDate || undefined,
          due_date: dueDate || undefined,
          done_ratio: doneRatio !== "" ? Number(doneRatio) : undefined,
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
                <textarea
                  className="issue-edit-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("issueEdit.descriptionPlaceholder")}
                  rows={4}
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
                <select
                  className="issue-edit-select"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                >
                  <option value="">{t("issueEdit.unassigned")}</option>
                  {members.map((m) => (
                    <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                  ))}
                </select>
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
                disabled={isSaving || !subject.trim() || !projectId || !trackerId}
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
