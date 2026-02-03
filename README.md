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
| `signoff_status` | Check governance and initiative status |
| `signoff_setup_governance` | Configure leads and Jira project |
| `signoff_new_initiative` | Create a new initiative |
| `signoff_advance` | Create next artifact |
| `signoff_create_jira_tickets` | Generate Jira ticket info |

## Usage in Claude Desktop

1. **Check status:**
   ```
   "Check the signoff flow status"
   ```

2. **Set up governance:**
   ```
   "Set up signoff governance with BA lead 'user1', Design lead 'user2', Dev lead 'user3', and Jira project 'PROJ'"
   ```

3. **Create initiative:**
   ```
   "Create a new initiative FEAT-100 titled 'New checkout flow'"
   ```

4. **Advance to next step:**
   ```
   "Advance initiative FEAT-100"
   ```

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
