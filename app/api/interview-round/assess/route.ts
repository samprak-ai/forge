import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { saveRep, completeInterviewRound, getOrCreateTodaySession } from "@/lib/db";
import type { DimensionScore } from "@/lib/types";

const anthropic = new Anthropic();

type QuestionTranscript = {
  promptId: string;
  question: string;
  transcript: string;
  context: {
    leverage_from_resume: string;
    directional_angle: string;
  };
};

type RoundAssessRequest = {
  roundId: string;
  questions: QuestionTranscript[];
  company: string;
  role_title: string;
  company_interview_philosophy?: string;
  resume_leverage_map?: { experience: string; why_it_maps: string }[];
  gap_mitigation?: { gap: string; strategy: string }[];
};

function buildRoundAssessmentPrompt(body: RoundAssessRequest): string {
  const resumeContext =
    body.resume_leverage_map
      ?.map((r) => `- ${r.experience}: ${r.why_it_maps}`)
      .join("\n") || "Not available";

  const gapContext =
    body.gap_mitigation
      ?.map((g) => `- Gap: ${g.gap} → Strategy: ${g.strategy}`)
      .join("\n") || "None identified";

  const questionsBlock = body.questions
    .map(
      (q, i) => `### Question ${i + 1}
**Question:** "${q.question}"
**Expected leverage:** ${q.context.leverage_from_resume}
**Directional angle:** ${q.context.directional_angle}
**Candidate's Answer:** "${q.transcript}"`
    )
    .join("\n\n");

  return `You are an expert interview coach conducting a holistic assessment of a mock interview round. The candidate answered ${body.questions.length} questions for a ${body.role_title} role at ${body.company}. Evaluate each answer individually AND provide an overall round assessment.

## Company: ${body.company}
## Role: ${body.role_title}

## Company Interview Philosophy
${body.company_interview_philosophy || "Not available"}

## Candidate's Strongest Experiences
${resumeContext}

## Known Gaps to Mitigate
${gapContext}

## Interview Questions & Answers
${questionsBlock}

Respond with ONLY valid JSON in this exact format, no other text:
{
  "per_question_scores": [
    {
      "question_index": 0,
      "overall": <number 0-100>,
      "dimensions": [
        { "dimension": "vocabulary", "score": <number>, "comment": "<1 sentence>" },
        { "dimension": "confidence", "score": <number>, "comment": "<1 sentence>" },
        { "dimension": "articulation", "score": <number>, "comment": "<1 sentence>" },
        { "dimension": "alignment", "score": <number>, "comment": "<1 sentence>" }
      ],
      "summary": "<1-2 sentence feedback for this question>"
    }
  ],
  "round_score": <number 0-100>,
  "readiness_verdict": "Interview Ready|Almost Ready|Needs More Practice",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "summary": "<3-4 sentence overall assessment of the candidate's interview performance across all questions>"
}

Scoring guidance per dimension:
- **vocabulary**: Professional terminology, filler words, precision
- **confidence**: Assertive statements vs hedging, ownership of accomplishments
- **articulation**: STAR structure, flow, transitions, completeness
- **alignment**: Strategic use of resume experience, relevance to role/company

For round_score: weighted composite reflecting overall interview readiness.
For readiness_verdict: "Interview Ready" (80+), "Almost Ready" (60-79), "Needs More Practice" (<60).
Strengths and improvements should reference specific moments across the round.`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RoundAssessRequest;
    const { roundId, questions, company, role_title } = body;

    if (!roundId || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Call Claude for holistic assessment
    const assessmentPrompt = buildRoundAssessmentPrompt(body);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: assessmentPrompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Strip markdown code fences if present
    let cleanText = text.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.split("\n").slice(1).join("\n");
      cleanText = cleanText.replace(/```\s*$/, "").trim();
    }

    const result = JSON.parse(cleanText);

    // Get or create session for saving individual reps
    const session = await getOrCreateTodaySession();

    // Save each question as an individual rep
    const perQuestionScores: {
      prompt_id: string;
      overall: number;
      dimensions: DimensionScore[];
    }[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qScore = result.per_question_scores[i];

      if (qScore) {
        await saveRep({
          sessionId: session.id,
          type: "speaking",
          promptId: q.promptId,
          content: q.transcript,
          score: qScore.overall,
          dimensions: qScore.dimensions,
        });

        perQuestionScores.push({
          prompt_id: q.promptId,
          overall: qScore.overall,
          dimensions: qScore.dimensions,
        });
      }
    }

    // Save round data
    const transcripts = questions.map((q) => ({
      prompt_id: q.promptId,
      question: q.question,
      transcript: q.transcript,
    }));

    const roundAssessment = {
      strengths: result.strengths,
      improvements: result.improvements,
      readiness_verdict: result.readiness_verdict,
      summary: result.summary,
    };

    await completeInterviewRound(
      roundId,
      transcripts,
      perQuestionScores,
      result.round_score,
      roundAssessment
    );

    return NextResponse.json({
      round_score: result.round_score,
      readiness_verdict: result.readiness_verdict,
      strengths: result.strengths,
      improvements: result.improvements,
      summary: result.summary,
      per_question_scores: result.per_question_scores,
    });
  } catch (error) {
    console.error("Round assessment error:", error);
    return NextResponse.json(
      { error: "Failed to assess interview round" },
      { status: 500 }
    );
  }
}
