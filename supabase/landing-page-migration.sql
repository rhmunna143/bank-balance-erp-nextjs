-- =====================================================
-- Landing Page CMS Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. SITE SETTINGS (one row per bank — stores global landing page config)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL DEFAULT 'Agent Banking',
  tagline TEXT DEFAULT 'Your Trusted Banking Partner',
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#1a56db',
  secondary_color TEXT DEFAULT '#7c3aed',
  footer_text TEXT DEFAULT '© 2026 Agent Banking. All rights reserved.',
  contact_email TEXT,
  contact_phone TEXT,
  contact_address TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bank_id)
);

-- 2. LANDING SECTIONS (dynamic content blocks)
CREATE TABLE IF NOT EXISTS public.landing_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL, -- 'hero', 'about', 'services', 'features', 'stats', 'testimonials', 'cta', 'faq'
  title TEXT,
  subtitle TEXT,
  content JSONB DEFAULT '{}', -- flexible JSON for section-specific data
  image_url TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bank_id, section_key)
);

-- 3. LANDING IMAGES (gallery / media library)
CREATE TABLE IF NOT EXISTS public.landing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL, -- ImgBB URL
  delete_url TEXT, -- ImgBB delete URL for cleanup
  section_key TEXT, -- optional: which section this image belongs to
  alt_text TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. LANDING SERVICES (individual service cards)
CREATE TABLE IF NOT EXISTS public.landing_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon_name TEXT DEFAULT 'Banknote', -- Lucide icon name
  image_url TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. LANDING TESTIMONIALS
CREATE TABLE IF NOT EXISTS public.landing_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designation TEXT,
  avatar_url TEXT,
  quote TEXT NOT NULL,
  rating INT DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. LANDING FAQ
CREATE TABLE IF NOT EXISTS public.landing_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_faqs ENABLE ROW LEVEL SECURITY;

-- Public read policies (anyone can view published landing page content)
CREATE POLICY "Public can view site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Public can view active sections" ON public.landing_sections FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view images" ON public.landing_images FOR SELECT USING (true);
CREATE POLICY "Public can view active services" ON public.landing_services FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view active testimonials" ON public.landing_testimonials FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view active faqs" ON public.landing_faqs FOR SELECT USING (is_active = true);

-- Admin write policies
CREATE POLICY "Admins can manage site settings" ON public.site_settings FOR ALL
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));
CREATE POLICY "Admins can manage sections" ON public.landing_sections FOR ALL
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));
CREATE POLICY "Admins can manage images" ON public.landing_images FOR ALL
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));
CREATE POLICY "Admins can manage services" ON public.landing_services FOR ALL
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));
CREATE POLICY "Admins can manage testimonials" ON public.landing_testimonials FOR ALL
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));
CREATE POLICY "Admins can manage faqs" ON public.landing_faqs FOR ALL
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));
