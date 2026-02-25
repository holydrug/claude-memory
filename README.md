# semantic-memory-mcp

Persistent memory for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Knowledge graph with semantic search — works locally, no API keys needed.

## Quick start

```bash
npx semantic-memory-mcp init
# Restart Claude Code — done!
```

The interactive wizard lets you choose between two modes:

| Mode | Storage | Embeddings | Dependencies |
|------|---------|------------|--------------|
| **Lightweight** | SQLite | Built-in (all-MiniLM-L6-v2, 384-dim) | None |
| **Full** | Neo4j | Ollama (nomic-embed-text, 768-dim+) | Docker |

**Full mode** generates a `docker-compose.yml` with Neo4j + Ollama, starts containers, pulls the embedding model — all from the wizard. On macOS it installs Ollama natively via Homebrew for Metal GPU acceleration.

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

## Manual setup

If you prefer to configure manually instead of using `init`:

```json
{
  "mcpServers": {
    "semantic-memory": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "semantic-memory-mcp"]
    }
  }
}
```

Full mode with Neo4j + Ollama:

```json
{
  "mcpServers": {
    "semantic-memory": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "semantic-memory-mcp"],
      "env": {
        "STORAGE_PROVIDER": "neo4j",
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "your_password",
        "EMBEDDING_PROVIDER": "ollama",
        "OLLAMA_MODEL": "nomic-embed-text",
        "EMBEDDING_DIM": "768"
      }
    }
  }
}
```

## Embedding models

| Model | Dim | Size | Best for |
|-------|-----|------|----------|
| `all-MiniLM-L6-v2` (builtin) | 384 | 80 MB | Zero-setup, good enough for most use cases |
| `nomic-embed-text` | 768 | 274 MB | Best balance of quality and speed (recommended for Full) |
| `mxbai-embed-large` | 1024 | 670 MB | Highest quality, complex semantic relationships |
| `all-minilm` | 384 | 45 MB | Smallest Ollama model, fast |

## Requirements

- Node.js >= 18
- Docker (Full mode only)

## License

MIT
