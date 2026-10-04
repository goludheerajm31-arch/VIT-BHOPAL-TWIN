-- ============================================================================
-- MIGRATION: Student Announcement Submission & Admin Verification System
-- Target: PostgreSQL / Supabase
-- ============================================================================

-- 1. Alter Announcements table to support student submissions & moderation workflow
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'content') THEN
    ALTER TABLE public.announcements ADD COLUMN content TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'author_id') THEN
    ALTER TABLE public.announcements ADD COLUMN author_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'author_name') THEN
    ALTER TABLE public.announcements ADD COLUMN author_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'author_email') THEN
    ALTER TABLE public.announcements ADD COLUMN author_email TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'status') THEN
    ALTER TABLE public.announcements ADD COLUMN status TEXT NOT NULL DEFAULT 'PUBLISHED';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'attachment_url') THEN
    ALTER TABLE public.announcements ADD COLUMN attachment_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'event_date') THEN
    ALTER TABLE public.announcements ADD COLUMN event_date TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'event_time') THEN
    ALTER TABLE public.announcements ADD COLUMN event_time TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'venue') THEN
    ALTER TABLE public.announcements ADD COLUMN venue TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'submitted_at') THEN
    ALTER TABLE public.announcements ADD COLUMN submitted_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'reviewed_by') THEN
    ALTER TABLE public.announcements ADD COLUMN reviewed_by TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'reviewer_name') THEN
    ALTER TABLE public.announcements ADD COLUMN reviewer_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'reviewed_at') THEN
    ALTER TABLE public.announcements ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'review_comment') THEN
    ALTER TABLE public.announcements ADD COLUMN review_comment TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'published_at') THEN
    ALTER TABLE public.announcements ADD COLUMN published_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'version') THEN
    ALTER TABLE public.announcements ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Populate default content and status for existing rows
UPDATE public.announcements
SET content = COALESCE(content, description),
    status = COALESCE(status, 'PUBLISHED'),
    published_at = COALESCE(published_at, created_at)
WHERE status IS NULL OR status = '';

CREATE INDEX IF NOT EXISTS idx_announcements_status ON public.announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_author_id ON public.announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_announcements_submitted_at ON public.announcements(submitted_at);

-- 2. Announcement Reviews Table (Immutable Audit of Admin Moderation)
CREATE TABLE IF NOT EXISTS public.announcement_reviews (
  id TEXT PRIMARY KEY,
  announcement_id TEXT NOT NULL REFERENCES public.announcements(id) ON UPDATE CASCADE ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('APPROVE', 'REJECT', 'REQUEST_CHANGES', 'RESUBMITTED')),
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcement_reviews_ann_id ON public.announcement_reviews(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reviews_created_at ON public.announcement_reviews(created_at DESC);

-- 3. In-App Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PostgREST API Grants
GRANT ALL ON TABLE public.announcements TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.announcement_reviews TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.notifications TO anon, authenticated, service_role;

-- 5. Hardened RLS Policies for Announcements
-- Drop existing blanket policies
DROP POLICY IF EXISTS "Public read announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admin insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admin update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admin delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Read published or owned announcements" ON public.announcements;
DROP POLICY IF EXISTS "Students create submissions" ON public.announcements;
DROP POLICY IF EXISTS "Students update own draft/changes requested" ON public.announcements;

-- SELECT: Public and students see ONLY PUBLISHED announcements. Authors see their own submissions. Admins see all.
CREATE POLICY "Read published or owned announcements"
  ON public.announcements FOR SELECT
  USING (
    status = 'PUBLISHED'
    OR (auth.uid() IS NOT NULL AND (auth.uid()::text = author_id OR public.is_admin()))
  );

-- INSERT: Students can create their own announcements as DRAFT or PENDING_REVIEW. Admins can insert any.
CREATE POLICY "Insert announcements"
  ON public.announcements FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    public.is_admin()
    OR (
      auth.uid()::text = author_id
      AND status IN ('DRAFT', 'PENDING_REVIEW')
    )
  );

-- UPDATE: Students can only edit their own submissions while DRAFT or CHANGES_REQUESTED, or resubmit to PENDING_REVIEW.
-- Students CANNOT set status to PUBLISHED or APPROVED!
CREATE POLICY "Update announcements"
  ON public.announcements FOR UPDATE
  TO authenticated, service_role
  USING (
    public.is_admin()
    OR (
      auth.uid()::text = author_id
      AND status IN ('DRAFT', 'CHANGES_REQUESTED')
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      auth.uid()::text = author_id
      AND status IN ('DRAFT', 'PENDING_REVIEW')
    )
  );

-- DELETE: Only Admins can delete announcements
CREATE POLICY "Delete announcements"
  ON public.announcements FOR DELETE
  TO authenticated, service_role
  USING (public.is_admin());

-- 6. RLS Policies for Announcement Reviews
DROP POLICY IF EXISTS "Admin read reviews" ON public.announcement_reviews;
DROP POLICY IF EXISTS "Authors read own reviews" ON public.announcement_reviews;
DROP POLICY IF EXISTS "Admin insert reviews" ON public.announcement_reviews;

CREATE POLICY "Read reviews"
  ON public.announcement_reviews FOR SELECT
  TO authenticated, service_role
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_id AND a.author_id = auth.uid()::text
    )
  );

CREATE POLICY "Admin insert reviews"
  ON public.announcement_reviews FOR INSERT
  TO authenticated, service_role
  WITH CHECK (public.is_admin() OR auth.uid() IS NOT NULL);

-- 7. RLS Policies for Notifications
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated, service_role
  USING (
    user_id = auth.uid()::text
    OR (user_id = 'ADMIN' AND public.is_admin())
    OR public.is_admin()
  );

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated, service_role
  USING (
    user_id = auth.uid()::text
    OR (user_id = 'ADMIN' AND public.is_admin())
    OR public.is_admin()
  )
  WITH CHECK (
    user_id = auth.uid()::text
    OR (user_id = 'ADMIN' AND public.is_admin())
    OR public.is_admin()
  );

CREATE POLICY "Insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- 8. Add Tables to Realtime Publication
ALTER TABLE public.announcement_reviews REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_reviews;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
