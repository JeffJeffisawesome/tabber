-- =====================================================================
-- Migration: Add Users Table, Tab Author Relationship, and Author RLS
-- Run this in Supabase Project -> SQL Editor
-- =====================================================================

-- 1. Create public.users table (mirrors auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add user_id column to public.tabs
ALTER TABLE public.tabs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tabs_user_id ON public.tabs (user_id);

-- 3. Automatic Trigger to sync new Auth users into public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Guitarist'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW();

    -- If this is the first user registered and there are tabs without an author, assign them
    IF (SELECT COUNT(*) FROM auth.users) = 1 THEN
        UPDATE public.tabs SET user_id = NEW.id WHERE user_id IS NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill existing auth.users into public.users
INSERT INTO public.users (id, email, name, avatar_url, created_at)
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1), 'Guitarist'),
    COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture', ''),
    created_at
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    avatar_url = EXCLUDED.avatar_url;

-- 5. Assign all existing tabs with NULL user_id to the first person in auth.users
DO $$
DECLARE
    first_oauth_user_id UUID;
BEGIN
    SELECT id INTO first_oauth_user_id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;

    IF first_oauth_user_id IS NOT NULL THEN
        -- Ensure user exists in public.users
        INSERT INTO public.users (id, email, name, avatar_url)
        SELECT
            id,
            email,
            COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1), 'Guitarist'),
            COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture', '')
        FROM auth.users
        WHERE id = first_oauth_user_id
        ON CONFLICT (id) DO NOTHING;

        -- Assign existing unassigned tabs to this first user
        UPDATE public.tabs
        SET user_id = first_oauth_user_id
        WHERE user_id IS NULL;

        RAISE NOTICE 'Assigned existing tabs to first user: %', first_oauth_user_id;
    ELSE
        RAISE NOTICE 'No OAuth users found in auth.users yet. Tabs will be assigned when the first user logs in.';
    END IF;
END $$;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabs ENABLE ROW LEVEL SECURITY;

-- 7. Configure RLS Policies
-- Users table:
DROP POLICY IF EXISTS "Allow public read access to users" ON public.users;
CREATE POLICY "Allow public read access to users"
ON public.users FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow users to update own profile" ON public.users;
CREATE POLICY "Allow users to update own profile"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to insert own profile" ON public.users;
CREATE POLICY "Allow users to insert own profile"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Tabs table:
DROP POLICY IF EXISTS "Allow public read access" ON public.tabs;
DROP POLICY IF EXISTS "Allow public insert access" ON public.tabs;
DROP POLICY IF EXISTS "Allow public update access" ON public.tabs;
DROP POLICY IF EXISTS "Allow public delete access" ON public.tabs;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.tabs;
DROP POLICY IF EXISTS "Allow author update access" ON public.tabs;
DROP POLICY IF EXISTS "Allow author delete access" ON public.tabs;

-- 7a. Public read: Anyone can browse tabs
CREATE POLICY "Allow public read access"
ON public.tabs FOR SELECT
USING (true);

-- 7b. Insert: Logged-in users can create tabs and set user_id to themselves
CREATE POLICY "Allow authenticated insert access"
ON public.tabs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 7c. Update: Only the tab author can edit the tab
CREATE POLICY "Allow author update access"
ON public.tabs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 7d. Delete: Only the tab author can delete the tab
CREATE POLICY "Allow author delete access"
ON public.tabs FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

