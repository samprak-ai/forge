import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { ScoreResult } from "@/lib/types";
import { saveRep } from "@/lib/db";

const anthropic = new Anthropic();

type InterviewWritingScoreRequest = {
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

function buildInterviewWritingScoringPrompt(
  question: string,
  content: string,
  context: InterviewWritingScoreRequest["context"]
) {
  const resumeContext =
    context.resume_leverage_map
      ?.map((r) => `- ${r.experience}: ${r.why_it_maps}`)
      .join("\n") || "Not available";

  const gapContext =
    context.gap_mitigation
      ?.map((g) => `- Gap: ${g.gap} → Strategy: ${g.strategy}`)
      .join("\n") || "None identified";

  return `You are an expert interview coach evaluating a candidate's WRITTEN answer to an interview question. The candidate is writing their answer as a preparation step before practicing verbal delivery. Score the response on four dimensions. Each score is 0–100.

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

## Candidate's Written Answer
"${content}"

Respond with ONLY valid JSON in this exact format, no other text:
{
  "overall": <number>,
  "dimensions": [
    { "dimension": "clarity", "score": <number>, "comment": "<1 sentence>" },
    { "dimension": "structure", "score": <number>, "comment": "<1 sentence>" },
    { "dimension": "persuasion", "score": <number>, "comment": "<1 sentence>" },
    { "dimension": "alignment", "score": <number>, "comment": "<1 sentence>" }
  ],
  "summary": "<2-3 sentence overall feedback>"
}

Scoring guidance:
- **clarity**: Are ideas expressed precisely? Would this be easy to understand if spoken aloud? Absence of vague or ambiguous language. Strong, concrete examples rather than abstract claims.
- **structure**: Logical flow of ideas. Clear framework (STAR: Situation, Task, Action, Result or problem-solution). Strong opening that addresses the question directly. Coherent transitions between points. Complete thought — no loose ends.
- **persuasion**: Compelling argument for the candidate's fit. Confident positioning (not hedging or self-deprecating). Memorable framing that would move an interviewer. Shows initiative and ownership.
- **alignment**: How well the answer maps to the candidate's actual resume experiences listed above. Strategic use of the recommended leverage points. Relevance to the role and company. Effective positioning of strengths against known gaps.
- **overall**: A weighted composite that reflects interview readiness. Penalize major weaknesses but reward strategic use of resume experience and clear structure.`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InterviewWritingScoreRequest;
    const { prompt, promptId, content, sessionId, context } = body;

    if (!prompt || !content || !sessionId || !context) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const scoringPrompt = buildInterviewWritingScoringPrompt(
      prompt,
      content,
      context
    );

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

    // Save rep as type "writing"
    await saveRep({
      sessionId,
      type: "writing",
      promptId,
      content,
      score: result.overall,
      dimensions: result.dimensions,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Interview writing scoring error:", error);
    return NextResponse.json(
      { error: "Failed to score interview writing response" },
      { status: 500 }
    );
  }
}
