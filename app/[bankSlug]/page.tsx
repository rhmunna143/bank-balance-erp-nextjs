"use client";

import { useBankStore } from "@/stores/bankStore";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { AboutSection } from "@/components/landing/AboutSection";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { FooterSection } from "@/components/landing/FooterSection";

export default function BankLandingPage() {
  const bank = useBankStore((state) => state.bank);

  if (!bank) return null;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <LandingNavbar
        siteName={bank.name}
        logoUrl={bank.logoUrl}
        primaryColor={bank.theme}
        bankSlug={bank.slug}
      />

      <HeroSection
        title={bank.name}
        subtitle="Your Trusted Banking Partner"
        ctaText="Login"
        ctaLink="/sign-in"
        backgroundImageUrl={null}
        primaryColor={bank.theme}
      />

      <AboutSection
        title="About Us"
        subtitle=""
        content="Providing reliable financial services to our community."
        imageUrl={null}
        primaryColor={bank.theme}
      />

      <ServicesSection
        title="Our Services"
        subtitle=""
        services={[]}
        primaryColor={bank.theme}
      />

      <FooterSection settings={{}} bankName={bank.name} />
    </main>
  );
}
