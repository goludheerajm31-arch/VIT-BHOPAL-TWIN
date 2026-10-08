-- ============================================================================
-- SUPABASE STORAGE: CAMPUS GUIDES BUCKET & RLS POLICIES
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/cqhgnvxuvsqxrvdgmkpk/sql/new
-- ============================================================================

-- 1. Ensure campus-guides bucket is registered with allowed MIME types and 15MB limit
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campus-guides',
  'campus-guides',
  true,
  15728640,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Public Read: Any student, faculty, or visitor can view and download campus guide documents & photos
DROP POLICY IF EXISTS "Public read campus guides" ON storage.objects;
CREATE POLICY "Public read campus guides"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campus-guides');

-- 3. Authorized Upload: Authenticated administrators and publishers can upload guide attachments
DROP POLICY IF EXISTS "Authorized upload campus guides" ON storage.objects;
CREATE POLICY "Authorized upload campus guides"
  ON storage.objects FOR INSERT
  TO authenticated, service_role
  WITH CHECK (bucket_id = 'campus-guides');

-- 4. Authorized Update: Authenticated users can replace/update guide files
DROP POLICY IF EXISTS "Authorized update campus guides" ON storage.objects;
CREATE POLICY "Authorized update campus guides"
  ON storage.objects FOR UPDATE
  TO authenticated, service_role
  USING (bucket_id = 'campus-guides');

-- 5. Authorized Delete: Authenticated administrators can remove guide files
DROP POLICY IF EXISTS "Authorized delete campus guides" ON storage.objects;
CREATE POLICY "Authorized delete campus guides"
  ON storage.objects FOR DELETE
  TO authenticated, service_role
  USING (bucket_id = 'campus-guides');
