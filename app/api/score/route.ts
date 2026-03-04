import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { ScoreRequest, ScoreResult } from "@/lib/types";
import { saveRep } from "@/lib/db";

const anthropic = new Anthropic();

function buildWritingPrompt(prompt: string, content: string, wordLimit: number) {
  return `You are a professional writing coach. Score the following writing response on four dimensions. Each score is 0–100.

Prompt given to the writer:
"${prompt}"

Word limit: ${wordLimit} words

Writer's response:
"${content}"

Respond with ONLY valid JSON in this exact format, no other text:
{
  "overall": <number>,
  "dimensions": [
    { "dimension": "clarity", "score": <number>, "comment": "<1 sentence>" },
    { "dimension": "structure", "score": <number>, "comment": "<1 sentence>" },
    { "dimension": "concision", "score": <number>, "comment": "<1 sentence>" },
    { "dimension": "persuasion", "score": <number>, "comment": "<1 sentence>" }
  ],
  "summary": "<2-3 sentence overall feedback>"
}

Scoring guidance:
- clarity: Is the writing easy to understand? Are ideas expressed precisely?
- structure: Is there a logical flow? Does it have a clear beginning, middle, end?
- concision: Does it stay within the word limit? Is every word earning its place?
- persuasion: Is the argument compelling? Would it move the reader to action or agreement?
- overall: A weighted composite (not a simple average — penalize major weaknesses).`;
}

function buildSpeakingPrompt(
  prompt: string,
  content: string,
  timeLimitSeconds: number | null | undefined
) {
  const timeNote = timeLimitSeconds
    ? `Time limit: ${timeLimitSeconds} seconds`
    : "No specific time limit";

  return `You are a professional speaking coach. Score the following spoken response (transcribed from audio) on four dimensions. Each score is 0–100.

Prompt given to the speaker:
"${prompt}"

${timeNote}

Speaker's transcribed response:
"${content}"

Respond with ONLY valid JSON in this exact format, no other text:
{
  "overall": <number>,
  "dimensions": [
    { "dimension": "clarity", "score": <number>, "comment": "<1 sentence>" },
    { "dimension": "structure", "score": <number>, "comment": "<1 sentence>" },
    { "dimension": "concision", "score": <number>, "comment": "<1 sentence>" },
    { "dimension": "delivery", "score": <number>, "comment": "<1 sentence>" }
  ],
  "summary": "<2-3 sentence overall feedback>"
}

Scoring guidance:
- clarity: Are ideas expressed clearly? Would a listener follow easily?
- structure: Is there a logical flow? Does the response have a clear opening, body, and close?
- concision: Does the speaker stay on point without rambling or filler words?
- delivery: Does the speaker sound confident, natural, and engaging based on word choice and phrasing?
- overall: A weighted composite (not a simple average — penalize major weaknesses).`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ScoreRequest;
    const { prompt, promptId, content, wordLimit, sessionId, type, timeLimitSeconds } = body;

    if (!prompt || !content || !sessionId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const scoringPrompt =
      type === "speaking"
        ? buildSpeakingPrompt(prompt, content, timeLimitSeconds)
        : buildWritingPrompt(prompt, content, wordLimit);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: scoringPrompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const result: ScoreResult = JSON.parse(text);

    // Save the rep to Supabase
    await saveRep({
      sessionId,
      type: type ?? "writing",
      promptId,
      content,
      score: result.overall,
      dimensions: result.dimensions,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Scoring error:", error);
    return NextResponse.json(
      { error: "Failed to score" },
      { status: 500 }
    );
  }
}
