import { Check, RotateCcw, Trash2 } from "lucide-react";
import type { PersonalTask } from "../../types/app";
import { usePersonalTaskStore } from "../../stores/personalTaskStore";
import { formatDate } from "../../lib/dateUtils";
import { ProgressBar } from "./ProgressBar";
import "./PersonalTaskItem.css";

interface Props {
  task: PersonalTask;
}

export function PersonalTaskItem({ task }: Props) {
  const { completeTask, restoreTask, deleteTask, selectTask } = usePersonalTaskStore();

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  const handleClick = () => {
    selectTask(task.id);
  };

  return (
    <div className={`personal-task-item ${task.completed ? "personal-task-completed" : ""}`} onClick={handleClick}>
      <div className="personal-task-header">
        <div className="personal-task-title-row">
          <span className="personal-task-badge">개인</span>
          <span className="personal-task-subject">{task.subject}</span>
        </div>
        <div className="personal-task-actions">
          {task.completed ? (
            <>
              <button
                className="personal-task-action-btn"
                onClick={(e) => handleAction(e, () => restoreTask(task.id))}
                title="복원"
              >
                <RotateCcw size={12} />
              </button>
              <button
                className="personal-task-action-btn personal-task-delete-btn"
                onClick={(e) => handleAction(e, () => deleteTask(task.id))}
                title="삭제"
              >
                <Trash2 size={12} />
              </button>
            </>
          ) : (
            <>
              <button
                className="personal-task-action-btn personal-task-complete-btn"
                onClick={(e) => handleAction(e, () => completeTask(task.id))}
                title="완료"
              >
                <Check size={12} />
              </button>
              <button
                className="personal-task-action-btn personal-task-delete-btn"
                onClick={(e) => handleAction(e, () => deleteTask(task.id))}
                title="삭제"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="personal-task-meta">
        <span className="personal-task-date">
          {task.completed ? `완료: ${formatDate(task.completed_on)}` : `등록: ${formatDate(task.created_on)}`}
        </span>
        {!task.completed && task.due_date && (
          <ProgressBar startDate={task.created_on.split("T")[0]} dueDate={task.due_date} />
        )}
      </div>
    </div>
  );
}
