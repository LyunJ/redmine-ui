import { fetch } from "@tauri-apps/plugin-http";
import type {
  CurrentUserResponse,
  IssueDetailResponse,
  IssuesResponse,
  IssueStatusesResponse,
  RedmineIssue,
  RedmineIssueDetail,
  RedmineIssueStatus,
  RedmineUser,
} from "../types/redmine";

export class RedmineClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {
    // trailing slash 제거
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

  async getCurrentUser(): Promise<RedmineUser> {
    const data = await this.request<CurrentUserResponse>(
      "/users/current.json",
    );
    return data.user;
  }

  async getIssueStatuses(): Promise<RedmineIssueStatus[]> {
    const data = await this.request<IssueStatusesResponse>(
      "/issue_statuses.json",
    );
    return data.issue_statuses;
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
