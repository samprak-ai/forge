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
