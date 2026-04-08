import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { usePersonalTaskStore } from "../../stores/personalTaskStore";
import { useTranslation } from "../../lib/i18n";
import "./AddTaskModal.css";

export function AddTaskModal() {
  const { isModalOpen, closeModal, addTask } = usePersonalTaskStore();
  const { t } = useTranslation();
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
          <span className="modal-title">{t("addTask.title")}</span>
          <button className="modal-close-btn" onClick={closeModal}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-field">
            <label className="modal-label">
              {t("addTask.taskNameRequired")}
            </label>
            <input
              ref={subjectRef}
              className="modal-input"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("addTask.taskNamePlaceholder")}
            />
          </div>
          <div className="modal-field">
            <label className="modal-label">{t("addTask.description")}</label>
            <textarea
              className="modal-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("addTask.descriptionPlaceholder")}
              rows={8}
            />
          </div>
          <div className="modal-field">
            <label className="modal-label">{t("addTask.dueDate")}</label>
            <input
              className="modal-input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="modal-btn modal-btn-cancel" onClick={closeModal}>
              {t("addTask.cancel")}
            </button>
            <button type="submit" className="modal-btn modal-btn-submit" disabled={!subject.trim()}>
              {t("addTask.add")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
