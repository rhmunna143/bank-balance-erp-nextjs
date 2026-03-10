"use client";

import { useEffect, useState } from "react";
import { useBank } from "@/hooks/useBank";
import { supabase } from "@/services/supabaseClient";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { AboutSection } from "@/components/landing/AboutSection";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTASection } from "@/components/landing/CTASection";
import { FooterSection } from "@/components/landing/FooterSection";
import { FullPageSpinner } from "@/components/common/LoadingSpinner";

export default function BankLandingPage() {
  const { bank, bankSlug } = useBank();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bank?.id) return;

    const fetchLandingData = async () => {
      const [settings, sections, services, testimonials, faqs] =
        await Promise.all([
          supabase
            .from("site_settings")
            .select("*")
            .eq("bank_id", bank.id)
            .maybeSingle(),
          supabase
            .from("landing_sections")
            .select("*")
            .eq("bank_id", bank.id)
            .eq("is_active", true)
            .order("sort_order"),
          supabase
            .from("landing_services")
            .select("*")
            .eq("bank_id", bank.id)
            .eq("is_active", true)
            .order("sort_order"),
          supabase
            .from("landing_testimonials")
            .select("*")
            .eq("bank_id", bank.id)
            .eq("is_active", true)
            .order("sort_order"),
          supabase
            .from("landing_faqs")
            .select("*")
            .eq("bank_id", bank.id)
            .eq("is_active", true)
            .order("sort_order"),
        ]);

      setData({
        settings: settings.data,
        sections: sections.data || [],
        services: services.data || [],
        testimonials: testimonials.data || [],
        faqs: faqs.data || [],
      });
      setLoading(false);
    };

    fetchLandingData();
  }, [bank?.id]);

  if (loading) return <FullPageSpinner />;

  const settings = data?.settings;
  const sections = data?.sections || [];
  const services = data?.services || [];
  const testimonials = data?.testimonials || [];
  const faqs = data?.faqs || [];
  const bankName = bank?.name || "Agent Banking";
  const primaryColor = settings?.primary_color || "#1a56db";

  const getSection = (key) => sections.find((s) => s.section_key === key);
  const heroSection = getSection("hero");
  const aboutSection = getSection("about");
  const servicesSection = getSection("services");
  const statsSection = getSection("stats");
  const testimonialsSection = getSection("testimonials");
  const faqSection = getSection("faq");
  const ctaSection = getSection("cta");

  return (
    <main>
      <LandingNavbar
        siteName={settings?.site_name || bankName}
        logoUrl={settings?.logo_url}
        primaryColor={primaryColor}
        bankSlug={bankSlug}
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

      <FooterSection settings={settings} bankName={bankName} />
    </main>
  );
}
