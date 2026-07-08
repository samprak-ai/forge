import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic();

type Turn = { question: string; answer: string };

type FollowupRequest = {
  originalQuestion: string;
  history: Turn[];
  followupsAsked: number;
  maxFollowups: number;
  context?: {
    leverage_from_resume?: string;
    directional_angle?: string;
    company_interview_philosophy?: string;
  };
};

function buildFollowupPrompt(body: FollowupRequest) {
  const { originalQuestion, history, followupsAsked, maxFollowups, context } =
    body;

  const transcript = history
    .map(
      (t, i) =>
        `${i === 0 ? "Q (original)" : "Q (follow-up)"}: ${t.question}\nCandidate: ${t.answer}`
    )
    .join("\n\n");

  return `You are a sharp, professional interviewer conducting a live verbal interview. You have just heard the candidate's latest answer. Decide whether to ask ONE natural follow-up question that probes deeper, or to conclude this topic.

## Original interview question
"${originalQuestion}"

## Conversation so far
${transcript}

## What you know about the candidate / role
- Resume experience they should leverage: ${context?.leverage_from_resume || "unknown"}
- Directional angle for a strong answer: ${context?.directional_angle || "unknown"}
- Company interview philosophy: ${context?.company_interview_philosophy || "unknown"}

## Your decision
- Follow-ups asked so far: ${followupsAsked} of a maximum ${maxFollowups}.
- Ask a follow-up ONLY if it would meaningfully sharpen the answer — e.g. the candidate was vague, made a claim without evidence, glossed over their specific role, gave no measurable result, or opened an interesting thread worth pulling.
- A good follow-up is short (one sentence), conversational, and specific to what they actually said (reference their words). Examples: "You mentioned you 'led' that migration — what did you personally own versus delegate?" or "You said it improved performance — do you have a number on that?"
- If the answer was already strong and complete, or you have hit the follow-up limit, CONCLUDE instead. Do not ask filler questions.

Respond with ONLY valid JSON, no other text:
{
  "action": "followup" | "conclude",
  "followup": "<the follow-up question, or empty string if concluding>",
  "reason": "<brief internal note on why>"
}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FollowupRequest;

    if (!body.originalQuestion || !Array.isArray(body.history)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Hard stop at the cap regardless of model judgment.
    if (body.followupsAsked >= body.maxFollowups) {
      return NextResponse.json({ followup: null });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: buildFollowupPrompt(body) }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    let cleanText = text.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.split("\n").slice(1).join("\n");
      cleanText = cleanText.replace(/```\s*$/, "").trim();
    }

    const parsed = JSON.parse(cleanText) as {
      action: "followup" | "conclude";
      followup: string;
    };

    const followup =
      parsed.action === "followup" && parsed.followup?.trim()
        ? parsed.followup.trim()
        : null;

    return NextResponse.json({ followup });
  } catch (error) {
    console.error("Follow-up generation error:", error);
    // Fail safe: no follow-up rather than blocking the interview.
    return NextResponse.json({ followup: null });
  }
}
