import { createClient } from "@/lib/supabase/server";

export type Prompt = {
  id: string;
  type: "writing" | "speaking";
  category: string;
  text: string;
  wordLimit: number;
  timeLimitSeconds: number | null;
};

// Map DB row to our Prompt type
function toPrompt(row: {
  id: string;
  type: string;
  category: string;
  text: string;
  word_limit: number | null;
  time_limit_seconds: number | null;
}): Prompt {
  return {
    id: row.id,
    type: row.type as "writing" | "speaking",
    category: row.category,
    text: row.text,
    wordLimit: row.word_limit ?? 150,
    timeLimitSeconds: row.time_limit_seconds,
  };
}

export async function getRandomPrompt(type: "writing" | "speaking"): Promise<Prompt> {
  const supabase = await createClient();

  // Supabase doesn't have a random() function built in,
  // so we fetch all of the type and pick one
  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .eq("type", type);

  if (error || !data || data.length === 0) {
    // Fallback prompt if DB is empty
    return {
      id: "fallback",
      type,
      category: "general",
      text: type === "writing"
        ? "Write about a challenge you overcame recently and what you learned."
        : "Describe a challenge you overcame recently and what you learned.",
      wordLimit: 150,
      timeLimitSeconds: type === "speaking" ? 60 : null,
    };
  }

  const row = data[Math.floor(Math.random() * data.length)];
  return toPrompt(row);
}

export async function getAllPrompts(type?: "writing" | "speaking"): Promise<Prompt[]> {
  const supabase = await createClient();

  let query = supabase.from("prompts").select("*").order("created_at", { ascending: true });

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error || !data) return [];
  return data.map(toPrompt);
}

export async function getPromptsByCategory(category: string): Promise<Prompt[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .eq("category", category)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map(toPrompt);
}

// ---------------------------------------------------------------------------
// Interview prep prompts (imported from job-search-intel)
// ---------------------------------------------------------------------------

export type InterviewPrepPrompt = Prompt & {
  source: string;
  company: string;
  roleTitle: string;
  context: {
    leverage_from_resume: string;
    directional_angle: string;
    opening_pitch?: string;
    company_interview_philosophy?: string;
    resume_leverage_map?: { experience: string; why_it_maps: string }[];
    gap_mitigation?: { gap: string; strategy: string }[];
  } | null;
};

function toInterviewPrepPrompt(row: {
  id: string;
  type: string;
  category: string;
  text: string;
  word_limit: number | null;
  time_limit_seconds: number | null;
  source: string;
  company: string;
  role_title: string;
  context: InterviewPrepPrompt["context"];
}): InterviewPrepPrompt {
  return {
    ...toPrompt(row),
    source: row.source,
    company: row.company,
    roleTitle: row.role_title,
    context: row.context,
  };
}

export async function getInterviewPrepPrompts(): Promise<InterviewPrepPrompt[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .eq("source", "interview_prep")
    .order("company", { ascending: true })
    .order("role_title", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map(toInterviewPrepPrompt);
}

export async function getPromptsForMockRound(
  company: string,
  roleTitle: string,
  limit = 6
): Promise<InterviewPrepPrompt[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .eq("source", "interview_prep")
    .eq("company", company)
    .eq("role_title", roleTitle)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data.map(toInterviewPrepPrompt);
}

export async function getInterviewPrepPromptById(id: string): Promise<InterviewPrepPrompt | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .eq("id", id)
    .eq("source", "interview_prep")
    .single();

  if (error || !data) return null;
  return toInterviewPrepPrompt(data);
}
