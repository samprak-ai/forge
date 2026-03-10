import { createClient } from "@/lib/supabase/server";
import type { DimensionScore } from "@/lib/types";

export async function getOrCreateTodaySession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const today = new Date().toISOString().split("T")[0];

  // Try to fetch existing session for today
  const { data: existing } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  if (existing) return existing;

  // Create new session
  const { data: created, error } = await supabase
    .from("sessions")
    .insert({ user_id: user.id, date: today })
    .select()
    .single();

  if (error) throw error;
  return created;
}

export async function saveRep({
  sessionId,
  type,
  promptId,
  content,
  score,
  dimensions,
}: {
  sessionId: string;
  type: "writing" | "speaking";
  promptId: string;
  content: string;
  score: number;
  dimensions: DimensionScore[];
}) {
  const supabase = await createClient();

  // Insert the rep
  const { error: repError } = await supabase.from("reps").insert({
    session_id: sessionId,
    type,
    prompt_id: promptId,
    content,
    score,
    dimensions,
  });

  if (repError) throw repError;

  // Increment completed_reps on the session
  const { error: sessionError } = await supabase.rpc("increment_completed_reps", {
    session_id_input: sessionId,
  });

  // Fallback if RPC doesn't exist — use manual update
  if (sessionError) {
    const { data: session } = await supabase
      .from("sessions")
      .select("completed_reps")
      .eq("id", sessionId)
      .single();

    if (session) {
      await supabase
        .from("sessions")
        .update({ completed_reps: session.completed_reps + 1 })
        .eq("id", sessionId);
    }
  }
}

export async function getSessionReps(sessionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reps")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getRecentReps(limit = 20) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("reps")
    .select("*, sessions!inner(user_id)")
    .eq("sessions.user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export type SkillAverages = Record<string, number>;

export async function getSkillAverages(): Promise<SkillAverages> {
  const reps = await getRecentReps(50);

  const totals: Record<string, { sum: number; count: number }> = {
    clarity: { sum: 0, count: 0 },
    structure: { sum: 0, count: 0 },
    concision: { sum: 0, count: 0 },
    persuasion: { sum: 0, count: 0 },
  };

  for (const rep of reps) {
    const dims = rep.dimensions as DimensionScore[] | null;
    if (!dims) continue;
    for (const d of dims) {
      if (totals[d.dimension]) {
        totals[d.dimension].sum += d.score;
        totals[d.dimension].count += 1;
      }
    }
  }

  const averages: SkillAverages = {};
  for (const [key, val] of Object.entries(totals)) {
    averages[key] = val.count > 0 ? Math.round(val.sum / val.count) : 0;
  }
  return averages;
}

export async function getStreak(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  // Fetch sessions with at least 1 completed rep, ordered by date descending
  const { data: sessions } = await supabase
    .from("sessions")
    .select("date")
    .eq("user_id", user.id)
    .gt("completed_reps", 0)
    .order("date", { ascending: false })
    .limit(365);

  if (!sessions || sessions.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if the most recent session is today or yesterday
  const lastSessionDate = new Date(sessions[0].date + "T00:00:00");
  const diffFromToday = Math.floor(
    (today.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // If the last session is more than 1 day ago, streak is 0
  if (diffFromToday > 1) return 0;

  // Walk backwards through dates counting consecutive days
  let expectedDate = lastSessionDate;

  for (const session of sessions) {
    const sessionDate = new Date(session.date + "T00:00:00");
    const diff = Math.floor(
      (expectedDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diff === 0) {
      // Same date as expected — count it and move to previous day
      streak++;
      expectedDate = new Date(sessionDate);
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (diff > 0) {
      // Gap found — streak broken
      break;
    }
    // diff < 0 shouldn't happen since we order desc, but skip if so
  }

  return streak;
}

export async function getWeeklyReps() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString();

  const { data, error } = await supabase
    .from("reps")
    .select("*, sessions!inner(user_id, date)")
    .eq("sessions.user_id", user.id)
    .gte("created_at", weekAgoStr)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Interview Rounds (Mock Interview Mode)
// ---------------------------------------------------------------------------

export async function createInterviewRound(
  company: string,
  roleTitle: string,
  questionCount: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("interview_rounds")
    .insert({
      user_id: user.id,
      company,
      role_title: roleTitle,
      question_count: questionCount,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completeInterviewRound(
  roundId: string,
  transcripts: { prompt_id: string; question: string; transcript: string }[],
  perQuestionScores: { prompt_id: string; overall: number; dimensions: DimensionScore[] }[],
  roundScore: number,
  roundAssessment: {
    strengths: string[];
    improvements: string[];
    readiness_verdict: string;
    summary: string;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("interview_rounds")
    .update({
      transcripts,
      per_question_scores: perQuestionScores,
      round_score: roundScore,
      round_assessment: roundAssessment,
      completed_at: new Date().toISOString(),
    })
    .eq("id", roundId);

  if (error) throw error;
}

export async function getInterviewRounds(
  company?: string,
  roleTitle?: string,
  limit = 10
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  let query = supabase
    .from("interview_rounds")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (company) query = query.eq("company", company);
  if (roleTitle) query = query.eq("role_title", roleTitle);

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Practice Progress Analytics
// ---------------------------------------------------------------------------

export type ProgressRep = {
  id: string;
  type: "writing" | "speaking";
  prompt_id: string;
  score: number;
  dimensions: DimensionScore[];
  created_at: string;
  company: string | null;
  role_title: string | null;
};

export async function getProgressData(
  limit = 200,
  company?: string,
  roleTitle?: string
): Promise<ProgressRep[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Fetch reps with prompt metadata (company, role_title)
  const { data: reps, error } = await supabase
    .from("reps")
    .select("id, type, prompt_id, score, dimensions, created_at, sessions!inner(user_id)")
    .eq("sessions.user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  if (!reps || reps.length === 0) return [];

  // Fetch prompt metadata for company/role mapping
  const promptIds = [...new Set(reps.map((r) => r.prompt_id).filter(Boolean))];

  const { data: prompts } = await supabase
    .from("prompts")
    .select("id, company, role_title")
    .in("id", promptIds);

  const promptMap = new Map(
    (prompts || []).map((p) => [p.id, { company: p.company, role_title: p.role_title }])
  );

  // Map reps with prompt metadata and apply filters
  const result: ProgressRep[] = [];
  for (const rep of reps) {
    const prompt = promptMap.get(rep.prompt_id);
    const repCompany = prompt?.company || null;
    const repRole = prompt?.role_title || null;

    // Apply company/role filters
    if (company && repCompany !== company) continue;
    if (roleTitle && repRole !== roleTitle) continue;

    result.push({
      id: rep.id,
      type: rep.type as "writing" | "speaking",
      prompt_id: rep.prompt_id,
      score: rep.score,
      dimensions: rep.dimensions as DimensionScore[],
      created_at: rep.created_at,
      company: repCompany,
      role_title: repRole,
    });
  }

  return result;
}

export async function getProgressFilters(): Promise<{
  companies: string[];
  roles: { company: string; role_title: string }[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Get distinct company/role combos from prompts that have reps
  const { data: reps } = await supabase
    .from("reps")
    .select("prompt_id, sessions!inner(user_id)")
    .eq("sessions.user_id", user.id);

  if (!reps || reps.length === 0) return { companies: [], roles: [] };

  const promptIds = [...new Set(reps.map((r) => r.prompt_id).filter(Boolean))];

  const { data: prompts } = await supabase
    .from("prompts")
    .select("company, role_title")
    .in("id", promptIds)
    .not("company", "is", null);

  if (!prompts) return { companies: [], roles: [] };

  const companiesSet = new Set<string>();
  const rolesSet = new Map<string, Set<string>>();

  for (const p of prompts) {
    if (p.company) {
      companiesSet.add(p.company);
      if (p.role_title) {
        if (!rolesSet.has(p.company)) rolesSet.set(p.company, new Set());
        rolesSet.get(p.company)!.add(p.role_title);
      }
    }
  }

  const roles: { company: string; role_title: string }[] = [];
  for (const [comp, roleSet] of rolesSet) {
    for (const role of roleSet) {
      roles.push({ company: comp, role_title: role });
    }
  }

  return {
    companies: [...companiesSet].sort(),
    roles: roles.sort((a, b) => a.company.localeCompare(b.company) || a.role_title.localeCompare(b.role_title)),
  };
}

export async function getRecentSessions(limit = 10) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
