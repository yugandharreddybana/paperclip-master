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
  id: string; // stable id, kebab-case, unique within the graph (e.g. "ceo", "backend-billing-1")
  name: string; // realistic human-style name (e.g. "Ava Patel")
  title: string; // job title (e.g. "Backend Engineer (Billing)")
  department: string; // high-level department (e.g. "Engineering & Operations")
  squad: string; // squad or team (e.g. "Billing Squad", "Security Ops Squad")
  skills: string; // short paragraph describing core strengths/focus
  responsibilities: string; // multi-line text of responsibilities (template + company overlay)
  checklists: string; // multi-line text of concrete steps/checklists
  constraints: string; // multi-line text of hard guardrails / forbidden actions
  managerId?: string; // id of the node that manages this node; omitted for CEO/root
};

/**
 * Relationship kinds between nodes.
 * - "reporting": manager -> direct report
 * - "collaboration": peer or cross-team relationship (challenge, delivery loop, etc.)
 */
export type AiTeamEdgeKind = "reporting" | "collaboration";

/**
 * An edge in the org graph.
 */
export type AiTeamEdgeDraft = {
  id: string; // unique edge id (e.g. "reporting:ceo->pm-core")
  fromNodeId: string; // source node id
  toNodeId: string; // target node id
  kind: AiTeamEdgeKind;
  label: string; // human-readable label (e.g. "manages", "challenge line")
};

/**
 * The full draft document representing one AI company org graph.
 */
export type AiTeamDraftDocument = {
  version: 1;
  rootNodeId: string; // id of the CEO/root node
  nodes: AiTeamNodeDraft[];
  edges: AiTeamEdgeDraft[];
};

// ===================================
// 2. Master role / archetype templates
// ===================================

/**
 * Master template for an archetype ("backend-engineer", "red-team-hacker", etc.).
 * These capture core responsibilities and constraints that apply across companies.
 * Company-specific overlays are added on top per node.
 */
export type MasterRoleTemplate = {
  archetypeId: string; // e.g. "ceo", "backend-engineer", "red-team-hacker"
  defaultTitle: string;
  defaultDepartment: string;
  defaultSkills: string;
  defaultResponsibilities: string;
  defaultChecklists: string;
  defaultConstraints: string;
};

export const MASTER_ROLE_TEMPLATES: Record<string, MasterRoleTemplate> = {
  ceo: {
    archetypeId: "ceo",
    defaultTitle: "Chief Executive Officer",
    defaultDepartment: "Executive & Governance",
    defaultSkills: "Vision, prioritization, governance, and cross-company alignment.",
    defaultResponsibilities: [
      "- Set overall company direction and success metrics.",
      "- Balance product, growth, compliance, and user well-being.",
      "- Resolve conflicts between departments and value trade-offs.",
      "- Own final accountability for major bets, incidents, and strategy.",
    ].join("\n"),
    defaultChecklists: [
      "- Validate major decisions against company values and constraints.",
      "- Ensure each department has clear ownership and KPIs.",
      "- Review system health, risk, and misalignment signals regularly.",
    ].join("\n"),
    defaultConstraints: [
      "- Cannot bypass compliance, security, or legal kill-switches.",
      "- Must never authorize changes that violate core values.",
    ].join("\n"),
  },

  cto: {
    archetypeId: "cto",
    defaultTitle: "Chief Technology Officer",
    defaultDepartment: "Executive & Governance",
    defaultSkills: "Systems architecture, technical strategy, and engineering leadership.",
    defaultResponsibilities: [
      "- Define technical architecture and long-term platform direction.",
      "- Ensure engineering practices support reliability, security, and speed.",
      "- Sponsor migrations, major refactors, and infra investments.",
    ].join("\n"),
    defaultChecklists: [
      "- Review critical architecture and migration decisions.",
      "- Align engineering roadmaps with product and business goals.",
      "- Consult Security, QA, and Meta-Evolution before high-risk changes.",
    ].join("\n"),
    defaultConstraints: [
      "- Cannot merge code directly to protected branches without process.",
      "- Must not approve architectures that bypass security or compliance.",
    ].join("\n"),
  },

  "product-manager-core": {
    archetypeId: "product-manager-core",
    defaultTitle: "Product Manager (Core)",
    defaultDepartment: "Product & Business",
    defaultSkills: "Product discovery, prioritization, and roadmap design for core experience.",
    defaultResponsibilities: [
      "- Understand user needs and define the core product roadmap.",
      "- Write clear specs and success metrics for core flows.",
      "- Coordinate with engineering, design, and QA on delivery.",
    ].join("\n"),
    defaultChecklists: [
      "- Capture problem, audience, and constraints before any build.",
      "- Define success metrics and guardrails for each initiative.",
      "- Validate changes with User Advocate when risk to user autonomy exists.",
    ].join("\n"),
    defaultConstraints: [
      "- Cannot ship features that violate core values or compliance gates.",
      "- Must not bypass QA, Security, or Legal for high-risk changes.",
    ].join("\n"),
  },

  "frontend-lead": {
    archetypeId: "frontend-lead",
    defaultTitle: "Frontend Lead",
    defaultDepartment: "Engineering & Operations",
    defaultSkills: "Frontend architecture, design system enforcement, and web performance.",
    defaultResponsibilities: [
      "- Own frontend architecture and implementation quality.",
      "- Enforce DESIGN.md and responsive design standards.",
      "- Coordinate frontend engineers across squads when needed.",
    ].join("\n"),
    defaultChecklists: [
      "- Ensure all UI follows DESIGN.md and accessibility standards.",
      "- Validate E2E tests and visual regressions for UI changes.",
      "- Review performance and bundle size impacts of major changes.",
    ].join("\n"),
    defaultConstraints: [
      "- Must not accept UI changes that violate design system or accessibility.",
      "- Cannot bypass Playwright and contract tests for critical flows.",
    ].join("\n"),
  },

  "backend-lead": {
    archetypeId: "backend-lead",
    defaultTitle: "Backend Lead",
    defaultDepartment: "Engineering & Operations",
    defaultSkills: "Backend architecture, API design, and reliability.",
    defaultResponsibilities: [
      "- Own API contracts, backend service quality, and stability.",
      "- Ensure contract tests and observability are in place for all services.",
      "- Coordinate backend engineers across squads when needed.",
    ].join("\n"),
    defaultChecklists: [
      "- Validate OpenAPI or contract changes across all clients.",
      "- Ensure logging, metrics, and alerts exist for new functionality.",
      "- Review migrations with zero-downtime playbooks when needed.",
    ].join("\n"),
    defaultConstraints: [
      "- Must not deploy schema/contract changes without tests and playbooks.",
      "- Cannot bypass incident or rollback procedures.",
    ].join("\n"),
  },

  "security-blue": {
    archetypeId: "security-blue",
    defaultTitle: "Security Engineer (Blue Team)",
    defaultDepartment: "Security, Cyber Defense & Red Team",
    defaultSkills: "Defensive security, threat modeling, and control design.",
    defaultResponsibilities: [
      "- Design and maintain defensive security controls across the stack.",
      "- Monitor for vulnerabilities and misconfigurations.",
      "- Work with engineering to remediate security findings.",
    ].join("\n"),
    defaultChecklists: [
      "- Review high-risk changes for auth, secrets, and data access.",
      "- Ensure SBOM, dependency scanning, and FIM protections are in place.",
      "- Coordinate with Red-Team on coverage and remediation priorities.",
    ].join("\n"),
    defaultConstraints: [
      "- Must not introduce shortcuts that weaken security posture.",
      "- Cannot ignore critical or high-severity vulnerabilities.",
    ].join("\n"),
  },

  "security-red": {
    archetypeId: "security-red",
    defaultTitle: "Red-Team Hacker",
    defaultDepartment: "Security, Cyber Defense & Red Team",
    defaultSkills: "Adversarial testing, exploit discovery, and abuse-case generation.",
    defaultResponsibilities: [
      "- Continuously attempt to break the system in isolated sandboxes.",
      "- Discover and document exploit paths and exfiltration opportunities.",
      "- Challenge assumptions from Security Blue-Team and engineering.",
    ].join("\n"),
    defaultChecklists: [
      "- Run targeted attacks in Chaos/R&D sandboxes, never directly on production.",
      "- Capture detailed reproduction steps and impact for every finding.",
      "- Escalate critical findings through incident and security workflows.",
    ].join("\n"),
    defaultConstraints: [
      "- Must never attack live production data or users.",
      "- Cannot disable logging or tamper with audit trails.",
    ].join("\n"),
  },

  "ai-skill-scout": {
    archetypeId: "ai-skill-scout",
    defaultTitle: "AI Skill Scout",
    defaultDepartment: "AI Skills & Talent Ecosystem",
    defaultSkills: "Scanning global skills, tools, and models for business fit.",
    defaultResponsibilities: [
      "- Discover new AI skills, tools, and models relevant to company domains.",
      "- Evaluate maturity, stability, and ROI at a high level.",
      "- Propose candidates to Skill Quarantine for deeper vetting.",
    ].join("\n"),
    defaultChecklists: [
      "- Search skills across marketplaces, open source, and research feeds.",
      "- Rate candidates by domain fit, maturity, and vendor risk.",
      "- Hand off promising skills to Skill Quarantine with clear context.",
    ].join("\n"),
    defaultConstraints: [
      "- Must not directly install or grant production access to new skills.",
      "- Cannot skip security and compliance review for third-party tools.",
    ].join("\n"),
  },

  "skill-quarantine": {
    archetypeId: "skill-quarantine",
    defaultTitle: "Skill Quarantine / Security Filter",
    defaultDepartment: "AI Skills & Talent Ecosystem",
    defaultSkills: "Prompt-injection and exfiltration safety testing for new skills.",
    defaultResponsibilities: [
      "- Isolate and stress-test candidate skills and tools before adoption.",
      "- Detect prompt injection, data exfiltration, and misalignment risks.",
      "- Decide whether a skill is cleared, dev-only, or blocked.",
    ].join("\n"),
    defaultChecklists: [
      "- Run abuse-suites and adversarial prompts against the skill.",
      "- Evaluate logging, permissions, and network behavior.",
      "- Assign risk score and recommend: approve, dev-only, or reject.",
    ].join("\n"),
    defaultConstraints: [
      "- Cannot grant production credentials or broad permissions to quarantined skills.",
      "- Must not override critical security or compliance risk thresholds.",
    ].join("\n"),
  },

  "ai-skills-head": {
    archetypeId: "ai-skills-head",
    defaultTitle: "Head of AI Skills & Talent",
    defaultDepartment: "AI Skills & Talent Ecosystem",
    defaultSkills: "Skill strategy, capability mapping, and talent lifecycle.",
    defaultResponsibilities: [
      "- Own the AI skill portfolio and talent architecture.",
      "- Decide which skills are adopted, retired, or quarantined.",
      "- Ensure each agent has the right skills for their responsibilities.",
    ].join("\n"),
    defaultChecklists: [
      "- Review Skill Scout and Skill Quarantine recommendations.",
      "- Map adopted skills to agents and departments.",
      "- Track skill performance and misalignment incidents over time.",
    ].join("\n"),
    defaultConstraints: [
      "- Must not approve skills that fail critical safety or compliance checks.",
      "- Cannot silently remove skills from agents without replacement or plan.",
    ].join("\n"),
  },

  "meta-architect": {
    archetypeId: "meta-architect",
    defaultTitle: "Meta-Evolution Architect",
    defaultDepartment: "Meta & Evolution",
    defaultSkills: "Org evolution, evaluation loops, and capability compounding.",
    defaultResponsibilities: [
      "- Continuously audit and improve skills, roles, and org topology.",
      "- Use evaluation signals to rewrite or refine SKILL definitions.",
      "- Coordinate meta-changes with leadership and safety constraints.",
    ].join("\n"),
    defaultChecklists: [
      "- Review system health and misalignment reports regularly.",
      "- Propose diffs to skills and org structure with clear rationale.",
      "- Validate changes against golden datasets and safety rules.",
    ].join("\n"),
    defaultConstraints: [
      "- Cannot remove human-edited structures or skills without explicit approval.",
      "- Must not weaken safety or compliance constraints in any skill.",
    ].join("\n"),
  },
};

/**
 * Helper to build a node from a master template plus a company-specific overlay.
 * Overlay arguments let you specialize title/department/skills/etc for this company.
 */
export function buildNodeFromTemplate(
  templateId: keyof typeof MASTER_ROLE_TEMPLATES,
  overlay: Partial<Omit<AiTeamNodeDraft, "id">> & Pick<AiTeamNodeDraft, "id" | "name" | "squad" | "managerId">,
): AiTeamNodeDraft {
  const tmpl = MASTER_ROLE_TEMPLATES[templateId];
  if (!tmpl) {
    throw new Error(`Unknown master role template: ${templateId}`);
  }

  const skills = overlay.skills ?? tmpl.defaultSkills;
  const responsibilities = overlay.responsibilities
    ? `${tmpl.defaultResponsibilities}\n${overlay.responsibilities}`
    : tmpl.defaultResponsibilities;
  const checklists = overlay.checklists
    ? `${tmpl.defaultChecklists}\n${overlay.checklists}`
    : tmpl.defaultChecklists;
  const constraints = overlay.constraints
    ? `${tmpl.defaultConstraints}\n${overlay.constraints}`
    : tmpl.defaultConstraints;

  return {
    id: overlay.id,
    name: overlay.name,
    title: overlay.title ?? tmpl.defaultTitle,
    department: overlay.department ?? tmpl.defaultDepartment,
    squad: overlay.squad,
    skills,
    responsibilities,
    checklists,
    constraints,
    managerId: overlay.managerId,
  };
}

// ==============================
// 3. Seed template graph (optional)
// ==============================

const TEMPLATE_NODES: AiTeamNodeDraft[] = [
  buildNodeFromTemplate("ceo", {
    id: "ceo",
    name: "Ava Patel",
    squad: "Executive Board",
    managerId: undefined,
  }),
  buildNodeFromTemplate("cto", {
    id: "cto",
    name: "Noah Kim",
    squad: "Executive Board",
    managerId: "ceo",
  }),
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
  buildNodeFromTemplate("security-red", {
    id: "security-red",
    name: "Noor Alvarez",
    squad: "Red-Team Squad",
    managerId: "security-blue",
  }),
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
  buildNodeFromTemplate("ai-skills-head", {
    id: "ai-skills-head",
    name: "Lukas Schneider",
    squad: "AI Skill & Talent Squad",
    managerId: "ceo",
  }),
  buildNodeFromTemplate("meta-architect", {
    id: "meta-architect",
    name: "Theo Laurent",
    squad: "Evolution Council",
    managerId: "ceo",
  }),
];

const TEMPLATE_COLLABORATIONS: Array<[string, string, string]> = [
  ["security-red", "security-blue", "challenge line"],
  ["pm-core", "eng-frontend-lead", "delivery loop"],
  ["qa-e2e", "eng-backend-lead", "release quality"], // qa-e2e may be added by LLM
  ["skill-quarantine", "skill-scout", "vetting flow"],
];

// ==============================
// 4. Edge builders
// ==============================

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

function buildTemplateEdges(nodes: AiTeamNodeDraft[]): AiTeamEdgeDraft[] {
  const reporting = buildReportingEdges(nodes);
  const collaborations: AiTeamEdgeDraft[] = [];

  for (const [fromNodeId, toNodeId, label] of TEMPLATE_COLLABORATIONS) {
    const fromExists = nodes.some((n) => n.id === fromNodeId);
    const toExists = nodes.some((n) => n.id === toNodeId);
    if (!fromExists || !toExists) continue;

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

export function buildAriaAiTeamTemplate(): AiTeamDraftDocument {
  const nodes = TEMPLATE_NODES.map((node) => ({ ...node }));
  return {
    version: 1,
    rootNodeId: "ceo",
    nodes,
    edges: buildTemplateEdges(nodes),
  };
}

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

const REQUIRED_DEPARTMENTS = [
  "Executive & Governance",
  "Product & Business",
  "Engineering & Operations",
  "Security, Cyber Defense & Red Team",
  "AI Skills & Talent Ecosystem",
  "Quality, Testing & Reliability",
  "Data, Analytics & Knowledge",
  "Finance & Procurement",
  "Meta & Evolution",
];

/**
 * Validate that a draft has basic structural integrity and coverage.
 * This is where you enforce "no missing security", "must have CEO", etc.
 */
export function validateAiTeamDraft(draft: AiTeamDraftDocument): AiTeamDraftValidationError[] {
  const errors: AiTeamDraftValidationError[] = [];

  if (draft.version !== 1) {
    errors.push({ code: "VERSION", message: `version must be 1, got ${draft.version}` });
  }

  const nodeIds = new Set(draft.nodes.map((n) => n.id));
  const root = draft.nodes.find((n) => n.id === draft.rootNodeId);
  if (!root) {
    errors.push({ code: "ROOT_MISSING", message: `rootNodeId '${draft.rootNodeId}' does not exist in nodes` });
  }

  const ceo = draft.nodes.find((n) => n.title.toLowerCase().includes("chief executive officer") || n.id === "ceo");
  if (!ceo) {
    errors.push({ code: "CEO_MISSING", message: "Draft must include a CEO node" });
  } else if (draft.rootNodeId !== ceo.id) {
    errors.push({
      code: "ROOT_NOT_CEO",
      message: `rootNodeId must be the CEO node id ('${ceo.id}'), got '${draft.rootNodeId}'`,
    });
  }

  // Required departments present
  const deptSet = new Set(draft.nodes.map((n) => n.department.trim()).filter(Boolean));
  for (const required of REQUIRED_DEPARTMENTS) {
    if (!deptSet.has(required)) {
      errors.push({
        code: "DEPARTMENT_MISSING",
        message: `Draft is missing at least one node in required department '${required}'`,
      });
    }
  }

  // Manager references valid and no self-manager
  for (const node of draft.nodes) {
    if (!node.managerId) continue;
    if (node.managerId === node.id) {
      errors.push({
        code: "MANAGER_SELF",
        message: `Node '${node.id}' cannot manage itself`,
      });
    } else if (!nodeIds.has(node.managerId)) {
      errors.push({
        code: "MANAGER_UNKNOWN",
        message: `Node '${node.id}' references unknown managerId '${node.managerId}'`,
      });
    }
  }

  // Edge references valid nodes
  for (const edge of draft.edges) {
    if (!nodeIds.has(edge.fromNodeId)) {
      errors.push({
        code: "EDGE_FROM_UNKNOWN",
        message: `Edge '${edge.id}' has unknown fromNodeId '${edge.fromNodeId}'`,
      });
    }
    if (!nodeIds.has(edge.toNodeId)) {
      errors.push({
        code: "EDGE_TO_UNKNOWN",
        message: `Edge '${edge.id}' has unknown toNodeId '${edge.toNodeId}'`,
      });
    }
  }

  return errors;
}

// ==============================
// 6. Summary, Mermaid, Markdown
// ==============================

export function buildAiTeamDraftSummary(draft: AiTeamDraftDocument): string {
  const departments = new Set(
    draft.nodes
      .map((node) => node.department.trim())
      .filter((value) => value.length > 0),
  );
  const squads = new Set(
    draft.nodes
      .map((node) => node.squad.trim())
      .filter((value) => value.length > 0),
  );

  const reportingCount = draft.edges.filter((edge) => edge.kind === "reporting").length;
  const customCount = draft.edges.filter((edge) => edge.kind !== "reporting").length;

  return [
    "AI Team Draft Summary",
    "",
    `- Nodes: ${draft.nodes.length}`,
    `- Reporting lines: ${reportingCount}`,
    `- Custom relationships: ${customCount}`,
    `- Departments: ${departments.size}`,
    `- Squads: ${squads.size}`,
  ].join("\n");
}

function sanitizeMermaidLabel(value: string): string {
  return value.replaceAll('"', "'").replaceAll("\n", " ").trim();
}

function mermaidEdgeOperator(kind: AiTeamEdgeKind): string {
  if (kind === "reporting") return "-->";
  if (kind === "collaboration") return "-.-";
  return "==>";
}

export function buildAiTeamMermaid(draft: AiTeamDraftDocument): string {
  const lines: string[] = ["flowchart TD"];

  for (const node of draft.nodes) {
    const label = sanitizeMermaidLabel(`${node.name} - ${node.title}`);
    lines.push(`  ${node.id}["${label}"]`);
  }

  for (const edge of draft.edges) {
    const label = sanitizeMermaidLabel(edge.label);
    lines.push(`  ${edge.fromNodeId} ${mermaidEdgeOperator(edge.kind)}|"${label}"| ${edge.toNodeId}`);
  }

  return lines.join("\n");
}

export function buildAiTeamDraftMarkdown(draft: AiTeamDraftDocument): string {
  const nodesJson = JSON.stringify(draft.nodes, null, 2);
  const edgesJson = JSON.stringify(draft.edges, null, 2);
  const summary = buildAiTeamDraftSummary(draft);
  const mermaid = buildAiTeamMermaid(draft);

  return `${summary}

## Graph JSON

\`\`\`json
{
  "version": 1,
  "rootNodeId": "${draft.rootNodeId}",
  "nodes": ${nodesJson},
  "edges": ${edgesJson}
}
\`\`\`

## Mermaid

\`\`\`mermaid
${mermaid}
\`\`\`
`;
}