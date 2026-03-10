import { createClient } from '@/lib/supabase/server';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { AboutSection } from '@/components/landing/AboutSection';
import { ServicesSection } from '@/components/landing/ServicesSection';
import { StatsSection } from '@/components/landing/StatsSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { CTASection } from '@/components/landing/CTASection';
import { FooterSection } from '@/components/landing/FooterSection';

export const revalidate = 60;

async function getLandingData() {
  const supabase = await createClient();

  // Resolve the root bank from platform_settings
  const { data: platformSettings } = await supabase
    .from('platform_settings')
    .select('root_bank_id')
    .single();

  let bank = null;
  if (platformSettings?.root_bank_id) {
    const { data: rootBank } = await supabase
      .from('banks')
      .select('id, name')
      .eq('id', platformSettings.root_bank_id)
      .single();
    bank = rootBank;
  }

  // Fallback to first bank if no root bank set
  if (!bank) {
    const { data: firstBank } = await supabase
      .from('banks')
      .select('id, name')
      .limit(1)
      .single();
    bank = firstBank;
  }

  if (!bank) return null;

  const [settings, sections, services, testimonials, faqs] = await Promise.all([
    supabase.from('site_settings').select('*').eq('bank_id', bank.id).single(),
    supabase.from('landing_sections').select('*').eq('bank_id', bank.id).eq('is_active', true).order('sort_order'),
    supabase.from('landing_services').select('*').eq('bank_id', bank.id).eq('is_active', true).order('sort_order'),
    supabase.from('landing_testimonials').select('*').eq('bank_id', bank.id).eq('is_active', true).order('sort_order'),
    supabase.from('landing_faqs').select('*').eq('bank_id', bank.id).eq('is_active', true).order('sort_order'),
  ]);

  return {
    bank,
    settings: settings.data,
    sections: sections.data || [],
    services: services.data || [],
    testimonials: testimonials.data || [],
    faqs: faqs.data || [],
  };
}

export default async function LandingPage() {
  const data = await getLandingData();

  // Fallback when no data yet (tables may not exist)
  const settings = data?.settings;
  const sections = data?.sections || [];
  const services = data?.services || [];
  const testimonials = data?.testimonials || [];
  const faqs = data?.faqs || [];
  const bankName = data?.bank?.name || 'Agent Banking';
  const primaryColor = settings?.primary_color || '#1a56db';

  const getSection = (key) => sections.find((s) => s.section_key === key);
  const heroSection = getSection('hero');
  const aboutSection = getSection('about');
  const servicesSection = getSection('services');
  const statsSection = getSection('stats');
  const testimonialsSection = getSection('testimonials');
  const faqSection = getSection('faq');
  const ctaSection = getSection('cta');

  return (
    <main>
      <LandingNavbar
        siteName={settings?.site_name || bankName}
        logoUrl={settings?.logo_url}
        primaryColor={primaryColor}
      />

      <HeroSection
        title={heroSection?.title}
        subtitle={heroSection?.subtitle}
        backgroundImageUrl={heroSection?.image_url}
        ctaText={heroSection?.content?.cta_text}
        ctaLink={heroSection?.content?.cta_link}
        primaryColor={primaryColor}
      />

      <AboutSection
        title={aboutSection?.title}
        subtitle={aboutSection?.subtitle}
        content={aboutSection?.content}
        imageUrl={aboutSection?.image_url}
        primaryColor={primaryColor}
      />

      <ServicesSection
        title={servicesSection?.title}
        subtitle={servicesSection?.subtitle}
        services={services}
        primaryColor={primaryColor}
      />

      <StatsSection
        content={statsSection?.content}
        primaryColor={primaryColor}
      />

      <TestimonialsSection
        title={testimonialsSection?.title}
        subtitle={testimonialsSection?.subtitle}
        testimonials={testimonials}
        primaryColor={primaryColor}
      />

      <FAQSection
        title={faqSection?.title}
        subtitle={faqSection?.subtitle}
        faqs={faqs}
        primaryColor={primaryColor}
      />

      <CTASection
        title={ctaSection?.title}
        subtitle={ctaSection?.subtitle}
        primaryColor={primaryColor}
      />

      <FooterSection
        settings={settings}
        bankName={bankName}
      />
    </main>
  );
}
