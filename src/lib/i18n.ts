import { useSettingsStore } from "../stores/settingsStore";

export type Language = "ko" | "en";

const ko: Record<string, string> = {
  // TitleBar
  "titlebar.openRedmine": "레드마인 웹에서 열기",
  "titlebar.refresh": "새로고침",
  "titlebar.pollInterval": "갱신 주기",
  "titlebar.logout": "로그아웃",
  "titlebar.darkMode": "다크 모드",
  "titlebar.lightMode": "라이트 모드",
  "titlebar.unpinFromTop": "항상 위 해제",
  "titlebar.pinToTop": "항상 위 고정",
  "titlebar.language": "언어 (KO)",
  "titlebar.newIssue": "새 일감",

  // ViewTabs
  "tab.todo": "해야할 일",
  "tab.assigned": "담당 일감",
  "tab.reported": "보고한 일감",
  "tab.completed": "완료된 일감",
  "tab.personalCompleted": "완료된 개인 작업",

  // SortControls
  "sort.createdOn": "등록일",
  "sort.updatedOn": "수정일",
  "sort.dueDate": "완료예정일",

  // IssueItem
  "issue.badge": "일감",

  // IssueList empty messages
  "empty.todo": "해야할 일이 없습니다",
  "empty.assigned": "진행할 일감이 없습니다",
  "empty.reported": "보고한 일감이 없습니다",
  "empty.completed": "완료된 일감이 없습니다",
  "empty.personalCompleted": "완료된 개인 작업이 없습니다",
  "loading.issues": "일감을 불러오는 중...",

  // IssueDetail
  "detail.back": "목록",
  "detail.openInWeb": "웹에서 열기",
  "detail.status": "상태",
  "detail.priority": "우선순위",
  "detail.assignee": "담당자",
  "detail.project": "프로젝트",
  "detail.progress": "진행률",
  "detail.startDate": "시작일",
  "detail.dueDate": "완료예정일",
  "detail.description": "설명",
  "detail.comments": "댓글",
  "detail.edit": "수정",
  "detail.addComment": "댓글 추가",
  "detail.commentPlaceholder": "댓글을 입력하세요...",
  "detail.submit": "등록",

  // LoginForm
  "login.subtitle": "Redmine 서버에 연결하세요",
  "login.apiKeyPlaceholder": "내 계정 > API 접근 키",
  "login.connect": "연결",
  "login.connecting": "연결 중...",

  // FilterBar
  "filter.edit": "필터 편집",
  "filter.delete": "필터 삭제",
  "filter.add": "필터 추가",

  // FilterEditor
  "filterEditor.select": "선택",
  "filterEditor.search": "검색...",
  "filterEditor.noResults": "검색 결과 없음",
  "filterEditor.editTitle": "필터 편집",
  "filterEditor.addTitle": "필터 추가",
  "filterEditor.filterName": "필터 이름",
  "filterEditor.filterNamePlaceholder": "필터 이름",
  "filterEditor.includePersonalTasks": "개인 작업 포함",
  "filterEditor.conditions": "조건",
  "filterEditor.addCondition": "조건 추가",
  "filterEditor.noConditions": "조건 없음 (모든 일감 표시)",
  "filterEditor.valuePlaceholder": "값 입력",
  "filterEditor.preview": "미리보기",
  "filterEditor.previewEmpty": "조건에 맞는 일감이 없습니다",
  "filterEditor.previewMore": "...외 {{n}}건",
  "filterEditor.cancel": "취소",
  "filterEditor.save": "저장",
  "filterEditor.add": "추가",

  // Field labels (FilterEditor + IssueEditModal)
  "field.status": "상태",
  "field.priority": "우선순위",
  "field.tracker": "트래커",
  "field.project": "프로젝트",
  "field.assignedTo": "담당자",
  "field.startDate": "시작일",
  "field.dueDate": "완료예정일",
  "field.createdOn": "등록일",
  "field.updatedOn": "수정일",
  "field.doneRatio": "진행률",

  // AddTaskModal
  "addTask.title": "개인 작업 추가",
  "addTask.taskName": "작업명",
  "addTask.taskNameRequired": "작업명 *",
  "addTask.taskNamePlaceholder": "작업명을 입력하세요",
  "addTask.description": "작업 내용",
  "addTask.descriptionPlaceholder": "작업 내용을 입력하세요 (선택)",
  "addTask.dueDate": "작업 기한",
  "addTask.cancel": "취소",
  "addTask.add": "추가",

  // PersonalTaskDetail
  "ptDetail.badge": "개인 작업",
  "ptDetail.cancel": "취소",
  "ptDetail.save": "저장",
  "ptDetail.restore": "복원",
  "ptDetail.delete": "삭제",
  "ptDetail.edit": "수정",
  "ptDetail.complete": "완료",
  "ptDetail.status": "상태",
  "ptDetail.statusCompleted": "완료",
  "ptDetail.statusInProgress": "진행 중",
  "ptDetail.createdOn": "등록일",
  "ptDetail.dueDate": "작업 기한",
  "ptDetail.completedOn": "완료일",
  "ptDetail.progress": "진행률",
  "ptDetail.description": "작업 내용",
  "ptDetail.descriptionPlaceholder": "작업 내용을 입력하세요 (선택)",
  "ptDetail.noContent": "내용 없음",
  "ptDetail.taskNamePlaceholder": "작업명을 입력하세요",

  // BottomBar
  "bottombar.addIssue": "새 일감",
  "bottombar.addTask": "개인 작업 추가",
  "bottombar.addSection": "섹션 추가",

  // TodoView
  "todo.expandSection": "섹션 펼치기",
  "todo.collapseSection": "섹션 접기",
  "todo.sortByCreated": "등록일 순 정렬",
  "todo.noSort": "정렬 없음 (수동)",
  "todo.deleteSection": "섹션 삭제",
  "todo.empty": "항목이 없습니다",
  "todo.dropHere": "여기에 놓기",
  "todo.noItems": "해야할 일이 없습니다",

  // IssueEditModal
  "issueEdit.createTitle": "새 일감",
  "issueEdit.editTitle": "일감 수정",
  "issueEdit.project": "프로젝트",
  "issueEdit.tracker": "트래커",
  "issueEdit.subject": "제목",
  "issueEdit.subjectPlaceholder": "일감 제목을 입력하세요",
  "issueEdit.description": "설명",
  "issueEdit.descriptionPlaceholder": "일감 설명을 입력하세요 (선택)",
  "issueEdit.status": "상태",
  "issueEdit.priority": "우선순위",
  "issueEdit.assignee": "담당자",
  "issueEdit.startDate": "시작일",
  "issueEdit.dueDate": "완료예정일",
  "issueEdit.doneRatio": "진행률 (%)",
  "issueEdit.cancel": "취소",
  "issueEdit.create": "등록",
  "issueEdit.save": "저장",
  "issueEdit.saving": "저장 중...",
  "issueEdit.loadingData": "데이터 로드 중...",
  "issueEdit.select": "선택",
  "issueEdit.unassigned": "담당자 없음",
};

const en: Record<string, string> = {
  // TitleBar
  "titlebar.openRedmine": "Open Redmine in browser",
  "titlebar.refresh": "Refresh",
  "titlebar.pollInterval": "Poll interval",
  "titlebar.logout": "Logout",
  "titlebar.darkMode": "Dark mode",
  "titlebar.lightMode": "Light mode",
  "titlebar.unpinFromTop": "Unpin from top",
  "titlebar.pinToTop": "Pin to top",
  "titlebar.language": "Language (EN)",
  "titlebar.newIssue": "New issue",

  // ViewTabs
  "tab.todo": "To Do",
  "tab.assigned": "Assigned",
  "tab.reported": "Reported",
  "tab.completed": "Completed",
  "tab.personalCompleted": "Completed Tasks",

  // SortControls
  "sort.createdOn": "Created",
  "sort.updatedOn": "Updated",
  "sort.dueDate": "Due date",

  // IssueItem
  "issue.badge": "Issue",

  // IssueList empty messages
  "empty.todo": "Nothing to do",
  "empty.assigned": "No assigned issues",
  "empty.reported": "No reported issues",
  "empty.completed": "No completed issues",
  "empty.personalCompleted": "No completed tasks",
  "loading.issues": "Loading issues...",

  // IssueDetail
  "detail.back": "Back",
  "detail.openInWeb": "Open in web",
  "detail.status": "Status",
  "detail.priority": "Priority",
  "detail.assignee": "Assignee",
  "detail.project": "Project",
  "detail.progress": "Progress",
  "detail.startDate": "Start date",
  "detail.dueDate": "Due date",
  "detail.description": "Description",
  "detail.comments": "Comments",
  "detail.edit": "Edit",
  "detail.addComment": "Add Comment",
  "detail.commentPlaceholder": "Enter your comment...",
  "detail.submit": "Submit",

  // LoginForm
  "login.subtitle": "Connect to your Redmine server",
  "login.apiKeyPlaceholder": "My account > API access key",
  "login.connect": "Connect",
  "login.connecting": "Connecting...",

  // FilterBar
  "filter.edit": "Edit filter",
  "filter.delete": "Delete filter",
  "filter.add": "Add filter",

  // FilterEditor
  "filterEditor.select": "Select",
  "filterEditor.search": "Search...",
  "filterEditor.noResults": "No results",
  "filterEditor.editTitle": "Edit Filter",
  "filterEditor.addTitle": "Add Filter",
  "filterEditor.filterName": "Filter name",
  "filterEditor.filterNamePlaceholder": "Filter name",
  "filterEditor.includePersonalTasks": "Include personal tasks",
  "filterEditor.conditions": "Conditions",
  "filterEditor.addCondition": "Add condition",
  "filterEditor.noConditions": "No conditions (show all issues)",
  "filterEditor.valuePlaceholder": "Enter value",
  "filterEditor.preview": "Preview",
  "filterEditor.previewEmpty": "No issues match the conditions",
  "filterEditor.previewMore": "...and {{n}} more",
  "filterEditor.cancel": "Cancel",
  "filterEditor.save": "Save",
  "filterEditor.add": "Add",

  // Field labels
  "field.status": "Status",
  "field.priority": "Priority",
  "field.tracker": "Tracker",
  "field.project": "Project",
  "field.assignedTo": "Assignee",
  "field.startDate": "Start date",
  "field.dueDate": "Due date",
  "field.createdOn": "Created",
  "field.updatedOn": "Updated",
  "field.doneRatio": "Progress",

  // AddTaskModal
  "addTask.title": "Add Personal Task",
  "addTask.taskName": "Task name",
  "addTask.taskNameRequired": "Task name *",
  "addTask.taskNamePlaceholder": "Enter task name",
  "addTask.description": "Description",
  "addTask.descriptionPlaceholder": "Enter description (optional)",
  "addTask.dueDate": "Due date",
  "addTask.cancel": "Cancel",
  "addTask.add": "Add",

  // PersonalTaskDetail
  "ptDetail.badge": "Personal Task",
  "ptDetail.cancel": "Cancel",
  "ptDetail.save": "Save",
  "ptDetail.restore": "Restore",
  "ptDetail.delete": "Delete",
  "ptDetail.edit": "Edit",
  "ptDetail.complete": "Complete",
  "ptDetail.status": "Status",
  "ptDetail.statusCompleted": "Completed",
  "ptDetail.statusInProgress": "In progress",
  "ptDetail.createdOn": "Created",
  "ptDetail.dueDate": "Due date",
  "ptDetail.completedOn": "Completed on",
  "ptDetail.progress": "Progress",
  "ptDetail.description": "Description",
  "ptDetail.descriptionPlaceholder": "Enter description (optional)",
  "ptDetail.noContent": "No content",
  "ptDetail.taskNamePlaceholder": "Enter task name",

  // BottomBar
  "bottombar.addIssue": "New Issue",
  "bottombar.addTask": "Add Personal Task",
  "bottombar.addSection": "Add Section",

  // TodoView
  "todo.expandSection": "Expand section",
  "todo.collapseSection": "Collapse section",
  "todo.sortByCreated": "Sort by created date",
  "todo.noSort": "No sort (manual)",
  "todo.deleteSection": "Delete section",
  "todo.empty": "No items",
  "todo.dropHere": "Drop here",
  "todo.noItems": "Nothing to do",

  // IssueEditModal
  "issueEdit.createTitle": "New Issue",
  "issueEdit.editTitle": "Edit Issue",
  "issueEdit.project": "Project",
  "issueEdit.tracker": "Tracker",
  "issueEdit.subject": "Subject",
  "issueEdit.subjectPlaceholder": "Enter issue subject",
  "issueEdit.description": "Description",
  "issueEdit.descriptionPlaceholder": "Enter description (optional)",
  "issueEdit.status": "Status",
  "issueEdit.priority": "Priority",
  "issueEdit.assignee": "Assignee",
  "issueEdit.startDate": "Start date",
  "issueEdit.dueDate": "Due date",
  "issueEdit.doneRatio": "Progress (%)",
  "issueEdit.cancel": "Cancel",
  "issueEdit.create": "Create",
  "issueEdit.save": "Save",
  "issueEdit.saving": "Saving...",
  "issueEdit.loadingData": "Loading data...",
  "issueEdit.select": "Select",
  "issueEdit.unassigned": "Unassigned",
};

const translations: Record<Language, Record<string, string>> = { ko, en };

export function useTranslation() {
  const language = useSettingsStore((s) => s.language);
  const dict = translations[language];

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = dict[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{{${k}}}`, String(v));
      });
    }
    return text;
  };

  return { t, language };
}
