# Paperclip Architecture Documentation

## Overview

Paperclip is an open-source orchestration platform designed to run autonomous AI companies ("zero-human companies"). It operates as a Node.js server and a React UI to manage a team of AI agents to fulfill business goals.

Paperclip handles org charts, budgets, governance, goal alignment, and agent coordination instead of just traditional task management.

## Key Concepts

*   **Companies:** The top-level organizational unit. One instance can manage multiple companies with strict data isolation.
*   **Agents:** AI entities (employees) powered by various models (Claude, Codex, OpenClaw, CLI, HTTP bots). If it receives a heartbeat, it's hired.
*   **Org Chart:** Defines roles, hierarchies, reporting lines, and permissions for Agents.
*   **Tasks (Issues):** Ticket-based units of work. Traced back to company missions/goals. Full tool-call tracing and an immutable audit log.
*   **Heartbeats:** Agents wake up on scheduled events, check work, and act.
*   **Cost Control:** Budgets per agent, tracking tokens and money. Agents stop when they hit budget limits.
*   **Governance:** Human-in-the-loop board system. Humans review strategy, approve hires, override actions, pause/terminate agents.
*   **Workspaces:** Git worktrees and execution environments for agents to work on isolated code branches.
*   **Routines & Schedules:** Recurring automated jobs without manual kickoffs.

## Codebase Structure

The application is structured as a monorepo utilizing `pnpm` workspaces.

### 1. `server/` (Backend Application Server)
-   **Core Tech:** Node.js, Express, TypeScript.
-   **Key Files/Directories:**
    -   `src/app.ts`: Setup of Express server, routing, error handling, Vite integration (for dev mode), plugin job coordinator.
    -   `src/routes/`: Contains all business logic API routes (`agents.ts`, `companies.ts`, `issues.ts`, `goals.ts`, `auth.ts`, `environments.ts`, `costs.ts`, `budget.ts`, etc.).
    -   `src/services/`: Core logic (e.g., Access Service, Agent Service, Storage, Telemetry).
    -   `src/adapters/`: Interfaces for LLM agents.
-   **Responsibilities:** Authenticate users/agents, enforce access controls, coordinate heartbeats, manage database transactions, serve the API (`/api/*`), and stream Vite HTML during development.

### 2. `ui/` (Frontend React Application)
-   **Core Tech:** React 19, React Router, Vite, TailwindCSS, `@tanstack/react-query`.
-   **Key Files/Directories:**
    -   `src/App.tsx`: Main routing configuration (e.g., Dashboards, Workspaces, Agents, Tasks, Inbox).
    -   `src/pages/`: Page-level React components representing different UI views.
    -   `src/components/`: Reusable React components.
    -   `src/api/`: Typed HTTP clients that interact with the `server/`.
    -   `src/context/`: Context providers (e.g., Company, Breadcrumbs, Dialogs).
-   **Responsibilities:** Providing the UI to manage and monitor autonomous companies, task ticketing, org charts, budget monitoring.

### 3. `packages/db/` (Database Layer)
-   **Core Tech:** Drizzle ORM, Embedded Postgres (for quick setup), SQLite (in some modules/plugins).
-   **Key Files/Directories:**
    -   `src/schema/`: Database schema definitions (Tables: `agents`, `companies`, `issues`, `heartbeat_runs`, `budget_policies`, etc.).
    -   `src/client.ts`: Database client configuration.
    -   `src/migrations/`: Database migrations.
-   **Responsibilities:** Central source of truth, schema modeling, executing database migrations safely.

### 4. `packages/adapters/` (Agent Runtime Adapters)
-   **Core Concept:** Translates abstract agent intentions into concrete LLM API calls or tool executions.
-   **Notable Adapters:**
    -   `claude-local`, `codex-local`, `gemini-local`, `ollama-local`: Connect directly to standard LLM providers.
    -   `openclaw-gateway`: Specific adapter for OpenClaw agents.
    -   `cursor-cloud`, `cursor-local`, `opencode-local`: Adapter patterns tailored to coding agents/tools.

### 5. `packages/shared/`
-   **Core Concept:** Shared utilities, types, Zod validation schemas, and constants (like `API_PREFIX`) utilized by both frontend and backend.

## Data Flow & Architecture

1.  **Actor Initialization:** Human (Board Member) logs into the UI.
2.  **API interaction:** The UI makes a RESTful call to `/api/agents` or `/api/issues` via `@tanstack/react-query`.
3.  **Backend Processing:** The Express server authenticates the session, verifies board claims, and executes the operation utilizing Drizzle ORM to update PostgreSQL.
4.  **Agent Waking (Heartbeat System):**
    -   When a task is assigned or a cron routine fires, the server records a `heartbeat_run_event`.
    -   The Heartbeat Execution system wakes the corresponding Agent via its configured Adapter.
5.  **Agent Execution:**
    -   The Agent loads context, retrieves any secrets needed via Secret Providers, and checks its budget.
    -   The Agent executes tool calls (e.g., executing a bash command in its `execution_workspace`).
    -   The output is streamed/recorded back as a `run_transcript` and `activity_log`.
    -   The Agent incurs a cost, which is logged against its `budget_policy`.
6.  **Governance Loop:** If an Agent requests a blocked action or needs a review, it flags the issue. The human board member reviews it in the UI and approves or denies it.

## Key Mechanisms

*   **Atomic Task Checkout:** Prevent multiple agents from checking out the exact same work concurrently.
*   **Plugins (`packages/plugins`):** Designed for extending Paperclip instance capabilities without forking core codebase.
*   **Portability (`companies.ts`):** Entire company schemas (agents, skills, tasks) can be exported/imported.