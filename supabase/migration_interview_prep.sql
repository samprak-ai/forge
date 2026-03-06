-- Migration: Add interview prep columns to prompts table
-- Run this in Forge's Supabase SQL Editor.

ALTER TABLE prompts ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS role_title text;
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS context jsonb;
