-- ============================================================================
-- VIT Bhopal Digital Campus Twin: Production PostgreSQL Schema (Supabase)
-- Authoritative Canonical Schema, Database-Controlled RBAC, & Hardened RLS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extensions & Schema Grants
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. Timestamp Trigger Function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ----------------------------------------------------------------------------
-- 3. Core RBAC Architecture: User Roles Table
-- ----------------------------------------------------------------------------
-- Authoritative database-controlled role assignments (STUDENT, FACULTY, PUBLISHER, ADMIN, GUEST).
-- Authorization decisions query this table; client user_metadata is NEVER trusted.
CREATE TABLE IF NOT EXISTS public.user_roles (
  id TEXT PRIMARY KEY DEFAULT ('urole_' || gen_random_uuid()),
  user_id TEXT, -- Supabase auth.users UUID string when linked
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

-- Unique index: only 1 ACTIVE entry per email & role
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_unique_active_email_role
  ON public.user_roles (LOWER(TRIM(email)), role)
  WHERE status = 'ACTIVE';

-- ----------------------------------------------------------------------------
-- 4. User Profiles Table
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

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(LOWER(TRIM(email)));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ----------------------------------------------------------------------------
-- 5. Security Helper Functions (SECURITY DEFINER with Safe search_path)
-- ----------------------------------------------------------------------------

-- Check if current execution context has active ADMIN authorization
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- Service role bypass for backend server/migration tasks
    (auth.role() = 'service_role')
    OR
    -- Database-authoritative check on user_roles table
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE (ur.user_id = auth.uid()::text OR LOWER(TRIM(ur.email)) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', ''))))
        AND ur.role = 'ADMIN'
        AND ur.status = 'ACTIVE'
    )
    OR
    -- Protected app_metadata claim (only writable by service role)
    (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- Check if current user has an active granted role
CREATE OR REPLACE FUNCTION public.has_role(check_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE (ur.user_id = auth.uid()::text OR LOWER(TRIM(ur.email)) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', ''))))
      AND ur.role = UPPER(TRIM(check_role))
      AND ur.status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.has_role(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated, service_role;

-- Check if current user is an authorized faculty member
CREATE OR REPLACE FUNCTION public.is_faculty()
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN (
    public.has_role('FACULTY')
    OR
    EXISTS (
      SELECT 1 FROM public.faculty f
      WHERE f.auth_user_id = auth.uid()
        AND f.status = 'ACTIVE'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.is_faculty() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_faculty() TO authenticated, service_role;

-- Check if current user is an authorized publisher
CREATE OR REPLACE FUNCTION public.is_publisher(target_pub_id TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;

  IF target_pub_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.publishers p
      WHERE p.id = target_pub_id
        AND (p.auth_user_id = auth.uid()::text OR p.user_id = auth.uid()::text)
        AND p.status = 'ACTIVE'
    );
  END IF;

  RETURN (
    public.has_role('PUBLISHER')
    OR
    EXISTS (
      SELECT 1 FROM public.publishers p
      WHERE (p.auth_user_id = auth.uid()::text OR p.user_id = auth.uid()::text)
        AND p.status = 'ACTIVE'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.is_publisher(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_publisher(TEXT) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6. Privilege Escalation Prevention Trigger
-- ----------------------------------------------------------------------------
-- Strict database-level boundary: ordinary users CANNOT alter their own role in profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Privilege escalation rejected: ordinary authenticated users cannot modify their own role.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trigger_prevent_profile_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- ----------------------------------------------------------------------------
-- 7. Auth User Provisioning Trigger (auth.users -> profiles + user_roles link)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_initial_role TEXT := 'STUDENT';
BEGIN
  -- Authoritative role assignment: check user_roles table, default to STUDENT
  -- NEVER trusts client user_metadata to assign elevated privileges
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

  -- Link auth_user_id in user_roles
  UPDATE public.user_roles
  SET user_id = NEW.id::text, updated_at = NOW()
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email)) AND (user_id IS NULL OR user_id = '');

  -- Link auth_user_id in faculty
  UPDATE public.faculty
  SET auth_user_id = NEW.id, status = 'ACTIVE', updated_at = NOW()
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email)) AND auth_user_id IS NULL;

  -- Link auth_user_id in students
  UPDATE public.students
  SET auth_user_id = NEW.id, updated_at = NOW()
  WHERE LOWER(TRIM(institutional_email)) = LOWER(TRIM(NEW.email)) AND auth_user_id IS NULL;

  -- Link auth_user_id in publishers
  UPDATE public.publishers
  SET auth_user_id = NEW.id::text, status = 'ACTIVE', updated_at = NOW()
  WHERE LOWER(TRIM(contact_email)) = LOWER(TRIM(NEW.email)) AND (auth_user_id IS NULL OR auth_user_id = '');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 8. Authoritative Student Records
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

CREATE TRIGGER trigger_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_unique_email ON public.students (LOWER(TRIM(institutional_email)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_unique_reg_number ON public.students (UPPER(TRIM(registration_number)));
CREATE INDEX IF NOT EXISTS idx_students_auth_user_id ON public.students(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);

-- ----------------------------------------------------------------------------
-- 9. Campus Locations & Buildings
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
-- 10. Publishers & Student Clubs
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_publishers_unique_active_email
  ON public.publishers (LOWER(TRIM(contact_email)))
  WHERE status = 'ACTIVE';

CREATE OR REPLACE VIEW public.clubs AS SELECT * FROM public.publishers;

-- ----------------------------------------------------------------------------
-- 11. Campus Events
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
$$ LANGUAGE plpgsql SET search_path = public;

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

CREATE OR REPLACE VIEW public.active_events AS
SELECT *
FROM public.events
WHERE status NOT IN ('cancelled', 'expired', 'CANCELLED', 'EXPIRED')
  AND approval_status = 'approved'
  AND (event_end_at IS NULL OR event_end_at > NOW())
ORDER BY date ASC, event_end_at ASC;

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
$$ LANGUAGE plpgsql SET search_path = public;

-- ----------------------------------------------------------------------------
-- 12. Campus Announcements
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
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'PENDING', 'APPROVED', 'REJECTED', 'DRAFT', 'PUBLISHED', 'CHANGES_REQUESTED')),
  author_role TEXT,
  author_id TEXT,
  author_email TEXT,
  author_reg_number TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_publisher_id ON public.announcements(publisher_id);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON public.announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON public.announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_author_id ON public.announcements(author_id);

-- ----------------------------------------------------------------------------
-- 13. Faculty Directory
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
  status TEXT NOT NULL DEFAULT 'PROVISIONED' CHECK (status IN ('PROVISIONED', 'ACTIVE', 'DISABLED', 'available', 'in_lecture', 'meeting', 'busy', 'on_leave')),
  live_status TEXT NOT NULL DEFAULT 'available' CHECK (live_status IN ('available', 'in_lecture', 'meeting', 'busy', 'on_leave')),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_faculty_updated_at
  BEFORE UPDATE ON public.faculty
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_unique_normalized_email ON public.faculty (LOWER(TRIM(email)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_unique_auth_user_id ON public.faculty (auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_faculty_building_id ON public.faculty(building_id);
CREATE INDEX IF NOT EXISTS idx_faculty_cabin ON public.faculty(cabin_number);
CREATE INDEX IF NOT EXISTS idx_faculty_school ON public.faculty(school);
CREATE INDEX IF NOT EXISTS idx_faculty_status ON public.faculty(status);
CREATE INDEX IF NOT EXISTS idx_faculty_live_status ON public.faculty(live_status);

-- ----------------------------------------------------------------------------
-- 14. Faculty Access Applications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faculty_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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

CREATE TRIGGER trigger_faculty_applications_updated_at
  BEFORE UPDATE ON public.faculty_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_applications_unique_pending_email
  ON public.faculty_applications (LOWER(TRIM(email)))
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_faculty_applications_email ON public.faculty_applications(LOWER(TRIM(email)));
CREATE INDEX IF NOT EXISTS idx_faculty_applications_status ON public.faculty_applications(status);
CREATE INDEX IF NOT EXISTS idx_faculty_applications_created_at ON public.faculty_applications(created_at DESC);

-- ----------------------------------------------------------------------------
-- 15. Publisher Access Applications
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

CREATE TRIGGER trigger_publisher_applications_updated_at
  BEFORE UPDATE ON public.publisher_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS idx_publisher_applications_unique_pending_email
  ON public.publisher_applications (LOWER(TRIM(email)))
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_publisher_applications_email ON public.publisher_applications(LOWER(TRIM(email)));
CREATE INDEX IF NOT EXISTS idx_publisher_applications_status ON public.publisher_applications(status);
CREATE INDEX IF NOT EXISTS idx_publisher_applications_auth_user_id ON public.publisher_applications(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_publisher_applications_created_at ON public.publisher_applications(created_at DESC);

-- ----------------------------------------------------------------------------
-- 16. Saved Items (Bookmarks)
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
-- 17. Immutable Audit Logs
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
-- 18. Campus Hub Guides
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

CREATE TRIGGER trigger_campus_guides_updated_at
  BEFORE UPDATE ON public.campus_guides
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_campus_guides_category ON public.campus_guides(category);
CREATE INDEX IF NOT EXISTS idx_campus_guides_status ON public.campus_guides(status);
CREATE INDEX IF NOT EXISTS idx_campus_guides_display_order ON public.campus_guides(display_order);

-- ----------------------------------------------------------------------------
-- 19. Campus Guide Attachments
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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict least-privilege policies. ZERO blanket 'FOR ALL USING (true)'
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publisher_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_guide_attachments ENABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- RLS: 1. Profiles
-- ----------------------------------------------------------------------------
CREATE POLICY "Profiles readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated, service_role
  USING (true);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated, service_role
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- RLS: 2. User Roles
-- ----------------------------------------------------------------------------
CREATE POLICY "Users read own role authorizations or admin reads all"
  ON public.user_roles FOR SELECT
  TO authenticated, anon, service_role
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id) OR
    (auth.jwt()->>'email' IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM(auth.jwt()->>'email'))) OR
    public.is_admin()
  );

CREATE POLICY "Admin insert user roles"
  ON public.user_roles FOR INSERT
  TO authenticated, service_role
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin update user roles"
  ON public.user_roles FOR UPDATE
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete user roles"
  ON public.user_roles FOR DELETE
  TO authenticated, service_role
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- RLS: 3. Students
-- ----------------------------------------------------------------------------
CREATE POLICY "Students readable by authenticated users"
  ON public.students FOR SELECT
  TO authenticated, service_role
  USING (true);

CREATE POLICY "Student update own record"
  ON public.students FOR UPDATE
  TO authenticated, service_role
  USING (auth.uid() = auth_user_id OR public.is_admin())
  WITH CHECK (auth.uid() = auth_user_id OR public.is_admin());

CREATE POLICY "Admin insert students"
  ON public.students FOR INSERT
  TO authenticated, service_role
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete students"
  ON public.students FOR DELETE
  TO authenticated, service_role
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- RLS: 4. Locations
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- RLS: 5. Publishers
-- ----------------------------------------------------------------------------
CREATE POLICY "Public read publishers"
  ON public.publishers FOR SELECT
  USING (true);

CREATE POLICY "Admin insert publishers"
  ON public.publishers FOR INSERT
  TO authenticated, service_role
  WITH CHECK (public.is_admin());

CREATE POLICY "Publisher owner or admin update publishers"
  ON public.publishers FOR UPDATE
  TO authenticated, service_role
  USING (public.is_admin() OR auth.uid()::text = user_id OR auth.uid()::text = auth_user_id)
  WITH CHECK (public.is_admin() OR auth.uid()::text = user_id OR auth.uid()::text = auth_user_id);

CREATE POLICY "Admin delete publishers"
  ON public.publishers FOR DELETE
  TO authenticated, service_role
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- RLS: 6. Events
-- ----------------------------------------------------------------------------
CREATE POLICY "Read approved events or owned"
  ON public.events FOR SELECT
  USING (
    approval_status = 'approved'
    OR public.is_admin()
    OR public.is_publisher(publisher_id)
  );

CREATE POLICY "Authorized publisher or admin insert events"
  ON public.events FOR INSERT
  TO authenticated, service_role
  WITH CHECK (public.is_admin() OR public.is_publisher(publisher_id));

CREATE POLICY "Authorized publisher or admin update events"
  ON public.events FOR UPDATE
  TO authenticated, service_role
  USING (public.is_admin() OR public.is_publisher(publisher_id))
  WITH CHECK (public.is_admin() OR public.is_publisher(publisher_id));

CREATE POLICY "Admin delete events"
  ON public.events FOR DELETE
  TO authenticated, service_role
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- RLS: 7. Announcements
-- ----------------------------------------------------------------------------
CREATE POLICY "Read announcements"
  ON public.announcements FOR SELECT
  USING (
    verified = true
    OR status IN ('approved', 'PUBLISHED')
    OR public.is_admin()
    OR (auth.uid() IS NOT NULL AND auth.uid()::text = author_id)
  );

CREATE POLICY "Insert announcements"
  ON public.announcements FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    public.is_admin()
    OR public.is_publisher(publisher_id)
    OR (
      auth.uid() IS NOT NULL
      AND auth.uid()::text = author_id
      AND status IN ('pending', 'DRAFT', 'PENDING_REVIEW')
    )
  );

CREATE POLICY "Update announcements"
  ON public.announcements FOR UPDATE
  TO authenticated, service_role
  USING (
    public.is_admin()
    OR public.is_publisher(publisher_id)
    OR (
      auth.uid() IS NOT NULL
      AND auth.uid()::text = author_id
      AND status IN ('pending', 'DRAFT', 'CHANGES_REQUESTED')
    )
  )
  WITH CHECK (
    public.is_admin()
    OR public.is_publisher(publisher_id)
    OR (
      auth.uid() IS NOT NULL
      AND auth.uid()::text = author_id
      AND status IN ('pending', 'DRAFT', 'PENDING_REVIEW')
    )
  );

CREATE POLICY "Admin delete announcements"
  ON public.announcements FOR DELETE
  TO authenticated, service_role
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- RLS: 8. Faculty Directory
-- ----------------------------------------------------------------------------
CREATE POLICY "Public read faculty"
  ON public.faculty FOR SELECT
  USING (status <> 'DISABLED' OR public.is_admin());

CREATE POLICY "Admin insert faculty"
  ON public.faculty FOR INSERT
  TO authenticated, service_role
  WITH CHECK (public.is_admin());

CREATE POLICY "Faculty update own record or admin"
  ON public.faculty FOR UPDATE
  TO authenticated, service_role
  USING (auth.uid() = auth_user_id OR public.is_admin())
  WITH CHECK (auth.uid() = auth_user_id OR public.is_admin());

CREATE POLICY "Admin delete faculty"
  ON public.faculty FOR DELETE
  TO authenticated, service_role
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- RLS: 9. Faculty Applications
-- ----------------------------------------------------------------------------
CREATE POLICY "Read own faculty applications or admin"
  ON public.faculty_applications FOR SELECT
  TO authenticated, anon, service_role
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = auth_user_id) OR
    (auth.jwt()->>'email' IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM(auth.jwt()->>'email'))) OR
    public.is_admin()
  );

CREATE POLICY "Authenticated users submit faculty application"
  ON public.faculty_applications FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    auth.uid() = auth_user_id
    AND status = 'PENDING'
  );

CREATE POLICY "Admin update faculty applications"
  ON public.faculty_applications FOR UPDATE
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete faculty applications"
  ON public.faculty_applications FOR DELETE
  TO authenticated, service_role
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- RLS: 10. Publisher Applications
-- ----------------------------------------------------------------------------
CREATE POLICY "Read own publisher applications or admin"
  ON public.publisher_applications FOR SELECT
  TO authenticated, anon, service_role
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = auth_user_id) OR
    (auth.jwt()->>'email' IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM(auth.jwt()->>'email'))) OR
    public.is_admin()
  );

CREATE POLICY "Authenticated students submit publisher application"
  ON public.publisher_applications FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    auth.uid()::text = auth_user_id
    AND status = 'PENDING'
  );

CREATE POLICY "Admin update publisher applications"
  ON public.publisher_applications FOR UPDATE
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete publisher applications"
  ON public.publisher_applications FOR DELETE
  TO authenticated, service_role
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- RLS: 11. Saved Items (Strict User Isolation)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- RLS: 12. Audit Logs (Tamper-Proof, Append-Only)
-- ----------------------------------------------------------------------------
CREATE POLICY "Admin read audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated, service_role
  USING (public.is_admin());

CREATE POLICY "Log audit actions"
  ON public.audit_logs FOR INSERT
  TO authenticated, service_role
  WITH CHECK (public.is_admin() OR auth.uid()::text = user_id);

-- Note: No UPDATE or DELETE policies on audit_logs (strictly immutable)

-- ----------------------------------------------------------------------------
-- RLS: 13. Campus Guides
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- RLS: 14. Campus Guide Attachments
-- ----------------------------------------------------------------------------
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

-- ============================================================================
-- SUPABASE REALTIME CONFIGURATION
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
-- SUPABASE STORAGE BUCKETS & POLICIES
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('event-posters', 'event-posters', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('campus-guides', 'campus-guides', true, 15728640, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Public read event posters"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-posters');

CREATE POLICY "Authorized upload event posters"
  ON storage.objects FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    bucket_id = 'event-posters'
    AND (public.is_admin() OR public.has_role('PUBLISHER'))
  );

CREATE POLICY "Authorized update event posters"
  ON storage.objects FOR UPDATE
  TO authenticated, service_role
  USING (
    bucket_id = 'event-posters'
    AND (public.is_admin() OR public.has_role('PUBLISHER'))
  );

CREATE POLICY "Authorized delete event posters"
  ON storage.objects FOR DELETE
  TO authenticated, service_role
  USING (
    bucket_id = 'event-posters'
    AND (public.is_admin() OR public.has_role('PUBLISHER'))
  );

CREATE POLICY "Public read campus guide files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campus-guides');

CREATE POLICY "Admin upload campus guide files"
  ON storage.objects FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    bucket_id = 'campus-guides'
    AND public.is_admin()
  );

CREATE POLICY "Admin update campus guide files"
  ON storage.objects FOR UPDATE
  TO authenticated, service_role
  USING (
    bucket_id = 'campus-guides'
    AND public.is_admin()
  );

CREATE POLICY "Admin delete campus guide files"
  ON storage.objects FOR DELETE
  TO authenticated, service_role
  USING (
    bucket_id = 'campus-guides'
    AND public.is_admin()
  );
-- ============================================================================
-- VIT Bhopal Digital Campus Twin: Authoritative Production Seed Data
-- Strict Foreign Key Ordering: Locations & Publishers -> Events, Faculty, Announcements
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Initial Authoritative RBAC User Roles
-- ----------------------------------------------------------------------------
INSERT INTO public.user_roles (id, email, role, status, organization, notes)
VALUES
  ('urole-admin', 'admin@vitbhopal.ac.in', 'ADMIN', 'ACTIVE', 'Office of IT & Campus Governance', 'Permanent Master Administrator'),
  ('urole-fac-demo', 'faculty.demo@vitbhopal.ac.in', 'FACULTY', 'ACTIVE', 'School of Computing Science & Engineering', 'Demo Faculty Account'),
  ('urole-pub-demo', 'publisher.demo@vitbhopal.ac.in', 'PUBLISHER', 'ACTIVE', 'Authorized Student Organization', 'Demo Publisher Account'),
  ('urole-stu-demo', 'student.demo@vitbhopal.ac.in', 'STUDENT', 'ACTIVE', 'Student Body', 'Demo Student Account'),
  ('urole-ai-club', 'aiclub@vitbhopal.ac.in', 'PUBLISHER', 'ACTIVE', 'AI & ML Club', 'Student Chapter'),
  ('urole-e-cell', 'e-cell@vitbhopal.ac.in', 'PUBLISHER', 'ACTIVE', 'Innovation & Entrepreneurship Cell', 'Student Chapter'),
  ('urole-dev-soc', 'devsociety@vitbhopal.ac.in', 'PUBLISHER', 'ACTIVE', 'Developer Student Society', 'Student Chapter'),
  ('urole-cultural', 'culturalguild@vitbhopal.ac.in', 'PUBLISHER', 'ACTIVE', 'Cultural & Performing Arts Guild', 'Student Chapter'),
  ('urole-sports', 'sports@vitbhopal.ac.in', 'PUBLISHER', 'ACTIVE', 'VITB Sports Council', 'Sports Governing Body'),
  ('urole-campus-adm', 'campus@vitbhopal.ac.in', 'PUBLISHER', 'ACTIVE', 'Campus Administration', 'Controller of Examinations')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 2. Campus Locations & Buildings
-- ----------------------------------------------------------------------------
INSERT INTO public.locations (id, name, category, description, latitude, longitude, building, floor, facilities, opening_hours, accessibility, image, zone, contact_phone)
VALUES
('loc-ab-1', 'VITB Academic Block 1', 'Buildings', 'VITB Academic Block 1: Main academic block housing lecture theatres, dean offices, faculty cabins, central auditorium, seminar halls, and high-performance computing labs.', 23.077636, 76.851518, 'VITB Academic Block 1', 'Ground to 4th Floor', '["Smart Classrooms", "Faculty Cabins", "Auditorium Hall", "Seminar Hall", "Advanced Computing Labs", "Elevators", "RO Drinking Water"]'::jsonb, '08:00 AM – 08:30 PM', 'Dual elevators, wheelchair ramps, accessible restrooms on all floors', 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&auto=format&fit=crop&q=80', 'Academic Precinct', '+91 7560 254510'),
('loc-ab-2', 'VITB Academic Block 2', 'Buildings', 'VITB Academic Block 2: Modern academic facility featuring smart classrooms, robotics and AI laboratories, collaborative work pods, and faculty rooms.', 23.073721, 76.855731, 'VITB Academic Block 2', 'Ground to 5th Floor', '["AI & Robotics Labs", "Interactive Classrooms", "Faculty Cabins", "Discussion Pods", "Elevators", "Digital Notice Boards"]'::jsonb, '08:00 AM – 08:30 PM', 'Ramped entry, elevators, tactile guidance corridors, accessible washrooms', 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=1200&auto=format&fit=crop&q=80', 'Academic Precinct', '+91 7560 254515'),
('loc-mph', 'Multi-purpose Hall', 'Sports', 'Multi-purpose Hall (MPH): Indoor sports complex with badminton courts, basketball arena, table tennis zone, student gymnasium, and event arena.', 23.076212, 76.849646, 'Multi-purpose Hall', 'Ground & Mezzanine', '["Badminton Courts", "Basketball Arena", "Gymnasium", "Table Tennis Arena", "Locker Rooms", "First Aid Station"]'::jsonb, '06:00 AM – 09:30 AM, 04:30 PM – 09:30 PM', 'Ramped entrance, step-free access to indoor courts and spectator gallery', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&auto=format&fit=crop&q=80', 'Sports Precinct', '+91 7560 254570'),
('loc-dr-morepen', 'Dr. Morepen Health Care', 'Medical', 'Dr. Morepen Health Care: 24/7 dedicated campus healthcare dispensary and medical clinic providing outpatient care, resident doctors, pharmacy, triage, and ambulance emergency support.', 23.07755, 76.8507, 'Dr. Morepen Health Care', 'Ground Floor', '["24/7 Emergency Ward", "Resident Doctor & Nurses", "Pharmacy", "Observation Beds", "Ambulance Bay", "Oxygen Facility"]'::jsonb, '24 Hours / 7 Days (Emergency & OPD)', 'Direct ambulance triage dock, zero-barrier ramp entrance, wheelchair availability', 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=1200&auto=format&fit=crop&q=80', 'Health & Wellness', '+91 7560 254599'),
('loc-girls-hostel-1', 'Girls Hostel Block 1', 'Hostel', 'Girls Hostel Block 1: Residential facility for female students with dining mess, study halls, high-speed Wi-Fi, recreation rooms, and round-the-clock security.', 23.075265, 76.852412, 'Girls Hostel Block 1', 'Ground to 6th Floor', '["Dining Mess", "Study Lounges", "Gym Annex", "Laundry Service", "Biometric Access", "24/7 Warden Office"]'::jsonb, 'Resident Access (Curfew 09:30 PM)', 'Elevators, ground-floor accessible rooms, ramped main portico', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&auto=format&fit=crop&q=80', 'Girls Residential Precinct', '+91 7560 254555'),
('loc-girls-hostel-2', 'Girls Hostel Block 2', 'Hostel', 'Girls Hostel Block 2: Modern residential block featuring air-conditioned rooms, quiet study halls, indoor activity room, and student mess facility.', 23.074718, 76.853045, 'Girls Hostel Block 2', 'Ground to 6th Floor', '["Central Air Cooling", "Dining Mess", "Study Hall", "High-speed Wi-Fi", "Medical Desk", "Washing Stations"]'::jsonb, 'Resident Access (Curfew 09:30 PM)', 'Elevators, wheelchair accessible entrance, step-free access', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&auto=format&fit=crop&q=80', 'Girls Residential Precinct', '+91 7560 254556'),
('loc-boys-hostel-1', 'Boys Hostel Block 1', 'Hostel', 'Boys Hostel Block 1: Senior student residence with dining mess, reading room, recreational court, and 24-hour security.', 23.079215, 76.850231, 'Boys Hostel Block 1', 'Ground to 5th Floor', '["Mess Hall", "Badminton Court", "Night Canteen", "Study Room", "Laundry Machines"]'::jsonb, 'Resident Access (Curfew 09:30 PM)', 'Ramped entry, accessible ground-floor living quarters', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&auto=format&fit=crop&q=80', 'Boys Residential Precinct', '+91 7560 254541'),
('loc-boys-hostel-2', 'Boys Hostel Block 2', 'Hostel', 'Boys Hostel Block 2: Modern residential complex for undergraduate students with gym, high-speed campus internet, and indoor game tables.', 23.079541, 76.850982, 'Boys Hostel Block 2', 'Ground to 6th Floor', '["Dining Mess", "Fitness Gym", "Table Tennis", "Wi-Fi Hub", "Warden Desk"]'::jsonb, 'Resident Access (Curfew 09:30 PM)', 'Dual elevators, ramped main portico, accessible restrooms', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&auto=format&fit=crop&q=80', 'Boys Residential Precinct', '+91 7560 254542'),
('loc-boys-hostel-3', 'Boys Hostel Block 3', 'Hostel', 'Boys Hostel Block 3: Undergraduate student hostel with spacious rooms, reading hall, courtyard sports area, and dining cafeteria.', 23.079822, 76.851711, 'Boys Hostel Block 3', 'Ground to 6th Floor', '["Mess Facilities", "Study Hall", "Open Courtyard", "High-speed Internet"]'::jsonb, 'Resident Access (Curfew 09:30 PM)', 'Elevator access, accessible ramps', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&auto=format&fit=crop&q=80', 'Boys Residential Precinct', '+91 7560 254543'),
('loc-central-library', 'Central Library', 'Library', 'Central Campus Library: Multi-storey knowledge center housing print collections, digital databases, IEEE/ACM journals, silent research carrels, and discussion rooms.', 23.0772, 76.8519, 'Central Library', 'Ground to 3rd Floor', '["Digital Catalog (OPAC)", "Silent Study Zones", "Research Carrels", "E-Resource Lab", "Discussion Rooms"]'::jsonb, '08:00 AM – 11:00 PM (Exam extended hours)', 'Full elevator access to all tiers, wheelchair turnstiles', 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&auto=format&fit=crop&q=80', 'Academic Precinct', '+91 7560 254520')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  facilities = EXCLUDED.facilities,
  opening_hours = EXCLUDED.opening_hours,
  accessibility = EXCLUDED.accessibility,
  image = EXCLUDED.image,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 3. Publishers / Student Clubs
-- ----------------------------------------------------------------------------
INSERT INTO public.publishers (id, user_id, organization_name, category, description, logo_url, verified, contact_email, department)
VALUES
('pub-ai-club', 'user-publisher', 'AI & ML Club', 'Technical', 'Official student chapter fostering machine learning research, Kaggle hackathons, and industry mentorship.', 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80', true, 'aiclub@vitbhopal.ac.in', 'School of Computing Science'),
('pub-innovation-club', 'user-pub-2', 'Innovation & Entrepreneurship Cell', 'Technical', 'Nurturing student startup ventures, intellectual property filings, and annual university hackathons.', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=150&auto=format&fit=crop&q=80', true, 'e-cell@vitbhopal.ac.in', 'School of Computing Science'),
('pub-coding-club', 'user-pub-3', 'Developer Student Society', 'Technical', 'Community for full-stack developers, competitive coders, open-source contributors, and dev conferences.', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=150&auto=format&fit=crop&q=80', true, 'devsociety@vitbhopal.ac.in', 'School of Computing Science'),
('pub-cultural-club', 'user-pub-4', 'Cultural & Performing Arts Guild', 'Cultural', 'Organizers of university annual fest Advitya, acoustic nights, drama productions, and dance troupes.', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=150&auto=format&fit=crop&q=80', true, 'culturalguild@vitbhopal.ac.in', 'Student Welfare Department'),
('pub-sports-council', 'user-pub-5', 'VITB Sports Council', 'Sports', 'Official governing sports body administering intramural leagues, annual athletic meets, and tournament training.', 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=150&auto=format&fit=crop&q=80', true, 'sports@vitbhopal.ac.in', 'Department of Physical Education'),
('pub-campus', 'user-admin', 'Campus Administration', 'Administration', 'Office of the Controller of Examinations and University Campus Operations.', 'https://images.unsplash.com/photo-1562774053-701939374585?w=150&auto=format&fit=crop&q=80', true, 'campus@vitbhopal.ac.in', 'Administration')
ON CONFLICT (id) DO UPDATE SET
  organization_name = EXCLUDED.organization_name,
  description = EXCLUDED.description,
  verified = EXCLUDED.verified,
  contact_email = EXCLUDED.contact_email,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 4. Campus Events (FKs: publisher_id -> publishers.id, location_id -> locations.id)
-- ----------------------------------------------------------------------------
INSERT INTO public.events (id, title, subtitle, description, organizer, publisher_id, location_id, location_name, venue_detail, date, start_time, end_time, category, verified, cover_image, capacity, status, approval_status, tags)
VALUES
('evt-001', 'Advitya Hackathon 2026', 'National 36-Hour Hackathon', 'Annual national-level collegiate hackathon featuring Tracks in Generative AI, Web3, Smart Cities, and Robotics.', 'AI & ML Club', 'pub-ai-club', 'loc-ab-1', 'VITB Academic Block 1', 'Main Auditorium & CS Labs', '2026-09-12', '09:00 AM', '09:00 PM', 'Technical', true, 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80', 500, 'upcoming', 'approved', '["Hackathon", "AI", "Coding", "PrizePool"]'::jsonb),
('evt-002', 'Inter-Hostel Badminton Championship', 'Annual Trophy Series', 'Knockout tournament open to residents of all hostel blocks across men and women divisions.', 'VITB Sports Council', 'pub-sports-council', 'loc-mph', 'Multi-purpose Hall', 'Indoor Badminton Arena', '2026-09-15', '04:00 PM', '08:30 PM', 'Sports', true, 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1200&auto=format&fit=crop&q=80', 120, 'upcoming', 'approved', '["Badminton", "Sports", "InterHostel"]'::jsonb),
('evt-003', 'AI Club Workshop', 'Hands-on Deep Learning Masterclass', 'Comprehensive workshop covering computer vision, LLM inference, and deployment on campus edge devices.', 'AI & ML Club', 'pub-ai-club', 'loc-ab-1', 'VITB Academic Block 1', 'AB1-204 Computer Lab', '2026-09-25', '10:00 AM', '01:00 PM', 'Workshops', true, 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80', 90, 'upcoming', 'approved', '["Workshop", "AI", "MachineLearning"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  description = EXCLUDED.description,
  date = EXCLUDED.date,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  approval_status = EXCLUDED.approval_status,
  tags = EXCLUDED.tags,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 5. Faculty Directory (FK: building_id -> locations.id)
-- ----------------------------------------------------------------------------
INSERT INTO public.faculty (id, name, prefix, designation, school, department_name, cabin_number, building_id, building_name, floor, wing, room_details, email, phone, consultation_hours, subjects, research_area, directions_guide, status, live_status)
VALUES
('fac-dr-sharma', 'Dr. Rajesh Sharma', 'Dr.', 'Professor & Dean', 'SCSE', 'Computer Science and Engineering', 'AB1-314', 'loc-ab-1', 'VITB Academic Block 1', '3rd Floor', 'Wing A (North Corridor)', 'Cabin 314, Senior Faculty Wing adjacent to Dean Suite', 'rajesh.sharma@vitbhopal.ac.in', '+91 7560 254601', 'Mon, Wed: 03:00 PM – 05:00 PM', '["Advanced Algorithms", "Distributed Systems", "Cloud Computing"]'::jsonb, 'High-Performance Computing and Cloud Architecture', 'Take North Elevator at AB-1 to Floor 3, turn left past HOD Office; Cabin 314 is on the left corridor.', 'ACTIVE', 'available'),
('fac-dr-patel', 'Dr. Neha Patel', 'Dr.', 'Associate Professor', 'SCSE', 'Artificial Intelligence & Data Science', 'AB1-204', 'loc-ab-1', 'VITB Academic Block 1', '2nd Floor', 'Wing B (East Corridor)', 'Cabin 204, AI Lab Corridor', 'neha.patel@vitbhopal.ac.in', '+91 7560 254602', 'Tue, Thu: 02:00 PM – 04:00 PM', '["Deep Learning", "Natural Language Processing", "Machine Learning"]'::jsonb, 'Multimodal Generative Models and Low-Resource NLP', 'Take Central Staircase to Floor 2, enter East Corridor; Cabin 204 is opposite the High-Performance AI Lab.', 'ACTIVE', 'available'),
('fac-dr-verma', 'Dr. Amit Verma', 'Dr.', 'Professor & HOD', 'SEEE', 'Electrical & Electronics Engineering', 'AB1-105', 'loc-ab-1', 'VITB Academic Block 1', '1st Floor', 'Wing C (South Corridor)', 'Cabin 105, HOD Chamber SEEE', 'amit.verma@vitbhopal.ac.in', '+91 7560 254603', 'Daily: 11:00 AM – 12:30 PM', '["VLSI Design", "Embedded Systems", "IoT Architecture"]'::jsonb, 'Ultra-Low Power VLSI circuits and Edge Computing', 'Enter main portico of AB-1, proceed through South Corridor on Ground/1st Floor, Cabin 105 is the second door on right.', 'ACTIVE', 'available'),
('fac-dr-iyer', 'Dr. Priya Iyer', 'Dr.', 'Assistant Professor (Sr.)', 'SASL', 'Mathematics & Computing', 'AB1-412', 'loc-ab-1', 'VITB Academic Block 1', '4th Floor', 'Wing A (West Corridor)', 'Cabin 412, Mathematics Faculty Cluster', 'priya.iyer@vitbhopal.ac.in', '+91 7560 254604', 'Mon, Fri: 10:00 AM – 12:00 PM', '["Linear Algebra", "Optimization Techniques", "Graph Theory"]'::jsonb, 'Combinatorial Optimization and Algorithmic Graph Theory', 'Take South Elevator to Floor 4, turn right into West Corridor, Cabin 412 is midway along the quiet study bay.', 'ACTIVE', 'available'),
('fac-dr-khan', 'Dr. Tariq Khan', 'Dr.', 'Associate Professor', 'SMEC', 'Mechanical Engineering', 'AB2-218', 'loc-ab-2', 'VITB Academic Block 2', '2nd Floor', 'Wing B', 'Cabin 218, Mechatronics Wing', 'tariq.khan@vitbhopal.ac.in', '+91 7560 254605', 'Wed, Thu: 02:30 PM – 04:30 PM', '["Thermodynamics", "Robotics & Automation", "Fluid Dynamics"]'::jsonb, 'Autonomous Mobile Robotics and Swarm Intelligence', 'Enter AB-2 through main foyer, take elevator to 2nd Floor, follow Mechatronics signs to Cabin 218.', 'ACTIVE', 'available')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  designation = EXCLUDED.designation,
  status = EXCLUDED.status,
  live_status = EXCLUDED.live_status,
  consultation_hours = EXCLUDED.consultation_hours,
  directions_guide = EXCLUDED.directions_guide,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 6. Campus Announcements (FKs: publisher_id -> publishers.id, location_id -> locations.id)
-- ----------------------------------------------------------------------------
INSERT INTO public.announcements (id, title, description, publisher_id, publisher_name, location_id, location_name, category, priority, action_url, verified, status)
VALUES
('ann-001', 'Mid-Term Examination Hall Allocations Released', 'Students of all schools (SCSE, SEEE, SMEC, SASL) can now verify their designated examination halls and seat numbers in the portal.', 'pub-campus', 'Office of the Controller of Examinations', 'loc-ab-1', 'VITB Academic Block 1', 'Academics', 'urgent', '/events', true, 'approved'),
('ann-002', 'Annual Sports Fest Registration Open', 'Badminton, basketball, football, and athletics team registrations are now accepting entries at the Multi-Purpose Hall sports desk.', 'pub-sports-council', 'VITB Sports Council', 'loc-mph', 'Multi-purpose Hall', 'Sports', 'high', '/events/evt-002', true, 'approved'),
('ann-003', 'Advitya Hackathon 2026 Tracks & Mentors Announced', 'Problem statements for Generative AI and Autonomous Robotics tracks have been published. Join the orientation session in Seminar Hall.', 'pub-ai-club', 'AI & ML Club', 'loc-ab-1', 'VITB Academic Block 1', 'Technical', 'medium', '/events/evt-001', true, 'approved')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  priority = EXCLUDED.priority,
  action_url = EXCLUDED.action_url,
  verified = EXCLUDED.verified,
  status = EXCLUDED.status,
  updated_at = NOW();
