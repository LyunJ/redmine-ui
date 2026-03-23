import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { usePersonalTaskStore } from "../../stores/personalTaskStore";
import "./AddTaskModal.css";

export function AddTaskModal() {
  const { isModalOpen, closeModal, addTask } = usePersonalTaskStore();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const subjectRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isModalOpen) {
      setSubject("");
      setDescription("");
      setDueDate("");
      setTimeout(() => subjectRef.current?.focus(), 50);
    }
  }, [isModalOpen]);

  if (!isModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;
    await addTask(subject.trim(), description.trim(), dueDate || null);
    closeModal();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeModal();
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <span className="modal-title">개인 작업 추가</span>
          <button className="modal-close-btn" onClick={closeModal}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-field">
            <label className="modal-label">
              작업명 <span className="modal-required">*</span>
            </label>
            <input
              ref={subjectRef}
              className="modal-input"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="작업명을 입력하세요"
            />
          </div>
          <div className="modal-field">
            <label className="modal-label">작업 내용</label>
            <textarea
              className="modal-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="작업 내용을 입력하세요 (선택)"
              rows={8}
            />
          </div>
          <div className="modal-field">
            <label className="modal-label">작업 기한</label>
            <input
              className="modal-input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="modal-btn modal-btn-cancel" onClick={closeModal}>
              취소
            </button>
            <button type="submit" className="modal-btn modal-btn-submit" disabled={!subject.trim()}>
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
