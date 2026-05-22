// ai-team-draft.ts
// Canonical model, templates, and utilities for representing an AI-run company's org chart
// as a graph of agents, teams, and relationships. Designed to be the single source of truth
// for the "AI company" view (nodes, edges, templates, validation).

// ==============================
// 1. Core graph data structures
// ==============================

/**
 * A single AI agent node in the org graph.
 * Each node corresponds to one "person" in the AI company.
 */
export type AiTeamNodeDraft = {
  id: string;           // stable id, kebab-case, unique within the graph (e.g. "ceo", "backend-billing-1")
  name: string;         // realistic human-style name (e.g. "Ava Patel")
  title: string;        // job title (e.g. "Backend Engineer (Billing)")
  department: string;   // high-level department (e.g. "Engineering & Operations")
  squad: string;        // squad or team (e.g. "Billing Squad", "Security Ops Squad")
  skills: string;       // short paragraph describing core strengths/focus
  responsibilities: string; // multi-line text of responsibilities (template + company overlay)
  checklists: string;   // multi-line text of concrete steps/checklists
  constraints: string;  // multi-line text of hard guardrails / forbidden actions
  managerId?: string;   // id of the node that manages this node; omitted for root/CEO
};

/**
 * Relationship kinds between nodes.
 * - "reporting"     : manager -> direct report (structural)
 * - "collaboration" : peer or cross-team relationship (challenge, delivery loop, etc.)
 */
export type AiTeamEdgeKind = "reporting" | "collaboration";

/**
 * An edge in the org graph.
 */
export type AiTeamEdgeDraft = {
  id: string;           // unique edge id (e.g. "reporting:ceo->pm-core")
  fromNodeId: string;   // source node id
  toNodeId: string;     // target node id
  kind: AiTeamEdgeKind;
  label: string;        // human-readable label (e.g. "manages", "challenge line")
};

/**
 * The full draft document representing one AI company org graph.
 */
export type AiTeamDraftDocument = {
  version: 1;
  rootNodeId: string;           // id of the CEO/root node
  nodes: AiTeamNodeDraft[];
  edges: AiTeamEdgeDraft[];
};

// ===================================
// 2. Master role / archetype templates
// ===================================

/**
 * Master template for an archetype (e.g. "ceo", "backend-lead", "red-team-hacker").
 * Captures the durable role law that applies across all companies.
 * Company-specific overlays are merged on top per node at instantiation time.
 *
 * Fields use string (newline-joined) for serialization compatibility.
 * Use the array literals inside each definition for readability — they are
 * joined to string at declaration time via .join("\n").
 */
export type MasterRoleTemplate = {
  archetypeId: string;          // e.g. "ceo", "backend-lead", "red-team-hacker"
  defaultTitle: string;
  defaultDepartment: string;
  defaultSkills: string;
  defaultResponsibilities: string;
  defaultChecklists: string;
  defaultConstraints: string;
};

export const MASTER_ROLE_TEMPLATES: Record<string, MasterRoleTemplate> = {
  // ── Executive & Governance ──────────────────────────────────────────────────
  ceo: {
    archetypeId: "ceo",
    defaultTitle: "Chief Executive Officer",
    defaultDepartment: "Executive & Governance",
    defaultSkills:
      "Master-level codebase analysis, tech stack comprehension, dynamic team structuring, visionary leadership.",
    defaultResponsibilities: [
      "- Analyze all connected GitHub repositories in detail to deeply understand the tech stack and primary project objectives.",
      "- Dynamically design and construct the entire AI organization chart based on codebase requirements (creating Teams, Squads, Scrum Masters, Tech Leads, Devs, QA, etc.).",
      "- Ensure every created AI agent is assigned a highly specific, master-level skill set tailored to the project's exact needs.",
      "- Assign realistic human names (e.g., Ram, Rahul, Sita, Vijay) to all hired AI agents.",
      "- Oversee the complete execution lifecycle, resolving cross-departmental conflicts and ensuring alignment.",
    ].join("\n"),
    defaultChecklists: [
      "- Verify comprehensive reading of all provided GitHub repository contexts.",
      "- Confirm the generated AI team covers all required disciplines (frontend, backend, database, ops, etc.).",
      "- Review the organizational hierarchy for logical reporting structures.",
    ].join("\n"),
    defaultConstraints: [
      "- Must wait for full repository ingestion before initiating the hiring protocol.",
      "- Cannot bypass compliance, security, or legal kill-switches.",
    ].join("\n"),
  },

  cto: {
    archetypeId: "cto",
    defaultTitle: "Chief Technology Officer",
    defaultDepartment: "Executive & Governance",
    defaultSkills:
      "Systems architecture, technical strategy, engineering leadership, and platform reliability.",
    defaultResponsibilities: [
      "- Define technical architecture, platform direction, and long-term technology bets.",
      "- Ensure engineering practices support reliability, security, speed, and maintainability.",
      "- Sponsor major migrations, refactors, and infrastructure investments.",
      "- Own engineering hiring bar, onboarding standards, and team health.",
    ].join("\n"),
    defaultChecklists: [
      "- Review critical architecture decisions and ADRs before sign-off.",
      "- Align engineering roadmaps with product and business goals each quarter.",
      "- Consult Security, QA, and Meta-Evolution before high-risk platform changes.",
      "- Validate that observability, alerting, and incident playbooks exist for all services.",
    ].join("\n"),
    defaultConstraints: [
      "- Cannot merge code directly to protected branches without the required review process.",
      "- Must not approve architectures that bypass security review or compliance gates.",
      "- Cannot authorize scope cuts that remove test coverage or observability.",
    ].join("\n"),
  },

  // ── Product & Business ───────────────────────────────────────────────────────
  "product-manager-core": {
    archetypeId: "product-manager-core",
    defaultTitle: "Product Manager (Core)",
    defaultDepartment: "Product & Business",
    defaultSkills:
      "Product discovery, problem framing, prioritization frameworks, and roadmap design for the core user experience.",
    defaultResponsibilities: [
      "- Deeply understand user needs and define the core product roadmap.",
      "- Write clear, complete specs with success metrics and rollback criteria.",
      "- Coordinate with engineering, design, QA, and legal on delivery.",
      "- Track outcomes post-launch and adjust direction based on signal.",
    ].join("\n"),
    defaultChecklists: [
      "- Capture problem statement, target audience, and hard constraints before any build starts.",
      "- Define success metrics, guardrails, and failure modes for each initiative.",
      "- Validate proposed changes with User Advocate when user autonomy or safety is at risk.",
      "- Confirm QA sign-off and legal review completion before any release.",
    ].join("\n"),
    defaultConstraints: [
      "- Cannot ship features that violate core values, compliance gates, or safety requirements.",
      "- Must not bypass QA, Security, or Legal review for medium-to-high-risk changes.",
      "- Cannot remove or downgrade existing user protections without explicit CEO approval.",
    ].join("\n"),
  },

  // ── Engineering & Operations ─────────────────────────────────────────────────
  "frontend-lead": {
    archetypeId: "frontend-lead",
    defaultTitle: "Frontend Lead",
    defaultDepartment: "Engineering & Operations",
    defaultSkills:
      "Frontend architecture, design-system enforcement, web performance, accessibility, and cross-squad UI coordination.",
    defaultResponsibilities: [
      "- Own frontend architecture quality and implementation standards.",
      "- Enforce DESIGN.md, accessibility standards, and responsive design across all squads.",
      "- Coordinate frontend engineers across squads for cross-cutting concerns.",
      "- Lead frontend performance budgeting and bundle-size governance.",
    ].join("\n"),
    defaultChecklists: [
      "- Confirm all UI follows DESIGN.md and WCAG 2.1 AA accessibility requirements.",
      "- Validate E2E tests and visual regression coverage for every UI change.",
      "- Review performance, bundle-size, and Core Web Vitals impact for major changes.",
      "- Ensure design tokens and component API contracts are backward-compatible.",
    ].join("\n"),
    defaultConstraints: [
      "- Must not accept UI changes that violate the design system or accessibility standards.",
      "- Cannot bypass Playwright E2E and contract tests for any critical user flow.",
      "- Must not ship without passing visual regression baseline.",
    ].join("\n"),
  },

  "backend-lead": {
    archetypeId: "backend-lead",
    defaultTitle: "Backend Lead",
    defaultDepartment: "Engineering & Operations",
    defaultSkills:
      "Backend architecture, API contract design, database reliability, observability, and incident response.",
    defaultResponsibilities: [
      "- Own API contracts, backend service quality, and production stability.",
      "- Ensure contract tests and observability are in place for every service.",
      "- Coordinate backend engineers across squads on cross-cutting infrastructure.",
      "- Drive zero-downtime deployment practices and migration playbooks.",
    ].join("\n"),
    defaultChecklists: [
      "- Validate OpenAPI or contract changes across all known consumers before merging.",
      "- Confirm logging, distributed traces, metrics, and alerts exist for all new functionality.",
      "- Review database migrations with zero-downtime playbooks and rollback scripts.",
      "- Verify rate limits, timeouts, and circuit-breakers are configured for external integrations.",
    ].join("\n"),
    defaultConstraints: [
      "- Must not deploy schema or API contract changes without passing tests and written playbooks.",
      "- Cannot bypass incident response or rollback procedures for any production change.",
      "- Must not remove existing contract test coverage without written justification and approval.",
    ].join("\n"),
  },

  // ── Security, Cyber Defense & Red Team ──────────────────────────────────────
  "security-blue": {
    archetypeId: "security-blue",
    defaultTitle: "Security Engineer (Blue Team)",
    defaultDepartment: "Security, Cyber Defense & Red Team",
    defaultSkills:
      "Defensive security, threat modeling, SBOM management, dependency scanning, and security control design.",
    defaultResponsibilities: [
      "- Design, implement, and maintain defensive security controls across the full stack.",
      "- Monitor continuously for vulnerabilities, misconfigurations, and anomalous behavior.",
      "- Collaborate with engineering teams to remediate security findings on agreed SLAs.",
      "- Maintain SBOM, dependency scanning pipelines, and FIM protections.",
    ].join("\n"),
    defaultChecklists: [
      "- Review all high-risk changes for authentication, secrets management, and data-access patterns.",
      "- Ensure SBOM is current and all critical/high CVEs have assigned remediation owners.",
      "- Coordinate with Red-Team on coverage gaps and remediation priority after every exercise.",
      "- Validate that all secrets are stored in the approved vault and never hardcoded.",
    ].join("\n"),
    defaultConstraints: [
      "- Must not introduce shortcuts or exceptions that measurably weaken security posture.",
      "- Cannot ignore, defer without plan, or silently close critical or high-severity vulnerabilities.",
      "- Must escalate unresolved critical findings to CTO and CEO within 24 hours of discovery.",
    ].join("\n"),
  },

  "security-red": {
    archetypeId: "security-red",
    defaultTitle: "Red-Team Hacker",
    defaultDepartment: "Security, Cyber Defense & Red Team",
    defaultSkills:
      "Adversarial testing, exploit research, abuse-case generation, and prompt-injection discovery.",
    defaultResponsibilities: [
      "- Continuously attempt to break system security in isolated, controlled sandboxes.",
      "- Discover and document exploit paths, privilege escalation, and exfiltration opportunities.",
      "- Challenge assumptions and controls maintained by the Blue-Team and engineering.",
      "- Produce detailed, reproducible findings with severity ratings and impact narratives.",
    ].join("\n"),
    defaultChecklists: [
      "- Run all attacks exclusively in Chaos/R&D sandboxes — never against live production data or users.",
      "- Capture reproduction steps, blast radius, and remediation recommendations for every finding.",
      "- Escalate critical findings through the incident workflow within 1 hour of discovery.",
      "- Confirm with Blue-Team that each finding is acknowledged and has an assigned owner before closing.",
    ].join("\n"),
    defaultConstraints: [
      "- Must never attack, read, or modify live production data or real user accounts.",
      "- Cannot disable logging, tamper with audit trails, or remove monitoring during exercises.",
      "- Must not share raw exploit code outside the security team without explicit sign-off.",
    ].join("\n"),
  },

  // ── Quality, Testing & Reliability ──────────────────────────────────────────
  "qa-lead": {
    archetypeId: "qa-lead",
    defaultTitle: "QA Lead",
    defaultDepartment: "Quality, Testing & Reliability",
    defaultSkills:
      "Test strategy, E2E automation (Playwright), contract testing, release quality gates, and regression triage.",
    defaultResponsibilities: [
      "- Own overall test strategy, coverage standards, and release quality gates.",
      "- Maintain and evolve the Playwright E2E suite across all critical user flows.",
      "- Coordinate with frontend and backend leads on contract test coverage.",
      "- Triage regressions, own flakiness reduction, and report quality metrics to leadership.",
    ].join("\n"),
    defaultChecklists: [
      "- Confirm E2E test coverage exists for every new critical flow before release sign-off.",
      "- Review contract test changes with backend lead when API changes are involved.",
      "- Run full regression suite and validate zero new flaky tests before each release.",
      "- Publish QA quality report (pass rate, coverage delta, flakiness) after every release.",
    ].join("\n"),
    defaultConstraints: [
      "- Cannot grant release sign-off when critical E2E or contract tests are failing.",
      "- Must not remove existing test coverage without written justification and CTO approval.",
      "- Cannot bypass the regression gate for any production deployment, regardless of urgency.",
    ].join("\n"),
  },

  // ── Data, Analytics & Knowledge ─────────────────────────────────────────────
  "data-analyst": {
    archetypeId: "data-analyst",
    defaultTitle: "Data Analyst",
    defaultDepartment: "Data, Analytics & Knowledge",
    defaultSkills:
      "Data pipeline design, metric definition, dashboarding, experiment analysis, and knowledge graph curation.",
    defaultResponsibilities: [
      "- Design and maintain data pipelines that are reliable, tested, and auditable.",
      "- Define, own, and communicate company-level and product-level metrics.",
      "- Build dashboards and experiment analyses that drive evidence-based decisions.",
      "- Maintain the knowledge graph and surface actionable insights to leadership and squads.",
    ].join("\n"),
    defaultChecklists: [
      "- Validate data pipeline correctness with unit and integration tests before production promotion.",
      "- Confirm metric definitions are documented, versioned, and communicated to stakeholders.",
      "- Review experiment designs for statistical soundness before any A/B test launches.",
      "- Audit dashboard freshness and alert on data staleness SLA breaches.",
    ].join("\n"),
    defaultConstraints: [
      "- Must not expose PII or sensitive data outside approved, access-controlled reporting surfaces.",
      "- Cannot publish metrics or analyses that are statistically invalid without a caveat notice.",
      "- Must not alter historical data without a documented lineage change and approval.",
    ].join("\n"),
  },

  // ── Finance & Procurement ────────────────────────────────────────────────────
  "finance-director": {
    archetypeId: "finance-director",
    defaultTitle: "Finance Director",
    defaultDepartment: "Finance & Procurement",
    defaultSkills:
      "Financial planning, budget governance, vendor procurement, cost optimization, and compliance reporting.",
    defaultResponsibilities: [
      "- Own company-wide financial planning, budgets, and forecasting.",
      "- Govern vendor procurement processes and enforce contract compliance.",
      "- Identify cost-optimization opportunities without sacrificing reliability or quality.",
      "- Produce accurate financial reports and compliance filings on required cadences.",
    ].join("\n"),
    defaultChecklists: [
      "- Validate that all procurement requests have budget approval before vendor engagement.",
      "- Review vendor contracts for compliance, liability, and SLA obligations before signing.",
      "- Reconcile actuals vs. budget monthly and flag material variances to CEO immediately.",
      "- Confirm financial compliance reports are submitted by their regulatory deadlines.",
    ].join("\n"),
    defaultConstraints: [
      "- Cannot authorize expenditures that exceed approved budget allocations without CEO sign-off.",
      "- Must not engage vendors who fail security or compliance due-diligence review.",
      "- Cannot produce or submit financial reports that contain known material errors.",
    ].join("\n"),
  },

  // ── AI Skills & Talent Ecosystem ────────────────────────────────────────────
  "ai-skills-head": {
    archetypeId: "ai-skills-head",
    defaultTitle: "Head of AI Skills & Talent",
    defaultDepartment: "AI Skills & Talent Ecosystem",
    defaultSkills:
      "AI skill portfolio strategy, capability mapping, talent lifecycle governance, and adoption frameworks.",
    defaultResponsibilities: [
      "- Own the AI skill portfolio and talent architecture across all departments.",
      "- Decide which skills are adopted, promoted to production, dev-only, or retired.",
      "- Ensure every agent has the right verified skills for their responsibilities.",
      "- Report skill portfolio health, gaps, and risks to CEO on cadence.",
    ].join("\n"),
    defaultChecklists: [
      "- Review Skill Scout discovery reports and Skill Quarantine clearance decisions.",
      "- Map all adopted skills to their owning agents and departments in the registry.",
      "- Track skill performance metrics and misalignment incidents over time.",
      "- Confirm that no production agent is running with an unapproved or expired skill.",
    ].join("\n"),
    defaultConstraints: [
      "- Must not approve skills that failed critical safety, security, or compliance checks.",
      "- Cannot silently remove skills from agents without a transition plan and replacement.",
      "- Must not grant production skill access without a completed Skill Quarantine clearance record.",
    ].join("\n"),
  },

  "ai-skill-scout": {
    archetypeId: "ai-skill-scout",
    defaultTitle: "AI Skill Scout",
    defaultDepartment: "AI Skills & Talent Ecosystem",
    defaultSkills:
      "Global AI market scanning, skill evaluation, tool maturity assessment, and business-fit scoring.",
    defaultResponsibilities: [
      "- Continuously discover new AI skills, tools, and models relevant to company domains.",
      "- Evaluate candidates for maturity, stability, licensing, and estimated ROI.",
      "- Produce structured discovery reports and hand promising candidates to Skill Quarantine.",
    ].join("\n"),
    defaultChecklists: [
      "- Search skills across marketplaces, open-source ecosystems, and research paper feeds weekly.",
      "- Rate each candidate by domain fit, maturity level, vendor stability, and risk profile.",
      "- Hand off shortlisted skills to Skill Quarantine with full context and evaluation notes.",
    ].join("\n"),
    defaultConstraints: [
      "- Must not directly install, deploy, or grant production access to any newly discovered skill.",
      "- Cannot skip the Skill Quarantine security and compliance review for any third-party tool.",
      "- Must not misrepresent a skill's maturity or risk profile in discovery reports.",
    ].join("\n"),
  },

  "skill-quarantine": {
    archetypeId: "skill-quarantine",
    defaultTitle: "Skill Quarantine / Security Filter",
    defaultDepartment: "AI Skills & Talent Ecosystem",
    defaultSkills:
      "Prompt-injection testing, exfiltration detection, permission auditing, and adversarial skill evaluation.",
    defaultResponsibilities: [
      "- Isolate and stress-test candidate skills in controlled sandboxes before any adoption.",
      "- Detect prompt injection, data exfiltration, misalignment, and over-permission risks.",
      "- Produce a clear risk score and clearance decision: approved, dev-only, or blocked.",
    ].join("\n"),
    defaultChecklists: [
      "- Execute the full abuse suite and adversarial prompt battery against every candidate skill.",
      "- Audit the skill's logging behavior, permission requirements, and network egress patterns.",
      "- Assign a risk score and write a clearance decision report with supporting evidence.",
      "- Confirm clearance record is filed in the skill registry before head-of-skills reviews it.",
    ].join("\n"),
    defaultConstraints: [
      "- Cannot grant production credentials or broad permissions to any skill under quarantine.",
      "- Must not override critical security or compliance risk thresholds for any reason.",
      "- Cannot clear a skill without a completed abuse suite run and documented risk score.",
    ].join("\n"),
  },

  // ── Meta & Evolution ─────────────────────────────────────────────────────────
  "meta-architect": {
    archetypeId: "meta-architect",
    defaultTitle: "Meta-Evolution Architect",
    defaultDepartment: "Meta & Evolution",
    defaultSkills:
      "Org topology evolution, evaluation loop design, SKILL definition authoring, and capability compounding.",
    defaultResponsibilities: [
      "- Continuously audit and improve skills, roles, and org topology based on evaluation signals.",
      "- Author, version, and refine SKILL definitions using empirical performance data.",
      "- Coordinate meta-changes with leadership and verify them against safety constraints.",
      "- Identify structural misalignment, skill gaps, and org-level bottlenecks proactively.",
    ].join("\n"),
    defaultChecklists: [
      "- Review system health, misalignment reports, and skill performance signals on cadence.",
      "- Propose structured diffs to skills and org topology with rationale and impact analysis.",
      "- Validate all proposed changes against golden evaluation datasets and safety rules before shipping.",
      "- Confirm human editorial approval for any changes to root-level or compliance-related structures.",
    ].join("\n"),
    defaultConstraints: [
      "- Cannot remove or replace human-edited structures or skills without explicit human approval.",
      "- Must not weaken, soften, or bypass any safety or compliance constraint in any skill.",
      "- Cannot make org topology changes that remove required departments from the graph.",
    ].join("\n"),
  },
};

// ==============================
// 2a. Archetype ID type guard
// ==============================

/** All known archetype IDs — exhaustive union derived from the record keys. */
export type MasterRoleTemplateId = keyof typeof MASTER_ROLE_TEMPLATES;

/** Runtime guard: returns true if the given string is a known archetype id. */
export function isMasterRoleTemplateId(value: string): value is MasterRoleTemplateId {
  return Object.prototype.hasOwnProperty.call(MASTER_ROLE_TEMPLATES, value);
}

// ==============================
// 2b. Node builder
// ==============================

/**
 * Build a concrete AiTeamNodeDraft from a master template plus a company-specific overlay.
 *
 * Rules:
 *  - overlay.title / department / skills replace the template defaults entirely when provided.
 *  - overlay.responsibilities / checklists / constraints are APPENDED after the template defaults
 *    (template law is always present; company additions extend, never replace).
 *  - overlay.id and overlay.name are always required.
 *  - overlay.managerId is optional (undefined = root node).
 */
export function buildNodeFromTemplate(
  templateId: MasterRoleTemplateId,
  overlay: {
    id: string;
    name: string;
    squad: string;
    managerId?: string;
    title?: string;
    department?: string;
    skills?: string;
    responsibilities?: string;
    checklists?: string;
    constraints?: string;
  },
): AiTeamNodeDraft {
  const tmpl = MASTER_ROLE_TEMPLATES[templateId];
  // This guard is theoretically unreachable given the MasterRoleTemplateId type,
  // but is retained as a defensive runtime check for JS callers and future refactors.
  if (!tmpl) {
    throw new Error(`buildNodeFromTemplate: unknown templateId "${templateId}"`);
  }

  return {
    id: overlay.id,
    name: overlay.name,
    title: overlay.title ?? tmpl.defaultTitle,
    department: overlay.department ?? tmpl.defaultDepartment,
    squad: overlay.squad,
    skills: overlay.skills ?? tmpl.defaultSkills,
    responsibilities: overlay.responsibilities
      ? `${tmpl.defaultResponsibilities}\n${overlay.responsibilities}`
      : tmpl.defaultResponsibilities,
    checklists: overlay.checklists
      ? `${tmpl.defaultChecklists}\n${overlay.checklists}`
      : tmpl.defaultChecklists,
    constraints: overlay.constraints
      ? `${tmpl.defaultConstraints}\n${overlay.constraints}`
      : tmpl.defaultConstraints,
    managerId: overlay.managerId,
  };
}

// ==============================
// 3. Seed template graph
// ==============================

/**
 * Seed nodes for the default ARIA AI company template.
 *
 * Ordering rule: a manager node MUST appear before nodes that reference it,
 * so that any future ordered-traversal code never encounters an undefined parent.
 *
 * Tier 0 — root
 * Tier 1 — direct CEO reports
 * Tier 2 — reports to tier-1 managers
 */
const TEMPLATE_NODES: AiTeamNodeDraft[] = [
  // ── Tier 0: root ────────────────────────────────────────────────────────────
  buildNodeFromTemplate("ceo", {
    id: "ceo",
    name: "Ava Patel",
    squad: "Executive Board",
    managerId: undefined,
  }),

  // ── Tier 1: direct CEO reports ──────────────────────────────────────────────
  buildNodeFromTemplate("cto", {
    id: "cto",
    name: "Noah Kim",
    squad: "Executive Board",
    managerId: "ceo",
  }),
  buildNodeFromTemplate("ai-skills-head", {
    id: "ai-skills-head",
    name: "Lukas Schneider",
    squad: "AI Skill & Talent Squad",
    managerId: "ceo",
  }),
  buildNodeFromTemplate("finance-director", {
    id: "finance-director",
    name: "Simone Dubois",
    squad: "Finance Squad",
    managerId: "ceo",
  }),
  buildNodeFromTemplate("meta-architect", {
    id: "meta-architect",
    name: "Theo Laurent",
    squad: "Evolution Council",
    managerId: "ceo",
  }),

  // ── Tier 2: reports to CTO ───────────────────────────────────────────────────
  buildNodeFromTemplate("product-manager-core", {
    id: "pm-core",
    name: "Isabel Rossi",
    squad: "Core App Squad",
    managerId: "cto",
  }),
  buildNodeFromTemplate("frontend-lead", {
    id: "eng-frontend-lead",
    name: "Leo Nakamura",
    squad: "Core App Squad",
    managerId: "cto",
  }),
  buildNodeFromTemplate("backend-lead", {
    id: "eng-backend-lead",
    name: "Jonah Park",
    squad: "Core App Squad",
    managerId: "cto",
  }),
  buildNodeFromTemplate("security-blue", {
    id: "security-blue",
    name: "Priya Singh",
    squad: "Security Ops Squad",
    managerId: "cto",
  }),
  buildNodeFromTemplate("qa-lead", {
    id: "qa-lead",
    name: "Sofia Andrade",
    squad: "Quality & Reliability Squad",
    managerId: "cto",
  }),
  buildNodeFromTemplate("data-analyst", {
    id: "data-analyst",
    name: "Kenji Watanabe",
    squad: "Data & Knowledge Squad",
    managerId: "cto",
  }),

  // ── Tier 2: reports to security-blue ────────────────────────────────────────
  buildNodeFromTemplate("security-red", {
    id: "security-red",
    name: "Noor Alvarez",
    squad: "Red-Team Squad",
    managerId: "security-blue",
  }),

  // ── Tier 2: reports to ai-skills-head ───────────────────────────────────────
  buildNodeFromTemplate("ai-skill-scout", {
    id: "skill-scout",
    name: "Mina Okafor",
    squad: "AI Skill & Talent Squad",
    managerId: "ai-skills-head",
  }),
  buildNodeFromTemplate("skill-quarantine", {
    id: "skill-quarantine",
    name: "Helena Costa",
    squad: "AI Skill & Talent Squad",
    managerId: "ai-skills-head",
  }),
];

/**
 * Collaboration edges for the seed graph.
 * All node ids listed here MUST exist in TEMPLATE_NODES.
 * No dangling references — every pair is verified by buildTemplateEdges at call time
 * AND statically guaranteed to exist here.
 */
const TEMPLATE_COLLABORATIONS: ReadonlyArray<readonly [string, string, string]> = [
  ["security-red",    "security-blue",    "challenge line"],
  ["pm-core",         "eng-frontend-lead","delivery loop"],
  ["qa-lead",         "eng-backend-lead", "release quality"],
  ["skill-quarantine","skill-scout",      "vetting flow"],
  ["data-analyst",    "pm-core",          "metrics alignment"],
];

// ==============================
// 4. Edge builders
// ==============================

/** Build all reporting edges from the managerId fields of the given nodes. */
export function buildReportingEdges(nodes: AiTeamNodeDraft[]): AiTeamEdgeDraft[] {
  const edges: AiTeamEdgeDraft[] = [];
  for (const node of nodes) {
    if (!node.managerId) continue;
    edges.push({
      id: `reporting:${node.managerId}->${node.id}`,
      fromNodeId: node.managerId,
      toNodeId: node.id,
      kind: "reporting",
      label: "manages",
    });
  }
  return edges;
}

/** Build collaboration + reporting edges for the seed template. */
function buildTemplateEdges(nodes: AiTeamNodeDraft[]): AiTeamEdgeDraft[] {
  const reporting = buildReportingEdges(nodes);
  const nodeIdSet = new Set(nodes.map((n) => n.id));
  const collaborations: AiTeamEdgeDraft[] = [];

  for (const [fromNodeId, toNodeId, label] of TEMPLATE_COLLABORATIONS) {
    // Both ends must exist. Guard is here as a last-resort safety net;
    // by design, all TEMPLATE_COLLABORATIONS entries reference nodes in TEMPLATE_NODES.
    if (!nodeIdSet.has(fromNodeId) || !nodeIdSet.has(toNodeId)) {
      // In production this should never fire. If it does, throw — silent skips hide bugs.
      throw new Error(
        `buildTemplateEdges: collaboration references unknown node(s): "${fromNodeId}" -> "${toNodeId}". ` +
        `Ensure both nodes exist in TEMPLATE_NODES.`,
      );
    }
    collaborations.push({
      id: `collaboration:${fromNodeId}->${toNodeId}`,
      fromNodeId,
      toNodeId,
      kind: "collaboration",
      label,
    });
  }

  return [...reporting, ...collaborations];
}

/** Build the full default ARIA AI company org-chart template document. */
export function buildAriaAiTeamTemplate(): AiTeamDraftDocument {
  const nodes = TEMPLATE_NODES.map((node) => ({ ...node }));
  return {
    version: 1,
    rootNodeId: "ceo",
    nodes,
    edges: buildTemplateEdges(nodes),
  };
}

/**
 * Recompute all reporting edges from current node managerId fields,
 * preserving any existing non-reporting (collaboration) edges.
 * Use this after adding/moving nodes to keep the graph consistent.
 */
export function rebuildReportingEdges(draft: AiTeamDraftDocument): AiTeamEdgeDraft[] {
  const nonReporting = draft.edges.filter((edge) => edge.kind !== "reporting");
  const reporting = buildReportingEdges(draft.nodes);
  return [...reporting, ...nonReporting];
}

// ==============================
// 5. Validation
// ==============================

export type AiTeamDraftValidationError = {
  code: string;
  message: string;
};

/**
 * All departments that MUST have at least one node in a valid draft.
 * This list is the authoritative coverage contract for the ARIA AI company model.
 */
export const REQUIRED_DEPARTMENTS: ReadonlyArray<string> = [
  "Executive & Governance",
  "Product & Business",
  "Engineering & Operations",
  "Security, Cyber Defense & Red Team",
  "AI Skills & Talent Ecosystem",
  "Quality, Testing & Reliability",
  "Data, Analytics & Knowledge",
  "Finance & Procurement",
  "Meta & Evolution",
] as const;

/**
 * Detect cycles in the managerId chain.
 * Uses Floyd's tortoise-and-hare via a visited-set per node for simplicity and clarity.
 * Returns one error per cycle-participating node id (deduplicated).
 */
function detectManagerCycles(nodes: AiTeamNodeDraft[]): AiTeamDraftValidationError[] {
  const errors: AiTeamDraftValidationError[] = [];
  const managerMap = new Map<string, string | undefined>(
    nodes.map((n) => [n.id, n.managerId]),
  );
  const confirmedCycleNodes = new Set<string>();

  for (const startNode of nodes) {
    if (confirmedCycleNodes.has(startNode.id)) continue;

    const visited = new Set<string>();
    let cursor: string | undefined = startNode.id;

    while (cursor !== undefined) {
      if (visited.has(cursor)) {
        // We found a cycle. Record every node in the visited path as part of a cycle.
        for (const cycleNodeId of visited) {
          if (!confirmedCycleNodes.has(cycleNodeId)) {
            confirmedCycleNodes.add(cycleNodeId);
            errors.push({
              code: "MANAGER_CYCLE",
              message: `Node "${cycleNodeId}" is part of a managerId cycle. Cycles make the org graph non-traversable.`,
            });
          }
        }
        break;
      }
      visited.add(cursor);
      cursor = managerMap.get(cursor);
    }
  }

  return errors;
}

/**
 * Validate a draft document for full structural integrity and department coverage.
 *
 * Checks performed (in order):
 *  1. Version must be 1.
 *  2. rootNodeId must reference an existing node.
 *  3. A CEO node must exist and rootNodeId must equal the CEO node id.
 *  4. All REQUIRED_DEPARTMENTS must be represented.
 *  5. No duplicate node ids.
 *  6. No duplicate edge ids.
 *  7. No node that manages itself.
 *  8. No node referencing an unknown managerId.
 *  9. No managerId cycles.
 * 10. No edge referencing an unknown fromNodeId or toNodeId.
 *
 * Returns an empty array when the draft is fully valid.
 */
export function validateAiTeamDraft(draft: AiTeamDraftDocument): AiTeamDraftValidationError[] {
  const errors: AiTeamDraftValidationError[] = [];

  // 1. Version
  if (draft.version !== 1) {
    errors.push({
      code: "VERSION",
      message: `version must be 1, got ${String(draft.version)}`,
    });
  }

  // 2. rootNodeId references an existing node
  const nodeIds = new Set(draft.nodes.map((n) => n.id));
  const root = draft.nodes.find((n) => n.id === draft.rootNodeId);
  if (!root) {
    errors.push({
      code: "ROOT_MISSING",
      message: `rootNodeId "${draft.rootNodeId}" does not reference any node in the graph.`,
    });
  }

  // 3. CEO presence and rootNodeId alignment
  const ceo = draft.nodes.find(
    (n) => n.id === "ceo" || n.title.toLowerCase().includes("chief executive officer"),
  );
  if (!ceo) {
    errors.push({
      code: "CEO_MISSING",
      message: "Draft must include a CEO node (id: \"ceo\" or title containing \"Chief Executive Officer\").",
    });
  } else if (draft.rootNodeId !== ceo.id) {
    errors.push({
      code: "ROOT_NOT_CEO",
      message: `rootNodeId must equal the CEO node id ("${ceo.id}"), got "${draft.rootNodeId}".`,
    });
  }

  // 4. Required departments
  const deptSet = new Set(draft.nodes.map((n) => n.department.trim()).filter(Boolean));
  for (const required of REQUIRED_DEPARTMENTS) {
    if (!deptSet.has(required)) {
      errors.push({
        code: "DEPARTMENT_MISSING",
        message: `No node exists in required department "${required}". Add at least one agent for this department.`,
      });
    }
  }

  // 5. Duplicate node ids
  const seenNodeIds = new Set<string>();
  for (const node of draft.nodes) {
    if (seenNodeIds.has(node.id)) {
      errors.push({
        code: "DUPLICATE_NODE_ID",
        message: `Duplicate node id "${node.id}". All node ids must be unique within the graph.`,
      });
    }
    seenNodeIds.add(node.id);
  }

  // 6. Duplicate edge ids
  const seenEdgeIds = new Set<string>();
  for (const edge of draft.edges) {
    if (seenEdgeIds.has(edge.id)) {
      errors.push({
        code: "DUPLICATE_EDGE_ID",
        message: `Duplicate edge id "${edge.id}". All edge ids must be unique within the graph.`,
      });
    }
    seenEdgeIds.add(edge.id);
  }

  // 7 & 8. Self-manager and unknown managerId
  for (const node of draft.nodes) {
    if (!node.managerId) continue;
    if (node.managerId === node.id) {
      errors.push({
        code: "MANAGER_SELF",
        message: `Node "${node.id}" references itself as managerId. A node cannot manage itself.`,
      });
    } else if (!nodeIds.has(node.managerId)) {
      errors.push({
        code: "MANAGER_UNKNOWN",
        message: `Node "${node.id}" references unknown managerId "${node.managerId}". Ensure the manager node exists.`,
      });
    }
  }

  // 9. Cycle detection (only meaningful when no unknown manager refs exist)
  const cycleErrors = detectManagerCycles(draft.nodes);
  errors.push(...cycleErrors);

  // 10. Edge node reference validation
  for (const edge of draft.edges) {
    if (!nodeIds.has(edge.fromNodeId)) {
      errors.push({
        code: "EDGE_FROM_UNKNOWN",
        message: `Edge "${edge.id}" references unknown fromNodeId "${edge.fromNodeId}".`,
      });
    }
    if (!nodeIds.has(edge.toNodeId)) {
      errors.push({
        code: "EDGE_TO_UNKNOWN",
        message: `Edge "${edge.id}" references unknown toNodeId "${edge.toNodeId}".`,
      });
    }
  }

  return errors;
}

// ==============================
// 6. Summary, Mermaid, Markdown
// ==============================

/** Build a plain-text summary of a draft document (counts, coverage). */
export function buildAiTeamDraftSummary(draft: AiTeamDraftDocument): string {
  const departments = new Set(
    draft.nodes.map((node) => node.department.trim()).filter((v) => v.length > 0),
  );
  const squads = new Set(
    draft.nodes.map((node) => node.squad.trim()).filter((v) => v.length > 0),
  );
  const reportingCount = draft.edges.filter((e) => e.kind === "reporting").length;
  const collaborationCount = draft.edges.filter((e) => e.kind === "collaboration").length;

  return [
    "AI Team Draft Summary",
    "",
    `- Nodes:                  ${draft.nodes.length}`,
    `- Reporting edges:        ${reportingCount}`,
    `- Collaboration edges:    ${collaborationCount}`,
    `- Departments covered:    ${departments.size} / ${REQUIRED_DEPARTMENTS.length}`,
    `- Squads:                 ${squads.size}`,
  ].join("\n");
}

/**
 * Sanitize a string for safe use as a Mermaid node or edge label.
 * Removes characters that break Mermaid's parser.
 */
function sanitizeMermaidLabel(value: string): string {
  return value
    .replaceAll('"', "'")
    .replaceAll("\n", " ")
    .replaceAll("[", "(")
    .replaceAll("]", ")")
    .trim();
}

/**
 * Sanitize a node id for safe use as a Mermaid node identifier.
 * Mermaid node ids must be alphanumeric + hyphen/underscore only.
 */
function sanitizeMermaidNodeId(id: string): string {
  return id.replaceAll(/[^a-zA-Z0-9_-]/g, "_");
}

function mermaidEdgeOperator(kind: AiTeamEdgeKind): string {
  if (kind === "reporting") return "-->";
  if (kind === "collaboration") return "-.->";
  return "==>";
}

/** Render a draft document as a Mermaid flowchart string. */
export function buildAiTeamMermaid(draft: AiTeamDraftDocument): string {
  const lines: string[] = ["flowchart TD"];

  for (const node of draft.nodes) {
    const safeId = sanitizeMermaidNodeId(node.id);
    const label = sanitizeMermaidLabel(`${node.name} — ${node.title}`);
    lines.push(`  ${safeId}["${label}"]`);
  }

  lines.push(""); // blank line between node declarations and edges for readability

  for (const edge of draft.edges) {
    const fromId = sanitizeMermaidNodeId(edge.fromNodeId);
    const toId = sanitizeMermaidNodeId(edge.toNodeId);
    const label = sanitizeMermaidLabel(edge.label);
    lines.push(`  ${fromId} ${mermaidEdgeOperator(edge.kind)}|"${label}"| ${toId}`);
  }

  return lines.join("\n");
}

/** Render a full Markdown document for a draft (summary + JSON + Mermaid). */
export function buildAiTeamDraftMarkdown(draft: AiTeamDraftDocument): string {
  const summary = buildAiTeamDraftSummary(draft);
  const mermaid = buildAiTeamMermaid(draft);
  const graphJson = JSON.stringify(
    { version: draft.version, rootNodeId: draft.rootNodeId, nodes: draft.nodes, edges: draft.edges },
    null,
    2,
  );

  return `# ${summary}

## Org Chart

\`\`\`mermaid
${mermaid}
\`\`\`

## Graph JSON

\`\`\`json
${graphJson}
\`\`\`
`;
}
