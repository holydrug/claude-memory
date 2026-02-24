import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import { createInterface } from "node:readline/promises";

const OLLAMA_MODELS: Record<string, number> = {
  "nomic-embed-text": 768,
  "mxbai-embed-large": 1024,
  "all-minilm": 384,
};

async function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  const answer = await rl.question(question);
  return answer.trim();
}

async function choose(
  rl: ReturnType<typeof createInterface>,
  prompt: string,
  options: string[],
  descriptions: string[],
): Promise<number> {
  console.log(`\n${prompt}`);
  for (let i = 0; i < options.length; i++) {
    const marker = i === 0 ? ">" : " ";
    console.log(`  ${marker} ${i + 1}) ${options[i]} — ${descriptions[i]}`);
  }
  const raw = await ask(rl, `Choose [1-${options.length}] (default: 1): `);
  const n = raw === "" ? 1 : parseInt(raw, 10);
  if (n < 1 || n > options.length || isNaN(n)) return 0;
  return n - 1;
}

function isOllamaRunning(url: string): boolean {
  try {
    execSync(`curl -sf ${url}/api/tags`, { timeout: 3000, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function isDockerAvailable(): boolean {
  try {
    execSync("docker info", { timeout: 5000, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function startOllamaDocker(port: number): boolean {
  try {
    // Check if container already exists
    const existing = execSync("docker ps -a --filter name=ollama --format '{{.Names}}'", {
      timeout: 5000,
      stdio: "pipe",
    }).toString().trim();

    if (existing === "ollama") {
      console.log("  Starting existing 'ollama' container...");
      execSync("docker start ollama", { timeout: 10000, stdio: "pipe" });
    } else {
      console.log("  Creating and starting 'ollama' container...");
      execSync(
        `docker run -d --name ollama -p ${port}:11434 -v ollama_data:/root/.ollama ollama/ollama`,
        { timeout: 30000, stdio: "inherit" },
      );
    }
    return true;
  } catch {
    return false;
  }
}

function waitForOllama(url: string, maxWaitSec: number): boolean {
  const deadline = Date.now() + maxWaitSec * 1000;
  while (Date.now() < deadline) {
    if (isOllamaRunning(url)) return true;
    execSync("sleep 1");
  }
  return false;
}

function pullModel(url: string, model: string): boolean {
  try {
    console.log(`  Pulling model '${model}'... (this may take a minute)`);
    execSync(
      `curl -sf ${url}/api/pull -d '${JSON.stringify({ name: model })}'`,
      { timeout: 300000, stdio: "inherit" },
    );
    return true;
  } catch {
    return false;
  }
}

function isModelAvailable(url: string, model: string): boolean {
  try {
    const raw = execSync(`curl -sf ${url}/api/tags`, { timeout: 5000, stdio: "pipe" }).toString();
    const data = JSON.parse(raw) as { models?: Array<{ name: string }> };
    return data.models?.some((m) => m.name.startsWith(model)) ?? false;
  } catch {
    return false;
  }
}

export async function runInit(): Promise<void> {
  const claudeJsonPath = join(homedir(), ".claude.json");
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    let config: Record<string, unknown>;

    if (existsSync(claudeJsonPath)) {
      config = JSON.parse(readFileSync(claudeJsonPath, "utf-8"));
    } else {
      console.error("~/.claude.json not found — creating it. Is Claude Code installed?");
      config = {};
    }

    // Step 1: Choose embedding provider
    const providerIdx = await choose(
      rl,
      "Embedding provider:",
      ["builtin", "ollama"],
      [
        "all-MiniLM-L6-v2, 384-dim, CPU, no dependencies",
        "higher-quality models via local Ollama (needs Docker or Ollama)",
      ],
    );

    const provider = providerIdx === 0 ? "builtin" : "ollama";

    const mcpServers = (config["mcpServers"] ?? {}) as Record<string, unknown>;
    const envVars: Record<string, string> = {};

    if (provider === "ollama") {
      // Step 2: Ollama URL
      const ollamaUrl = (await ask(rl, "\nOllama URL (default: http://localhost:11434): "))
        || "http://localhost:11434";

      // Step 3: Check if Ollama is running
      if (!isOllamaRunning(ollamaUrl)) {
        console.log(`\n  Ollama is not running at ${ollamaUrl}.`);

        if (isDockerAvailable()) {
          const startIt = await ask(rl, "  Start Ollama via Docker? [Y/n]: ");
          if (startIt === "" || startIt.toLowerCase() === "y") {
            // Extract port from URL
            const port = new URL(ollamaUrl).port || "11434";
            if (!startOllamaDocker(parseInt(port, 10))) {
              console.error("\n  Failed to start Ollama container. Please start it manually.");
              rl.close();
              process.exit(1);
            }
            console.log("  Waiting for Ollama to be ready...");
            if (!waitForOllama(ollamaUrl, 15)) {
              console.error("\n  Ollama did not start in time. Check: docker logs ollama");
              rl.close();
              process.exit(1);
            }
            console.log("  Ollama is ready.");
          } else {
            console.log("  Skipping. Make sure Ollama is running before using the MCP server.");
          }
        } else {
          console.log("  Docker is not available either.");
          console.log("  Install Ollama (https://ollama.com) or Docker, then re-run init.");
        }
      } else {
        console.log(`\n  Ollama is running at ${ollamaUrl}.`);
      }

      // Step 4: Choose model
      const modelNames = Object.keys(OLLAMA_MODELS);
      const modelDescs = modelNames.map(
        (m) => `${OLLAMA_MODELS[m]}-dim`,
      );
      const modelIdx = await choose(rl, "Embedding model:", modelNames, modelDescs);
      const model: string = modelNames[modelIdx] ?? modelNames[0]!;
      const dim: number = OLLAMA_MODELS[model] ?? 768;

      // Step 5: Pull model if needed
      if (isOllamaRunning(ollamaUrl) && !isModelAvailable(ollamaUrl, model)) {
        const pullAnswer = await ask(rl, `\n  Model '${model}' not found. Pull it now? [Y/n]: `);
        if (pullAnswer === "" || pullAnswer.toLowerCase() === "y") {
          if (!pullModel(ollamaUrl, model)) {
            console.error(`  Failed to pull '${model}'. Pull it manually: ollama pull ${model}`);
          }
        }
      } else if (isOllamaRunning(ollamaUrl)) {
        console.log(`\n  Model '${model}' is available.`);
      }

      envVars["EMBEDDING_PROVIDER"] = "ollama";
      envVars["OLLAMA_URL"] = ollamaUrl;
      envVars["OLLAMA_MODEL"] = model;
      envVars["EMBEDDING_DIM"] = String(dim);
    }

    // Write config
    const serverEntry: Record<string, unknown> = {
      type: "stdio",
      command: "npx",
      args: ["-y", "semantic-memory-mcp"],
    };

    if (Object.keys(envVars).length > 0) {
      serverEntry["env"] = envVars;
    }

    mcpServers["semantic-memory"] = serverEntry;
    config["mcpServers"] = mcpServers;

    writeFileSync(claudeJsonPath, JSON.stringify(config, null, 2) + "\n");

    console.log(`\n  Written to ~/.claude.json (provider: ${provider})`);
    console.log("  Restart Claude Code to activate.");
  } finally {
    rl.close();
  }
}
