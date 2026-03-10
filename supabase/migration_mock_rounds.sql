-- Mock interview rounds
-- Stores multi-question interview simulation sessions with holistic assessment

CREATE TABLE IF NOT EXISTS interview_rounds (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    company text NOT NULL,
    role_title text NOT NULL,
    question_count int NOT NULL,
    transcripts jsonb,          -- [{prompt_id, question, transcript}]
    per_question_scores jsonb,  -- [{prompt_id, overall, dimensions}]
    round_score numeric,        -- holistic readiness score 0-100
    round_assessment jsonb,     -- {strengths, improvements, readiness_verdict, summary}
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rounds_user ON interview_rounds(user_id);
CREATE INDEX IF NOT EXISTS idx_rounds_company ON interview_rounds(company, role_title);
