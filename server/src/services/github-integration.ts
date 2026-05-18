import { and, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { authAccounts } from "@paperclipai/db";
import type { DeploymentMode, GithubIntegrationStatus, GithubRepositoryListItem } from "@paperclipai/shared";

const GH_ACCEPT = "application/vnd.github+json";
const GH_API_VERSION = "2022-11-28";

export type GithubTokenResolution = {
  token: string;
  source: "oauth" | "instance_pat";
};

/**
 * Resolves a GitHub token for the board actor:
 * 1) OAuth token from linked `account` row (any board user id)
 * 2) `PAPERCLIP_GITHUB_PAT` when actor is the synthetic `local-board` user (local-trusted dev)
 */
export async function resolveGithubAccessToken(db: Db, userId: string): Promise<GithubTokenResolution | null> {
  const oauthRow = await db
    .select({
      accessToken: authAccounts.accessToken,
    })
    .from(authAccounts)
    .where(and(eq(authAccounts.userId, userId), eq(authAccounts.providerId, "github")))
    .then((rows) => rows[0] ?? null);

  const oauthToken = oauthRow?.accessToken?.trim();
  if (oauthToken) {
    return { token: oauthToken, source: "oauth" };
  }

  const pat = process.env.PAPERCLIP_GITHUB_PAT?.trim();
  if (pat && userId === "local-board") {
    return { token: pat, source: "instance_pat" };
  }

  return null;
}

export function githubOAuthEnvConfigured(): boolean {
  const id = process.env.GITHUB_CLIENT_ID?.trim();
  const secret = process.env.GITHUB_CLIENT_SECRET?.trim();
  return Boolean(id && secret);
}

export async function fetchGithubUserLogin(token: string): Promise<string | null> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Accept: GH_ACCEPT,
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": GH_API_VERSION,
    },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { login?: string };
  return typeof body.login === "string" ? body.login : null;
}

export async function fetchGithubUserRepositories(input: {
  token: string;
  page: number;
  pageSize: number;
  search?: string;
}): Promise<{ items: GithubRepositoryListItem[] }> {
  const pageSize = Math.min(Math.max(input.pageSize, 1), 100);
  const page = Math.max(input.page, 1);
  const q = input.search?.trim().toLowerCase() ?? "";

  const url = new URL("https://api.github.com/user/repos");
  url.searchParams.set("per_page", String(pageSize));
  url.searchParams.set("page", String(page));
  url.searchParams.set("sort", "updated");
  url.searchParams.set("affiliation", "owner,collaborator,organization_member");

  const res = await fetch(url, {
    headers: {
      Accept: GH_ACCEPT,
      Authorization: `Bearer ${input.token}`,
      "X-GitHub-Api-Version": GH_API_VERSION,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub API error ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as Array<{
    full_name?: string;
    html_url?: string;
    default_branch?: string | null;
    private?: boolean;
  }>;

  const items: GithubRepositoryListItem[] = [];
  for (const row of data) {
    const fullName = typeof row.full_name === "string" ? row.full_name : "";
    if (!fullName) continue;
    const htmlUrl = typeof row.html_url === "string" ? row.html_url : `https://github.com/${fullName}`;
    items.push({
      fullName,
      htmlUrl,
      defaultBranch: row.default_branch ?? null,
      private: Boolean(row.private),
    });
  }

  const filtered = q
    ? items.filter((item) => item.fullName.toLowerCase().includes(q))
    : items;

  return { items: filtered };
}

export async function buildGithubIntegrationStatus(
  db: Db,
  input: { userId: string; deploymentMode: DeploymentMode; publicAuthBasePath?: string },
): Promise<GithubIntegrationStatus> {
  const oauthAppConfigured = githubOAuthEnvConfigured();
  const oauthLinkAvailable = input.deploymentMode === "authenticated" && oauthAppConfigured;
  const tokenPack = await resolveGithubAccessToken(db, input.userId);
  const githubLogin = tokenPack ? await fetchGithubUserLogin(tokenPack.token) : null;

  const base =
    input.publicAuthBasePath?.trim() ||
    process.env.PAPERCLIP_PUBLIC_URL?.trim() ||
    "";
  const callbackUrlHint = base
    ? `${base.replace(/\/+$/, "")}/api/auth/callback/github`
    : "/api/auth/callback/github (set PAPERCLIP_PUBLIC_URL or auth base URL for the exact value)";

  return {
    oauthAppConfigured,
    oauthLinkAvailable,
    deploymentMode: input.deploymentMode,
    tokenAvailable: Boolean(tokenPack),
    tokenSource: tokenPack?.source ?? "none",
    githubLogin,
    help: {
      callbackUrlHint,
      patEnv: "PAPERCLIP_GITHUB_PAT",
    },
  };
}
