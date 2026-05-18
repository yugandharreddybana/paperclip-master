import type { GithubIntegrationStatus, GithubRepositoryListResponse } from "@paperclipai/shared";
import { api } from "./client";

export const githubApi = {
  status: () => api.get<GithubIntegrationStatus>("/github/status"),
  repositories: (params: { page?: number; pageSize?: number; q?: string }) => {
    const sp = new URLSearchParams();
    if (params.page != null) sp.set("page", String(params.page));
    if (params.pageSize != null) sp.set("pageSize", String(params.pageSize));
    if (params.q) sp.set("q", params.q);
    const qs = sp.toString();
    return api.get<GithubRepositoryListResponse>(`/github/repositories${qs ? `?${qs}` : ""}`);
  },
};
