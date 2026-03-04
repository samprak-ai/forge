import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getWeeklyReps, getSkillAverages, getStreak } from "@/lib/db";
import type { DimensionScore } from "@/lib/types";

const anthropic = new Anthropic();

export async function GET() {
  try {
    const [reps, averages, streak] = await Promise.all([
      getWeeklyReps(),
      getSkillAverages(),
      getStreak(),
    ]);

    if (reps.length === 0) {
      return NextResponse.json({
        notes: "No practice data from this week yet. Complete some reps to get your first coaching summary!",
      });
    }

    // Build a summary of the week's practice for the AI
    const repSummaries = reps.map((rep) => {
      const dims = rep.dimensions as DimensionScore[] | null;
      const dimStr = dims
        ? dims.map((d) => `${d.dimension}: ${d.score}`).join(", ")
        : "no scores";
      return `- ${rep.type} rep (score: ${rep.score ?? "N/A"}, ${dimStr})`;
    });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `You are a supportive communication coach. Write a brief weekly coaching summary for a user practicing professional writing and speaking.

Here is their data from the past 7 days:

Total reps completed: ${reps.length}
Current streak: ${streak} days
Skill averages: ${JSON.stringify(averages)}

Individual reps:
${repSummaries.join("\n")}

Write 3-4 short paragraphs:
1. A brief positive acknowledgment of their effort this week
2. Their strongest dimension and what they're doing well
3. Their weakest dimension and one specific, actionable tip to improve
4. A motivating close for the week ahead

Keep it warm but direct. No fluff. Under 200 words total. Do not use markdown formatting.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ notes: text });
  } catch (error) {
    console.error("Coaching notes error:", error);
    return NextResponse.json(
      { error: "Failed to generate coaching notes" },
      { status: 500 }
    );
  }
}
