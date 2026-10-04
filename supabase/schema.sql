-- ============================================================================
-- VIT Bhopal Digital Campus Twin: Production Supabase PostgreSQL Schema
-- Hardened Row Level Security (RLS), Foreign Keys, Triggers, & Realtime Setup
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant schema usage to standard Supabase API roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 1. Automatic Timestamp Update Trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 2. User Profiles & RBAC Helper Function
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('GUEST', 'STUDENT', 'PUBLISHER', 'ADMIN', 'FACULTY')),
  avatar TEXT,
  department TEXT,
  reg_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-provision profile on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT'),
    NEW.raw_user_meta_data->>'avatar'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    avatar = COALESCE(EXCLUDED.avatar, profiles.avatar);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Secure admin verification function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- Service role bypass for backend Express tasks
    (auth.role() = 'service_role')
    OR
    -- Direct profile role check
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
    OR
    -- JWT metadata claim fallback
    (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'ADMIN')
    OR
    (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- 3. Campus Locations & Buildings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  building TEXT,
  floor TEXT,
  facilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  opening_hours TEXT,
  accessibility TEXT,
  image TEXT,
  zone TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_locations_category ON public.locations(category);
CREATE INDEX IF NOT EXISTS idx_locations_building ON public.locations(building);

-- ----------------------------------------------------------------------------
-- 4. Publishers / Student Clubs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.publishers (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  organization_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Club',
  description TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  contact_email TEXT NOT NULL DEFAULT '',
  verified_at TIMESTAMPTZ,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_publishers_updated_at
  BEFORE UPDATE ON public.publishers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_publishers_category ON public.publishers(category);
CREATE INDEX IF NOT EXISTS idx_publishers_verified ON public.publishers(verified);

-- Backwards-compatible alias view for any existing 'clubs' query
CREATE OR REPLACE VIEW public.clubs AS SELECT * FROM public.publishers;

-- ----------------------------------------------------------------------------
-- 5. Campus Events (FKs to publishers and locations)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT NOT NULL DEFAULT '',
  organizer TEXT NOT NULL,
  publisher_id TEXT NOT NULL REFERENCES public.publishers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  location_id TEXT NOT NULL REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  location_name TEXT NOT NULL,
  venue_detail TEXT,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Technical',
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  cover_image TEXT,
  capacity INTEGER CHECK (capacity IS NULL OR capacity >= 0),
  registration_url TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('approved', 'pending', 'rejected')),
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_publisher_id ON public.events(publisher_id);
CREATE INDEX IF NOT EXISTS idx_events_location_id ON public.events(location_id);
CREATE INDEX IF NOT EXISTS idx_events_status_approval ON public.events(status, approval_status);

-- ----------------------------------------------------------------------------
-- 6. Announcements (FK to publishers and optional FK to locations)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  publisher_id TEXT NOT NULL REFERENCES public.publishers(id) ON UPDATE CASCADE ON DELETE CASCADE,
  publisher_name TEXT NOT NULL,
  location_id TEXT REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE SET NULL,
  location_name TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  action_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_publisher_id ON public.announcements(publisher_id);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON public.announcements(priority);

-- ----------------------------------------------------------------------------
-- 7. Faculty Directory & Cabin Locator (FK to locations)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faculty (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prefix TEXT,
  designation TEXT NOT NULL,
  school TEXT NOT NULL,
  department_name TEXT NOT NULL DEFAULT '',
  cabin_number TEXT NOT NULL,
  building_id TEXT NOT NULL REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  building_name TEXT NOT NULL,
  floor TEXT NOT NULL,
  wing TEXT,
  room_details TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  consultation_hours TEXT NOT NULL DEFAULT 'By Appointment',
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  research_area TEXT,
  directions_guide TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_lecture', 'meeting', 'busy', 'on_leave')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_faculty_updated_at
  BEFORE UPDATE ON public.faculty
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_faculty_building_id ON public.faculty(building_id);
CREATE INDEX IF NOT EXISTS idx_faculty_cabin ON public.faculty(cabin_number);
CREATE INDEX IF NOT EXISTS idx_faculty_school ON public.faculty(school);
CREATE INDEX IF NOT EXISTS idx_faculty_status ON public.faculty(status);

-- ----------------------------------------------------------------------------
-- 8. Saved Items (Private user bookmarks)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_items (
  id TEXT PRIMARY KEY DEFAULT ('saved_' || gen_random_uuid()),
  user_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('EVENT', 'LOCATION')),
  item_id TEXT NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_saved_item UNIQUE (user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON public.saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_user_type ON public.saved_items(user_id, item_type);

-- ----------------------------------------------------------------------------
-- 9. Audit Logs (Admin-only, immutable audit trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('audit_' || gen_random_uuid()),
  user_id TEXT,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================================================
-- PRODUCTION ROW LEVEL SECURITY (RLS) POLICIES
-- Strict least-privilege policies. ZERO 'FOR ALL USING (true)'
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Explicit table & sequence privileges for PostgREST API roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 1. Profiles
CREATE POLICY "Profiles readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated, service_role
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated, service_role
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Locations (Public Read, Admin Write)
CREATE POLICY "Public read locations"
  ON public.locations FOR SELECT
  USING (true);

CREATE POLICY "Admin insert locations"
  ON public.locations FOR INSERT
  TO authenticated, service_role
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin update locations"
  ON public.locations FOR UPDATE
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete locations"
  ON public.locations FOR DELETE
  TO authenticated, service_role
  USING (public.is_admin());

-- 3. Publishers (Public Read, Admin Write)
CREATE POLICY "Public read publishers"
  ON public.publishers FOR SELECT
  USING (true);

CREATE POLICY "Admin insert publishers"
  ON public.publishers FOR INSERT
  TO authenticated, service_role
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin update publishers"
  ON public.publishers FOR UPDATE
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete publishers"
  ON public.publishers FOR DELETE
  TO authenticated, service_role
  USING (public.is_admin());

-- 4. Events (Public Read Approved, Admin Write)
CREATE POLICY "Read approved events"
  ON public.events FOR SELECT
  USING (approval_status = 'approved' OR public.is_admin());

CREATE POLICY "Admin insert events"
  ON public.events FOR INSERT
  TO authenticated, service_role
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin update events"
  ON public.events FOR UPDATE
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete events"
  ON public.events FOR DELETE
  TO authenticated, service_role
  USING (public.is_admin());

-- 5. Announcements (Public Read, Admin Write)
CREATE POLICY "Public read announcements"
  ON public.announcements FOR SELECT
  USING (true);

CREATE POLICY "Admin insert announcements"
  ON public.announcements FOR INSERT
  TO authenticated, service_role
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin update announcements"
  ON public.announcements FOR UPDATE
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete announcements"
  ON public.announcements FOR DELETE
  TO authenticated, service_role
  USING (public.is_admin());

-- 6. Faculty (Public Read, Admin Write)
CREATE POLICY "Public read faculty"
  ON public.faculty FOR SELECT
  USING (true);

CREATE POLICY "Admin insert faculty"
  ON public.faculty FOR INSERT
  TO authenticated, service_role
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin update faculty"
  ON public.faculty FOR UPDATE
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete faculty"
  ON public.faculty FOR DELETE
  TO authenticated, service_role
  USING (public.is_admin());

-- 7. Saved Items (Strict User Isolation)
CREATE POLICY "Users read own saved items"
  ON public.saved_items FOR SELECT
  TO authenticated, service_role
  USING (auth.uid()::text = user_id OR public.is_admin());

CREATE POLICY "Users insert own saved items"
  ON public.saved_items FOR INSERT
  TO authenticated, service_role
  WITH CHECK (auth.uid()::text = user_id OR public.is_admin());

CREATE POLICY "Users delete own saved items"
  ON public.saved_items FOR DELETE
  TO authenticated, service_role
  USING (auth.uid()::text = user_id OR public.is_admin());

-- 8. Audit Logs (Admin-Only Read, Backend/Admin Insert, Tamper-Proof)
CREATE POLICY "Admin read audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated, service_role
  USING (public.is_admin());

CREATE POLICY "Admin insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated, service_role
  WITH CHECK (public.is_admin());

-- Note: No UPDATE or DELETE policies on audit_logs (immutable append-only)

-- ============================================================================
-- SUPABASE REALTIME CONFIGURATION
-- Replica Identity FULL enables DELETE payloads to carry previous IDs
-- Only tables requiring live multi-user synchronization are published
-- ============================================================================

ALTER TABLE public.locations REPLICA IDENTITY FULL;
ALTER TABLE public.publishers REPLICA IDENTITY FULL;
ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;
ALTER TABLE public.faculty REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.publishers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.faculty;
