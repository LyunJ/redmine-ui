import { fetch } from "@tauri-apps/plugin-http";
import type {
  CurrentUserResponse,
  IssueCreatePayload,
  IssueDetailResponse,
  IssuePrioritiesResponse,
  IssueUpdatePayload,
  IssuesResponse,
  IssueStatusesResponse,
  MembershipsResponse,
  ProjectsResponse,
  RedmineIssue,
  RedmineIssueDetail,
  RedmineIssueStatus,
  RedmineMember,
  RedmineIssuePriority,
  RedmineProject,
  RedmineTracker,
  RedmineUser,
  TrackersResponse,
} from "../types/redmine";

export class RedmineClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  private async request<T>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-Redmine-API-Key": this.apiKey,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Redmine API error: ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  private async mutate<T>(
    method: "POST" | "PUT",
    path: string,
    body: unknown,
  ): Promise<T | null> {
    const url = new URL(path, this.baseUrl);
    const response = await fetch(url.toString(), {
      method,
      headers: {
        "X-Redmine-API-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Redmine API error: ${response.status} ${text}`);
    }
    // PUT /issues/{id}.json returns 200 with no body; POST returns 201 with body
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return null;
    }
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  }

  async getCurrentUser(): Promise<RedmineUser> {
    const data = await this.request<CurrentUserResponse>("/users/current.json");
    return data.user;
  }

  async getIssueStatuses(): Promise<RedmineIssueStatus[]> {
    const data = await this.request<IssueStatusesResponse>("/issue_statuses.json");
    return data.issue_statuses;
  }

  async getTrackers(): Promise<RedmineTracker[]> {
    const data = await this.request<TrackersResponse>("/trackers.json");
    return data.trackers;
  }

  async getProjects(): Promise<RedmineProject[]> {
    const allProjects: RedmineProject[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const data = await this.request<ProjectsResponse>("/projects.json", {
        limit: limit.toString(),
        offset: offset.toString(),
      });
      allProjects.push(...data.projects);
      if (offset + data.projects.length >= data.total_count) break;
      offset += limit;
    }

    return allProjects;
  }

  async getProjectMembers(projectId: number): Promise<RedmineMember[]> {
    const data = await this.request<MembershipsResponse>(
      `/projects/${projectId}/memberships.json`,
      { limit: "100" },
    );
    return data.memberships.filter((m) => m.user != null);
  }

  async getIssuePriorities(): Promise<RedmineIssuePriority[]> {
    const data = await this.request<IssuePrioritiesResponse>(
      "/enumerations/issue_priorities.json",
    );
    return data.issue_priorities;
  }

  async getMyIssues(statusIds: number[]): Promise<RedmineIssue[]> {
    const allIssues: RedmineIssue[] = [];

    for (const statusId of statusIds) {
      let offset = 0;
      const limit = 100;

      while (true) {
        const data = await this.request<IssuesResponse>("/issues.json", {
          assigned_to_id: "me",
          status_id: statusId.toString(),
          limit: limit.toString(),
          offset: offset.toString(),
        });
        allIssues.push(...data.issues);

        if (offset + data.issues.length >= data.total_count) break;
        offset += limit;
      }
    }

    return allIssues;
  }

  async getReportedIssues(statusIds: number[]): Promise<RedmineIssue[]> {
    const allIssues: RedmineIssue[] = [];

    for (const statusId of statusIds) {
      let offset = 0;
      const limit = 100;

      while (true) {
        const data = await this.request<IssuesResponse>("/issues.json", {
          author_id: "me",
          status_id: statusId.toString(),
          limit: limit.toString(),
          offset: offset.toString(),
        });
        allIssues.push(...data.issues);

        if (offset + data.issues.length >= data.total_count) break;
        offset += limit;
      }
    }

    return allIssues;
  }

  async getCompletedIssues(statusIds: number[]): Promise<RedmineIssue[]> {
    const allIssues: RedmineIssue[] = [];

    for (const statusId of statusIds) {
      let offset = 0;
      const limit = 100;

      while (true) {
        const data = await this.request<IssuesResponse>("/issues.json", {
          assigned_to_id: "me",
          status_id: statusId.toString(),
          limit: limit.toString(),
          offset: offset.toString(),
        });
        allIssues.push(...data.issues);

        if (offset + data.issues.length >= data.total_count) break;
        offset += limit;
      }
    }

    return allIssues;
  }

  async getAllVisibleIssues(openStatusIds: number[]): Promise<RedmineIssue[]> {
    const allIssues: RedmineIssue[] = [];

    for (const statusId of openStatusIds) {
      let offset = 0;
      const limit = 100;

      while (true) {
        const data = await this.request<IssuesResponse>("/issues.json", {
          status_id: statusId.toString(),
          limit: limit.toString(),
          offset: offset.toString(),
        });
        allIssues.push(...data.issues);

        if (offset + data.issues.length >= data.total_count) break;
        offset += limit;
      }
    }

    return allIssues;
  }

  async getIssueDetail(issueId: number): Promise<RedmineIssueDetail> {
    const data = await this.request<IssueDetailResponse>(
      `/issues/${issueId}.json`,
      { include: "journals" },
    );
    return data.issue;
  }

  async createIssue(payload: IssueCreatePayload): Promise<RedmineIssueDetail> {
    const data = await this.mutate<IssueDetailResponse>("POST", "/issues.json", {
      issue: payload,
    });
    return data!.issue;
  }

  async updateIssue(issueId: number, payload: IssueUpdatePayload): Promise<void> {
    await this.mutate("PUT", `/issues/${issueId}.json`, { issue: payload });
  }

  async addComment(issueId: number, notes: string): Promise<void> {
    await this.mutate("PUT", `/issues/${issueId}.json`, { issue: { notes } });
  }

  async fetchImageAsBlob(imagePath: string): Promise<string> {
    const url = imagePath.startsWith("http")
      ? imagePath
      : `${this.baseUrl}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Redmine-API-Key": this.apiKey,
      },
    });
    if (!response.ok) {
      throw new Error(`Image fetch failed: ${response.status}`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
