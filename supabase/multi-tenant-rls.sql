-- =====================================================
-- RLS Policies for Multi-Tenant Upgrade
-- Run AFTER multi-tenant-upgrade.sql
-- =====================================================

-- Platform Settings: only superadmins can modify
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Anyone can read platform settings" ON public.platform_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Superadmins can update platform settings" ON public.platform_settings;
CREATE POLICY "Superadmins can update platform settings" ON public.platform_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_superadmin = TRUE
    )
  );

-- Banks: Allow public read of active banks (for slug resolution)
DROP POLICY IF EXISTS "Public can read active banks by slug" ON public.banks;
CREATE POLICY "Public can read active banks by slug" ON public.banks
  FOR SELECT USING (is_active = TRUE);
