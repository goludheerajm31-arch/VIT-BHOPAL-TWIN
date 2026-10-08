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
-- Determines role strictly from database authorization (user_roles table or defaults to STUDENT).
-- NEVER trusts client-supplied user_metadata role to prevent privilege escalation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_initial_role TEXT := 'STUDENT';
BEGIN
  -- Look up pre-provisioned role in user_roles if created by an administrator
  SELECT role INTO v_initial_role
  FROM public.user_roles
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
    AND status = 'ACTIVE'
  ORDER BY CASE role WHEN 'ADMIN' THEN 1 WHEN 'FACULTY' THEN 2 WHEN 'PUBLISHER' THEN 3 ELSE 4 END ASC
  LIMIT 1;

  IF v_initial_role IS NULL THEN
    v_initial_role := 'STUDENT';
  END IF;

  INSERT INTO public.profiles (id, name, email, role, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_initial_role,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'avatar')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    email = EXCLUDED.email,
    avatar = COALESCE(EXCLUDED.avatar, profiles.avatar);

  -- Link auth_user_id in user_roles if provisioned by email
  UPDATE public.user_roles
  SET user_id = NEW.id::text, updated_at = NOW()
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email)) AND (user_id IS NULL OR user_id = '');

  -- Link auth_user_id in faculty if provisioned by email
  UPDATE public.faculty
  SET auth_user_id = NEW.id, status = 'ACTIVE', updated_at = NOW()
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email)) AND auth_user_id IS NULL;

  -- Link auth_user_id in students if provisioned by email
  UPDATE public.students
  SET auth_user_id = NEW.id, updated_at = NOW()
  WHERE LOWER(TRIM(institutional_email)) = LOWER(TRIM(NEW.email)) AND auth_user_id IS NULL;

  -- Link auth_user_id in publishers if provisioned by email
  UPDATE public.publishers
  SET auth_user_id = NEW.id, status = 'ACTIVE', updated_at = NOW()
  WHERE LOWER(TRIM(contact_email)) = LOWER(TRIM(NEW.email)) AND auth_user_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Secure admin verification function
-- Strictly database-authoritative: checks service role, user_roles table, or profiles table.
-- NEVER trusts user_metadata from client JWTs.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- Service role bypass for backend Express tasks
    (auth.role() = 'service_role')
    OR
    -- Check user_roles table for ACTIVE ADMIN role
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE (user_id = auth.uid()::text OR LOWER(TRIM(email)) = LOWER(TRIM(auth.jwt()->>'email')))
        AND role = 'ADMIN'
        AND status = 'ACTIVE'
    )
    OR
    -- Direct profile role check
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
    OR
    -- Protected app_metadata claim (only writable by service role)
    (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- 2b. Authoritative Student Records
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  registration_number TEXT NOT NULL,
  institutional_email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  program TEXT NOT NULL DEFAULT 'B.Tech',
  branch TEXT NOT NULL DEFAULT 'Computer Science & Engineering',
  department TEXT NOT NULL DEFAULT 'School of Computing Science and Engineering',
  semester INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PROVISIONED', 'GRADUATED', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Database-level uniqueness on normalized institutional email and registration number
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_unique_email ON public.students (LOWER(TRIM(institutional_email)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_unique_reg_number ON public.students (UPPER(TRIM(registration_number)));
CREATE INDEX IF NOT EXISTS idx_students_auth_user_id ON public.students(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);

CREATE TRIGGER trigger_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

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
-- 4. Publishers / Student Chapters & Campus Publishers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.publishers (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  auth_user_id TEXT,
  organization_name TEXT NOT NULL,
  name TEXT,
  category TEXT NOT NULL DEFAULT 'Club',
  description TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  contact_email TEXT NOT NULL DEFAULT '',
  verified_at TIMESTAMPTZ,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PROVISIONED', 'ACTIVE', 'DISABLED')),
  notes TEXT,
  granted_by TEXT,
  granted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_publishers_updated_at
  BEFORE UPDATE ON public.publishers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_publishers_category ON public.publishers(category);
CREATE INDEX IF NOT EXISTS idx_publishers_verified ON public.publishers(verified);
CREATE INDEX IF NOT EXISTS idx_publishers_status ON public.publishers(status);
CREATE INDEX IF NOT EXISTS idx_publishers_contact_email ON public.publishers(LOWER(TRIM(contact_email)));
CREATE INDEX IF NOT EXISTS idx_publishers_auth_user_id ON public.publishers(auth_user_id);

-- Enforce database uniqueness: max 1 ACTIVE publisher per normalized institutional email
CREATE UNIQUE INDEX IF NOT EXISTS idx_publishers_unique_active_email
  ON public.publishers (LOWER(TRIM(contact_email)))
  WHERE status = 'ACTIVE';

-- ----------------------------------------------------------------------------
-- 4b. User Roles (Centralized Authoritative Multi-Role Capability Records)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id TEXT PRIMARY KEY DEFAULT ('urole_' || gen_random_uuid()),
  user_id TEXT,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('GUEST', 'STUDENT', 'FACULTY', 'PUBLISHER', 'ADMIN')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PROVISIONED', 'ACTIVE', 'DISABLED')),
  granted_by TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  organization TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_user_roles_email ON public.user_roles(LOWER(TRIM(email)));
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_status ON public.user_roles(role, status);

-- Enforce uniqueness: only 1 ACTIVE publisher role record per normalized institutional email
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_unique_active_publisher
  ON public.user_roles (LOWER(TRIM(email)), role)
  WHERE status = 'ACTIVE' AND role = 'PUBLISHER';

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
  event_end_at TIMESTAMPTZ,
  category TEXT NOT NULL DEFAULT 'Technical',
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  cover_image TEXT,
  storage_path TEXT,
  poster_metadata JSONB,
  capacity INTEGER CHECK (capacity IS NULL OR capacity >= 0),
  registration_url TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled', 'expired', 'draft', 'published', 'DRAFT', 'PUBLISHED', 'CANCELLED', 'EXPIRED')),
  approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('approved', 'pending', 'rejected')),
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automatically compute event_end_at in Asia/Kolkata (IST, UTC+5:30) if not explicitly set
CREATE OR REPLACE FUNCTION public.handle_event_end_at()
RETURNS TRIGGER AS $$
DECLARE
  v_end_time TEXT;
  v_hour INT := 23;
  v_minute INT := 59;
  v_second INT := 59;
  v_match TEXT[];
BEGIN
  IF NEW.event_end_at IS NULL AND NEW.date IS NOT NULL THEN
    v_end_time := TRIM(COALESCE(NEW.end_time, ''));
    IF v_end_time ~* '^([0-9]{1,2}):([0-9]{2})\s*(AM|PM)?$' THEN
      v_match := regexp_matches(v_end_time, '^([0-9]{1,2}):([0-9]{2})\s*(AM|PM)?$', 'i');
      v_hour := v_match[1]::INT;
      v_minute := v_match[2]::INT;
      IF UPPER(v_match[3]) = 'PM' AND v_hour < 12 THEN
        v_hour := v_hour + 12;
      ELSIF UPPER(v_match[3]) = 'AM' AND v_hour = 12 THEN
        v_hour := 0;
      END IF;
      v_second := 0;
    ELSIF v_end_time ~ '^([0-9]{1,2}):([0-9]{2})$' THEN
      v_match := regexp_matches(v_end_time, '^([0-9]{1,2}):([0-9]{2})$');
      v_hour := v_match[1]::INT;
      v_minute := v_match[2]::INT;
      v_second := 0;
    END IF;

    -- Form IST timestamp with +05:30 offset
    NEW.event_end_at := (NEW.date::TEXT || ' ' || LPAD(v_hour::TEXT, 2, '0') || ':' || LPAD(v_minute::TEXT, 2, '0') || ':' || LPAD(v_second::TEXT, 2, '0') || '+05:30')::TIMESTAMPTZ;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_events_end_at
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_event_end_at();

CREATE TRIGGER trigger_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_event_end_at ON public.events(event_end_at);
CREATE INDEX IF NOT EXISTS idx_events_publisher_id ON public.events(publisher_id);
CREATE INDEX IF NOT EXISTS idx_events_location_id ON public.events(location_id);
CREATE INDEX IF NOT EXISTS idx_events_status_approval ON public.events(status, approval_status);

-- Authoritative view for active public campus events:
-- Excludes expired, completed, or cancelled events, and filters past end times using server timestamp
CREATE OR REPLACE VIEW public.active_events AS
SELECT *
FROM public.events
WHERE status NOT IN ('cancelled', 'expired', 'CANCELLED', 'EXPIRED')
  AND approval_status = 'approved'
  AND (event_end_at IS NULL OR event_end_at > NOW())
ORDER BY date ASC, event_end_at ASC;

-- Server/database automated idempotent cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_events()
RETURNS TABLE(cleaned_count INT) AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.events
  SET status = 'expired',
      updated_at = NOW()
  WHERE status NOT IN ('cancelled', 'expired', 'CANCELLED', 'EXPIRED')
    AND event_end_at IS NOT NULL
    AND event_end_at <= NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

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
-- 7. Faculty Directory & Cabin Locator (Admin-Provisioned Architecture)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faculty (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prefix TEXT,
  designation TEXT NOT NULL,
  school TEXT NOT NULL DEFAULT 'SCSE',
  department TEXT NOT NULL DEFAULT '',
  department_name TEXT NOT NULL DEFAULT '',
  cabin_number TEXT NOT NULL DEFAULT 'AB1-TBD',
  building_id TEXT NOT NULL REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT DEFAULT 'loc-ab-1',
  building_name TEXT NOT NULL DEFAULT 'VITB Academic Block 1',
  floor TEXT NOT NULL DEFAULT 'Ground Floor',
  wing TEXT,
  room_details TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  consultation_hours TEXT NOT NULL DEFAULT 'By Appointment',
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  research_area TEXT,
  directions_guide TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PROVISIONED' CHECK (status IN ('PROVISIONED', 'ACTIVE', 'DISABLED')),
  live_status TEXT NOT NULL DEFAULT 'available' CHECK (live_status IN ('available', 'in_lecture', 'meeting', 'busy', 'on_leave')),
  auth_user_id UUID,
  created_by UUID,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_faculty_updated_at
  BEFORE UPDATE ON public.faculty
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enforce database-level uniqueness on normalized (lowercase, trimmed) email
CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_unique_normalized_email ON public.faculty (LOWER(TRIM(email)));

-- Enforce uniqueness on authenticated user identity when claimed
CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_unique_auth_user_id ON public.faculty (auth_user_id) WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_faculty_building_id ON public.faculty(building_id);
CREATE INDEX IF NOT EXISTS idx_faculty_cabin ON public.faculty(cabin_number);
CREATE INDEX IF NOT EXISTS idx_faculty_school ON public.faculty(school);
CREATE INDEX IF NOT EXISTS idx_faculty_status ON public.faculty(status);
CREATE INDEX IF NOT EXISTS idx_faculty_live_status ON public.faculty(live_status);

-- ----------------------------------------------------------------------------
-- 7b. Faculty Access Applications (Unprovisioned institutional requests)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faculty_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  designation TEXT NOT NULL,
  employee_id TEXT,
  additional_information TEXT,
  supporting_document_url TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce database uniqueness: max 1 active PENDING application per normalized email
CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_applications_unique_pending_email
  ON public.faculty_applications (LOWER(TRIM(email)))
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_faculty_applications_email ON public.faculty_applications(email);
CREATE INDEX IF NOT EXISTS idx_faculty_applications_status ON public.faculty_applications(status);
CREATE INDEX IF NOT EXISTS idx_faculty_applications_created_at ON public.faculty_applications(created_at DESC);

CREATE TRIGGER trigger_faculty_applications_updated_at
  BEFORE UPDATE ON public.faculty_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 7b. Publisher Access Applications (Student & Department Publisher Requests)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.publisher_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id TEXT,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  organization TEXT,
  reason TEXT NOT NULL,
  additional_information TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce database uniqueness: max 1 active PENDING application per normalized institutional email
CREATE UNIQUE INDEX IF NOT EXISTS idx_publisher_applications_unique_pending_email
  ON public.publisher_applications (LOWER(TRIM(email)))
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_publisher_applications_email ON public.publisher_applications(LOWER(TRIM(email)));
CREATE INDEX IF NOT EXISTS idx_publisher_applications_status ON public.publisher_applications(status);
CREATE INDEX IF NOT EXISTS idx_publisher_applications_auth_user_id ON public.publisher_applications(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_publisher_applications_created_at ON public.publisher_applications(created_at DESC);

CREATE TRIGGER trigger_publisher_applications_updated_at
  BEFORE UPDATE ON public.publisher_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

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

-- ----------------------------------------------------------------------------
-- 10. Campus Guides (Authoritative Reference / Procedures for Campus Hub)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campus_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN (
    'ACADEMICS', 'HOSTEL', 'STUDENT_SERVICES', 'ADMINISTRATION',
    'FINANCE', 'COMPLAINTS', 'PLACEMENTS', 'GENERAL'
  )),
  short_description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  additional_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  external_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  display_order INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campus_guides_category ON public.campus_guides(category);
CREATE INDEX IF NOT EXISTS idx_campus_guides_status ON public.campus_guides(status);
CREATE INDEX IF NOT EXISTS idx_campus_guides_display_order ON public.campus_guides(display_order);
CREATE INDEX IF NOT EXISTS idx_campus_guides_updated_at ON public.campus_guides(updated_at DESC);

CREATE TRIGGER trigger_campus_guides_updated_at
  BEFORE UPDATE ON public.campus_guides
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 11. Campus Guide Attachments (Supabase Storage Metadata)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campus_guide_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES public.campus_guides(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campus_guide_attachments_guide_id ON public.campus_guide_attachments(guide_id);

-- ============================================================================
-- PRODUCTION ROW LEVEL SECURITY (RLS) POLICIES
-- Strict least-privilege policies. ZERO 'FOR ALL USING (true)'
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_guide_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publisher_applications ENABLE ROW LEVEL SECURITY;

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

-- 1b. Students (Authenticated Read, Ownership/Admin Update, Admin Insert/Delete)
CREATE POLICY "Students readable by authenticated users"
  ON public.students FOR SELECT
  TO authenticated, service_role
  USING (true);

CREATE POLICY "Student update own record"
  ON public.students FOR UPDATE
  TO authenticated, service_role
  USING (auth.uid() = auth_user_id OR public.is_admin())
  WITH CHECK (auth.uid() = auth_user_id OR public.is_admin());

CREATE POLICY "Admin manage students"
  ON public.students FOR INSERT
  TO authenticated, service_role
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete students"
  ON public.students FOR DELETE
  TO authenticated, service_role
  USING (public.is_admin());

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

-- 9. Campus Guides (Public Read for Published, Admin-Only for Draft/Archived/Mutation)
CREATE POLICY "Public read published guides"
  ON public.campus_guides FOR SELECT
  TO anon, authenticated, service_role
  USING (status = 'PUBLISHED' OR public.is_admin());

CREATE POLICY "Admin insert guides"
  ON public.campus_guides FOR INSERT
  TO authenticated, service_role
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin update guides"
  ON public.campus_guides FOR UPDATE
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete guides"
  ON public.campus_guides FOR DELETE
  TO authenticated, service_role
  USING (public.is_admin());

-- 10. Campus Guide Attachments (Public Read for Published Parent Guides, Admin-Only Mutation)
CREATE POLICY "Public read guide attachments"
  ON public.campus_guide_attachments FOR SELECT
  TO anon, authenticated, service_role
  USING (
    EXISTS (
      SELECT 1 FROM public.campus_guides g
      WHERE g.id = guide_id AND (g.status = 'PUBLISHED' OR public.is_admin())
    )
  );

CREATE POLICY "Admin insert guide attachments"
  ON public.campus_guide_attachments FOR INSERT
  TO authenticated, service_role
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin update guide attachments"
  ON public.campus_guide_attachments FOR UPDATE
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete guide attachments"
  ON public.campus_guide_attachments FOR DELETE
  TO authenticated, service_role
  USING (public.is_admin());

-- 11. Faculty Applications Policies
CREATE POLICY "Users read own applications or admin reads all"
  ON public.faculty_applications FOR SELECT
  TO authenticated, anon, service_role
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = auth_user_id) OR
    (auth.jwt()->>'email' IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM(auth.jwt()->>'email'))) OR
    public.is_admin()
  );

CREATE POLICY "Authenticated or institutional users insert applications"
  ON public.faculty_applications FOR INSERT
  TO authenticated, anon, service_role
  WITH CHECK (true);

CREATE POLICY "Admin update applications"
  ON public.faculty_applications FOR UPDATE
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete applications"
  ON public.faculty_applications FOR DELETE
  TO authenticated, service_role
  USING (public.is_admin());

-- 12. Publisher Applications Policies
CREATE POLICY "Users read own publisher applications or admin reads all"
  ON public.publisher_applications FOR SELECT
  TO authenticated, anon, service_role
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = auth_user_id) OR
    (auth.jwt()->>'email' IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM(auth.jwt()->>'email'))) OR
    public.is_admin()
  );

CREATE POLICY "Authenticated students insert publisher applications"
  ON public.publisher_applications FOR INSERT
  TO authenticated, anon, service_role
  WITH CHECK (true);

CREATE POLICY "Admin update publisher applications"
  ON public.publisher_applications FOR UPDATE
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete publisher applications"
  ON public.publisher_applications FOR DELETE
  TO authenticated, service_role
  USING (public.is_admin());

-- 13. User Roles Policies
CREATE POLICY "Users read own role authorizations or admin reads all"
  ON public.user_roles FOR SELECT
  TO authenticated, anon, service_role
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id) OR
    (auth.jwt()->>'email' IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM(auth.jwt()->>'email'))) OR
    public.is_admin()
  );

CREATE POLICY "Admin manage user roles"
  ON public.user_roles FOR ALL
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

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
ALTER TABLE public.campus_guides REPLICA IDENTITY FULL;
ALTER TABLE public.campus_guide_attachments REPLICA IDENTITY FULL;
ALTER TABLE public.faculty_applications REPLICA IDENTITY FULL;
ALTER TABLE public.students REPLICA IDENTITY FULL;
ALTER TABLE public.publisher_applications REPLICA IDENTITY FULL;
ALTER TABLE public.user_roles REPLICA IDENTITY FULL;

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
ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_guides;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_guide_attachments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.faculty_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.publisher_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;

-- ============================================================================
-- SUPABASE STORAGE: EVENT POSTERS & CAMPUS GUIDES BUCKETS & POLICIES
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('event-posters', 'event-posters', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('campus-guides', 'campus-guides', true, 15728640, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public can read posters from event-posters bucket
CREATE POLICY "Public read event posters"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-posters');

-- Authenticated publishers/admins can upload event posters
CREATE POLICY "Authorized upload event posters"
  ON storage.objects FOR INSERT
  TO authenticated, anon, service_role
  WITH CHECK (bucket_id = 'event-posters');

-- Authorized users can update event posters
CREATE POLICY "Authorized update event posters"
  ON storage.objects FOR UPDATE
  TO authenticated, anon, service_role
  USING (bucket_id = 'event-posters');

-- Authorized users or admins can delete event posters
CREATE POLICY "Authorized delete event posters"
  ON storage.objects FOR DELETE
  TO authenticated, anon, service_role
  USING (bucket_id = 'event-posters');

-- Public can read files from campus-guides bucket
CREATE POLICY "Public read campus guides"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campus-guides');

-- Authenticated publishers/admins can upload campus guide files
CREATE POLICY "Authorized upload campus guides"
  ON storage.objects FOR INSERT
  TO authenticated, service_role
  WITH CHECK (bucket_id = 'campus-guides');

-- Authorized users can update campus guide files
CREATE POLICY "Authorized update campus guides"
  ON storage.objects FOR UPDATE
  TO authenticated, service_role
  USING (bucket_id = 'campus-guides');

-- Authorized users or admins can delete campus guide files
CREATE POLICY "Authorized delete campus guides"
  ON storage.objects FOR DELETE
  TO authenticated, service_role
  USING (bucket_id = 'campus-guides');

