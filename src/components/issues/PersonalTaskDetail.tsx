import { useState, useEffect, useRef } from "react";
import { usePersonalTaskStore } from "../../stores/personalTaskStore";
import { ProgressBar } from "./ProgressBar";
import { ArrowLeft, Check, RotateCcw, Trash2, Pencil, X } from "lucide-react";
import { formatDate } from "../../lib/dateUtils";
import "./PersonalTaskDetail.css";

export function PersonalTaskDetail() {
  const { selectedTask, clearSelectedTask, completeTask, restoreTask, deleteTask, updateTask } =
    usePersonalTaskStore();

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

  // 선택된 작업이 변경되면 편집 모드 해제
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
          <span>목록</span>
        </button>
        <div className="pt-detail-header-actions">
          {isEditing ? (
            <>
              <button className="pt-detail-action-btn" onClick={cancelEditing} title="취소">
                <X size={14} />
                <span>취소</span>
              </button>
              <button
                className="pt-detail-action-btn pt-detail-save-btn"
                onClick={handleSave}
                disabled={!editSubject.trim()}
                title="저장"
              >
                <Check size={14} />
                <span>저장</span>
              </button>
            </>
          ) : selectedTask.completed ? (
            <>
              <button className="pt-detail-action-btn" onClick={handleRestore} title="복원">
                <RotateCcw size={14} />
                <span>복원</span>
              </button>
              <button className="pt-detail-action-btn pt-detail-delete-btn" onClick={handleDelete} title="삭제">
                <Trash2 size={14} />
                <span>삭제</span>
              </button>
            </>
          ) : (
            <>
              <button className="pt-detail-action-btn" onClick={startEditing} title="수정">
                <Pencil size={14} />
                <span>수정</span>
              </button>
              <button className="pt-detail-action-btn pt-detail-complete-btn" onClick={handleComplete} title="완료">
                <Check size={14} />
                <span>완료</span>
              </button>
              <button className="pt-detail-action-btn pt-detail-delete-btn" onClick={handleDelete} title="삭제">
                <Trash2 size={14} />
                <span>삭제</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="pt-detail-scroll">
        <div className="pt-detail-title">
          <span className="pt-detail-badge">개인 작업</span>
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
              placeholder="작업명을 입력하세요"
            />
          ) : (
            <h2>{selectedTask.subject}</h2>
          )}
        </div>

        <div className="pt-detail-info">
          <div className="info-row">
            <span className="info-label">상태</span>
            <span className={`info-value ${selectedTask.completed ? "pt-status-completed" : "pt-status-active"}`}>
              {selectedTask.completed ? "완료" : "진행 중"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">등록일</span>
            <span className="info-value">{formatDate(selectedTask.created_on)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">작업 기한</span>
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
              <span className="info-label">완료일</span>
              <span className="info-value">{formatDate(selectedTask.completed_on)}</span>
            </div>
          )}
          {!selectedTask.completed && selectedTask.due_date && !isEditing && (
            <div className="info-row">
              <span className="info-label">진행률</span>
              <ProgressBar startDate={selectedTask.created_on.split("T")[0]} dueDate={selectedTask.due_date} />
            </div>
          )}
        </div>

        <div className="pt-detail-section">
          <h3 className="section-title">작업 내용</h3>
          {isEditing ? (
            <textarea
              className="pt-edit-textarea"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="작업 내용을 입력하세요 (선택)"
              rows={8}
            />
          ) : selectedTask.description ? (
            <div className="pt-detail-description">{selectedTask.description}</div>
          ) : (
            <div className="pt-detail-description pt-detail-empty">내용 없음</div>
          )}
        </div>
      </div>
    </div>
  );
}
