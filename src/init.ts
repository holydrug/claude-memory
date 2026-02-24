import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export async function runInit(): Promise<void> {
  const claudeJsonPath = join(homedir(), ".claude.json");

  let config: Record<string, unknown>;

  if (existsSync(claudeJsonPath)) {
    config = JSON.parse(readFileSync(claudeJsonPath, "utf-8"));
  } else {
    console.error(
      "~/.claude.json not found — creating it. Is Claude Code installed?"
    );
    config = {};
  }

  const mcpServers = (config["mcpServers"] ?? {}) as Record<string, unknown>;

  mcpServers["semantic-memory"] = {
    type: "stdio",
    command: "npx",
    args: ["-y", "semantic-memory-mcp"],
  };

  config["mcpServers"] = mcpServers;

  writeFileSync(claudeJsonPath, JSON.stringify(config, null, 2) + "\n");

  console.log("Added 'semantic-memory' MCP server to ~/.claude.json");
  console.log("Restart Claude Code to activate.");
}
