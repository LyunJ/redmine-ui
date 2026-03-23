export type SortField = "created_on" | "updated_on" | "due_date";
export type SortDirection = "asc" | "desc";
export type Theme = "light" | "dark";
export type ViewTab = "todo" | "assigned" | "reported" | "completed" | "personal_completed";

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
