-- =====================================================================
-- Migration 003: Add optional strumming_pattern to public.tabs
-- Run this in your Supabase SQL Editor if using cloud database
-- =====================================================================

ALTER TABLE public.tabs ADD COLUMN IF NOT EXISTS strumming_pattern TEXT;

