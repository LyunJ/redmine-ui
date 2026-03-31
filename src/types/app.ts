export type SortField = "created_on" | "updated_on" | "due_date";
export type SortDirection = "asc" | "desc";
export type Theme = "light" | "dark";
export type ViewTab = "todo" | "assigned" | "reported" | "completed" | "personal_completed";

// 커스텀 필터 관련 타입
export type FilterField =
  | "status"
  | "priority"
  | "tracker"
  | "project"
  | "assigned_to"
  | "start_date"
  | "due_date"
  | "created_on"
  | "updated_on"
  | "done_ratio"
  | `cf_${number}`;

export type FilterOperator = "eq" | "neq" | "gte" | "lte";

export interface FilterCondition {
  field: FilterField;
  operator: FilterOperator;
  value: string; // RedmineNamedId의 id(문자열) 또는 날짜(YYYY-MM-DD) 또는 숫자
}

export interface CustomFilter {
  id: string;          // "default" 또는 "filter-{timestamp}-{random}"
  name: string;        // 표시 이름
  conditions: FilterCondition[];
  includePersonalTasks: boolean;
}

export interface PersonalTask {
  id: string;
  subject: string;
  description: string;
  due_date: string | null;
  completed: boolean;
  created_on: string;
  updated_on: string;
  completed_on: string | null;
}
