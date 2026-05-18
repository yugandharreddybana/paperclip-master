import type { DeploymentMode } from "../constants.js";

/** Board GitHub integration status for repo picker / OAuth wiring. */
export type GithubIntegrationStatus = {
  oauthAppConfigured: boolean;
  /** True when GitHub `/link-social` can be used (authenticated deployment + OAuth app env). */
  oauthLinkAvailable: boolean;
  deploymentMode: DeploymentMode;
  tokenAvailable: boolean;
  tokenSource: "oauth" | "instance_pat" | "none";
  githubLogin: string | null;
  help: {
    callbackUrlHint: string;
    /** PAT is read in local-trusted dev for `local-board` when OAuth link is unavailable. */
    patEnv: "PAPERCLIP_GITHUB_PAT";
  };
};

export type GithubRepositoryListItem = {
  fullName: string;
  htmlUrl: string;
  defaultBranch: string | null;
  private: boolean;
};

export type GithubRepositoryListResponse = {
  page: number;
  pageSize: number;
  items: GithubRepositoryListItem[];
};
