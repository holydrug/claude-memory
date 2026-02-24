export type EmbedFn = (text: string) => Promise<Float32Array>;

export interface StoreFact {
  subjectId: number;
  predicate: string;
  objectId: number;
  content: string;
  context: string;
  source: string;
  embedding: Float32Array;
}

export interface SearchResult {
  subject: string;
  predicate: string;
  object: string;
  fact: string;
  context: string;
  source: string;
  score: number;
}

export interface GraphResult {
  matchedName: string;
  entities: string[];
  facts: Array<{
    subject: string;
    predicate: string;
    object: string;
    fact: string;
  }>;
}

export interface EntityInfo {
  name: string;
  factCount: number;
}
