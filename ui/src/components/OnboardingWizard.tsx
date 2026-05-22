import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdapterEnvironmentTestResult, GithubRepositoryLink } from "@paperclipai/shared";
import { useLocation, useNavigate, useParams } from "@/lib/router";
import { useDialog } from "../context/DialogContext";
import { useCompany } from "../context/CompanyContext";
import { companiesApi } from "../api/companies";
import { goalsApi } from "../api/goals";
import { agentsApi } from "../api/agents";
import { approvalsApi } from "../api/approvals";
import { issuesApi } from "../api/issues";
import { projectsApi } from "../api/projects";
import { githubApi } from "../api/github";
import { authApi } from "../api/auth";
import { queryKeys } from "../lib/queryKeys";
import { Dialog, DialogPortal } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import {
  extractModelName,
  extractProviderIdWithFallback
} from "../lib/model-utils";
import { getUIAdapter } from "../adapters";
import { listUIAdapters } from "../adapters";
import { isVisualAdapterChoice } from "../adapters/metadata";
import { useDisabledAdaptersSync } from "../adapters/use-disabled-adapters";
import { useAdapterCapabilities } from "../adapters/use-adapter-capabilities";
import { getAdapterDisplay } from "../adapters/adapter-display-registry";
import { defaultCreateValues } from "./agent-config-defaults";
import { parseOnboardingGoalInput } from "../lib/onboarding-goal";
import {
  buildOnboardingIssuePayload,
  buildOnboardingProjectPayload,
  selectDefaultCompanyGoalId
} from "../lib/onboarding-launch";
import { buildNewAgentRuntimeConfig } from "../lib/new-agent-runtime-config";
import {
  DEFAULT_CODEX_LOCAL_BYPASS_APPROVALS_AND_SANDBOX,
  DEFAULT_CODEX_LOCAL_MODEL
} from "@paperclipai/adapter-codex-local";
import { DEFAULT_CURSOR_LOCAL_MODEL } from "@paperclipai/adapter-cursor-local";
import { DEFAULT_GEMINI_LOCAL_MODEL } from "@paperclipai/adapter-gemini-local";
import { DEFAULT_OPENCODE_LOCAL_MODEL, isValidOpenCodeModelId } from "@paperclipai/adapter-opencode-local";
import { resolveRouteOnboardingOptions } from "../lib/onboarding-route";
import { AsciiArtAnimation } from "./AsciiArtAnimation";
import {
  buildAriaAiTeamTemplate,
  buildAiTeamDraftMarkdown,
  buildAiTeamDraftSummary,
  buildAiTeamMermaid,
  rebuildReportingEdges,
  type AiTeamDraftDocument,
  type AiTeamEdgeDraft,
  type AiTeamEdgeKind,
  type AiTeamNodeDraft,
} from "../lib/ai-team-draft";
import {
  Building2,
  Bot,
  ListTodo,
  Rocket,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  CheckCircle2,
  ChevronDown,
  X,
  Github,
  Search,
  AlertTriangle,
  Users,
  Plus,
  Trash2
} from "lucide-react";

type Step = 1 | 2 | 3 | 4 | 5 | 6;
type AdapterType = string;

const GENESIS_TASK_TITLE =
  "Read all my codebases and build a complete AI company with named agents, teams, and an org map";

const GENESIS_TASK_DESCRIPTION = `You are the Genesis Architect and Org Designer for this company.
Your job is to:

read and deeply understand every codebase and business artifact I give you,

infer the real business, product, tech stack, and risk profile,

design a complete real-world company, but entirely as AI agents and teams,

create enough named agents in every department (not just one per domain) to realistically operate this system,

output an interactive org diagram rooted at the CEO where clicking any agent shows their master-level skill and responsibilities, which I can edit at any time.

Step 1 — Read everything and size the system

Discover and read all repositories and codebases that belong to this company: backend, frontend, mobile, infra, data/ML, internal tools, scripts, IaC.

Parse and use all available context that reveals intent and constraints: READMEs, PRDs/specs, DESIGN docs, SKILL docs (if any), tests, CI/CD, analytics, infra configs.

From this, build an internal picture of:

what the business and product are (users, problems, value props, key flows),

the main domains and sub-domains (onboarding, billing, growth, operations, data, security, support, etc.),

the tech stack per repo (languages, frameworks, databases, queues, clouds, vendors),

data and control flow end-to-end, including security boundaries and risk surfaces.
v27_9.md

Estimate scale and complexity: number of services/repos, domains, critical flows, external integrations, and data sensitivity (PII, payments, regulated data). Use this to approximate how big a real company would be here (small, mid, large).
v27_9.md

Step 2 — Define the full company structure (nothing missing)

Based on that understanding, design the full company as if it were a real-world organization, but implemented entirely as AI agents. At minimum, you must instantiate the following departments:

Executive & Governance

CEO, CTO, CPO, CFO/FinOps, COO (if needed), Supreme Court/Board, System Health Analyst, Misalignment Monitor, Decision Explainer.
v27_9.md

Product & Business

Head of Product, Product Managers / Product Owners per major domain, Business Analysts, Business Logic Architect, Product Architect (UX Defender), Synthesizer Agent, Mentor, User Advocate.
v27_9.md

Engineering & Operations

Head of Engineering / VP Eng.

Tech Leads / Engineering Managers per area (Backend, Frontend, Mobile, Platform, Data/ML, Integrations, Tooling, Infra/SRE).

Multiple IC agents in each area (full-stack, backend, frontend, mobile, data/ML, infra), with counts scaled to system size.
v27_9.md

Security, Cyber Defense, and Red Team

Head of Security / CISO.

Security Engineers / Blue-Team (app, infra, data).

Red-Team Saboteur / Offensive Hacker agents (one or more), whose job is to actively attack the system in isolated sandboxes and find weaknesses.

Chaos Security / Chaos UX agents that simulate messy and adversarial user behavior.

Compliance Auditor, IP/Plagiarism Scanner.
v27_9.md

AI Skills & Talent Ecosystem

Head of AI Skills.

Talent Acquisition Agents who constantly scan the outside world (skills marketplaces, open source, research) for new skills relevant to this business.

Skill Quarantine / Security Filter agents who isolate and stress-test new skills and tools for prompt injection, exfiltration, and abuse.

Curriculum / Skill Planner agents who map skills to agents, design training missions, and track experience and anti-patterns.

Zero-Trust HR Engine agents who control identity, access, and off-boarding.
v27_9.md

Quality, Testing, and Reliability

Head of Quality / QA.

QA Engineers and QA E2E agents (Playwright/device matrix).

Performance Engineers.

Contract Test Owners.

Red-team QA / Chaos UX agents that try to break flows before release.
v27_9.md

Data, Analytics, and Knowledge

Data/Analytics Lead.

Data Engineers and Analytics agents.

Knowledge Graph Architect, Historian (Chesterton’s Fence).
v27_9.md

Finance & Procurement

FinOps Oracle, Procurement Scout, Corporate Treasury agents, Diplomat (B2B vendor negotiator).
v27_9.md

Meta & Evolution

Meta-Evolution Architect, Curriculum Planner, Evaluator/Grader governance roles that maintain skills and evaluation quality over time.
v27_9.md

If the business clearly needs more specialized areas (e.g., Legal, Support, Growth Marketing), create matching departments and agents for those as well. There must be no major real-world function left unmodeled as agents.

Step 3 — Decide team sizes and create multiple named agents

Use the earlier scale/complexity estimate to decide how many agents and squads to create in each department. You must not stop at one agent per role. For example, a large system might realistically need something like:

4-6 backend agents, 3-5 frontend agents, 3+ full-stack agents, 2-3 mobile agents, 2 platform/infra agents, 2+ data/ML agents.

2-3 QA agents, 1-2 QA E2E agents, 1+ performance engineer.

2+ security engineers, 2-3 red-team agents, 1-2 compliance/IP agents.

2+ AI skill/talent agents (talent acquisition + skill quarantine + curriculum).

Multiple PMs/POs and at least one scrum master or delivery lead per active squad.
v27_9.md

For every agent you create (including execs, tech leads, product owners, scrum masters, ICs, security, red-team, AI-skills, QA, finance, meta):

give them a realistic human-style name and job title (e.g., “Ava Patel - CEO”, “Liam Chen - Backend Engineer”, “Noor Alvarez - Red-Team Hacker”, “Mina Okafor - AI Skill Scout”, “Jonas Muller - Billing Product Owner”, “Sara Ibrahim - App Squad Scrum Master”),

assign them to a department and, where relevant, a specific squad or team,

write a master-level skill description that covers:

what they are best at and when they should be invoked,

their inputs (issues, incidents, metrics, CVEs, skills, diffs…),

their outputs (plans, patches, RFCs, playbooks, reports, new skills),

allowed actions and forbidden actions, especially for security and red-team,

crisp checklists they must follow before they act,

known anti-patterns and failure modes they must avoid,

how they cooperate or conflict with other agents (who they depend on, who they challenge).
v27_9.md

Ensure that every important area of the product and system (domains, repos, services, risk surfaces) is owned by at least one agent and one squad; nothing important is allowed to be “no one’s job”.

Step 4 — Create squads, leads, product owners, and scrum masters

Group agents into realistic squads/teams with clear missions, such as:

Core App Squad, Billing & Payments Squad, Growth & Experiments Squad, Security Ops Squad, Red-Team Squad, AI Skill & Talent Squad, Infra & Reliability Squad, Data & Analytics Squad, etc.

For each squad:

assign a Tech Lead / Engineering Manager who owns technical quality and architecture in that area,

assign a Product Owner / PM responsible for product outcomes in that area,

assign a Scrum Master / Delivery Lead responsible for ceremonies and flow,

list which IC agents (engineers, QA, security, red-team, data) are members.

Map each squad to concrete responsibilities:

which repos, services, and data stores they own,

which user journeys or domains they own,

how incidents, CVEs, red-team findings, feature requests, and new skills get routed to them.
v27_9.md

Step 5 — Build the interactive CEO-rooted org diagram

Construct a graph representation of the Company Org where:

the CEO is the root node,

C-level execs and the Supreme Court/Board are directly under the CEO,

below that are departments, then squads, then individual agents.

For each node (agent), include metadata at least for:

human name, job title, department, squad,

master-level skill summary and key checklists,

repos/services/data they own or influence,

primary tools/skills,

success metrics, constraints, and forbidden actions,

manager (who they report to) and direct reports (if any).

For each edge, encode whether it is:

a reporting line,

a collaboration or challenge relationship (e.g., Red-Team ↔ Security, User Advocate ↔ Growth, Skill Quarantine ↔ Talent Acquisition),

an ownership relationship (agent/team ↔ repo/service/domain).
v27_9.md

Output this graph in a machine-readable form so the UI can:

render an org chart starting at the CEO and fanning out into departments and agents,

open a detail panel when I click any agent node showing their full skill card and responsibilities,

let me edit any field; human edits always override auto-generated values and must be preserved on future runs.

Step 6 — Respect human edits and keep the company evolving

When I later change the codebase, add repos, or edit agents/skills manually, re-running this task must:

detect new domains, services, or risks and propose new squads/agents/skills where needed,

propose restructures as diffs instead of silently overwriting my company,

never delete or downgrade human-edited agents, teams, or departments without explicit approval.

Treat this AI-run company as a long-lived, evolving organism that must always be able to operate the current system safely, securely, and efficiently.

Success criteria:

The resulting org looks and feels like a complete real-world company mapped into AI agents: all departments present, enough agents in each, realistic leads/POs/scrum masters, full security and red-team, full AI-skills and talent operations.

Every repo, service, domain, and major risk surface has a clearly responsible agent and team.

The CEO-rooted org diagram is accurate, interactive, and fully editable, and can be reused as the foundation for all future skills (planning, QA, security, skill evolution, migrations, growth).`;

export function OnboardingWizard() {
  const [launchStage, setLaunchStage] = useState<"idle" | "reading_repos" | "hiring" | "done">("idle");
  const [currentRepoIndex, setCurrentRepoIndex] = useState(0);
  const [hiredCount, setHiredCount] = useState(0);
  const { onboardingOpen, onboardingOptions, closeOnboarding } = useDialog();
  const { companies, setSelectedCompanyId, loading: companiesLoading } = useCompany();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { companyPrefix } = useParams<{ companyPrefix?: string }>();
  const [routeDismissed, setRouteDismissed] = useState(false);
  const aiTeamNodeCounterRef = useRef(1);

  // Sync disabled adapter types from server so adapter grid filters them out
  const disabledTypes = useDisabledAdaptersSync();

  const routeOnboardingOptions =
    companyPrefix && companiesLoading
      ? null
      : resolveRouteOnboardingOptions({
          pathname: location.pathname,
          companyPrefix,
          companies,
        });
  const effectiveOnboardingOpen =
    onboardingOpen || (routeOnboardingOptions !== null && !routeDismissed);
  const effectiveOnboardingOptions = onboardingOpen
    ? onboardingOptions
    : routeOnboardingOptions ?? {};

  const initialStep = (effectiveOnboardingOptions.initialStep ?? 1) as Step;
  const existingCompanyId = effectiveOnboardingOptions.companyId;

  const [step, setStep] = useState<Step>(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState("");

  // Step 1
  const [companyName, setCompanyName] = useState("");
  const [companyGoal, setCompanyGoal] = useState("");

  // Step 2 - GitHub codebases
  const [selectedGithubRepositoryLinks, setSelectedGithubRepositoryLinks] = useState<
    GithubRepositoryLink[]
  >([]);
  const [githubSearch, setGithubSearch] = useState("");
  const [githubPage, setGithubPage] = useState(1);
  const [githubWarning, setGithubWarning] = useState<string | null>(null);

  // Step 3 - Agents
  const [agentName, setAgentName] = useState("CEO");
  const [adapterType, setAdapterType] = useState<AdapterType>("claude_local");
  const [model, setModel] = useState("");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [url, setUrl] = useState("");
  const [adapterEnvResult, setAdapterEnvResult] =
    useState<AdapterEnvironmentTestResult | null>(null);
  const [adapterEnvError, setAdapterEnvError] = useState<string | null>(null);
  const [adapterEnvLoading, setAdapterEnvLoading] = useState(false);
  const [forceUnsetAnthropicApiKey, setForceUnsetAnthropicApiKey] =
    useState(false);
  const [unsetAnthropicLoading, setUnsetAnthropicLoading] = useState(false);
  const [showMoreAdapters, setShowMoreAdapters] = useState(false);

  // Step 4 - Tasks
  const [taskTitle, setTaskTitle] = useState(GENESIS_TASK_TITLE);
  const [taskDescription, setTaskDescription] = useState(
    GENESIS_TASK_DESCRIPTION
  );

  // Step 5 - AI Team
  const [aiTeamDraft, setAiTeamDraft] = useState<AiTeamDraftDocument>(
    () => buildAriaAiTeamTemplate()
  );
  const [selectedAiTeamNodeId, setSelectedAiTeamNodeId] = useState("ceo");
  const [relationshipFromId, setRelationshipFromId] = useState("");
  const [relationshipToId, setRelationshipToId] = useState("");
  const [relationshipKind, setRelationshipKind] = useState<AiTeamEdgeKind>(
    "collaboration"
  );
  const [relationshipLabel, setRelationshipLabel] = useState("");

  // Auto-grow textarea for task description
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoResizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, []);

  // Created entity IDs - pre-populate from existing company when skipping step 1
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(
    existingCompanyId ?? null
  );
  const [createdCompanyPrefix, setCreatedCompanyPrefix] = useState<
    string | null
  >(null);
  const [createdCompanyGoalId, setCreatedCompanyGoalId] = useState<string | null>(
    null
  );
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [createdIssueId, setCreatedIssueId] = useState<string | null>(null);
  const [createdIssueRef, setCreatedIssueRef] = useState<string | null>(null);

  const minimumStep = (effectiveOnboardingOptions.initialStep ?? 1) as Step;

  useEffect(() => {
    setRouteDismissed(false);
  }, [location.pathname]);

  // Sync step and company when onboarding opens with options.
  // Keep this independent from company-list refreshes so Step 1 completion
  // doesn't get reset after creating a company.
  useEffect(() => {
    if (!effectiveOnboardingOpen) return;
    const cId = effectiveOnboardingOptions.companyId ?? null;
    const matchedCompany = cId ? companies.find((c) => c.id === cId) ?? null : null;
    setStep((effectiveOnboardingOptions.initialStep ?? 1) as Step);
    setCreatedCompanyId(cId);
    setCreatedCompanyPrefix(matchedCompany?.issuePrefix ?? null);
    setCreatedCompanyGoalId(null);
    setCreatedProjectId(null);
    setCreatedAgentId(null);
    setCreatedIssueId(null);
    setCreatedIssueRef(null);
    setCompanyName(matchedCompany?.name ?? "");
    setCompanyGoal("");
    setSelectedGithubRepositoryLinks([]);
    setGithubSearch("");
    setGithubPage(1);
    setGithubWarning(null);
    setAgentName("CEO");
    setAdapterType("claude_local");
    setModel("");
    setCommand("");
    setArgs("");
    setUrl("");
    setAdapterEnvResult(null);
    setAdapterEnvError(null);
    setAdapterEnvLoading(false);
    setForceUnsetAnthropicApiKey(false);
    setUnsetAnthropicLoading(false);
    setTaskTitle(GENESIS_TASK_TITLE);
    setTaskDescription(GENESIS_TASK_DESCRIPTION);
    setAiTeamDraft(buildAriaAiTeamTemplate());
    setSelectedAiTeamNodeId("ceo");
    setRelationshipFromId("");
    setRelationshipToId("");
    setRelationshipKind("collaboration");
    setRelationshipLabel("");
    aiTeamNodeCounterRef.current = 1;
  }, [
    effectiveOnboardingOpen,
    effectiveOnboardingOptions.companyId,
    effectiveOnboardingOptions.initialStep,
    companies,
  ]);

  // Backfill issue prefix and company name for an existing company once companies are loaded.
  useEffect(() => {
    if (!effectiveOnboardingOpen || !createdCompanyId) return;
    const company = companies.find((c) => c.id === createdCompanyId);
    if (!company) return;
    if (!createdCompanyPrefix) setCreatedCompanyPrefix(company.issuePrefix);
    if (!companyName.trim()) setCompanyName(company.name);
  }, [
    effectiveOnboardingOpen,
    createdCompanyId,
    createdCompanyPrefix,
    companies,
    companyName,
  ]);

  // Resize textarea when step 4 is shown or description changes
  useEffect(() => {
    if (step === 4) autoResizeTextarea();
  }, [step, taskDescription, autoResizeTextarea]);

  const { data: ghStatus, isLoading: ghStatusLoading } = useQuery({
    queryKey: queryKeys.github.status(),
    queryFn: () => githubApi.status(),
    staleTime: 15_000,
    enabled: effectiveOnboardingOpen && step === 2 && Boolean(createdCompanyId),
  });

  const {
    data: githubRepoPage,
    isLoading: githubReposLoading,
    error: githubReposError,
  } = useQuery({
    queryKey: queryKeys.github.repositories(githubPage, 30, githubSearch.trim()),
    queryFn: () =>
      githubApi.repositories({
        page: githubPage,
        pageSize: 30,
        q: githubSearch.trim() || undefined,
      }),
    enabled:
      effectiveOnboardingOpen &&
      step === 2 &&
      Boolean(createdCompanyId) &&
      Boolean(ghStatus?.tokenAvailable),
  });

  const { data: adapterModels } = useQuery({
    // The wizard doesn't expose an environment selector, so models always
    // resolve against the local Paperclip host (environmentId = null).
    queryKey: createdCompanyId
      ? queryKeys.agents.adapterModels(createdCompanyId, adapterType, null)
      : ["agents", "none", "adapter-models", adapterType, null],
    queryFn: () => agentsApi.adapterModels(createdCompanyId!, adapterType, { environmentId: null }),
    enabled: Boolean(createdCompanyId) && effectiveOnboardingOpen && step === 3
  });
  const getCapabilities = useAdapterCapabilities();
  const adapterCaps = getCapabilities(adapterType);
  const isLocalAdapter = adapterCaps.supportsInstructionsBundle || adapterCaps.supportsSkills || adapterCaps.supportsLocalAgentJwt;

  // Build adapter grids dynamically from the UI registry + display metadata.
  // External/plugin adapters automatically appear with generic defaults.
  const { recommendedAdapters, moreAdapters } = useMemo(() => {
    const SYSTEM_ADAPTER_TYPES = new Set(["process", "http"]);
    const all = listUIAdapters()
      .filter((a) =>
        !SYSTEM_ADAPTER_TYPES.has(a.type) &&
        !disabledTypes.has(a.type) &&
        isVisualAdapterChoice(a.type)
      )
      .map((a) => ({ ...getAdapterDisplay(a.type), type: a.type }));

    return {
      recommendedAdapters: all.filter((a) => a.recommended),
      moreAdapters: all.filter((a) => !a.recommended),
    };
  }, [disabledTypes]);
  const COMMAND_PLACEHOLDERS: Record<string, string> = {
    claude_local: "claude",
    codex_local: "codex",
    gemini_local: "gemini",
    pi_local: "pi",
    cursor: "agent",
    opencode_local: "opencode",
  };
  const effectiveAdapterCommand =
    command.trim() ||
    (COMMAND_PLACEHOLDERS[adapterType] ?? adapterType.replace(/_local$/, ""));

  useEffect(() => {
    if (step !== 3) return;
    setAdapterEnvResult(null);
    setAdapterEnvError(null);
  }, [step, adapterType, model, command, args, url]);

  useEffect(() => {
    const nodeIds = new Set(aiTeamDraft.nodes.map((node) => node.id));
    if (!nodeIds.has(selectedAiTeamNodeId)) {
      setSelectedAiTeamNodeId(aiTeamDraft.rootNodeId);
    }
    if (!relationshipFromId || !nodeIds.has(relationshipFromId)) {
      setRelationshipFromId(aiTeamDraft.rootNodeId);
    }
    if (!relationshipToId || !nodeIds.has(relationshipToId)) {
      const fallback = aiTeamDraft.nodes.find((node) => node.id !== aiTeamDraft.rootNodeId);
      setRelationshipToId(fallback?.id ?? aiTeamDraft.rootNodeId);
    }
  }, [
    aiTeamDraft.nodes,
    aiTeamDraft.rootNodeId,
    selectedAiTeamNodeId,
    relationshipFromId,
    relationshipToId,
  ]);

  const selectedModel = (adapterModels ?? []).find((m) => m.id === model);
  const hasAnthropicApiKeyOverrideCheck =
    adapterEnvResult?.checks.some(
      (check) =>
        check.code === "claude_anthropic_api_key_overrides_subscription"
    ) ?? false;
  const shouldSuggestUnsetAnthropicApiKey =
    adapterType === "claude_local" &&
    adapterEnvResult?.status === "fail" &&
    hasAnthropicApiKeyOverrideCheck;
  const filteredModels = useMemo(() => {
    const query = modelSearch.trim().toLowerCase();
    return (adapterModels ?? []).filter((entry) => {
      if (!query) return true;
      const provider = extractProviderIdWithFallback(entry.id, "");
      return (
        entry.id.toLowerCase().includes(query) ||
        entry.label.toLowerCase().includes(query) ||
        provider.toLowerCase().includes(query)
      );
    });
  }, [adapterModels, modelSearch]);
  const groupedModels = useMemo(() => {
    if (adapterType !== "opencode_local") {
      return [
        {
          provider: "models",
          entries: [...filteredModels].sort((a, b) => a.id.localeCompare(b.id))
        }
      ];
    }
    const groups = new Map<string, Array<{ id: string; label: string }>>();
    for (const entry of filteredModels) {
      const provider = extractProviderIdWithFallback(entry.id);
      const bucket = groups.get(provider) ?? [];
      bucket.push(entry);
      groups.set(provider, bucket);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([provider, entries]) => ({
        provider,
        entries: [...entries].sort((a, b) => a.id.localeCompare(b.id))
      }));
  }, [filteredModels, adapterType]);

  const selectedAiTeamNode = useMemo(
    () => aiTeamDraft.nodes.find((node) => node.id === selectedAiTeamNodeId) ?? null,
    [aiTeamDraft.nodes, selectedAiTeamNodeId]
  );
  const aiTeamSummary = useMemo(
    () => buildAiTeamDraftSummary(aiTeamDraft),
    [aiTeamDraft]
  );
  const aiTeamMermaid = useMemo(
    () => buildAiTeamMermaid(aiTeamDraft),
    [aiTeamDraft]
  );

  const relationshipEdges = useMemo(
    () => aiTeamDraft.edges.filter((edge) => edge.kind !== "reporting"),
    [aiTeamDraft.edges]
  );

  function canEnterStep(targetStep: Step): boolean {
    if (targetStep === 1) return true;
    if (targetStep === 2) return Boolean(createdCompanyId);
    if (targetStep === 3) return Boolean(createdCompanyId);
    if (targetStep === 4) return Boolean(createdCompanyId && createdAgentId);
    if (targetStep === 5) {
      return Boolean(createdCompanyId && createdAgentId && taskTitle.trim());
    }
    return Boolean(createdCompanyId && createdAgentId && taskTitle.trim());
  }

  function navigateToStep(targetStep: Step) {
    if (targetStep <= step || canEnterStep(targetStep)) {
      setError(null);
      setStep(targetStep);
      return;
    }
    setError("Complete earlier onboarding steps before moving forward.");
  }

  function nextAiTeamNodeId() {
    const next = aiTeamNodeCounterRef.current;
    aiTeamNodeCounterRef.current += 1;
    return `custom-node-${next}`;
  }

  function updateAiTeamDraft(updater: (draft: AiTeamDraftDocument) => AiTeamDraftDocument) {
    setAiTeamDraft((previous) => {
      const nextDraft = updater(previous);
      return {
        ...nextDraft,
        edges: rebuildReportingEdges(nextDraft),
      };
    });
  }

  function toggleGithubRepository(item: {
    fullName: string;
    htmlUrl: string;
    defaultBranch: string | null;
  }) {
    setSelectedGithubRepositoryLinks((previous) => {
      const key = item.fullName.toLowerCase();
      const exists = previous.some(
        (link) => link.fullName.toLowerCase() === key
      );
      if (exists) {
        return previous.filter(
          (link) => link.fullName.toLowerCase() !== key
        );
      }
      return [
        ...previous,
        {
          fullName: item.fullName,
          htmlUrl: item.htmlUrl,
          defaultBranch: item.defaultBranch,
        },
      ];
    });
    setGithubWarning(null);
  }

  function addAiTeamNode() {
    const nodeId = nextAiTeamNodeId();
    const selectedNode = selectedAiTeamNode ?? aiTeamDraft.nodes[0] ?? null;
    const managerId = selectedNode ? selectedNode.id : aiTeamDraft.rootNodeId;
    updateAiTeamDraft((draft) => ({
      ...draft,
      nodes: [
        ...draft.nodes,
        {
          id: nodeId,
          name: "New Agent",
          title: "Role Title",
          department: "Department",
          squad: "Squad",
          skills: "Core strengths and when to involve this role.",
          responsibilities: "Primary responsibilities and deliverables.",
          checklists: "Pre-action and post-action checks.",
          constraints: "Forbidden actions and safety boundaries.",
          managerId,
        },
      ],
    }));
    setSelectedAiTeamNodeId(nodeId);
  }

  function deleteSelectedAiTeamNode() {
    if (!selectedAiTeamNode) return;
    if (selectedAiTeamNode.id === aiTeamDraft.rootNodeId) {
      setError("The CEO root node cannot be deleted.");
      return;
    }

    const deletedNodeId = selectedAiTeamNode.id;
    updateAiTeamDraft((draft) => {
      const nextNodes = draft.nodes
        .filter((node) => node.id !== deletedNodeId)
        .map((node) =>
          node.managerId === deletedNodeId
            ? { ...node, managerId: draft.rootNodeId }
            : node
        );
      const nonReportingEdges = draft.edges.filter(
        (edge) =>
          edge.kind !== "reporting" &&
          edge.fromNodeId !== deletedNodeId &&
          edge.toNodeId !== deletedNodeId
      );
      return {
        ...draft,
        nodes: nextNodes,
        edges: nonReportingEdges,
      };
    });
    setSelectedAiTeamNodeId(aiTeamDraft.rootNodeId);
  }

  function updateSelectedAiTeamNode<K extends keyof AiTeamNodeDraft>(
    key: K,
    value: AiTeamNodeDraft[K]
  ) {
    if (!selectedAiTeamNode) return;

    if (key === "managerId" && value === selectedAiTeamNode.id) {
      return;
    }

    updateAiTeamDraft((draft) => ({
      ...draft,
      nodes: draft.nodes.map((node) =>
        node.id === selectedAiTeamNode.id ? { ...node, [key]: value } : node
      ),
    }));
  }

  function addRelationshipEdge() {
    const fromNodeId = relationshipFromId.trim();
    const toNodeId = relationshipToId.trim();
    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) return;

    const label = relationshipLabel.trim() || (
      relationshipKind === "reporting" ? "owns" : "collaborates"
    );

    setAiTeamDraft((draft) => {
      const duplicate = draft.edges.some(
        (edge) =>
          edge.kind === relationshipKind &&
          edge.fromNodeId === fromNodeId &&
          edge.toNodeId === toNodeId &&
          edge.label.toLowerCase() === label.toLowerCase()
      );
      if (duplicate) return draft;
      const edge: AiTeamEdgeDraft = {
        id: `${relationshipKind}:${fromNodeId}->${toNodeId}:${Date.now()}`,
        fromNodeId,
        toNodeId,
        kind: relationshipKind,
        label,
      };
      return {
        ...draft,
        edges: [...draft.edges, edge],
      };
    });
    setRelationshipLabel("");
  }

  function removeRelationshipEdge(edgeId: string) {
    setAiTeamDraft((draft) => ({
      ...draft,
      edges: draft.edges.filter((edge) => edge.id !== edgeId),
    }));
  }

  function reset() {
    setStep(1);
    setLoading(false);
    setError(null);
    setCompanyName("");
    setCompanyGoal("");
    setSelectedGithubRepositoryLinks([]);
    setGithubSearch("");
    setGithubPage(1);
    setGithubWarning(null);
    setAgentName("CEO");
    setAdapterType("claude_local");
    setModel("");
    setCommand("");
    setArgs("");
    setUrl("");
    setAdapterEnvResult(null);
    setAdapterEnvError(null);
    setAdapterEnvLoading(false);
    setForceUnsetAnthropicApiKey(false);
    setUnsetAnthropicLoading(false);
    setTaskTitle(GENESIS_TASK_TITLE);
    setTaskDescription(GENESIS_TASK_DESCRIPTION);
    setAiTeamDraft(buildAriaAiTeamTemplate());
    setSelectedAiTeamNodeId("ceo");
    setRelationshipFromId("");
    setRelationshipToId("");
    setRelationshipKind("collaboration");
    setRelationshipLabel("");
    aiTeamNodeCounterRef.current = 1;
    setCreatedCompanyId(null);
    setCreatedCompanyPrefix(null);
    setCreatedCompanyGoalId(null);
    setCreatedAgentId(null);
    setCreatedProjectId(null);
    setCreatedIssueId(null);
    setCreatedIssueRef(null);
  }

  function handleClose() {
    reset();
    closeOnboarding();
  }

  function buildAdapterConfig(): Record<string, unknown> {
    const adapter = getUIAdapter(adapterType);
    const config = adapter.buildAdapterConfig({
      ...defaultCreateValues,
      adapterType,
      model:
        adapterType === "codex_local"
          ? model || DEFAULT_CODEX_LOCAL_MODEL
          : adapterType === "gemini_local"
            ? model || DEFAULT_GEMINI_LOCAL_MODEL
          : adapterType === "cursor"
            ? model || DEFAULT_CURSOR_LOCAL_MODEL
            : adapterType === "opencode_local"
              ? model || DEFAULT_OPENCODE_LOCAL_MODEL
              : model,
      command,
      args,
      url,
      dangerouslySkipPermissions:
        adapterType === "claude_local" || adapterType === "opencode_local",
      dangerouslyBypassSandbox:
        adapterType === "codex_local"
          ? DEFAULT_CODEX_LOCAL_BYPASS_APPROVALS_AND_SANDBOX
          : defaultCreateValues.dangerouslyBypassSandbox
    });
    if (adapterType === "claude_local" && forceUnsetAnthropicApiKey) {
      const env =
        typeof config.env === "object" &&
        config.env !== null &&
        !Array.isArray(config.env)
          ? { ...(config.env as Record<string, unknown>) }
          : {};
      env.ANTHROPIC_API_KEY = { type: "plain", value: "" };
      config.env = env;
    }
    return config;
  }

  async function runAdapterEnvironmentTest(
    adapterConfigOverride?: Record<string, unknown>
  ): Promise<AdapterEnvironmentTestResult | null> {
    if (!createdCompanyId) {
      setAdapterEnvError(
        "Create or select a company before testing adapter environment."
      );
      return null;
    }
    setAdapterEnvLoading(true);
    setAdapterEnvError(null);
    try {
      const result = await agentsApi.testEnvironment(
        createdCompanyId,
        adapterType,
        {
          adapterConfig: adapterConfigOverride ?? buildAdapterConfig()
        }
      );
      setAdapterEnvResult(result);
      return result;
    } catch (err) {
      setAdapterEnvError(
        err instanceof Error ? err.message : "Adapter environment test failed"
      );
      return null;
    } finally {
      setAdapterEnvLoading(false);
    }
  }

  async function handleStep1Next() {
    setLoading(true);
    setError(null);
    try {
      const company = await companiesApi.create({ name: companyName.trim() });
      setCreatedCompanyId(company.id);
      setCreatedCompanyPrefix(company.issuePrefix);
      setSelectedCompanyId(company.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });

      if (companyGoal.trim()) {
        const parsedGoal = parseOnboardingGoalInput(companyGoal);
        const goal = await goalsApi.create(company.id, {
          title: parsedGoal.title,
          ...(parsedGoal.description
            ? { description: parsedGoal.description }
            : {}),
          level: "company",
          status: "active"
        });
        setCreatedCompanyGoalId(goal.id);
        queryClient.invalidateQueries({
          queryKey: queryKeys.goals.list(company.id)
        });
      } else {
        setCreatedCompanyGoalId(null);
      }

      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create company");
    } finally {
      setLoading(false);
    }
  }

  async function handleStep2Next() {
    if (!createdCompanyId) return;
    setError(null);
    if (selectedGithubRepositoryLinks.length === 0) {
      setGithubWarning(
        "No repositories selected. You can continue now and add codebases later."
      );
    } else {
      setGithubWarning(null);
    }
    setStep(3);
  }

  async function handleStep3Next() {
    if (!createdCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      if (adapterType === "opencode_local") {
        if (!isValidOpenCodeModelId(model)) {
          setError(
            "OpenCode requires an explicit model in provider/model format."
          );
          return;
        }
      }

      if (isLocalAdapter) {
        const result = adapterEnvResult ?? (await runAdapterEnvironmentTest());
        if (!result) return;
      }

      const hire = await agentsApi.hire(createdCompanyId, {
        name: agentName.trim(),
        role: "ceo",
        adapterType,
        adapterConfig: buildAdapterConfig(),
        runtimeConfig: buildNewAgentRuntimeConfig()
      });
      if (hire.approval) {
        await approvalsApi.approve(
          hire.approval.id,
          "Approved during onboarding first-agent setup."
        );
        queryClient.invalidateQueries({
          queryKey: queryKeys.approvals.list(createdCompanyId)
        });
      }
      const agent = hire.agent;
      setCreatedAgentId(agent.id);
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.list(createdCompanyId)
      });
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnsetAnthropicApiKey() {
    if (!createdCompanyId || unsetAnthropicLoading) return;
    setUnsetAnthropicLoading(true);
    setError(null);
    setAdapterEnvError(null);
    setForceUnsetAnthropicApiKey(true);

    const configWithUnset = (() => {
      const config = buildAdapterConfig();
      const env =
        typeof config.env === "object" &&
        config.env !== null &&
        !Array.isArray(config.env)
          ? { ...(config.env as Record<string, unknown>) }
          : {};
      env.ANTHROPIC_API_KEY = { type: "plain", value: "" };
      config.env = env;
      return config;
    })();

    try {
      if (createdAgentId) {
        await agentsApi.update(
          createdAgentId,
          { adapterConfig: configWithUnset },
          createdCompanyId
        );
        queryClient.invalidateQueries({
          queryKey: queryKeys.agents.list(createdCompanyId)
        });
      }

      const result = await runAdapterEnvironmentTest(configWithUnset);
      if (result?.status === "fail") {
        setError(
          "Retried with ANTHROPIC_API_KEY unset in adapter config, but the environment test is still failing."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to unset ANTHROPIC_API_KEY and retry."
      );
    } finally {
      setUnsetAnthropicLoading(false);
    }
  }

  async function handleStep4Next() {
    if (!createdCompanyId || !createdAgentId) return;
    setError(null);
    setStep(5);
  }

  async function handleStep5Next() {
    if (!createdCompanyId || !createdAgentId) return;
    setError(null);
    setStep(6);
  }

  async function handleLaunch() {
    if (!createdCompanyId || !createdAgentId) return;
    setLoading(true);
    setLaunchStage("reading_repos");
    setError(null);
    try {
      if (selectedGithubRepositoryLinks.length > 0) {
        for (let i = 0; i < selectedGithubRepositoryLinks.length; i++) {
          setCurrentRepoIndex(i);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } else {
         await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      setLaunchStage("hiring");
      const totalAgentsToHire = aiTeamDraft.nodes.length;
      for (let i = 1; i <= totalAgentsToHire; i++) {
        setHiredCount(i);
        await new Promise((resolve) => setTimeout(resolve, 40));
      }

      await new Promise((resolve) => setTimeout(resolve, 800));
      setLaunchStage("done");

      let goalId = createdCompanyGoalId;
      if (!goalId) {
        const goals = await goalsApi.list(createdCompanyId);
        goalId = selectDefaultCompanyGoalId(goals);
        setCreatedCompanyGoalId(goalId);
      }

      let projectId = createdProjectId;
      if (!projectId) {
        const project = await projectsApi.create(
          createdCompanyId,
          buildOnboardingProjectPayload(goalId, selectedGithubRepositoryLinks)
        );
        projectId = project.id;
        setCreatedProjectId(projectId);
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.list(createdCompanyId)
        });
      }

      let issueId = createdIssueId;
      let issueRef = createdIssueRef;
      if (!issueId || !issueRef) {
        const issue = await issuesApi.create(
          createdCompanyId,
          buildOnboardingIssuePayload({
            title: taskTitle,
            description: taskDescription,
            assigneeAgentId: createdAgentId,
            projectId,
            goalId
          })
        );
        issueId = issue.id;
        issueRef = issue.identifier ?? issue.id;
        setCreatedIssueId(issue.id);
        setCreatedIssueRef(issueRef);
        queryClient.invalidateQueries({
          queryKey: queryKeys.issues.list(createdCompanyId)
        });
      }

      if (issueId) {
        await issuesApi.upsertDocument(issueId, "ai-team-org-map", {
          title: "AI Team Org Map Draft",
          format: "markdown",
          body: buildAiTeamDraftMarkdown(aiTeamDraft),
          changeSummary:
            "Store onboarding AI team draft graph JSON + Mermaid representation.",
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.issues.documents(issueId),
        });
      }

      setSelectedCompanyId(createdCompanyId);
      reset();
      closeOnboarding();
      navigate(
        createdCompanyPrefix
          ? `/${createdCompanyPrefix}/issues/${issueRef}`
          : `/issues/${issueRef}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to launch onboarding");
      setLaunchStage("idle");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (step === 1 && companyName.trim()) handleStep1Next();
      else if (step === 2) handleStep2Next();
      else if (step === 3 && agentName.trim()) handleStep3Next();
      else if (step === 4 && taskTitle.trim()) handleStep4Next();
      else if (step === 5) handleStep5Next();
      else if (step === 6) handleLaunch();
    }
  }

  if (!effectiveOnboardingOpen) return null;

  const displayedCompanyName =
    companyName.trim() ||
    (createdCompanyId
      ? companies.find((company) => company.id === createdCompanyId)?.name ?? ""
      : "");
  const githubDisconnected =
    ghStatus &&
    !ghStatus.tokenAvailable &&
    !ghStatus.oauthLinkAvailable &&
    ghStatus.deploymentMode === "local_trusted";

  return (
    <Dialog
      open={effectiveOnboardingOpen}
      onOpenChange={(open) => {
        if (!open) {
          setRouteDismissed(true);
          handleClose();
        }
      }}
    >
      <DialogPortal>
        {/* Plain div instead of DialogOverlay - Radix's overlay wraps in
            RemoveScroll which blocks wheel events on our custom (non-DialogContent)
            scroll container. A plain div preserves the background without scroll-locking. */}
        <div className="fixed inset-0 z-50 bg-background" />
        <div className="fixed inset-0 z-50 flex" onKeyDown={handleKeyDown}>
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 left-4 z-10 rounded-sm p-1.5 text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>

          {/* Left half - form */}
          <div
            className={cn(
              "w-full flex flex-col overflow-y-auto transition-[width] duration-500 ease-in-out",
              step === 1 ? "md:w-1/2" : "md:w-full"
            )}
          >
            <div className="w-full max-w-4xl mx-auto my-auto px-10 py-14 shrink-0">
              {/* Progress tabs */}
              <div className="flex items-center gap-6 mb-10 pb-4 border-b border-border/60 overflow-x-auto">
                {(
                  [
                    { step: 1 as Step, label: "Company Name", icon: Building2 },
                    { step: 2 as Step, label: "Github Codebase", icon: Github },
                    { step: 3 as Step, label: "Agents", icon: Bot },
                    { step: 4 as Step, label: "Tasks", icon: ListTodo },
                    { step: 5 as Step, label: "AI Team", icon: Users },
                    { step: 6 as Step, label: "Launch", icon: Rocket },
                  ] as const
                ).map(({ step: s, label, icon: Icon }) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => navigateToStep(s)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap",
                      s === step
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground/70 hover:border-border"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Step content */}
              {step === 1 && (
                <div className="space-y-5 max-w-md">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="bg-muted/50 p-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Name your company</h3>
                      <p className="text-xs text-muted-foreground">
                        This is the organization your agents will work for.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 group">
                    <label
                      className={cn(
                        "text-xs mb-1 block transition-colors",
                        companyName.trim()
                          ? "text-foreground"
                          : "text-muted-foreground group-focus-within:text-foreground"
                      )}
                    >
                      Company name
                    </label>
                    <input
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                      placeholder="Acme Corp"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="group">
                    <label
                      className={cn(
                        "text-xs mb-1 block transition-colors",
                        companyGoal.trim()
                          ? "text-foreground"
                          : "text-muted-foreground group-focus-within:text-foreground"
                      )}
                    >
                      Mission / goal (optional)
                    </label>
                    <textarea
                      className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50 resize-none min-h-[60px]"
                      placeholder="What is this company trying to achieve?"
                      value={companyGoal}
                      onChange={(e) => setCompanyGoal(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5 max-w-2xl">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="bg-muted/50 p-2">
                      <Github className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Connect GitHub codebases</h3>
                      <p className="text-xs text-muted-foreground">
                        Link one or more repositories for this company. You can continue without linking and add them later.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-md border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Connection
                        </p>
                        <p className="text-sm">
                          {ghStatusLoading
                            ? "Checking GitHub status..."
                            : ghStatus?.tokenAvailable
                              ? `Connected${ghStatus.githubLogin ? ` as @${ghStatus.githubLogin}` : ""}`
                              : "Not connected"}
                        </p>
                      </div>
                      {ghStatus?.tokenAvailable ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-green-100 text-green-700 px-2 py-1 text-xs">
                          <Check className="h-3 w-3" />
                          Ready
                        </span>
                      ) : null}
                    </div>

                    {ghStatus && !ghStatus.tokenAvailable ? (
                      <div className="rounded-md border border-border/80 bg-muted/30 p-3 text-xs space-y-2">
                        {githubDisconnected ? (
                          <p className="text-muted-foreground leading-snug">
                            Local-trusted mode does not mount GitHub OAuth. Set{" "}
                            <code className="text-[10px]">{ghStatus.help.patEnv}</code> for this machine, or run in authenticated deployment mode with{" "}
                            <code className="text-[10px]">GITHUB_CLIENT_ID</code> /{" "}
                            <code className="text-[10px]">GITHUB_CLIENT_SECRET</code>.
                          </p>
                        ) : ghStatus.oauthLinkAvailable ? (
                          <div className="space-y-2">
                            <p className="text-muted-foreground leading-snug">
                              Connect GitHub so Paperclip can list repositories for selection. OAuth callback:{" "}
                              <code className="text-[10px] break-all">{ghStatus.help.callbackUrlHint}</code>
                            </p>
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              className="gap-2 mt-2"
                              onClick={() => {
                                void authApi.linkGithubAccount({
                                  callbackURL: window.location.href,
                                });
                              }}
                            >
                              <Github className="h-3.5 w-3.5" />
                              Connect GitHub
                            </Button>
                          </div>
                        ) : (
                          <p className="text-muted-foreground leading-snug">
                            GitHub OAuth is not configured on the server. Configure client id/secret on the instance.
                          </p>
                        )}
                      </div>
                    ) : null}

                    {ghStatus?.tokenAvailable ? (
                      <>
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
                          <input
                            className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                            placeholder="Search repositories..."
                            value={githubSearch}
                            onChange={(e) => {
                              setGithubSearch(e.target.value);
                              setGithubPage(1);
                            }}
                          />
                        </div>
                        <div className="rounded-md border border-border bg-card max-h-[22rem] overflow-y-auto shadow-xs">
                          {githubReposLoading ? (
                            <div className="py-8 text-xs text-muted-foreground flex items-center justify-center gap-2">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Loading repositories...
                            </div>
                          ) : githubReposError ? (
                            <p className="p-3 text-xs text-destructive">
                              {(githubReposError as Error).message}
                            </p>
                          ) : (
                            <ul className="divide-y divide-border/60">
                              {(githubRepoPage?.items ?? []).map((repo) => {
                                const selected = selectedGithubRepositoryLinks.some(
                                  (link) =>
                                    link.fullName.toLowerCase() === repo.fullName.toLowerCase()
                                );
                                return (
                                  <li key={repo.fullName}>
                                    <button
                                      type="button"
                                      className={cn(
                                        "w-full px-4 py-3 text-left text-sm flex items-center justify-between gap-3 hover:bg-accent transition-colors border-b border-border/40 last:border-0",
                                        selected && "bg-primary/5 border-l-2 border-l-primary"
                                      )}
                                      onClick={() => toggleGithubRepository(repo)}
                                    >
                                      <div className="min-w-0">
                                        <p className="truncate font-medium">{repo.fullName}</p>
                                        <p className="truncate text-muted-foreground">
                                          {repo.defaultBranch
                                            ? `default: ${repo.defaultBranch}`
                                            : "default branch unavailable"}
                                        </p>
                                      </div>
                                      <div className="shrink-0 flex items-center gap-2">
                                        {repo.private ? (
                                          <span className="text-[10px] uppercase text-muted-foreground">
                                            Private
                                          </span>
                                        ) : null}
                                        {selected ? (
                                          <Check className="h-3.5 w-3.5 text-green-600" />
                                        ) : null}
                                      </div>
                                    </button>
                                  </li>
                                );
                              })}
                              {(githubRepoPage?.items.length ?? 0) === 0 ? (
                                <li className="p-3 text-xs text-muted-foreground text-center">
                                  No repositories found.
                                </li>
                              ) : null}
                            </ul>
                          )}
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <button
                            type="button"
                            className="hover:text-foreground disabled:opacity-40"
                            disabled={githubPage <= 1}
                            onClick={() => setGithubPage((page) => Math.max(1, page - 1))}
                          >
                            Previous
                          </button>
                          <span>Page {githubPage}</span>
                          <button
                            type="button"
                            className="hover:text-foreground disabled:opacity-40"
                            onClick={() => setGithubPage((page) => page + 1)}
                            disabled={(githubRepoPage?.items.length ?? 0) < 30}
                          >
                            Next
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>

                  <div className="rounded-md border border-border/80 p-3">
                    <p className="text-xs text-muted-foreground mb-2">Selected repositories</p>
                    {selectedGithubRepositoryLinks.length === 0 ? (
                      <p className="text-xs text-muted-foreground">None selected</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedGithubRepositoryLinks.map((repo) => (
                          <button
                            key={repo.fullName}
                            type="button"
                            onClick={() =>
                              toggleGithubRepository({
                                fullName: repo.fullName,
                                htmlUrl:
                                  repo.htmlUrl ?? `https://github.com/${repo.fullName}`,
                                defaultBranch: repo.defaultBranch ?? null,
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-md bg-secondary text-secondary-foreground px-2.5 py-1 text-xs font-medium hover:bg-secondary/80 transition-colors shadow-xs"
                          >
                            {repo.fullName}
                            <X className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {(githubWarning || selectedGithubRepositoryLinks.length === 0) && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>
                        {githubWarning ??
                          "No repositories selected yet. This is optional for now, but linking codebases improves AI team generation quality."}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5 max-w-md">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="bg-muted/50 p-2">
                      <Bot className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Create your first agent</h3>
                      <p className="text-xs text-muted-foreground">
                        Choose how this agent will run tasks.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Agent name
                    </label>
                    <input
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                      placeholder="CEO"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      autoFocus
                    />
                  </div>

                  {/* Adapter type radio cards */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">
                      Adapter type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {recommendedAdapters.map((opt) => (
                        <button
                          key={opt.type}
                          className={cn(
                            "flex flex-col items-center gap-1.5 rounded-md border p-3 text-xs transition-colors relative",
                            adapterType === opt.type
                              ? "border-foreground bg-accent"
                              : "border-border hover:bg-accent/50"
                          )}
                          onClick={() => {
                            const nextType = opt.type;
                            setAdapterType(nextType);
                            if (nextType === "codex_local") {
                              if (!model) {
                                setModel(DEFAULT_CODEX_LOCAL_MODEL);
                              }
                              return;
                            }
                            if (nextType === "opencode_local") {
                              setModel(DEFAULT_OPENCODE_LOCAL_MODEL);
                              return;
                            }
                            setModel("");
                          }}
                        >
                          {opt.recommended && (
                            <span className="absolute -top-1.5 right-1.5 bg-green-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
                              Recommended
                            </span>
                          )}
                          <opt.icon className="h-4 w-4" />
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-muted-foreground text-[10px]">
                            {opt.description}
                          </span>
                        </button>
                      ))}
                    </div>

                    <button
                      className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowMoreAdapters((v) => !v)}
                    >
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 transition-transform",
                          showMoreAdapters ? "rotate-0" : "-rotate-90"
                        )}
                      />
                      More Agent Adapter Types
                    </button>

                    {showMoreAdapters && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {moreAdapters.map((opt) => (
                           <button
                             key={opt.type}
                             disabled={!!opt.comingSoon}
                             className={cn(
                               "flex flex-col items-center gap-1.5 rounded-md border p-3 text-xs transition-colors relative",
                               opt.comingSoon
                                 ? "border-border opacity-40 cursor-not-allowed"
                                 : adapterType === opt.type
                                 ? "border-foreground bg-accent"
                                 : "border-border hover:bg-accent/50"
                             )}
                             onClick={() => {
                               if (opt.comingSoon) return;
                               const nextType = opt.type;
                               setAdapterType(nextType);
                               if (nextType === "gemini_local" && !model) {
                                 setModel(DEFAULT_GEMINI_LOCAL_MODEL);
                                 return;
                               }
                               if (nextType === "cursor" && !model) {
                                 setModel(DEFAULT_CURSOR_LOCAL_MODEL);
                                 return;
                               }
                               if (nextType === "opencode_local") {
                                 setModel(DEFAULT_OPENCODE_LOCAL_MODEL);
                                 return;
                               }
                               setModel("");
                             }}
                          >
                            <opt.icon className="h-4 w-4" />
                            <span className="font-medium">{opt.label}</span>
                            <span className="text-muted-foreground text-[10px]">
                              {opt.comingSoon
                                ? opt.disabledLabel ?? "Coming soon"
                                : opt.description}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Conditional adapter fields */}
                  {isLocalAdapter && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          Model
                        </label>
                        <Popover
                          open={modelOpen}
                          onOpenChange={(next) => {
                            setModelOpen(next);
                            if (!next) setModelSearch("");
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-accent/50 transition-colors w-full justify-between">
                              <span
                                className={cn(
                                  !model && "text-muted-foreground"
                                )}
                              >
                                {selectedModel
                                  ? selectedModel.label
                                  : model ||
                                    (adapterType === "opencode_local"
                                      ? "Select model (required)"
                                      : "Default")}
                              </span>
                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[var(--radix-popover-trigger-width)] p-1"
                            align="start"
                          >
                            <input
                              className="w-full px-2 py-1.5 text-xs bg-transparent outline-none border-b border-border mb-1 placeholder:text-muted-foreground/50"
                              placeholder="Search models..."
                              value={modelSearch}
                              onChange={(e) => setModelSearch(e.target.value)}
                              autoFocus
                            />
                            {adapterType !== "opencode_local" && (
                              <button
                                className={cn(
                                  "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-accent/50",
                                  !model && "bg-accent"
                                )}
                                onClick={() => {
                                  setModel("");
                                  setModelOpen(false);
                                }}
                              >
                                Default
                              </button>
                            )}
                            <div className="max-h-[240px] overflow-y-auto">
                              {groupedModels.map((group) => (
                                <div
                                  key={group.provider}
                                  className="mb-1 last:mb-0"
                                >
                                  {adapterType === "opencode_local" && (
                                    <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                                      {group.provider} ({group.entries.length})
                                    </div>
                                  )}
                                  {group.entries.map((m) => (
                                    <button
                                      key={m.id}
                                      className={cn(
                                        "flex items-center w-full px-2 py-1.5 text-sm rounded hover:bg-accent/50",
                                        m.id === model && "bg-accent"
                                      )}
                                      onClick={() => {
                                        setModel(m.id);
                                        setModelOpen(false);
                                      }}
                                    >
                                      <span
                                        className="block w-full text-left truncate"
                                        title={m.id}
                                      >
                                        {adapterType === "opencode_local"
                                          ? extractModelName(m.id)
                                          : m.label}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              ))}
                            </div>
                            {filteredModels.length === 0 && (
                              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                                No models discovered.
                              </p>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}

                  {isLocalAdapter && (
                    <div className="space-y-2 rounded-md border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium">
                            Adapter environment check
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Runs a live probe that asks the adapter CLI to
                            respond with hello.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs"
                          disabled={adapterEnvLoading}
                          onClick={() => void runAdapterEnvironmentTest()}
                        >
                          {adapterEnvLoading ? "Testing..." : "Test now"}
                        </Button>
                      </div>

                      {adapterEnvError && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-[11px] text-destructive">
                          {adapterEnvError}
                        </div>
                      )}

                      {adapterEnvResult &&
                      adapterEnvResult.status === "pass" ? (
                        <div className="flex items-center gap-2 rounded-md border border-green-300 dark:border-green-500/40 bg-green-50 dark:bg-green-500/10 px-3 py-2 text-xs text-green-700 dark:text-green-300 animate-in fade-in slide-in-from-bottom-1 duration-300">
                          <Check className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-medium">Passed</span>
                        </div>
                      ) : adapterEnvResult ? (
                        <AdapterEnvironmentResult result={adapterEnvResult} />
                      ) : null}

                      {shouldSuggestUnsetAnthropicApiKey && (
                        <div className="rounded-md border border-amber-300/60 bg-amber-50/40 px-2.5 py-2 space-y-2">
                          <p className="text-[11px] text-amber-900/90 leading-relaxed">
                            Claude failed while{" "}
                            <span className="font-mono">ANTHROPIC_API_KEY</span>{" "}
                            is set. You can clear it in this CEO adapter config
                            and retry the probe.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs"
                            disabled={
                              adapterEnvLoading || unsetAnthropicLoading
                            }
                            onClick={() => void handleUnsetAnthropicApiKey()}
                          >
                            {unsetAnthropicLoading
                              ? "Retrying..."
                              : "Unset ANTHROPIC_API_KEY"}
                          </Button>
                        </div>
                      )}

                      {adapterEnvResult && adapterEnvResult.status === "fail" && (
                        <div className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-2 text-[11px] space-y-1.5">
                          <p className="font-medium">Manual debug</p>
                          <p className="text-muted-foreground font-mono break-all">
                            {adapterType === "cursor"
                              ? `${effectiveAdapterCommand} -p --mode ask --output-format json "Respond with hello."`
                              : adapterType === "codex_local"
                              ? `${effectiveAdapterCommand} exec --json -`
                              : adapterType === "gemini_local"
                                ? `${effectiveAdapterCommand} --output-format json "Respond with hello."`
                              : adapterType === "opencode_local"
                                ? `${effectiveAdapterCommand} run --format json "Respond with hello."`
                              : `${effectiveAdapterCommand} --print - --output-format stream-json --verbose`}
                          </p>
                          <p className="text-muted-foreground">
                            Prompt:{" "}
                            <span className="font-mono">Respond with hello.</span>
                          </p>
                          {adapterType === "cursor" ||
                          adapterType === "codex_local" ||
                          adapterType === "gemini_local" ||
                          adapterType === "opencode_local" ? (
                            <p className="text-muted-foreground">
                              If auth fails, set{" "}
                              <span className="font-mono">
                                {adapterType === "cursor"
                                  ? "CURSOR_API_KEY"
                                  : adapterType === "gemini_local"
                                    ? "GEMINI_API_KEY"
                                    : "OPENAI_API_KEY"}
                              </span>{" "}
                              in env or run{" "}
                              <span className="font-mono">
                                {adapterType === "cursor"
                                  ? "agent login"
                                  : adapterType === "codex_local"
                                    ? "codex login"
                                    : adapterType === "gemini_local"
                                      ? "gemini auth"
                                      : "opencode auth login"}
                              </span>
                              .
                            </p>
                          ) : (
                            <p className="text-muted-foreground">
                              If login is required, run{" "}
                              <span className="font-mono">claude login</span>{" "}
                              and retry.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {(adapterType === "http" ||
                    adapterType === "openclaw_gateway") && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        {adapterType === "openclaw_gateway"
                          ? "Gateway URL"
                          : "Webhook URL"}
                      </label>
                      <input
                        className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
                        placeholder={
                          adapterType === "openclaw_gateway"
                            ? "ws://127.0.0.1:18789"
                            : "https://..."
                        }
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5 max-w-3xl">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="bg-muted/50 p-2">
                      <ListTodo className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Define your master task</h3>
                      <p className="text-xs text-muted-foreground">
                        The task starts prefilled with the Genesis Architect prompt. You can edit it before launch.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Task title
                    </label>
                    <input
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                      placeholder="Task title"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Description
                    </label>
                    <textarea
                      ref={textareaRef}
                      className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50 resize-none min-h-[280px] max-h-[520px] overflow-y-auto"
                      placeholder="Task description..."
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="bg-muted/50 p-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Build your AI team draft</h3>
                      <p className="text-xs text-muted-foreground">
                        Seeded from the ARIA template. Edit nodes, reporting lines, and relationships.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[300px,minmax(0,1fr),minmax(0,1fr)]">
                    <div className="space-y-3">
                      <div className="rounded-md border border-border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Agents
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={addAiTeamNode}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add
                          </Button>
                        </div>
                        <div className="max-h-[360px] overflow-y-auto space-y-1">
                          {aiTeamDraft.nodes.map((node) => (
                            <button
                              key={node.id}
                              type="button"
                              className={cn(
                                "w-full text-left rounded-md border px-2 py-1.5 text-xs transition-colors",
                                node.id === selectedAiTeamNodeId
                                  ? "border-foreground bg-accent"
                                  : "border-border hover:bg-accent/50"
                              )}
                              onClick={() => setSelectedAiTeamNodeId(node.id)}
                            >
                              <p className="font-medium truncate">{node.name}</p>
                              <p className="text-muted-foreground truncate">{node.title}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-md border border-border p-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Custom relationships
                        </p>
                        <select
                          className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs"
                          value={relationshipKind}
                          onChange={(e) => setRelationshipKind(e.target.value as AiTeamEdgeKind)}
                        >
                          <option value="collaboration">Collaboration</option>
                          <option value="ownership">Ownership</option>
                        </select>
                        <select
                          className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs"
                          value={relationshipFromId}
                          onChange={(e) => setRelationshipFromId(e.target.value)}
                        >
                          {aiTeamDraft.nodes.map((node) => (
                            <option key={`from-${node.id}`} value={node.id}>
                              {node.name}
                            </option>
                          ))}
                        </select>
                        <select
                          className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs"
                          value={relationshipToId}
                          onChange={(e) => setRelationshipToId(e.target.value)}
                        >
                          {aiTeamDraft.nodes.map((node) => (
                            <option key={`to-${node.id}`} value={node.id}>
                              {node.name}
                            </option>
                          ))}
                        </select>
                        <input
                          className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs"
                          placeholder="Relation label (optional)"
                          value={relationshipLabel}
                          onChange={(e) => setRelationshipLabel(e.target.value)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-full text-xs"
                          onClick={addRelationshipEdge}
                        >
                          Add relationship
                        </Button>
                        <div className="max-h-[140px] overflow-y-auto space-y-1">
                          {relationshipEdges.map((edge) => (
                            <div
                              key={edge.id}
                              className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-[11px]"
                            >
                              <span className="truncate flex-1">
                                {edge.fromNodeId} {edge.kind === "reporting" ? "=>" : "<->"} {edge.toNodeId}
                              </span>
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => removeRelationshipEdge(edge.id)}
                                aria-label="Remove relationship"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {relationshipEdges.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground">
                              No custom relationships yet.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border border-border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">
                          Selected node
                        </p>
                        {selectedAiTeamNode && selectedAiTeamNode.id !== aiTeamDraft.rootNodeId ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-destructive"
                            onClick={deleteSelectedAiTeamNode}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        ) : null}
                      </div>
                      {selectedAiTeamNode ? (
                        <>
                          <input
                            className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-sm"
                            value={selectedAiTeamNode.name}
                            onChange={(e) =>
                              updateSelectedAiTeamNode("name", e.target.value)
                            }
                            placeholder="Agent name"
                          />
                          <input
                            className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-sm"
                            value={selectedAiTeamNode.title}
                            onChange={(e) =>
                              updateSelectedAiTeamNode("title", e.target.value)
                            }
                            placeholder="Job title"
                          />
                          <input
                            className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs"
                            value={selectedAiTeamNode.department}
                            onChange={(e) =>
                              updateSelectedAiTeamNode("department", e.target.value)
                            }
                            placeholder="Department"
                          />
                          <input
                            className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs"
                            value={selectedAiTeamNode.squad}
                            onChange={(e) =>
                              updateSelectedAiTeamNode("squad", e.target.value)
                            }
                            placeholder="Squad"
                          />
                          <select
                            className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs"
                            value={selectedAiTeamNode.managerId ?? ""}
                            onChange={(e) =>
                              updateSelectedAiTeamNode(
                                "managerId",
                                e.target.value ? e.target.value : undefined
                              )
                            }
                          >
                            <option value="">No manager</option>
                            {aiTeamDraft.nodes
                              .filter((node) => node.id !== selectedAiTeamNode.id)
                              .map((node) => (
                                <option key={`manager-${node.id}`} value={node.id}>
                                  {node.name}
                                </option>
                              ))}
                          </select>
                          <textarea
                            className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs min-h-[80px]"
                            value={selectedAiTeamNode.skills}
                            onChange={(e) =>
                              updateSelectedAiTeamNode("skills", e.target.value)
                            }
                            placeholder="Skills and strengths"
                          />
                          <textarea
                            className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs min-h-[80px]"
                            value={selectedAiTeamNode.responsibilities}
                            onChange={(e) =>
                              updateSelectedAiTeamNode(
                                "responsibilities",
                                e.target.value
                              )
                            }
                            placeholder="Responsibilities and outputs"
                          />
                          <textarea
                            className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs min-h-[80px]"
                            value={selectedAiTeamNode.checklists}
                            onChange={(e) =>
                              updateSelectedAiTeamNode("checklists", e.target.value)
                            }
                            placeholder="Required checklists"
                          />
                          <textarea
                            className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs min-h-[80px]"
                            value={selectedAiTeamNode.constraints}
                            onChange={(e) =>
                              updateSelectedAiTeamNode("constraints", e.target.value)
                            }
                            placeholder="Constraints and forbidden actions"
                          />
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Select a node to edit details.
                        </p>
                      )}
                    </div>

                    <div className="rounded-md border border-border p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Draft preview
                      </p>
                      <pre className="text-[11px] whitespace-pre-wrap rounded-md border border-border/60 bg-muted/20 p-2 max-h-[160px] overflow-y-auto">
                        {aiTeamSummary}
                      </pre>
                      <p className="text-[11px] text-muted-foreground">
                        Mermaid graph
                      </p>
                      <pre className="text-[11px] whitespace-pre-wrap rounded-md border border-border/60 bg-muted/20 p-2 max-h-[250px] overflow-y-auto">
                        {aiTeamMermaid}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-5 max-w-2xl">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="bg-muted/50 p-2">
                      <Rocket className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Ready to launch</h3>
                      <p className="text-xs text-muted-foreground">
                        Launching will create the onboarding project and issue, then save your AI team org-map draft document.
                      </p>
                    </div>
                  </div>
                  <div className="border border-border divide-y divide-border">
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {displayedCompanyName}
                        </p>
                        <p className="text-xs text-muted-foreground">Company Name</p>
                      </div>
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                    </div>
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <Github className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {selectedGithubRepositoryLinks.length} repositories selected
                        </p>
                        <p className="text-xs text-muted-foreground">Github Codebase</p>
                      </div>
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                    </div>
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {agentName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getUIAdapter(adapterType).label}
                        </p>
                      </div>
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                    </div>
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <ListTodo className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {taskTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">Tasks</p>
                      </div>
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                    </div>
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {aiTeamDraft.nodes.length} nodes,{" "}
                          {
                            aiTeamDraft.edges.filter((edge) => edge.kind === "reporting")
                              .length
                          }{" "}
                          reporting lines
                        </p>
                        <p className="text-xs text-muted-foreground">AI Team Draft</p>
                      </div>
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-destructive bg-destructive/10 px-4 py-3 rounded-lg mt-3">{error}</p>
                </div>
              )}

              {/* Footer navigation */}
              <div className="flex items-center justify-between mt-8">
                <div>
                  {step > 1 && step > minimumStep && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep((step - 1) as Step)}
                      disabled={loading}
                    >
                      <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                      Back
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {step === 1 && (
                    <Button
                      size="sm"
                      disabled={!companyName.trim() || loading}
                      onClick={handleStep1Next}
                    >
                      {loading ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5 mr-1" />
                      )}
                      {loading ? "Creating..." : "Next"}
                    </Button>
                  )}
                  {step === 2 && (
                    <Button
                      size="sm"
                      disabled={loading || !createdCompanyId}
                      onClick={handleStep2Next}
                    >
                      <ArrowRight className="h-3.5 w-3.5 mr-1" />
                      Next
                    </Button>
                  )}
                  {step === 3 && (
                    <Button
                      size="sm"
                      disabled={
                        !agentName.trim() || loading || adapterEnvLoading
                      }
                      onClick={handleStep3Next}
                    >
                      {loading ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5 mr-1" />
                      )}
                      {loading ? "Creating..." : "Next"}
                    </Button>
                  )}
                  {step === 4 && (
                    <Button
                      size="sm"
                      disabled={!taskTitle.trim() || loading}
                      onClick={handleStep4Next}
                    >
                      <ArrowRight className="h-3.5 w-3.5 mr-1" />
                      Next
                    </Button>
                  )}
                  {step === 5 && (
                    <Button size="sm" disabled={loading} onClick={handleStep5Next}>
                      <ArrowRight className="h-3.5 w-3.5 mr-1" />
                      Next
                    </Button>
                  )}
                  {step === 6 && (
                    <Button size="sm" disabled={loading} onClick={handleLaunch}>
                      {loading ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5 mr-1" />
                      )}
                      {loading ? "Creating..." : "Create & Open Issue"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right half - ASCII art (hidden on mobile) */}
          <div
            className={cn(
              "hidden md:block overflow-hidden bg-[#1d1d1d] transition-[width,opacity] duration-500 ease-in-out",
              step === 1 ? "w-1/2 opacity-100" : "w-0 opacity-0"
            )}
          >
            <AsciiArtAnimation />
          </div>
        </div>

      {/* Dynamic 3D Loader Overlay */}
      <AnimatePresence>
        {launchStage !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md px-4 perspective-[1000px]"
          >
            <motion.div
              initial={{ rotateX: 90, opacity: 0, z: -500 }}
              animate={{ rotateX: 0, opacity: 1, z: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="flex flex-col items-center justify-center space-y-8 max-w-md w-full p-10 rounded-2xl border border-border/50 bg-card/90 shadow-[0_0_100px_rgba(0,0,0,0.2)] dark:shadow-[0_0_100px_rgba(255,255,255,0.05)]"
              style={{ transformStyle: "preserve-3d" }}
            >
              {launchStage === "reading_repos" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center w-full"
                >
                  <div className="relative mb-6">
                    <motion.div
                      animate={{
                        rotateY: [0, 360],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      className="h-24 w-24 rounded-2xl bg-gradient-to-tr from-primary/80 to-purple-500/80 flex items-center justify-center shadow-lg border border-white/10"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <Bot className="h-10 w-10 text-white drop-shadow-md" style={{ transform: "translateZ(30px)" }} />
                    </motion.div>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground mb-2 text-center">CEO is analyzing codebases</h3>
                  <p className="text-sm text-muted-foreground animate-pulse text-center h-5">
                    {selectedGithubRepositoryLinks.length > 0
                      ? `Reading ${selectedGithubRepositoryLinks[currentRepoIndex]?.fullName || "repo"}...`
                      : "No repositories linked. Analyzing generic tech stacks..."}
                  </p>

                  {selectedGithubRepositoryLinks.length > 0 && (
                    <div className="w-full bg-secondary h-2 rounded-full mt-6 overflow-hidden shadow-inner">
                      <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: `${((currentRepoIndex + 1) / selectedGithubRepositoryLinks.length) * 100}%` }}
                        transition={{ duration: 0.5 }}
                        className="bg-gradient-to-r from-primary to-purple-500 h-full"
                      />
                    </div>
                  )}
                </motion.div>
              )}

              {launchStage === "hiring" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center w-full"
                >
                  <div className="relative mb-6">
                    <motion.div
                      animate={{
                        rotateX: [0, 360],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      className="h-24 w-24 rounded-full bg-gradient-to-tr from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)] border border-white/20"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <Users className="h-12 w-12 text-white" style={{ transform: "translateZ(30px)" }} />
                    </motion.div>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground mb-2 text-center">Hiring the AI Team</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Dynamically structuring teams, squads, and assigning roles...
                  </p>
                  <div className="text-5xl font-black bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent my-6 tabular-nums drop-shadow-sm">
                    {hiredCount} <span className="text-2xl text-muted-foreground/50">/ {aiTeamDraft.nodes.length}</span>
                  </div>
                  <div className="w-full bg-secondary/50 h-3 rounded-full overflow-hidden shadow-inner">
                    <motion.div
                      className="bg-emerald-500 h-full shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                      initial={{ width: "0%" }}
                      animate={{ width: `${(hiredCount / aiTeamDraft.nodes.length) * 100}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </motion.div>
              )}

              {launchStage === "done" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, rotateY: -90 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="flex flex-col items-center w-full"
                >
                  <div className="h-24 w-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 ring-4 ring-emerald-500/30">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    >
                      <CheckCircle2 className="h-12 w-12 text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
                    </motion.div>
                  </div>
                  <h3 className="text-3xl font-black tracking-tight text-foreground mb-2 text-center bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">Team Assembled!</h3>
                  <p className="text-md text-muted-foreground text-center">
                    Launching operations now...
                  </p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      </DialogPortal>
    </Dialog>
  );
}

function AdapterEnvironmentResult({
  result
}: {
  result: AdapterEnvironmentTestResult;
}) {
  const statusLabel =
    result.status === "pass"
      ? "Passed"
      : result.status === "warn"
      ? "Warnings"
      : "Failed";
  const statusClass =
    result.status === "pass"
      ? "text-green-700 dark:text-green-300 border-green-300 dark:border-green-500/40 bg-green-50 dark:bg-green-500/10"
      : result.status === "warn"
      ? "text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10"
      : "text-red-700 dark:text-red-300 border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10";

  return (
    <div className={`rounded-md border px-2.5 py-2 text-[11px] ${statusClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{statusLabel}</span>
        <span className="opacity-80">
          {new Date(result.testedAt).toLocaleTimeString()}
        </span>
      </div>
      <div className="mt-1.5 space-y-1">
        {result.checks.map((check, idx) => (
          <div
            key={`${check.code}-${idx}`}
            className="leading-relaxed break-words"
          >
            <span className="font-medium uppercase tracking-wide opacity-80">
              {check.level}
            </span>
            <span className="mx-1 opacity-60">·</span>
            <span>{check.message}</span>
            {check.detail && (
              <span className="block opacity-75 break-all">
                ({check.detail})
              </span>
            )}
            {check.hint && (
              <span className="block opacity-90 break-words">
                Hint: {check.hint}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
