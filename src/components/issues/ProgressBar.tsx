import { calcProgress } from "../../lib/dateUtils";
import "./ProgressBar.css";

interface Props {
  startDate: string | null;
  dueDate: string | null;
}

const TOTAL_BLOCKS = 10;

export function ProgressBar({ startDate, dueDate }: Props) {
  const progress = calcProgress(startDate, dueDate);

  if (progress === null) {
    return <span className="progress-none">일정 미지정</span>;
  }

  const filled = Math.min(Math.round(progress * TOTAL_BLOCKS), TOTAL_BLOCKS);
  const overdue = progress > 1;
  const warning = progress > 0.8 && progress <= 1;

  return (
    <div
      className="progress-bar"
      title={`${startDate ?? "?"} ~ ${dueDate ?? "?"} (${Math.round(progress * 100)}%)`}
    >
      <div className="progress-blocks">
        {Array.from({ length: TOTAL_BLOCKS }, (_, i) => (
          <span
            key={i}
            className={`progress-block ${
              i < filled
                ? overdue
                  ? "block-overdue"
                  : warning
                    ? "block-warning"
                    : "block-filled"
                : "block-empty"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
