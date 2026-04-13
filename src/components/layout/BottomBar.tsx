import { Plus, LayoutList, FilePlus } from "lucide-react";
import { usePersonalTaskStore } from "../../stores/personalTaskStore";
import { useTodoStore, SECTION_COLORS } from "../../stores/todoStore";
import { useIssueStore } from "../../stores/issueStore";
import { useAuthStore } from "../../stores/authStore";
import { useTranslation } from "../../lib/i18n";
import "./BottomBar.css";

export function BottomBar() {
  const { openModal } = usePersonalTaskStore();
  const { addSection, sections } = useTodoStore();
  const currentView = useIssueStore((s) => s.currentView);
  const openCreateModal = useIssueStore((s) => s.openCreateModal);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { t } = useTranslation();

  const handleAddSection = () => {
    const color = SECTION_COLORS[sections.length % SECTION_COLORS.length];
    addSection(t("bottombar.addSection"), color);
  };

  return (
    <div className="bottombar">
      {isAuthenticated && (
        <button className="bottombar-add-btn" onClick={openCreateModal}>
          <FilePlus size={14} />
          <span>{t("bottombar.addIssue")}</span>
        </button>
      )}
      <button className="bottombar-add-btn" onClick={openModal}>
        <Plus size={14} />
        <span>{t("bottombar.addTask")}</span>
      </button>
      {currentView === "todo" && (
        <button className="bottombar-add-btn" onClick={handleAddSection}>
          <LayoutList size={14} />
          <span>{t("bottombar.addSection")}</span>
        </button>
      )}
    </div>
  );
}
