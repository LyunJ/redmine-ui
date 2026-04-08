import { useState, useEffect, useRef } from "react";
import { usePersonalTaskStore } from "../../stores/personalTaskStore";
import { ProgressBar } from "./ProgressBar";
import { useTranslation } from "../../lib/i18n";
import { ArrowLeft, Check, RotateCcw, Trash2, Pencil, X } from "lucide-react";
import { formatDate } from "../../lib/dateUtils";
import "./PersonalTaskDetail.css";

export function PersonalTaskDetail() {
  const { selectedTask, clearSelectedTask, completeTask, restoreTask, deleteTask, updateTask } =
    usePersonalTaskStore();
  const { t } = useTranslation();

  const [isEditing, setIsEditing] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const subjectRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => subjectRef.current?.focus(), 50);
    }
  }, [isEditing]);

  useEffect(() => {
    setIsEditing(false);
  }, [selectedTask?.id]);

  if (!selectedTask) return null;

  const startEditing = () => {
    setEditSubject(selectedTask.subject);
    setEditDescription(selectedTask.description);
    setEditDueDate(selectedTask.due_date ?? "");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editSubject.trim()) return;
    await updateTask(selectedTask.id, editSubject.trim(), editDescription.trim(), editDueDate || null);
    setIsEditing(false);
  };

  const handleComplete = async () => {
    await completeTask(selectedTask.id);
    clearSelectedTask();
  };

  const handleRestore = async () => {
    await restoreTask(selectedTask.id);
    clearSelectedTask();
  };

  const handleDelete = async () => {
    await deleteTask(selectedTask.id);
    clearSelectedTask();
  };

  return (
    <div className="pt-detail">
      <div className="pt-detail-header">
        <button className="pt-detail-back" onClick={clearSelectedTask}>
          <ArrowLeft size={16} />
          <span>{t("detail.back")}</span>
        </button>
        <div className="pt-detail-header-actions">
          {isEditing ? (
            <>
              <button className="pt-detail-action-btn" onClick={cancelEditing} title={t("ptDetail.cancel")}>
                <X size={14} />
                <span>{t("ptDetail.cancel")}</span>
              </button>
              <button
                className="pt-detail-action-btn pt-detail-save-btn"
                onClick={handleSave}
                disabled={!editSubject.trim()}
                title={t("ptDetail.save")}
              >
                <Check size={14} />
                <span>{t("ptDetail.save")}</span>
              </button>
            </>
          ) : selectedTask.completed ? (
            <>
              <button className="pt-detail-action-btn" onClick={handleRestore} title={t("ptDetail.restore")}>
                <RotateCcw size={14} />
                <span>{t("ptDetail.restore")}</span>
              </button>
              <button className="pt-detail-action-btn pt-detail-delete-btn" onClick={handleDelete} title={t("ptDetail.delete")}>
                <Trash2 size={14} />
                <span>{t("ptDetail.delete")}</span>
              </button>
            </>
          ) : (
            <>
              <button className="pt-detail-action-btn" onClick={startEditing} title={t("ptDetail.edit")}>
                <Pencil size={14} />
                <span>{t("ptDetail.edit")}</span>
              </button>
              <button className="pt-detail-action-btn pt-detail-complete-btn" onClick={handleComplete} title={t("ptDetail.complete")}>
                <Check size={14} />
                <span>{t("ptDetail.complete")}</span>
              </button>
              <button className="pt-detail-action-btn pt-detail-delete-btn" onClick={handleDelete} title={t("ptDetail.delete")}>
                <Trash2 size={14} />
                <span>{t("ptDetail.delete")}</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="pt-detail-scroll">
        <div className="pt-detail-title">
          <span className="pt-detail-badge">{t("ptDetail.badge")}</span>
          {isEditing ? (
            <input
              ref={subjectRef}
              className="pt-edit-input pt-edit-subject"
              type="text"
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") cancelEditing();
              }}
              placeholder={t("ptDetail.taskNamePlaceholder")}
            />
          ) : (
            <h2>{selectedTask.subject}</h2>
          )}
        </div>

        <div className="pt-detail-info">
          <div className="info-row">
            <span className="info-label">{t("ptDetail.status")}</span>
            <span className={`info-value ${selectedTask.completed ? "pt-status-completed" : "pt-status-active"}`}>
              {selectedTask.completed ? t("ptDetail.statusCompleted") : t("ptDetail.statusInProgress")}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">{t("ptDetail.createdOn")}</span>
            <span className="info-value">{formatDate(selectedTask.created_on)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t("ptDetail.dueDate")}</span>
            {isEditing ? (
              <input
                className="pt-edit-input pt-edit-date"
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            ) : (
              <span className="info-value">
                {selectedTask.due_date ? formatDate(selectedTask.due_date) : "-"}
              </span>
            )}
          </div>
          {selectedTask.completed_on && (
            <div className="info-row">
              <span className="info-label">{t("ptDetail.completedOn")}</span>
              <span className="info-value">{formatDate(selectedTask.completed_on)}</span>
            </div>
          )}
          {!selectedTask.completed && selectedTask.due_date && !isEditing && (
            <div className="info-row">
              <span className="info-label">{t("ptDetail.progress")}</span>
              <ProgressBar startDate={selectedTask.created_on.split("T")[0]} dueDate={selectedTask.due_date} />
            </div>
          )}
        </div>

        <div className="pt-detail-section">
          <h3 className="section-title">{t("ptDetail.description")}</h3>
          {isEditing ? (
            <textarea
              className="pt-edit-textarea"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder={t("ptDetail.descriptionPlaceholder")}
              rows={8}
            />
          ) : selectedTask.description ? (
            <div className="pt-detail-description">{selectedTask.description}</div>
          ) : (
            <div className="pt-detail-description pt-detail-empty">{t("ptDetail.noContent")}</div>
          )}
        </div>
      </div>
    </div>
  );
}
