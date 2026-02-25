# semantic-memory-mcp

Persistent memory for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Knowledge graph with semantic search — works locally, no API keys needed.

## Quick start

```bash
npx semantic-memory-mcp@latest init
# Restart Claude Code — done!
```

The interactive wizard lets you choose between two modes:

| Mode | Storage | Embeddings | Dependencies |
|------|---------|------------|--------------|
| **Lightweight** | SQLite | Built-in (all-MiniLM-L6-v2, 384-dim) | None |
| **Full** | Neo4j | Ollama (nomic-embed-text, 768-dim+) | Docker |

**Full mode** generates a `docker-compose.yml` with Neo4j + Ollama, starts containers, pulls the embedding model — all from the wizard. On macOS it installs Ollama natively via Homebrew for Metal GPU acceleration.

## Where to configure

There are three ways to connect the MCP server to Claude Code:

### Global (recommended for personal use)

Added automatically by `npx semantic-memory-mcp@latest init`. Config lives in `~/.claude.json`:

```json
{
  "mcpServers": {
    "semantic-memory": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "semantic-memory-mcp@latest"]
    }
  }
}
```

### Per-project — shared with team

Create `.mcp.json` in the project root. This file is committed to the repo so every team member gets the same setup:

```json
{
  "mcpServers": {
    "semantic-memory": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "semantic-memory-mcp@latest"],
      "env": {
        "CLAUDE_MEMORY_DIR": "./.semantic-memory"
      }
    }
  }
}
```

Add `.semantic-memory/` to `.gitignore` — it contains the local database and model cache.

### Per-project — personal (not shared)

Add a project-scoped override in `~/.claude.json`. This is useful when you want project-specific settings without affecting the repo:

```json
{
  "projects": {
    "/absolute/path/to/project": {
      "mcpServers": {
        "semantic-memory": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "semantic-memory-mcp@latest"],
          "env": {
            "CLAUDE_MEMORY_DIR": "/absolute/path/to/project/.semantic-memory"
          }
        }
      }
    }
  }
}
```

## What it does

Claude Code gets 4 tools to remember things across sessions:

- **`memory_store`** — save a fact as a Subject → Predicate → Object triple
- **`memory_search`** — find facts by meaning (vector similarity)
- **`memory_graph`** — explore connections around an entity
- **`memory_list_entities`** — list everything stored

```
> "Remember that billing-service uses PostgreSQL 16"
  → Stored: [billing-service] -[uses]-> [PostgreSQL 16]

> "What do you know about billing?"
  → [0.856] [billing-service] -[uses]-> [PostgreSQL 16]
```

## Embedding models

| Model | Dim | Size | Best for |
|-------|-----|------|----------|
| `all-MiniLM-L6-v2` (builtin) | 384 | 80 MB | Zero-setup, good enough for most use cases |
| `nomic-embed-text` | 768 | 274 MB | Best balance of quality and speed (recommended for Full) |
| `mxbai-embed-large` | 1024 | 670 MB | Highest quality, complex semantic relationships |
| `all-minilm` | 384 | 45 MB | Smallest Ollama model, fast |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `STORAGE_PROVIDER` | `sqlite` | `sqlite` or `neo4j` |
| `CLAUDE_MEMORY_DIR` | `~/.cache/claude-memory` | Data directory |
| `CLAUDE_MEMORY_DB` | `<data-dir>/memory.db` | SQLite database path |
| `CLAUDE_MEMORY_MODEL_CACHE` | `<data-dir>/models` | Embedding model cache |
| `EMBEDDING_PROVIDER` | `builtin` | `builtin` or `ollama` |
| `EMBEDDING_DIM` | `384` / `768` | Embedding dimension (auto-set by provider) |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `nomic-embed-text` | Ollama embedding model |
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j bolt URI |
| `NEO4J_USER` | `neo4j` | Neo4j username |
| `NEO4J_PASSWORD` | `memory_pass_2024` | Neo4j password |
| `MEMORY_TRIGGERS_STORE` | — | Extra trigger words for `memory_store` (comma-separated) |
| `MEMORY_TRIGGERS_SEARCH` | — | Extra trigger words for `memory_search` (comma-separated) |
| `MEMORY_TRIGGERS_GRAPH` | — | Extra trigger words for `memory_graph` (comma-separated) |
| `MEMORY_TRIGGERS_LIST` | — | Extra trigger words for `memory_list_entities` (comma-separated) |

### Custom trigger words

Each tool has built-in trigger words (in Russian and English) that tell Claude when to use it. You can add your own triggers in any language via environment variables. Custom triggers are **appended** to the defaults, not replacing them.

Example — adding Chinese and Spanish triggers:

```json
{
  "mcpServers": {
    "semantic-memory": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "semantic-memory-mcp@latest"],
      "env": {
        "MEMORY_TRIGGERS_STORE": "记住, recuerda, guardar",
        "MEMORY_TRIGGERS_SEARCH": "搜索记忆, buscar en memoria"
      }
    }
  }
}
```

You can also configure triggers interactively during `npx semantic-memory-mcp@latest init`.

## Requirements

- Node.js >= 18
- Docker (Full mode only)

## License

MIT
