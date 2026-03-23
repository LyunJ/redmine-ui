import { Plus, LayoutList } from "lucide-react";
import { usePersonalTaskStore } from "../../stores/personalTaskStore";
import { useTodoStore, SECTION_COLORS } from "../../stores/todoStore";
import { useIssueStore } from "../../stores/issueStore";
import "./BottomBar.css";

export function BottomBar() {
  const { openModal } = usePersonalTaskStore();
  const { addSection, sections } = useTodoStore();
  const currentView = useIssueStore((s) => s.currentView);

  const handleAddSection = () => {
    const color = SECTION_COLORS[sections.length % SECTION_COLORS.length];
    addSection("새 섹션", color);
  };

  return (
    <div className="bottombar">
      <button className="bottombar-add-btn" onClick={openModal}>
        <Plus size={14} />
        <span>개인 작업 추가</span>
      </button>
      {currentView === "todo" && (
        <button className="bottombar-add-btn" onClick={handleAddSection}>
          <LayoutList size={14} />
          <span>섹션 추가</span>
        </button>
      )}
    </div>
  );
}
