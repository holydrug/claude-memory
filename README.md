# semantic-memory-mcp

Semantic memory MCP server for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).
Local knowledge graph with vector search — **zero external dependencies**.

No Docker. No Ollama. No API keys. Just `npx` and go.

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

## Requirements

- Node.js >= 18
- ~80MB disk for the embedding model (downloaded on first use)
- ~1MB per 1000 facts stored

## License

MIT
