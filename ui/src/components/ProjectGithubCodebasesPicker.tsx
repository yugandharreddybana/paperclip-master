import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GithubRepositoryLink, Project } from "@paperclipai/shared";
import { githubApi } from "@/api/github";
import { projectsApi } from "@/api/projects";
import { authApi } from "@/api/auth";
import { queryKeys } from "@/lib/queryKeys";
import { useToastActions } from "@/context/ToastContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { GitBranch, Github, Loader2, Plus, Unlink2 } from "lucide-react";

type Props = {
  companyId: string | null | undefined;
  project: Project | null | undefined;
  disabled?: boolean;
};

export function ProjectGithubCodebasesPicker({ companyId, project, disabled }: Props) {
  const qc = useQueryClient();
  const toast = useToastActions();
  const projectId = project?.id ?? "";
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [localLinks, setLocalLinks] = useState<GithubRepositoryLink[]>([]);

  const linksKey = useMemo(
    () => JSON.stringify(project?.githubRepositoryLinks ?? []),
    [project?.githubRepositoryLinks],
  );

  useEffect(() => {
    setLocalLinks(project?.githubRepositoryLinks ?? []);
  }, [project?.id, linksKey]);

  const { data: ghStatus } = useQuery({
    queryKey: queryKeys.github.status(),
    queryFn: () => githubApi.status(),
    staleTime: 15_000,
  });

  const {
    data: repoPage,
    isLoading: reposLoading,
    error: reposError,
  } = useQuery({
    queryKey: queryKeys.github.repositories(page, 40, search.trim()),
    queryFn: () => githubApi.repositories({ page, pageSize: 40, q: search.trim() || undefined }),
    enabled: open && Boolean(ghStatus?.tokenAvailable) && Boolean(projectId && companyId),
  });

  const saveMutation = useMutation({
    mutationFn: async (next: GithubRepositoryLink[]) => {
      if (!companyId || !projectId) throw new Error("Missing project");
      return projectsApi.update(projectId, { githubRepositoryLinks: next }, companyId);
    },
    onSuccess: () => {
      if (companyId) {
        void qc.invalidateQueries({ queryKey: queryKeys.projects.list(companyId) });
      }
    },
    onError: (err: unknown) => {
      toast.pushToast({
        title: err instanceof Error ? err.message : "Could not save codebases",
        tone: "error",
      });
    },
  });

  const busy = saveMutation.isPending;

  function toggleRepo(item: { fullName: string; htmlUrl: string; defaultBranch: string | null }) {
    if (!projectId || !companyId || busy || disabled) return;
    const lower = item.fullName.toLowerCase();
    const exists = localLinks.some((link) => link.fullName.toLowerCase() === lower);
    const next = exists
      ? localLinks.filter((link) => link.fullName.toLowerCase() !== lower)
      : [
          ...localLinks,
          {
            fullName: item.fullName,
            htmlUrl: item.htmlUrl,
            defaultBranch: item.defaultBranch,
          },
        ];
    setLocalLinks(next);
    saveMutation.mutate(next);
  }

  const disconnected =
    ghStatus &&
    !ghStatus.tokenAvailable &&
    !ghStatus.oauthLinkAvailable &&
    ghStatus.deploymentMode === "local_trusted";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 text-sm min-h-8",
        (!projectId || disabled) && "opacity-50 pointer-events-none",
      )}
    >
      <GitBranch className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="text-muted-foreground shrink-0">Codebases</span>

      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
        {localLinks.length === 0 ? (
          <span className="text-xs text-muted-foreground/80">None linked</span>
        ) : (
          localLinks.map((link) => (
            <button
              key={link.fullName}
              type="button"
              title={`Remove ${link.fullName}`}
              disabled={busy || disabled || !projectId}
              className="inline-flex items-center gap-1 max-w-[220px] px-1.5 py-0.5 rounded-md bg-muted/80 text-[11px] font-medium hover:bg-muted transition-colors"
              onClick={() =>
                toggleRepo({
                  fullName: link.fullName,
                  htmlUrl: link.htmlUrl ?? `https://github.com/${link.fullName}`,
                  defaultBranch: link.defaultBranch ?? null,
                })
              }
            >
              <span className="truncate">{link.fullName}</span>
              <Unlink2 className="h-3 w-3 shrink-0 opacity-60" />
            </button>
          ))
        )}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
              disabled={!projectId || !companyId || disabled}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(100vw-2rem,380px)] p-2" disablePortal>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  GitHub
                </span>
                {ghStatus?.githubLogin ? (
                  <span className="text-[11px] text-muted-foreground truncate">@{ghStatus.githubLogin}</span>
                ) : null}
              </div>

              {ghStatus && !ghStatus.tokenAvailable ? (
                <div className="rounded-md border border-border/80 bg-muted/30 p-2 text-xs space-y-2">
                  {disconnected ? (
                    <p className="text-muted-foreground leading-snug">
                      Local-trusted mode does not mount GitHub OAuth. Set{" "}
                      <code className="text-[10px]">{ghStatus.help.patEnv}</code> for this machine, or run in
                      authenticated deployment mode with{" "}
                      <code className="text-[10px]">GITHUB_CLIENT_ID</code> /{" "}
                      <code className="text-[10px]">GITHUB_CLIENT_SECRET</code>.
                    </p>
                  ) : ghStatus.oauthLinkAvailable ? (
                    <div className="space-y-2">
                      <p className="text-muted-foreground leading-snug">
                        Connect GitHub so Paperclip can list your repositories. OAuth callback:{" "}
                        <code className="text-[10px] break-all">{ghStatus.help.callbackUrlHint}</code>
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => {
                          void authApi
                            .linkGithubAccount({
                              callbackURL: window.location.href,
                            })
                            .catch((err: unknown) =>
                              toast.pushToast({
                                title: err instanceof Error ? err.message : "GitHub link failed",
                                tone: "error",
                              }),
                            );
                        }}
                      >
                        <Github className="h-3.5 w-3.5" />
                        Connect GitHub
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground leading-snug">
                      GitHub OAuth is not configured on the server. Set client id/secret on the instance.
                    </p>
                  )}
                </div>
              ) : null}

              {ghStatus?.tokenAvailable ? (
                <>
                  <input
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Filter repositories…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                  <div className="max-h-56 overflow-y-auto rounded-md border border-border/60">
                    {reposLoading ? (
                      <div className="flex items-center justify-center py-8 text-muted-foreground gap-2 text-xs">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading
                      </div>
                    ) : reposError ? (
                      <p className="p-3 text-xs text-destructive">{(reposError as Error).message}</p>
                    ) : (
                      <ul className="divide-y divide-border/50">
                        {(repoPage?.items ?? []).map((item) => {
                          const active = localLinks.some(
                            (link) => link.fullName.toLowerCase() === item.fullName.toLowerCase(),
                          );
                          return (
                            <li key={item.fullName}>
                              <button
                                type="button"
                                className={cn(
                                  "flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-xs hover:bg-accent/40",
                                  active && "bg-primary/5",
                                )}
                                onClick={() => toggleRepo(item)}
                                disabled={busy}
                              >
                                <span className="truncate">{item.fullName}</span>
                                {item.private ? (
                                  <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                                    Private
                                  </span>
                                ) : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                    <button
                      type="button"
                      className="hover:text-foreground disabled:opacity-40"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <span>Page {page}</span>
                    <button
                      type="button"
                      className="hover:text-foreground disabled:opacity-40"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={(repoPage?.items.length ?? 0) < 40}
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
