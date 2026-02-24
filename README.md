# semantic-memory-mcp

Semantic memory MCP server for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).
Local knowledge graph with vector search — **zero external dependencies**.

Works out of the box with built-in embeddings. Power users can plug in [Ollama](#power-users-ollama) for higher-quality models.

## How it works

semantic-memory-mcp gives Claude Code a persistent knowledge graph stored in a local SQLite database.
Facts are stored as Subject-Predicate-Object triples with vector embeddings for semantic search.

```
[billing-service] -[uses]-> [PostgreSQL 16]
    Fact: "billing-service uses PostgreSQL 16 with JDBC driver"
```

**Stack:**
- **Storage**: SQLite + [sqlite-vec](https://github.com/asg017/sqlite-vec) for vector search
- **Embeddings**: [all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2) (384-dim, ~80MB, runs on CPU via ONNX)
- **Protocol**: [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) over stdio

## Quick start

```bash
# Install globally (or use npx)
npm install -g semantic-memory-mcp

# Auto-configure Claude Code
semantic-memory-mcp init

# Restart Claude Code — done!
```

Or add manually to `~/.claude.json`:

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

On first use, the embedding model (~80MB) downloads automatically and is cached permanently.

## Tools

### memory_store

Store a fact in the knowledge graph.

| Parameter | Required | Description |
|-----------|----------|-------------|
| subject | yes | Subject entity (English) |
| predicate | yes | Relationship verb: `uses`, `depends_on`, `has_pattern`, etc. |
| object | yes | Object entity (English) |
| fact | yes | Full description (any language) |
| context | yes | Source context |
| source | no | File path or URL |

### memory_search

Semantic search over stored facts.

| Parameter | Required | Description |
|-----------|----------|-------------|
| query | yes | Search query (any language) |
| limit | no | Max results (default: 5) |

### memory_graph

Explore the knowledge graph around an entity.

| Parameter | Required | Description |
|-----------|----------|-------------|
| entity | yes | Entity name (fuzzy match) |
| depth | no | Traversal depth (default: 2) |

### memory_list_entities

List all entities in the knowledge graph.

| Parameter | Required | Description |
|-----------|----------|-------------|
| pattern | no | Filter pattern (case-insensitive) |

## Usage with Claude Code

Add trigger words to your `CLAUDE.md` so Claude knows when to use memory:

```markdown
## Semantic Memory

When user says "remember", "recall", "what do you know about", "memory" —
use the semantic-memory MCP tools:

- `memory_store` — save a fact
- `memory_search` — find facts by meaning
- `memory_graph` — explore connections
- `memory_list_entities` — list everything
```

Then in conversation:

> "Remember that billing-service uses PostgreSQL 16"

Claude will call `memory_store` with the appropriate SPO triple.

> "What do you know about billing?"

Claude will call `memory_search` and return relevant facts.

## Configuration

All configuration is via environment variables (all optional):

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_MEMORY_DIR` | `~/.cache/claude-memory` | Data directory |
| `CLAUDE_MEMORY_DB` | `<dir>/memory.db` | SQLite database path |
| `CLAUDE_MEMORY_MODEL_CACHE` | `<dir>/models` | Embedding model cache |
| `EMBEDDING_PROVIDER` | `builtin` | `"builtin"` or `"ollama"` |
| `EMBEDDING_DIM` | `384` / `768` | Embedding dimension (default depends on provider) |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `nomic-embed-text` | Ollama embedding model name |

## Power Users: Ollama

If you have [Ollama](https://ollama.com) running locally, you can use higher-quality embedding models (nomic-embed-text 768-dim, mxbai-embed-large 1024-dim, etc.) instead of the built-in all-MiniLM-L6-v2.

### Setup

```bash
# 1. Pull an embedding model
ollama pull nomic-embed-text

# 2. Configure Claude Code to use Ollama
```

In `~/.claude.json`:

```json
{
  "mcpServers": {
    "semantic-memory": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "semantic-memory-mcp"],
      "env": {
        "EMBEDDING_PROVIDER": "ollama",
        "OLLAMA_MODEL": "nomic-embed-text",
        "EMBEDDING_DIM": "768"
      }
    }
  }
}
```

### Available models

| Model | Dim | Notes |
|-------|-----|-------|
| `nomic-embed-text` | 768 | Good balance of quality and speed |
| `mxbai-embed-large` | 1024 | Higher quality, slower |
| `all-minilm` | 384 | Similar to builtin, useful for testing |

Set `EMBEDDING_DIM` to match the model's output dimension. On first start, the dimension is saved in the database — if you switch models with a different dimension, you'll need a fresh database.

### Dimension mismatch

The embedding dimension is locked when the database is first created. If you change `EMBEDDING_DIM` later, you'll get a clear error:

```
Embedding dimension mismatch: database was created with dim=384,
but current config has dim=768.
Either use EMBEDDING_DIM=384 or start with a fresh database.
```

To switch dimensions, either delete the old database or use a different `CLAUDE_MEMORY_DB` path.

## Requirements

- Node.js >= 18
- ~80MB disk for the embedding model (downloaded on first use, builtin only)
- ~1MB per 1000 facts stored
- [Ollama](https://ollama.com) (optional, for `EMBEDDING_PROVIDER=ollama`)

## License

MIT
