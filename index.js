#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "fs";
import { join } from "path";

const ARTIFACTS = ["prd", "ux", "architecture", "epics_stories", "readiness"];
const ARTIFACT_GROUPS = {
  prd: ["ba", "design", "dev"],
  ux: ["ba", "design"],
  architecture: ["dev"],
  epics_stories: ["ba", "dev"],
  readiness: ["ba", "design", "dev"],
};

const server = new Server(
  {
    name: "signoff-flow-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper functions
function getProjectRoot() {
  try {
    return execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
  } catch {
    return process.cwd();
  }
}

function getGovernancePath() {
  return join(getProjectRoot(), "_bmad-output", "governance", "governance.yaml");
}

function getInitiativePath(key) {
  return join(getProjectRoot(), "_bmad-output", "initiatives", key);
}

function governanceExists() {
  return existsSync(getGovernancePath());
}

function loadGovernance() {
  if (!governanceExists()) return null;
  const content = readFileSync(getGovernancePath(), "utf-8");
  // Simple YAML parsing for our known structure
  const lines = content.split("\n");
  const governance = { groups: {}, jira: {} };
  
  let currentSection = null;
  let currentGroup = null;
  
  for (const line of lines) {
    if (line.startsWith("  project_key:")) {
      governance.jira.project_key = line.split(":")[1].trim().replace(/"/g, "");
    }
    if (line.match(/^  (ba|design|dev):$/)) {
      currentGroup = line.trim().replace(":", "");
      governance.groups[currentGroup] = { leads: { github_users: [], jira_account_ids: [] } };
    }
    if (line.includes("github_users:") && currentGroup) {
      const match = line.match(/\[(.*)\]/);
      if (match) {
        governance.groups[currentGroup].leads.github_users = match[1]
          .split(",")
          .map(s => s.trim().replace(/"/g, ""));
      }
    }
    if (line.includes("jira_account_ids:") && currentGroup) {
      const match = line.match(/\[(.*)\]/);
      if (match) {
        governance.groups[currentGroup].leads.jira_account_ids = match[1]
          .split(",")
          .map(s => s.trim().replace(/"/g, ""));
      }
    }
  }
  
  return governance;
}

function initiativeExists(key) {
  return existsSync(join(getInitiativePath(key), "state.yaml"));
}

function loadInitiativeState(key) {
  const statePath = join(getInitiativePath(key), "state.yaml");
  if (!existsSync(statePath)) return null;
  const content = readFileSync(statePath, "utf-8");
  
  // Parse current_step
  const stepMatch = content.match(/current_step:\s*(\w+)/);
  const currentStep = stepMatch ? stepMatch[1] : "prd";
  
  return { key, currentStep, raw: content };
}

function createInitiative(key, title) {
  const initPath = getInitiativePath(key);
  const artifactsPath = join(initPath, "artifacts");
  
  mkdirSync(artifactsPath, { recursive: true });
  
  const governance = loadGovernance();
  const baLeads = governance?.groups?.ba?.leads?.github_users || [];
  const designLeads = governance?.groups?.design?.leads?.github_users || [];
  const devLeads = governance?.groups?.dev?.leads?.github_users || [];
  
  const stateContent = `version: 1
key: "${key}"
title: "${title}"
external_ids:
  jira: ""

phase: planning
current_step: prd

governance_ref:
  path: _bmad-output/governance/governance.yaml

artifacts:
  prd:
    path: _bmad-output/initiatives/${key}/artifacts/PRD.md
    required_groups: [ba, design, dev]
    active:
      branch: "bmad/${key}/prd"
      pr_url: ""
      pr_number: null
      status: none
      jira_signoff_tickets:
        ba: ""
        design: ""
        dev: ""

  ux:
    path: _bmad-output/initiatives/${key}/artifacts/UX.md
    required_groups: [ba, design]
    active:
      branch: "bmad/${key}/ux"
      pr_url: ""
      pr_number: null
      status: none
      jira_signoff_tickets:
        ba: ""
        design: ""

  architecture:
    path: _bmad-output/initiatives/${key}/artifacts/ARCHITECTURE.md
    required_groups: [dev]
    active:
      branch: "bmad/${key}/architecture"
      pr_url: ""
      pr_number: null
      status: none
      jira_signoff_tickets:
        dev: ""

  epics_stories:
    path: _bmad-output/initiatives/${key}/artifacts/EPICS_AND_STORIES.md
    required_groups: [ba, dev]
    active:
      branch: "bmad/${key}/epics-stories"
      pr_url: ""
      pr_number: null
      status: none
      jira_signoff_tickets:
        ba: ""
        dev: ""

  readiness:
    path: _bmad-output/initiatives/${key}/artifacts/IMPLEMENTATION_READINESS.md
    required_groups: [ba, design, dev]
    active:
      branch: "bmad/${key}/readiness"
      pr_url: ""
      pr_number: null
      status: none
      jira_signoff_tickets:
        ba: ""
        design: ""
        dev: ""

history: []
`;

  writeFileSync(join(initPath, "state.yaml"), stateContent);
  
  const timelineContent = `# Timeline: ${key}

## ${title}

---

### ${new Date().toISOString()} — Initiative Initialized

- **Phase:** planning
- **Step:** prd
- **Action:** Initiative created

---
`;
  writeFileSync(join(initPath, "timeline.md"), timelineContent);
  
  return { key, title, path: initPath };
}

function createArtifact(key, artifact) {
  const artifactPath = join(getInitiativePath(key), "artifacts", `${artifact.toUpperCase()}.md`);
  const content = `# ${artifact.toUpperCase()} (Mock)

**Initiative:** \`${key}\`  
**Current step:** \`${artifact}\`  
**Generated at:** \`${new Date().toISOString()}\`

---

This is a **stub artifact** for the signoff workflow.
Signoff happens via PR approval — repo/PR is source of truth.
`;
  
  mkdirSync(join(getInitiativePath(key), "artifacts"), { recursive: true });
  writeFileSync(artifactPath, content);
  return artifactPath;
}

function appendTimeline(key, entry) {
  const timelinePath = join(getInitiativePath(key), "timeline.md");
  appendFileSync(timelinePath, `\n### ${new Date().toISOString()} — ${entry.title}\n\n${entry.content}\n\n---\n`);
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "signoff_status",
        description: "Check the status of governance and initiatives. Use this first to understand the current state.",
        inputSchema: {
          type: "object",
          properties: {
            initiative_key: {
              type: "string",
              description: "Optional: specific initiative key to check status for",
            },
          },
        },
      },
      {
        name: "signoff_setup_governance",
        description: "Set up governance with leads for BA, Design, and Dev groups. Required before creating initiatives.",
        inputSchema: {
          type: "object",
          properties: {
            ba_leads: {
              type: "array",
              items: { type: "string" },
              description: "GitHub usernames of BA leads",
            },
            design_leads: {
              type: "array",
              items: { type: "string" },
              description: "GitHub usernames of Design leads",
            },
            dev_leads: {
              type: "array",
              items: { type: "string" },
              description: "GitHub usernames of Dev leads",
            },
            jira_project_key: {
              type: "string",
              description: "Jira project key (e.g., 'PROJ')",
            },
          },
          required: ["ba_leads", "design_leads", "dev_leads", "jira_project_key"],
        },
      },
      {
        name: "signoff_new_initiative",
        description: "Create a new initiative. Governance must be set up first.",
        inputSchema: {
          type: "object",
          properties: {
            key: {
              type: "string",
              description: "Initiative key (e.g., 'FEAT-123' or 'INIT-001')",
            },
            title: {
              type: "string",
              description: "Initiative title",
            },
          },
          required: ["key", "title"],
        },
      },
      {
        name: "signoff_advance",
        description: "Advance an initiative to create the next artifact, PR, and Jira tickets.",
        inputSchema: {
          type: "object",
          properties: {
            key: {
              type: "string",
              description: "Initiative key",
            },
          },
          required: ["key"],
        },
      },
      {
        name: "signoff_create_jira_tickets",
        description: "Create Jira signoff tickets for the current artifact step. Requires Atlassian MCP to be configured.",
        inputSchema: {
          type: "object",
          properties: {
            key: {
              type: "string",
              description: "Initiative key",
            },
            artifact: {
              type: "string",
              description: "Artifact name (prd, ux, architecture, epics_stories, readiness)",
            },
            pr_url: {
              type: "string",
              description: "GitHub PR URL to include in tickets",
            },
          },
          required: ["key", "artifact"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "signoff_status": {
        const hasGovernance = governanceExists();
        let result = `## Signoff Flow Status\n\n`;
        result += `**Governance:** ${hasGovernance ? "✅ Configured" : "❌ Not configured (run signoff_setup_governance first)"}\n\n`;
        
        if (hasGovernance) {
          const governance = loadGovernance();
          result += `**Jira Project:** ${governance?.jira?.project_key || "Unknown"}\n`;
          result += `**BA Leads:** ${governance?.groups?.ba?.leads?.github_users?.join(", ") || "None"}\n`;
          result += `**Design Leads:** ${governance?.groups?.design?.leads?.github_users?.join(", ") || "None"}\n`;
          result += `**Dev Leads:** ${governance?.groups?.dev?.leads?.github_users?.join(", ") || "None"}\n\n`;
        }
        
        if (args?.initiative_key) {
          const state = loadInitiativeState(args.initiative_key);
          if (state) {
            result += `### Initiative: ${args.initiative_key}\n`;
            result += `**Current Step:** ${state.currentStep}\n`;
            const stepIndex = ARTIFACTS.indexOf(state.currentStep);
            result += `**Progress:** ${stepIndex + 1}/${ARTIFACTS.length} (${ARTIFACTS.join(" → ")})\n`;
          } else {
            result += `\n❌ Initiative ${args.initiative_key} not found.\n`;
          }
        }
        
        return { content: [{ type: "text", text: result }] };
      }

      case "signoff_setup_governance": {
        const govPath = getGovernancePath();
        mkdirSync(join(getProjectRoot(), "_bmad-output", "governance"), { recursive: true });
        
        const content = `version: 1

groups:
  ba:
    leads:
      github_users: [${args.ba_leads.map(l => `"${l}"`).join(", ")}]
      jira_account_ids: []
    github:
      team_slug: ""

  design:
    leads:
      github_users: [${args.design_leads.map(l => `"${l}"`).join(", ")}]
      jira_account_ids: []
    github:
      team_slug: ""

  dev:
    leads:
      github_users: [${args.dev_leads.map(l => `"${l}"`).join(", ")}]
      jira_account_ids: []
    github:
      team_slug: ""

jira:
  project_key: "${args.jira_project_key}"
  issue_types:
    signoff_request: "Task"

signoff_rules:
  prd:
    required_groups: [ba, design, dev]
  ux:
    required_groups: [ba, design]
  architecture:
    required_groups: [dev]
  epics_stories:
    required_groups: [ba, dev]
  readiness:
    required_groups: [ba, design, dev]
`;
        
        writeFileSync(govPath, content);
        
        return {
          content: [{
            type: "text",
            text: `✅ Governance configured!\n\n**Path:** ${govPath}\n**Jira Project:** ${args.jira_project_key}\n**BA Leads:** ${args.ba_leads.join(", ")}\n**Design Leads:** ${args.design_leads.join(", ")}\n**Dev Leads:** ${args.dev_leads.join(", ")}\n\nYou can now create initiatives with signoff_new_initiative.`,
          }],
        };
      }

      case "signoff_new_initiative": {
        if (!governanceExists()) {
          return {
            content: [{
              type: "text",
              text: "❌ Governance not configured. Run signoff_setup_governance first.",
            }],
          };
        }
        
        if (initiativeExists(args.key)) {
          return {
            content: [{
              type: "text",
              text: `❌ Initiative ${args.key} already exists. Use signoff_advance to continue it.`,
            }],
          };
        }
        
        const result = createInitiative(args.key, args.title);
        
        return {
          content: [{
            type: "text",
            text: `✅ Initiative created!\n\n**Key:** ${result.key}\n**Title:** ${result.title}\n**Path:** ${result.path}\n**Current Step:** prd\n\nNext: Run signoff_advance to create the PRD artifact and PR.`,
          }],
        };
      }

      case "signoff_advance": {
        if (!initiativeExists(args.key)) {
          return {
            content: [{
              type: "text",
              text: `❌ Initiative ${args.key} not found. Create it with signoff_new_initiative first.`,
            }],
          };
        }
        
        const state = loadInitiativeState(args.key);
        const currentStep = state.currentStep;
        const stepIndex = ARTIFACTS.indexOf(currentStep);
        
        if (stepIndex === -1) {
          return {
            content: [{
              type: "text",
              text: `❌ Unknown step: ${currentStep}`,
            }],
          };
        }
        
        if (stepIndex >= ARTIFACTS.length - 1 && currentStep === "readiness") {
          return {
            content: [{
              type: "text",
              text: `✅ Initiative ${args.key} is complete! All artifacts have been signed off.`,
            }],
          };
        }
        
        // Create artifact
        const artifactPath = createArtifact(args.key, currentStep);
        const groups = ARTIFACT_GROUPS[currentStep];
        
        appendTimeline(args.key, {
          title: `${currentStep.toUpperCase()} Step Started`,
          content: `- **Phase:** planning\n- **Step:** ${currentStep}\n- **Action:** Created artifact stub\n- **Required groups:** ${groups.join(", ")}`,
        });
        
        return {
          content: [{
            type: "text",
            text: `✅ Artifact created!\n\n**Initiative:** ${args.key}\n**Step:** ${currentStep.toUpperCase()}\n**Artifact:** ${artifactPath}\n**Required signoffs:** ${groups.join(", ")}\n\n**Next steps:**\n1. Create a GitHub PR for branch \`bmad/${args.key}/${currentStep}\`\n2. Create Jira tickets with signoff_create_jira_tickets\n3. Request reviews from leads\n4. When PR is merged, run signoff_advance again`,
          }],
        };
      }

      case "signoff_create_jira_tickets": {
        const groups = ARTIFACT_GROUPS[args.artifact];
        if (!groups) {
          return {
            content: [{
              type: "text",
              text: `❌ Unknown artifact: ${args.artifact}. Valid: ${ARTIFACTS.join(", ")}`,
            }],
          };
        }
        
        const governance = loadGovernance();
        const jiraProject = governance?.jira?.project_key || "UNKNOWN";
        
        let result = `## Jira Tickets to Create\n\n`;
        result += `Use the Atlassian MCP to create these tickets:\n\n`;
        
        for (const group of groups) {
          result += `### ${group.toUpperCase()} Signoff\n`;
          result += `- **Summary:** \`[BMAD][${args.key}][${args.artifact}] Signoff required — ${group.toUpperCase()}\`\n`;
          result += `- **Project:** ${jiraProject}\n`;
          result += `- **Type:** Task\n`;
          result += `- **Labels:** bmad, initiative-${args.key}, artifact-${args.artifact}, group-${group}\n`;
          result += `- **Description:**\n\`\`\`\nBMAD signoff requested (lead-only).\n\nInitiative: ${args.key}\nArtifact: ${args.artifact.toUpperCase()}\nGroup: ${group.toUpperCase()}\n\nPR: ${args.pr_url || "(pending)"}\n\nAction: Approve the PR to sign off.\n\`\`\`\n\n`;
        }
        
        return { content: [{ type: "text", text: result }] };
      }

      default:
        return {
          content: [{
            type: "text",
            text: `Unknown tool: ${name}`,
          }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error.message}`,
      }],
      isError: true,
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
