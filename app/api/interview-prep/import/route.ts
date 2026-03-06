import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Use service role key for server-to-server import (no user auth needed)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type QuestionTheme = {
  theme: string;
  likely_question: string;
  leverage_from_resume: string;
  directional_angle: string;
};

type ImportRequest = {
  company: string;
  role_title: string;
  session_config: {
    company_interview_philosophy: string;
    opening_pitch: string;
    question_themes: QuestionTheme[];
    resume_leverage_map: { experience: string; why_it_maps: string }[];
    gap_mitigation: { gap: string; strategy: string }[];
  };
};

export async function POST(request: Request) {
  try {
    // Verify import key
    const authHeader = request.headers.get("authorization");
    const expectedKey = process.env.FORGE_IMPORT_KEY;

    if (!expectedKey || !authHeader || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ImportRequest;
    const { company, role_title, session_config } = body;

    if (!company || !role_title || !session_config?.question_themes) {
      return NextResponse.json(
        { error: "Missing required fields: company, role_title, session_config.question_themes" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Delete existing prompts for this company + role to avoid duplicates on re-generate
    await supabase
      .from("prompts")
      .delete()
      .eq("source", "interview_prep")
      .eq("company", company)
      .eq("role_title", role_title);

    // Insert each question theme as a speaking prompt
    const prompts = session_config.question_themes.map((q: QuestionTheme) => ({
      type: "speaking",
      category: q.theme,
      text: q.likely_question,
      word_limit: null,
      time_limit_seconds: 120, // 2 minutes per answer
      source: "interview_prep",
      company,
      role_title,
      context: {
        leverage_from_resume: q.leverage_from_resume,
        directional_angle: q.directional_angle,
        opening_pitch: session_config.opening_pitch,
        company_interview_philosophy: session_config.company_interview_philosophy,
        resume_leverage_map: session_config.resume_leverage_map,
        gap_mitigation: session_config.gap_mitigation,
      },
    }));

    const { data, error } = await supabase.from("prompts").insert(prompts).select("id");

    if (error) {
      console.error("Import error:", error);
      return NextResponse.json({ error: "Failed to import prompts" }, { status: 500 });
    }

    return NextResponse.json({
      status: "imported",
      company,
      role_title,
      questions_imported: data?.length ?? 0,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
