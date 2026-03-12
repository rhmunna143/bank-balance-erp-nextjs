-- =====================================================
-- Multi-Tenant Upgrade: Root Route Ownership & SuperAdmin
-- Run this in Supabase SQL Editor
-- =====================================================

-- 2.1.1: Add `slug` column to `banks` table
ALTER TABLE public.banks
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Backfill existing banks with a slug derived from their name
UPDATE public.banks
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Make slug NOT NULL after backfill
ALTER TABLE public.banks
  ALTER COLUMN slug SET NOT NULL;

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_banks_slug ON public.banks(slug);

-- 2.1.2: Create `platform_settings` table (singleton row for global config)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  root_bank_id UUID REFERENCES public.banks(id) ON DELETE SET NULL,
  platform_name TEXT DEFAULT 'AgentBank ERP',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default singleton row
INSERT INTO public.platform_settings (id, platform_name)
VALUES (gen_random_uuid(), 'AgentBank ERP')
ON CONFLICT DO NOTHING;

-- 2.1.3: Add `is_superadmin` flag to `profiles` table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT FALSE;

-- 2.1.5: RPC to get the root bank slug
CREATE OR REPLACE FUNCTION public.get_root_bank()
RETURNS TABLE(bank_id UUID, bank_slug TEXT, bank_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT ps.root_bank_id, b.slug, b.name
  FROM public.platform_settings ps
  LEFT JOIN public.banks b ON b.id = ps.root_bank_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.1.6: RPC to set the root bank (SuperAdmin only)
CREATE OR REPLACE FUNCTION public.set_root_bank(p_bank_id UUID)
RETURNS VOID AS $$
DECLARE
  v_is_superadmin BOOLEAN;
BEGIN
  SELECT is_superadmin INTO v_is_superadmin
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT v_is_superadmin THEN
    RAISE EXCEPTION 'Only superadmins can change the root bank';
  END IF;

  UPDATE public.platform_settings
  SET root_bank_id = p_bank_id, updated_at = NOW(), updated_by = auth.uid()
  WHERE id = (SELECT id FROM public.platform_settings LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.1.7: RPC to get bank by slug
CREATE OR REPLACE FUNCTION public.get_bank_by_slug(p_slug TEXT)
RETURNS TABLE(
  id UUID, name TEXT, slug TEXT, currency TEXT,
  address TEXT, phone TEXT, logo_url TEXT, theme TEXT,
  owner_id UUID, is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.name, b.slug, b.currency,
         b.address, b.phone, b.logo_url, b.theme,
         b.owner_id, b.is_active
  FROM public.banks b
  WHERE b.slug = p_slug AND b.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.1.8: RPC to list all banks (for SuperAdmin panel)
CREATE OR REPLACE FUNCTION public.list_all_banks()
RETURNS TABLE(
  id UUID, name TEXT, slug TEXT, currency TEXT,
  owner_id UUID, owner_email TEXT, is_active BOOLEAN,
  is_root BOOLEAN, created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_is_superadmin BOOLEAN;
BEGIN
  SELECT p.is_superadmin INTO v_is_superadmin
  FROM public.profiles p WHERE p.id = auth.uid();

  IF NOT v_is_superadmin THEN
    RAISE EXCEPTION 'Only superadmins can list all banks';
  END IF;

  RETURN QUERY
  SELECT b.id, b.name, b.slug, b.currency,
         b.owner_id, pr.email AS owner_email, b.is_active,
         (ps.root_bank_id = b.id) AS is_root,
         b.created_at
  FROM public.banks b
  LEFT JOIN public.profiles pr ON pr.id = b.owner_id
  CROSS JOIN public.platform_settings ps
  ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.1.9: RPC to toggle bank active status (SuperAdmin only)
CREATE OR REPLACE FUNCTION public.toggle_bank_active(p_bank_id UUID, p_is_active BOOLEAN)
RETURNS VOID AS $$
DECLARE
  v_is_superadmin BOOLEAN;
BEGIN
  SELECT is_superadmin INTO v_is_superadmin
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT v_is_superadmin THEN
    RAISE EXCEPTION 'Only superadmins can toggle bank active status';
  END IF;

  UPDATE public.banks
  SET is_active = p_is_active
  WHERE id = p_bank_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.1.10: RPC to update platform settings (SuperAdmin only)
CREATE OR REPLACE FUNCTION public.update_platform_settings(p_platform_name TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
  v_is_superadmin BOOLEAN;
BEGIN
  SELECT is_superadmin INTO v_is_superadmin
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT v_is_superadmin THEN
    RAISE EXCEPTION 'Only superadmins can update platform settings';
  END IF;

  UPDATE public.platform_settings
  SET
    platform_name = COALESCE(p_platform_name, platform_name),
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = (SELECT id FROM public.platform_settings LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
