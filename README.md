# Signoff Flow MCP Server

MCP server for PR-centric signoff workflow with Jira visibility. Use with Claude Desktop or any MCP-compatible client.

## Installation

```bash
# Clone the repo
git clone https://github.com/kikeacevedo/signoff-flow-mcp.git

# Install dependencies
cd signoff-flow-mcp
npm install
```

## Configure Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "signoff-flow": {
      "command": "node",
      "args": ["/path/to/signoff-flow-mcp/index.js"]
    }
  }
}
```

Then restart Claude Desktop.

## Available Tools

| Tool | Description |
|------|-------------|
| `signoff_set_project` | **Use first!** Select project directory to work with |
| `signoff_status` | Check governance and initiative status |
| `signoff_setup_governance` | Configure leads and Jira project |
| `signoff_new_initiative` | Create a new initiative |
| `signoff_advance` | Create next artifact |
| `signoff_create_jira_tickets` | Generate Jira ticket info |

## Usage in Claude Desktop

### Step 1: Select your project (REQUIRED)

```
"Selecciona el proyecto /Users/david/proyectos/mi-app para signoff"
```

or in English:

```
"Set the signoff project to /Users/david/projects/my-app"
```

### Step 2: Check status / Setup governance

```
"Show me the signoff status"

"Set up governance with BA lead 'user1', Design lead 'user2', Dev lead 'user3', Jira project 'PROJ'"
```

### Step 3: Create and advance initiatives

```
"Create a new initiative FEAT-100 titled 'New checkout flow'"

"Advance initiative FEAT-100"
```

## Working with Multiple Projects

The PM can switch between projects at any time:

```
"Switch to project /Users/david/projects/project-a"
... work on project A ...

"Switch to project /Users/david/projects/project-b"
... work on project B ...
```

Each project maintains its own:
- Governance configuration
- Initiatives
- State files

## Workflow

1. **Setup governance** (once per project)
2. **Create initiative** 
3. **Advance** through steps: PRD → UX → Architecture → Epics & Stories → Readiness
4. For each step: create artifact → create PR → create Jira tickets → get approvals → merge PR → advance

## Prerequisites

- Node.js 18+
- Claude Desktop with MCP support
- GitHub CLI (`gh`) for PR creation
- Atlassian MCP for Jira ticket creation

## License

MIT
