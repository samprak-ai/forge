import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { ScoreResult } from "@/lib/types";
import { saveRep } from "@/lib/db";

const anthropic = new Anthropic();

type InterviewScoreRequest = {
  prompt: string;
  promptId: string;
  content: string;
  sessionId: string;
  context: {
    leverage_from_resume: string;
    directional_angle: string;
    opening_pitch?: string;
    company_interview_philosophy?: string;
    resume_leverage_map?: { experience: string; why_it_maps: string }[];
    gap_mitigation?: { gap: string; strategy: string }[];
  };
};

function buildInterviewScoringPrompt(
  question: string,
  transcript: string,
  context: InterviewScoreRequest["context"]
) {
  const resumeContext = context.resume_leverage_map
    ?.map((r) => `- ${r.experience}: ${r.why_it_maps}`)
    .join("\n") || "Not available";

  const gapContext = context.gap_mitigation
    ?.map((g) => `- Gap: ${g.gap} → Strategy: ${g.strategy}`)
    .join("\n") || "None identified";

  return `You are an expert interview coach evaluating a candidate's spoken answer to an interview question. Score the response on four dimensions. Each score is 0–100.

## Interview Question
"${question}"

## Expected Approach
- **Resume experience to leverage:** ${context.leverage_from_resume}
- **Directional angle:** ${context.directional_angle}

## Candidate's Strongest Experiences
${resumeContext}

## Known Gaps to Mitigate
${gapContext}

## Company Interview Philosophy
${context.company_interview_philosophy || "Not available"}

## Candidate's Transcribed Answer
"${transcript}"

Respond with ONLY valid JSON in this exact format, no other text:
{
  "overall": <number>,
  "dimensions": [
    { "dimension": "vocabulary", "score": <number>, "comment": "<1 sentence>" },
    { "dimension": "confidence", "score": <number>, "comment": "<1 sentence>" },
    { "dimension": "articulation", "score": <number>, "comment": "<1 sentence>" },
    { "dimension": "alignment", "score": <number>, "comment": "<1 sentence>" }
  ],
  "summary": "<2-3 sentence overall feedback>"
}

Scoring guidance:
- **vocabulary**: Use of industry-appropriate and professional terminology. Avoidance of filler words (um, uh, like, you know), casual language, and vague phrasing. Precision in word choice. Technical terms used correctly and naturally.
- **confidence**: Assertive, definitive statements vs. hedging (I think, maybe, sort of). Ownership of accomplishments ("I led" vs "I was involved in"). Absence of self-deprecation or unnecessary qualifiers. Direct answers without excessive caveats.
- **articulation**: Logical flow of ideas. Clear structure (ideally STAR: Situation, Task, Action, Result). Smooth transitions between points. Completeness of thought — no trailing off or abrupt topic changes. Concise delivery without rambling.
- **alignment**: How well the answer maps to the candidate's actual resume experiences listed above. Strategic use of the recommended leverage points. Relevance to the role and company. Effective positioning of strengths against known gaps.
- **overall**: A weighted composite that reflects interview readiness. Penalize major weaknesses but reward strategic use of resume experience.`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InterviewScoreRequest;
    const { prompt, promptId, content, sessionId, context } = body;

    if (!prompt || !content || !sessionId || !context) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const scoringPrompt = buildInterviewScoringPrompt(prompt, content, context);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: scoringPrompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Strip markdown code fences if present
    let cleanText = text.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.split("\n").slice(1).join("\n");
      cleanText = cleanText.replace(/```\s*$/, "").trim();
    }

    const result: ScoreResult = JSON.parse(cleanText);

    // Save rep to DB
    await saveRep({
      sessionId,
      type: "speaking",
      promptId,
      content,
      score: result.overall,
      dimensions: result.dimensions,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Interview scoring error:", error);
    return NextResponse.json(
      { error: "Failed to score interview response" },
      { status: 500 }
    );
  }
}
