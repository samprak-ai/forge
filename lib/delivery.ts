// Vocal delivery metrics derived from a Whisper transcript + segment timings.
// These capture *how* an answer was spoken (pace, filler words, pauses),
// which the cleaned transcript alone can't convey.

export type WhisperSegment = {
  start: number;
  end: number;
  text: string;
};

export type DeliveryMetrics = {
  words: number;
  durationSec: number;
  wpm: number; // words per minute
  fillerCount: number;
  fillerPer100: number; // fillers per 100 words
  fillerBreakdown: { word: string; count: number }[];
  longPauses: number; // inter-segment gaps > LONG_PAUSE_SEC
  speakingRatio: number; // fraction of duration actually spent talking (0–1)
};

// Classic disfluencies + hedge fillers. Deliberately excludes ambiguous words
// like "so", "right", "well", "okay" which are usually legitimate.
const FILLER_PATTERNS: { label: string; regex: RegExp }[] = [
  { label: "um", regex: /\bu+m+\b/gi },
  { label: "uh", regex: /\bu+h+\b/gi },
  { label: "er", regex: /\ber+\b/gi },
  { label: "ah", regex: /\bah+\b/gi },
  { label: "hmm", regex: /\bh+m+\b/gi },
  { label: "like", regex: /\blike\b/gi },
  { label: "you know", regex: /\byou know\b/gi },
  { label: "I mean", regex: /\bi mean\b/gi },
  { label: "sort of", regex: /\bsort of\b/gi },
  { label: "kind of", regex: /\bkind of\b/gi },
  { label: "basically", regex: /\bbasically\b/gi },
  { label: "actually", regex: /\bactually\b/gi },
  { label: "literally", regex: /\bliterally\b/gi },
];

const LONG_PAUSE_SEC = 2;

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function computeDeliveryMetrics(
  transcript: string,
  durationSec: number,
  segments: WhisperSegment[]
): DeliveryMetrics {
  const words = countWords(transcript);
  const safeDuration = durationSec > 0 ? durationSec : 0;

  const wpm =
    safeDuration > 0 ? Math.round(words / (safeDuration / 60)) : 0;

  const fillerBreakdown: { word: string; count: number }[] = [];
  let fillerCount = 0;
  for (const { label, regex } of FILLER_PATTERNS) {
    const matches = transcript.match(regex);
    if (matches && matches.length > 0) {
      fillerCount += matches.length;
      fillerBreakdown.push({ word: label, count: matches.length });
    }
  }
  fillerBreakdown.sort((a, b) => b.count - a.count);

  const fillerPer100 =
    words > 0 ? Math.round((fillerCount / words) * 1000) / 10 : 0;

  let longPauses = 0;
  let speaking = 0;
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  for (let i = 0; i < sorted.length; i++) {
    speaking += Math.max(0, sorted[i].end - sorted[i].start);
    if (i > 0) {
      const gap = sorted[i].start - sorted[i - 1].end;
      if (gap > LONG_PAUSE_SEC) longPauses++;
    }
  }
  const speakingRatio =
    safeDuration > 0 ? Math.min(1, Math.round((speaking / safeDuration) * 100) / 100) : 0;

  return {
    words,
    durationSec: Math.round(safeDuration),
    wpm,
    fillerCount,
    fillerPer100,
    fillerBreakdown,
    longPauses,
    speakingRatio,
  };
}

// Combine per-turn metrics into a single set for whole-conversation feedback.
export function aggregateDeliveryMetrics(
  turns: DeliveryMetrics[]
): DeliveryMetrics {
  if (turns.length === 0) {
    return {
      words: 0,
      durationSec: 0,
      wpm: 0,
      fillerCount: 0,
      fillerPer100: 0,
      fillerBreakdown: [],
      longPauses: 0,
      speakingRatio: 0,
    };
  }

  const words = turns.reduce((s, t) => s + t.words, 0);
  const durationSec = turns.reduce((s, t) => s + t.durationSec, 0);
  const fillerCount = turns.reduce((s, t) => s + t.fillerCount, 0);
  const longPauses = turns.reduce((s, t) => s + t.longPauses, 0);

  const breakdownMap = new Map<string, number>();
  for (const t of turns) {
    for (const f of t.fillerBreakdown) {
      breakdownMap.set(f.word, (breakdownMap.get(f.word) ?? 0) + f.count);
    }
  }
  const fillerBreakdown = [...breakdownMap.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);

  const wpm = durationSec > 0 ? Math.round(words / (durationSec / 60)) : 0;
  const fillerPer100 =
    words > 0 ? Math.round((fillerCount / words) * 1000) / 10 : 0;

  // Duration-weighted average speaking ratio.
  const weightedSpeaking = turns.reduce(
    (s, t) => s + t.speakingRatio * t.durationSec,
    0
  );
  const speakingRatio =
    durationSec > 0 ? Math.round((weightedSpeaking / durationSec) * 100) / 100 : 0;

  return {
    words,
    durationSec,
    wpm,
    fillerCount,
    fillerPer100,
    fillerBreakdown,
    longPauses,
    speakingRatio,
  };
}

// Human-readable pace label used in the UI and passed to the scorer.
export function paceLabel(wpm: number): "slow" | "conversational" | "fast" {
  if (wpm > 0 && wpm < 110) return "slow";
  if (wpm > 165) return "fast";
  return "conversational";
}
