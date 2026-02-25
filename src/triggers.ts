export type ToolKey = "store" | "search" | "graph" | "list";

export const DEFAULT_TRIGGERS: Record<ToolKey, string> = {
  store: "запомни, память, обнови память, сохрани в памяти, remember",
  search: "вспомни, что помнишь, поищи в памяти, recall, search memory",
  graph: "покажи граф, что связано с, graph, connections",
  list: "что в памяти, покажи всю память, list entities, what's in memory",
};

const BASE_DESCRIPTIONS: Record<ToolKey, string> = {
  store: "Store a fact in the semantic knowledge graph.",
  search: "Search the knowledge graph semantically. Returns facts matching the query by meaning.",
  graph: "Explore the knowledge graph around an entity. Returns connected facts and entities.",
  list: "List all entities in the knowledge graph. Optionally filtered by name pattern.",
};

export function buildDescription(toolKey: ToolKey, customTriggers?: string): string {
  const base = BASE_DESCRIPTIONS[toolKey];
  const defaults = DEFAULT_TRIGGERS[toolKey];

  let allTriggers = defaults;
  if (customTriggers) {
    const extra = customTriggers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");
    if (extra) {
      allTriggers = `${defaults}, ${extra}`;
    }
  }

  return `${base} Use when user says: ${allTriggers}.`;
}
