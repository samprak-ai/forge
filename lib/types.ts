export type Dimension = "clarity" | "structure" | "concision" | "persuasion" | "delivery" | "vocabulary" | "confidence" | "articulation" | "alignment";

export type DimensionScore = {
  dimension: Dimension;
  score: number; // 0–100
  comment: string;
};

export type ScoreResult = {
  overall: number; // 0–100 composite
  dimensions: DimensionScore[];
  summary: string;
};

export type ScoreRequest = {
  prompt: string;
  promptId: string;
  content: string;
  wordLimit: number;
  sessionId: string;
  type: "writing" | "speaking";
  timeLimitSeconds?: number | null;
};
