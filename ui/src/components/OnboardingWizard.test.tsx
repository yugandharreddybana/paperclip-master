// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingWizard } from "./OnboardingWizard";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockCloseOnboarding = vi.hoisted(() => vi.fn());
const mockSetSelectedCompanyId = vi.hoisted(() => vi.fn());
const mockCompanies = vi.hoisted(() => [] as Array<{ id: string; issuePrefix: string; name: string }>);
const mockDialogOptions = vi.hoisted(() => ({ initialStep: undefined as 1 | 2 | 3 | 4 | 5 | 6 | undefined, companyId: undefined as string | undefined }));

const mockCompaniesApi = vi.hoisted(() => ({
  create: vi.fn(),
}));

const mockGoalsApi = vi.hoisted(() => ({
  create: vi.fn(),
  list: vi.fn(),
}));

const mockAgentsApi = vi.hoisted(() => ({
  adapterModels: vi.fn(),
  hire: vi.fn(),
  testEnvironment: vi.fn(),
  update: vi.fn(),
}));

const mockApprovalsApi = vi.hoisted(() => ({
  approve: vi.fn(),
}));

const mockProjectsApi = vi.hoisted(() => ({
  create: vi.fn(),
}));

const mockIssuesApi = vi.hoisted(() => ({
  create: vi.fn(),
  upsertDocument: vi.fn(),
}));

const mockGithubApi = vi.hoisted(() => ({
  status: vi.fn(),
  repositories: vi.fn(),
}));

const mockAuthApi = vi.hoisted(() => ({
  linkGithubAccount: vi.fn(),
}));

vi.mock("../context/DialogContext", () => ({
  useDialog: () => ({
    onboardingOpen: true,
    onboardingOptions: mockDialogOptions,
    closeOnboarding: mockCloseOnboarding,
  }),
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    companies: mockCompanies,
    selectedCompanyId: null,
    setSelectedCompanyId: mockSetSelectedCompanyId,
    loading: false,
  }),
}));

vi.mock("../api/companies", () => ({ companiesApi: mockCompaniesApi }));
vi.mock("../api/goals", () => ({ goalsApi: mockGoalsApi }));
vi.mock("../api/agents", () => ({ agentsApi: mockAgentsApi }));
vi.mock("../api/approvals", () => ({ approvalsApi: mockApprovalsApi }));
vi.mock("../api/projects", () => ({ projectsApi: mockProjectsApi }));
vi.mock("../api/issues", () => ({ issuesApi: mockIssuesApi }));
vi.mock("../api/github", () => ({ githubApi: mockGithubApi }));
vi.mock("../api/auth", () => ({ authApi: mockAuthApi }));

vi.mock("../adapters", () => ({
  getUIAdapter: () => ({
    label: "Claude Local",
    buildAdapterConfig: () => ({}),
  }),
  listUIAdapters: () => [{ type: "claude_local" }],
}));

vi.mock("../adapters/metadata", () => ({
  isVisualAdapterChoice: () => true,
}));

vi.mock("../adapters/adapter-display-registry", () => ({
  getAdapterDisplay: () => ({
    label: "Claude Local",
    description: "Local adapter",
    recommended: true,
    icon: () => null,
  }),
}));

vi.mock("../adapters/use-disabled-adapters", () => ({
  useDisabledAdaptersSync: () => new Set<string>(),
}));

vi.mock("../adapters/use-adapter-capabilities", () => ({
  useAdapterCapabilities: () => () => ({
    supportsInstructionsBundle: false,
    supportsSkills: false,
    supportsLocalAgentJwt: false,
  }),
}));

vi.mock("./AsciiArtAnimation", () => ({
  AsciiArtAnimation: () => null,
}));

vi.mock("@/lib/router", () => ({
  useLocation: () => ({ pathname: "/onboarding" }),
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    children: ReactNode;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <div>{children}</div> : null),
  DialogPortal: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode; asChild?: boolean }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    className,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    className?: string;
  }) => (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

async function waitForCondition(predicate: () => boolean, attempts = 20) {
  for (let index = 0; index < attempts; index += 1) {
    if (predicate()) return;
    await flushReact();
  }
  throw new Error("Condition not reached in time");
}

function clickButtonByText(container: HTMLElement, text: string) {
  const matches = Array.from(container.querySelectorAll("button")).filter(
    (candidate) =>
      candidate.textContent?.replace(/\s+/g, " ").trim() === text
  );
  const button = matches[matches.length - 1];
  if (!button) throw new Error(`Button not found: ${text}`);
  button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

function clickButtonContainingText(container: HTMLElement, text: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) =>
      candidate.textContent?.replace(/\s+/g, " ").trim().includes(text)
  );
  if (!button) throw new Error(`Button containing text not found: ${text}`);
  button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

describe("OnboardingWizard", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);

    mockNavigate.mockReset();
    mockCloseOnboarding.mockReset();
    mockSetSelectedCompanyId.mockReset();
    mockDialogOptions.initialStep = 2;
    mockDialogOptions.companyId = "company-1";
    mockCompanies.length = 0;
    mockCompanies.push({
      id: "company-1",
      issuePrefix: "ACM",
      name: "Acme Corp",
    });
    mockCompaniesApi.create.mockReset();
    mockGoalsApi.create.mockReset();
    mockGoalsApi.list.mockReset();
    mockAgentsApi.adapterModels.mockReset();
    mockAgentsApi.hire.mockReset();
    mockAgentsApi.testEnvironment.mockReset();
    mockAgentsApi.update.mockReset();
    mockApprovalsApi.approve.mockReset();
    mockProjectsApi.create.mockReset();
    mockIssuesApi.create.mockReset();
    mockIssuesApi.upsertDocument.mockReset();
    mockGithubApi.status.mockReset();
    mockGithubApi.repositories.mockReset();
    mockAuthApi.linkGithubAccount.mockReset();

    mockCompaniesApi.create.mockResolvedValue({
      id: "company-1",
      issuePrefix: "ACM",
      name: "Acme Corp",
    });
    mockGoalsApi.list.mockResolvedValue([]);
    mockAgentsApi.adapterModels.mockResolvedValue([]);
    mockAgentsApi.hire.mockResolvedValue({
      agent: { id: "agent-1" },
      approval: null,
    });
    mockProjectsApi.create.mockResolvedValue({
      id: "project-1",
      name: "Onboarding",
    });
    mockIssuesApi.create.mockResolvedValue({
      id: "issue-1",
      identifier: "ACM-1",
    });
    mockIssuesApi.upsertDocument.mockResolvedValue({
      id: "doc-1",
      key: "ai-team-org-map",
    });
    mockGithubApi.status.mockResolvedValue({
      tokenAvailable: true,
      oauthLinkAvailable: true,
      githubLogin: "octocat",
      deploymentMode: "authenticated",
      help: {
        callbackUrlHint: "http://localhost:3100/api/auth/github/callback",
        patEnv: "GITHUB_TOKEN",
      },
    });
    mockGithubApi.repositories.mockResolvedValue({
      items: [
        {
          fullName: "paperclipai/paperclip",
          htmlUrl: "https://github.com/paperclipai/paperclip",
          defaultBranch: "main",
          private: false,
        },
      ],
      page: 1,
      pageSize: 30,
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders six steps and launches with github links + ai team document persistence", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <OnboardingWizard />
        </QueryClientProvider>
      );
    });

    expect(container.textContent).toContain("Company Name");
    expect(container.textContent).toContain("Github Codebase");
    expect(container.textContent).toContain("Agents");
    expect(container.textContent).toContain("Tasks");
    expect(container.textContent).toContain("AI Team");
    expect(container.textContent).toContain("Launch");

    await flushReact();
    expect(container.textContent).toContain("Connect GitHub codebases");
    await waitForCondition(() =>
      container.textContent?.includes("paperclipai/paperclip") ?? false
    );

    await act(async () => {
      clickButtonContainingText(container, "paperclipai/paperclip");
    });

    await act(async () => {
      clickButtonByText(container, "Next");
    });
    await flushReact();

    expect(container.textContent).toContain("Create your first agent");

    await act(async () => {
      clickButtonByText(container, "Next");
    });
    await flushReact();

    const taskTitleInput = container.querySelector(
      "input[placeholder=\"Task title\"]"
    ) as HTMLInputElement | null;
    expect(taskTitleInput?.value).toBe(
      "Read all my codebases and build a complete AI company with named agents, teams, and an org map"
    );

    await act(async () => {
      clickButtonByText(container, "Next");
    });
    await flushReact();

    expect(container.textContent).toContain("Build your AI team draft");

    await act(async () => {
      clickButtonByText(container, "Next");
    });
    await flushReact();

    expect(container.textContent).toContain("Ready to launch");

    await act(async () => {
      clickButtonByText(container, "Create & Open Issue");
    });
    await flushReact();
    await flushReact();

    expect(mockProjectsApi.create).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        githubRepositoryLinks: [
          expect.objectContaining({
            fullName: "paperclipai/paperclip",
          }),
        ],
      })
    );

    expect(mockIssuesApi.upsertDocument).toHaveBeenCalledWith(
      "issue-1",
      "ai-team-org-map",
      expect.objectContaining({
        format: "markdown",
        body: expect.stringContaining("## Graph JSON"),
      })
    );

    expect(mockNavigate).toHaveBeenCalledWith("/ACM/issues/ACM-1");

    await act(async () => {
      root.unmount();
    });
  });
});
