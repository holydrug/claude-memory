/** Predicate sets for auto-classifying facts as global or project scope */

const GLOBAL_PREDICATES = new Set([
  "uses",
  "depends_on",
  "deployed_on",
  "written_in",
  "has_version",
  "runs_on",
  "built_with",
  "integrates_with",
  "prefers",
  "convention",
]);

const PROJECT_PREDICATES = new Set([
  "blocked_by",
  "workaround_for",
  "todo",
  "bug_in",
  "fixed_by",
  "needs_refactor",
  "has_pattern",
  "test_for",
  "config_for",
]);

/**
 * Classify a predicate as a global or project scope candidate.
 * Conservative default: unknown predicates → "project" (promote via review).
 */
export function classifyScope(predicate: string): "global" | "project" {
  const normalized = predicate.toLowerCase().trim();
  if (GLOBAL_PREDICATES.has(normalized)) return "global";
  if (PROJECT_PREDICATES.has(normalized)) return "project";
  return "project";
}
