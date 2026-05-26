# Agents

This repository includes helper agents used by the development assistant for quick codebase tasks.

## Purpose
- Document available agents and how to use them when working in this workspace.

## Available agents
- **Explore** — Fast read-only codebase exploration and Q&A subagent. Use for searching files, summarizing code, or finding symbols quickly.

## Where changes were made
- Top owners metric implemented in `src/App.jsx` (aggregates `licensedUnits` per owner and computes `score = licensedUnitsTotal * numberOfLicenses`). See: [src/App.jsx](src/App.jsx)

## How to run the project
Install dependencies and start the dev server (choose one):

```bash
npm install
npm run dev
# or, if using bun
bun install
bun dev
```

## How to update agent behavior
- Agent definitions and behaviors are part of the development assistant config (not in this repo). To change agent capabilities, update the assistant prompts or tool mappings in your editor integration.

## Notes
- The `Explore` agent is read-only and safe for quick queries; it will not modify files unless instructed to do so by an explicit code-edit step.

If you want a more detailed agents manifest, tell me what to include (usage examples, commands, ownership, or links to external docs).

## AI Agent Guidance

- **Capabilities:** read and summarize the codebase, propose and apply small code edits, create or update docs, and suggest commands or tests. Agents will request confirmation before running commands or making destructive changes.
- **Safety rules:** agents will not perform destructive operations (e.g., force-push, delete remote branches, wipe files) without explicit human approval. Do not paste secrets or credentials into prompts.
- **When to ask:** request agents for small, well-scoped tasks (bug fixes, docs, minor refactors). For larger work, ask for a short plan first and review before implementation.
- **How to request edits:** be specific. Example: "Update top owners metric to weight units by sqrt(licenses) — show plan first." The agent should return a plan, then implement after confirmation.
- **Running commands/tests:** agents may suggest commands; run them locally unless you explicitly authorize the agent to run them in this environment. Agents will ask for confirmation before executing shell commands.
- **Review process:** always review agent-created diffs before merging. Prefer small PRs and ensure tests pass locally or in CI.
- **Adjusting agent behavior:** agent prompts and tool access are controlled by your editor/assistant configuration. Update those settings to change behavior.

If you'd like, I can add a short PR-review checklist for agent changes or wire a CI job to validate agent PRs — tell me which you'd prefer.
