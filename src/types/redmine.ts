export interface RedmineUser {
  id: number;
  login: string;
  firstname: string;
  lastname: string;
  mail: string;
}

export interface RedmineNamedId {
  id: number;
  name: string;
}

export interface RedmineCustomField {
  id: number;
  name: string;
  value: string | string[] | null;
}

export interface RedmineIssue {
  id: number;
  subject: string;
  description: string;
  status: RedmineNamedId;
  priority: RedmineNamedId;
  assigned_to?: RedmineNamedId;
  project: RedmineNamedId;
  tracker: RedmineNamedId;
  start_date: string | null;
  due_date: string | null;
  done_ratio: number;
  created_on: string;
  updated_on: string;
  custom_fields?: RedmineCustomField[];
}

export interface RedmineIssueStatus {
  id: number;
  name: string;
  is_closed: boolean;
}

export interface RedmineIssuePriority {
  id: number;
  name: string;
  is_default: boolean;
}

export interface RedmineJournalDetail {
  property: string;
  name: string;
  old_value: string | null;
  new_value: string | null;
}

export interface RedmineJournal {
  id: number;
  user: RedmineNamedId;
  notes: string;
  created_on: string;
  details: RedmineJournalDetail[];
}

export interface RedmineIssueDetail extends RedmineIssue {
  journals: RedmineJournal[];
}

export interface IssueDetailResponse {
  issue: RedmineIssueDetail;
}

// API response wrappers
export interface IssuesResponse {
  issues: RedmineIssue[];
  total_count: number;
  offset: number;
  limit: number;
}

export interface CurrentUserResponse {
  user: RedmineUser;
}

export interface IssueStatusesResponse {
  issue_statuses: RedmineIssueStatus[];
}

export interface IssuePrioritiesResponse {
  issue_priorities: RedmineIssuePriority[];
}

export interface RedmineTracker {
  id: number;
  name: string;
}

export interface RedmineProject {
  id: number;
  name: string;
  identifier: string;
}

export interface RedmineMember {
  id: number;
  user: RedmineNamedId;
}

export interface TrackersResponse {
  trackers: RedmineTracker[];
}

export interface ProjectsResponse {
  projects: RedmineProject[];
  total_count: number;
  offset: number;
  limit: number;
}

export interface MembershipsResponse {
  memberships: RedmineMember[];
}

export interface IssueCreatePayload {
  project_id: number;
  tracker_id: number;
  subject: string;
  description?: string;
  status_id?: number;
  priority_id?: number;
  assigned_to_id?: number | null;
  start_date?: string;
  due_date?: string;
  done_ratio?: number;
}

export interface IssueUpdatePayload {
  subject?: string;
  description?: string;
  status_id?: number;
  priority_id?: number;
  assigned_to_id?: number | null;
  start_date?: string;
  due_date?: string;
  done_ratio?: number;
  notes?: string;
}
