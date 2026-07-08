import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { DimensionScore } from "@/lib/types";
import type { DeliveryMetrics } from "@/lib/delivery";
import { paceLabel } from "@/lib/delivery";
import { saveRep } from "@/lib/db";

const anthropic = new Anthropic();

type Turn = { question: string; answer: string };

type AssessRequest = {
  promptId: string;
  sessionId: string;
  originalQuestion: string;
  turns: Turn[];
  delivery: DeliveryMetrics;
  context: {
    leverage_from_resume?: string;
    directional_angle?: string;
    company_interview_philosophy?: string;
    resume_leverage_map?: { experience: string; why_it_maps: string }[];
    gap_mitigation?: { gap: string; strategy: string }[];
  };
};

export type ConversationAssessment = {
  overall: number;
  dimensions: DimensionScore[];
  summary: string;
  highlights: string[];
  improvements: string[];
};

function buildAssessmentPrompt(body: AssessRequest) {
  const { originalQuestion, turns, delivery, context } = body;

  const conversation = turns
    .map(
      (t, i) =>
        `${i === 0 ? "Interviewer (main question)" : "Interviewer (follow-up)"}: ${t.question}\nCandidate: ${t.answer}`
    )
    .join("\n\n");

  const resumeContext =
    context.resume_leverage_map
      ?.map((r) => `- ${r.experience}: ${r.why_it_maps}`)
      .join("\n") || "Not available";

  const gapContext =
    context.gap_mitigation
      ?.map((g) => `- Gap: ${g.gap} → Strategy: ${g.strategy}`)
      .join("\n") || "None identified";

  const topFillers =
    delivery.fillerBreakdown
      .slice(0, 4)
      .map((f) => `${f.word} (${f.count})`)
      .join(", ") || "none detected";

  return `You are an expert interview coach evaluating a candidate's full spoken exchange with an interviewer — the main question plus any follow-ups. Score the whole exchange on five dimensions, each 0–100.

## Original interview question
"${originalQuestion}"

## Full conversation (main question + follow-ups)
${conversation}

## Expected approach
- Resume experience to leverage: ${context.leverage_from_resume || "Not available"}
- Directional angle: ${context.directional_angle || "Not available"}

## Candidate's strongest experiences
${resumeContext}

## Known gaps to mitigate
${gapContext}

## Company interview philosophy
${context.company_interview_philosophy || "Not available"}

## Measured vocal delivery (across the whole exchange)
- Speaking pace: ${delivery.wpm} words/min (${paceLabel(delivery.wpm)}; interviewers generally prefer ~120–160)
- Filler words: ${delivery.fillerCount} total (${delivery.fillerPer100} per 100 words). Most frequent: ${topFillers}
- Long pauses (>2s): ${delivery.longPauses}
- Total speaking time: ${delivery.durationSec}s across ${delivery.words} words

Respond with ONLY valid JSON in this exact format, no other text:
{
  "overall": <number>,
  "dimensions": [
    { "dimension": "vocabulary", "score": <number>, "comment": "<1 sentence>" },
    { "dimension": "confidence", "score": <number>, "comment": "<1 sentence>" },
    { "dimension": "articulation", "score": <number>, "comment": "<1 sentence>" },
    { "dimension": "alignment", "score": <number>, "comment": "<1 sentence>" },
    { "dimension": "delivery", "score": <number>, "comment": "<1 sentence referencing the pace/filler/pause numbers>" }
  ],
  "summary": "<2-3 sentence overall assessment of interview readiness>",
  "highlights": ["<specific strength>", "<specific strength>"],
  "improvements": ["<specific, actionable fix>", "<specific, actionable fix>"]
}

Scoring guidance:
- **vocabulary**: Industry-appropriate, precise terminology; avoids vague/casual phrasing.
- **confidence**: Assertive ownership ("I led") vs. hedging ("I think", "sort of"); direct answers without excessive qualifiers. Consider how they handled follow-up pressure.
- **articulation**: Logical flow and clear structure (ideally STAR); complete thoughts; no rambling.
- **alignment**: How well answers map to the candidate's real resume experiences and the recommended leverage points; positioning against known gaps.
- **delivery**: Base this dimension primarily on the measured pace, filler frequency, and pauses above. Reward a conversational pace, few fillers, and controlled pauses; penalize rushing/dragging, frequent fillers, or many long pauses.
- **overall**: Weighted composite reflecting true interview readiness. Reward candidates who improved or held up well under follow-up questions.`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AssessRequest;
    const { promptId, sessionId, turns, context } = body;

    if (!sessionId || !promptId || !turns?.length || !context) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1536,
      messages: [{ role: "user", content: buildAssessmentPrompt(body) }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    let cleanText = text.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.split("\n").slice(1).join("\n");
      cleanText = cleanText.replace(/```\s*$/, "").trim();
    }

    const result = JSON.parse(cleanText) as ConversationAssessment;

    // Persist as a speaking rep. Store the full exchange as the content.
    const content = turns
      .map((t) => `Q: ${t.question}\nA: ${t.answer}`)
      .join("\n\n");

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
    console.error("Conversation assessment error:", error);
    return NextResponse.json(
      { error: "Failed to assess interview" },
      { status: 500 }
    );
  }
}
