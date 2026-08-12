"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function IconChartBar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function IconCash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

function IconLoan() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconReport() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-400 flex-shrink-0">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  );
}

// ─── Counter animation ────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = target / 60;
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 20);
    return () => clearInterval(timer);
  }, [target]);

  return <>{prefix}{count.toLocaleString()}{suffix}</>;
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="agentbank-feature-card group">
      <div className="agentbank-feature-icon">{icon}</div>
      <h3 className="agentbank-feature-title">{title}</h3>
      <p className="agentbank-feature-desc">{description}</p>
    </div>
  );
}

// ─── Step Card ────────────────────────────────────────────────────────────────
function StepCard({ step, title, description, cta, href }: {
  step: number; title: string; description: string; cta: string; href: string;
}) {
  return (
    <div className="agentbank-step-card">
      <div className="agentbank-step-number">{step < 10 ? `0${step}` : step}</div>
      <h3 className="agentbank-step-title">{title}</h3>
      <p className="agentbank-step-desc">{description}</p>
      <Link href={href} className="agentbank-step-cta">
        {cta} <IconArrowRight />
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      <style>{`
        :root {
          --ab-navy: #0a0f1e;
          --ab-navy2: #0d1530;
          --ab-blue: #1d4ed8;
          --ab-blue-light: #3b82f6;
          --ab-teal: #0ea5e9;
          --ab-emerald: #10b981;
          --ab-purple: #7c3aed;
          --ab-text: #e2e8f0;
          --ab-muted: #94a3b8;
          --ab-border: rgba(255,255,255,0.08);
          --ab-glass: rgba(255,255,255,0.04);
        }

        .agentbank-page { background: var(--ab-navy); color: var(--ab-text); font-family: 'Inter', 'Segoe UI', sans-serif; }

        /* Nav */
        .agentbank-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          padding: 1rem 2rem;
          display: flex; align-items: center; justify-content: space-between;
          transition: all 0.3s ease;
        }
        .agentbank-nav.scrolled {
          background: rgba(10,15,30,0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--ab-border);
        }
        .agentbank-logo { display: flex; align-items: center; gap: 0.6rem; }
        .agentbank-logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, var(--ab-blue), var(--ab-teal));
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 1rem; color: white;
        }
        .agentbank-logo-text { font-size: 1.15rem; font-weight: 700; color: white; }
        .agentbank-logo-text span { color: var(--ab-teal); }
        .agentbank-nav-links { display: flex; align-items: center; gap: 2rem; }
        .agentbank-nav-link { color: var(--ab-muted); text-decoration: none; font-size: 0.9rem; transition: color 0.2s; }
        .agentbank-nav-link:hover { color: white; }
        .agentbank-btn-primary {
          background: linear-gradient(135deg, var(--ab-blue), var(--ab-teal));
          color: white; text-decoration: none; padding: 0.55rem 1.4rem;
          border-radius: 8px; font-size: 0.9rem; font-weight: 600;
          transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.4rem;
          box-shadow: 0 0 20px rgba(29,78,216,0.4);
        }
        .agentbank-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 0 30px rgba(29,78,216,0.6); }
        .agentbank-btn-ghost {
          color: var(--ab-text); text-decoration: none; padding: 0.55rem 1.4rem;
          border-radius: 8px; font-size: 0.9rem; font-weight: 500;
          border: 1px solid var(--ab-border); transition: all 0.2s;
          display: inline-flex; align-items: center; gap: 0.4rem;
        }
        .agentbank-btn-ghost:hover { border-color: var(--ab-blue-light); color: white; }

        /* Hero */
        .agentbank-hero {
          min-height: 100vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          position: relative; overflow: hidden; text-align: center; padding: 8rem 1.5rem 5rem;
        }
        .agentbank-hero-bg {
          position: absolute; inset: 0; z-index: 0;
          background: radial-gradient(ellipse 80% 60% at 50% 20%, rgba(29,78,216,0.25) 0%, transparent 70%),
                      radial-gradient(ellipse 60% 40% at 80% 80%, rgba(14,165,233,0.1) 0%, transparent 60%),
                      var(--ab-navy);
        }
        .agentbank-hero-img {
          position: absolute; inset: 0; z-index: 0;
          object-fit: cover; opacity: 0.12;
          width: 100%; height: 100%;
        }
        .agentbank-hero-badge {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: rgba(29,78,216,0.15); border: 1px solid rgba(29,78,216,0.4);
          color: var(--ab-blue-light); padding: 0.4rem 1rem; border-radius: 100px;
          font-size: 0.8rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;
          margin-bottom: 1.5rem; position: relative; z-index: 1;
        }
        .agentbank-hero-badge-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ab-teal); animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.2)} }
        .agentbank-hero-title {
          font-size: clamp(2.2rem, 5vw, 3.8rem); font-weight: 800;
          line-height: 1.12; letter-spacing: -0.02em; color: white;
          position: relative; z-index: 1; margin-bottom: 1.25rem; max-width: 820px;
        }
        .agentbank-hero-title .highlight {
          background: linear-gradient(135deg, var(--ab-teal), var(--ab-blue-light));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .agentbank-hero-sub {
          font-size: 1.1rem; color: var(--ab-muted); max-width: 600px;
          line-height: 1.7; position: relative; z-index: 1; margin-bottom: 2.5rem;
        }
        .agentbank-hero-actions {
          display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center;
          position: relative; z-index: 1; margin-bottom: 4rem;
        }
        .agentbank-btn-hero-primary {
          background: linear-gradient(135deg, var(--ab-blue), var(--ab-teal));
          color: white; text-decoration: none; padding: 0.85rem 2rem;
          border-radius: 10px; font-size: 1rem; font-weight: 700;
          transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.5rem;
          box-shadow: 0 0 40px rgba(29,78,216,0.5);
        }
        .agentbank-btn-hero-primary:hover { transform: translateY(-2px); box-shadow: 0 0 60px rgba(29,78,216,0.7); }
        .agentbank-btn-hero-ghost {
          color: white; text-decoration: none; padding: 0.85rem 2rem;
          border-radius: 10px; font-size: 1rem; font-weight: 600;
          border: 1px solid rgba(255,255,255,0.2); transition: all 0.2s;
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: rgba(255,255,255,0.05); backdrop-filter: blur(8px);
        }
        .agentbank-btn-hero-ghost:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.4); }
        .agentbank-hero-stats {
          display: flex; flex-wrap: wrap; gap: 3rem; justify-content: center;
          position: relative; z-index: 1;
        }
        .agentbank-hero-stat { text-align: center; }
        .agentbank-hero-stat-num { font-size: 2rem; font-weight: 800; color: white; }
        .agentbank-hero-stat-label { font-size: 0.8rem; color: var(--ab-muted); margin-top: 0.2rem; }

        /* Section */
        .agentbank-section { padding: 5rem 1.5rem; }
        .agentbank-section-inner { max-width: 1200px; margin: 0 auto; }
        .agentbank-section-label {
          display: inline-block; font-size: 0.75rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em;
          color: var(--ab-teal); margin-bottom: 1rem;
        }
        .agentbank-section-title {
          font-size: clamp(1.6rem, 3vw, 2.4rem); font-weight: 800;
          color: white; line-height: 1.2; letter-spacing: -0.02em;
        }
        .agentbank-section-sub { font-size: 1rem; color: var(--ab-muted); line-height: 1.7; max-width: 560px; }
        .agentbank-section-header { text-align: center; margin-bottom: 3.5rem; }
        .agentbank-section-header .agentbank-section-sub { margin: 0.75rem auto 0; }

        /* Features Grid */
        .agentbank-features-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;
        }
        .agentbank-feature-card {
          background: var(--ab-glass); border: 1px solid var(--ab-border); border-radius: 16px;
          padding: 1.75rem; transition: all 0.3s; cursor: default;
        }
        .agentbank-feature-card:hover {
          border-color: rgba(29,78,216,0.4); background: rgba(29,78,216,0.06);
          transform: translateY(-3px); box-shadow: 0 8px 40px rgba(29,78,216,0.15);
        }
        .agentbank-feature-icon {
          width: 48px; height: 48px; border-radius: 12px;
          background: linear-gradient(135deg, rgba(29,78,216,0.2), rgba(14,165,233,0.2));
          border: 1px solid rgba(29,78,216,0.3);
          display: flex; align-items: center; justify-content: center;
          color: var(--ab-teal); margin-bottom: 1.25rem;
          transition: all 0.3s;
        }
        .agentbank-feature-card:hover .agentbank-feature-icon {
          background: linear-gradient(135deg, rgba(29,78,216,0.4), rgba(14,165,233,0.3));
        }
        .agentbank-feature-title { font-size: 1rem; font-weight: 700; color: white; margin-bottom: 0.6rem; }
        .agentbank-feature-desc { font-size: 0.875rem; color: var(--ab-muted); line-height: 1.6; }

        /* How it works */
        .agentbank-steps-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 2rem;
          position: relative;
        }
        .agentbank-step-card {
          position: relative; padding: 2rem;
          background: var(--ab-glass); border: 1px solid var(--ab-border); border-radius: 16px;
          transition: all 0.3s;
        }
        .agentbank-step-card:hover { border-color: rgba(14,165,233,0.4); transform: translateY(-3px); }
        .agentbank-step-number {
          font-size: 3rem; font-weight: 900; line-height: 1;
          background: linear-gradient(135deg, var(--ab-blue), var(--ab-teal));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          margin-bottom: 1rem;
        }
        .agentbank-step-title { font-size: 1.1rem; font-weight: 700; color: white; margin-bottom: 0.75rem; }
        .agentbank-step-desc { font-size: 0.875rem; color: var(--ab-muted); line-height: 1.6; margin-bottom: 1.5rem; }
        .agentbank-step-cta {
          display: inline-flex; align-items: center; gap: 0.4rem;
          color: var(--ab-teal); text-decoration: none; font-size: 0.875rem; font-weight: 600;
          transition: gap 0.2s;
        }
        .agentbank-step-cta:hover { gap: 0.6rem; }

        /* Plans */
        .agentbank-plans-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;
        }
        .agentbank-plan-card {
          border-radius: 20px; padding: 2rem;
          border: 1px solid var(--ab-border); background: var(--ab-glass);
          display: flex; flex-direction: column; gap: 1.25rem; transition: all 0.3s;
        }
        .agentbank-plan-card.popular {
          border-color: var(--ab-blue-light);
          background: rgba(29,78,216,0.08);
          box-shadow: 0 0 60px rgba(29,78,216,0.2);
        }
        .agentbank-plan-card:hover { transform: translateY(-4px); }
        .agentbank-plan-badge {
          display: inline-block; background: linear-gradient(135deg, var(--ab-blue), var(--ab-teal));
          color: white; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; padding: 0.25rem 0.75rem; border-radius: 100px; width: fit-content;
        }
        .agentbank-plan-name { font-size: 1.25rem; font-weight: 800; color: white; }
        .agentbank-plan-price { font-size: 2.5rem; font-weight: 900; color: white; line-height: 1; }
        .agentbank-plan-price span { font-size: 1rem; font-weight: 500; color: var(--ab-muted); }
        .agentbank-plan-desc { font-size: 0.875rem; color: var(--ab-muted); }
        .agentbank-plan-features { display: flex; flex-direction: column; gap: 0.6rem; flex: 1; }
        .agentbank-plan-feature { display: flex; align-items: center; gap: 0.6rem; font-size: 0.875rem; color: var(--ab-text); }

        /* CTA Banner */
        .agentbank-cta-banner {
          position: relative; border-radius: 24px; overflow: hidden;
          background: linear-gradient(135deg, var(--ab-blue), #1e40af, var(--ab-purple));
          padding: 4rem 2rem; text-align: center;
        }
        .agentbank-cta-banner::before {
          content: '';
          position: absolute; inset: 0;
          background: url('/hero-bg.jpg') center/cover no-repeat;
          opacity: 0.07;
        }
        .agentbank-cta-inner { position: relative; z-index: 1; }
        .agentbank-cta-title { font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 800; color: white; margin-bottom: 1rem; }
        .agentbank-cta-sub { font-size: 1rem; color: rgba(255,255,255,0.75); max-width: 500px; margin: 0 auto 2.5rem; line-height: 1.7; }

        /* Footer */
        .agentbank-footer {
          border-top: 1px solid var(--ab-border);
          padding: 2.5rem 1.5rem;
          display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
          gap: 1rem; max-width: 1200px; margin: 0 auto;
        }
        .agentbank-footer-copy { font-size: 0.85rem; color: var(--ab-muted); }
        .agentbank-footer-links { display: flex; gap: 1.5rem; }
        .agentbank-footer-link { font-size: 0.85rem; color: var(--ab-muted); text-decoration: none; transition: color 0.2s; }
        .agentbank-footer-link:hover { color: white; }

        /* Dark stripe between sections */
        .agentbank-divider { background: var(--ab-navy2); }

        @media (max-width: 640px) {
          .agentbank-nav-links { display: none; }
          .agentbank-hero-stats { gap: 1.5rem; }
        }
      `}</style>

      <div className="agentbank-page">

        {/* ── Navbar ──────────────────────────────────────── */}
        <nav className={`agentbank-nav ${scrolled ? "scrolled" : ""}`}>
          <div className="agentbank-logo">
            <div className="agentbank-logo-icon">A</div>
            <span className="agentbank-logo-text">Agent<span>Bank</span> ERP</span>
          </div>
          <div className="agentbank-nav-links">
            <a href="#features" className="agentbank-nav-link">Features</a>
            <a href="#how-it-works" className="agentbank-nav-link">How It Works</a>
            <a href="#pricing" className="agentbank-nav-link">Pricing</a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {!isSignedIn ? (
              <>
                <Link href="/sign-in" className="agentbank-btn-ghost">Sign In</Link>
                <Link href="/sign-up" className="agentbank-btn-primary">Get Started <IconArrowRight /></Link>
              </>
            ) : (
              <>
                <Link href="/dashboard" className="agentbank-btn-primary">Dashboard</Link>
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      userButtonAvatarBox: { width: 40, height: 40 },
                    }
                  }}
                />
              </>
            )}
          </div>
        </nav>

        {/* ── Hero ────────────────────────────────────────── */}
        <section className="agentbank-hero">
          <div className="agentbank-hero-bg" />
          <img src="/hero-bg.jpg" alt="" className="agentbank-hero-img" />

          <div className="agentbank-hero-badge">
            <div className="agentbank-hero-badge-dot" />
            The Complete Agent Banking Platform
          </div>

          <h1 className="agentbank-hero-title">
            Manage Your Agent Banking<br />
            Operations with <span className="highlight">Precision</span>
          </h1>

          <p className="agentbank-hero-sub">
            AgentBank ERP is purpose-built for banking owners and officers to manage deposits, withdrawals, 
            cash flows, loans, expenses, and daily reconciliation — all in one powerful platform.
          </p>

          <div className="agentbank-hero-actions">
            <Link href="/sign-up" className="agentbank-btn-hero-primary">
              Create Your Bank <IconArrowRight />
            </Link>
            <Link href="/sign-in" className="agentbank-btn-hero-ghost">
              Sign In to Dashboard
            </Link>
          </div>

          <div className="agentbank-hero-stats">
            {[
              { num: 500, suffix: "+", label: "Active Banks" },
              { num: 50000, suffix: "+", label: "Transactions Processed" },
              { num: 99, suffix: ".9%", label: "Uptime" },
              { num: 24, suffix: "/7", label: "Support" },
            ].map((s) => (
              <div key={s.label} className="agentbank-hero-stat">
                <div className="agentbank-hero-stat-num">
                  <AnimatedCounter target={s.num} suffix={s.suffix} />
                </div>
                <div className="agentbank-hero-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ────────────────────────────────────── */}
        <section className="agentbank-section agentbank-divider" id="features">
          <div className="agentbank-section-inner">
            <div className="agentbank-section-header">
              <span className="agentbank-section-label">Platform Features</span>
              <h2 className="agentbank-section-title">Everything Your Banking Team Needs</h2>
              <p className="agentbank-section-sub">
                From day-to-day transactions to advanced reporting — every tool you need is built right in.
              </p>
            </div>
            <div className="agentbank-features-grid">
              <FeatureCard
                icon={<IconCash />}
                title="Deposit & Withdrawal"
                description="Record and track all customer deposits and withdrawals with real-time balance updates across mother accounts and hand cash."
              />
              <FeatureCard
                icon={<IconBuilding />}
                title="Multi-Account Management"
                description="Manage mother accounts, hand cash, and profit accounts in one unified view with automated reconciliation."
              />
              <FeatureCard
                icon={<IconLoan />}
                title="Loan & Credit Tracking"
                description="Issue, monitor, and manage loans with return schedules, overdue alerts, and complete audit trails."
              />
              <FeatureCard
                icon={<IconChartBar />}
                title="Daily Logs & Reports"
                description="Auto-generated daily reports covering all transactions, expenses, commissions, and cash positions."
              />
              <FeatureCard
                icon={<IconUsers />}
                title="Team Role Management"
                description="Add owners, admins, and operators to your bank with granular permission control and activity monitoring."
              />
              <FeatureCard
                icon={<IconShield />}
                title="Secure & Compliant"
                description="Bank-grade encryption, Clerk-powered authentication, and complete activity logs to keep your data protected."
              />
              <FeatureCard
                icon={<IconReport />}
                title="Expense Management"
                description="Categorize and track operational expenses — ink, rent, utilities — deducted from the right accounts automatically."
              />
              <FeatureCard
                icon={<IconChartBar />}
                title="Commission Tracking"
                description="Automatically compute and track agent commissions per transaction type with configurable rules per bank."
              />
            </div>
          </div>
        </section>

        {/* ── How It Works ────────────────────────────────── */}
        <section className="agentbank-section" id="how-it-works">
          <div className="agentbank-section-inner">
            <div className="agentbank-section-header">
              <span className="agentbank-section-label">Getting Started</span>
              <h2 className="agentbank-section-title">Set Up in Three Simple Steps</h2>
              <p className="agentbank-section-sub">
                Whether you're a bank owner launching a new branch or an officer joining an existing one — onboarding takes minutes.
              </p>
            </div>
            <div className="agentbank-steps-grid">
              <StepCard
                step={1}
                title="Create Your Account"
                description="Register as a bank owner or officer. Your Clerk-powered account is secured with multi-factor authentication from day one."
                cta="Register Now"
                href="/sign-up"
              />
              <StepCard
                step={2}
                title="Create or Join a Bank"
                description="Set up your bank profile with name, currency, and accounts. Or get an invitation from your bank owner to join an existing one."
                cta="Create a Bank"
                href="/sign-up"
              />
              <StepCard
                step={3}
                title="Start Operations"
                description="Begin recording transactions, managing cash flows, tracking loans, and generating daily reports — all from your dashboard."
                cta="View Dashboard"
                href="/sign-in"
              />
            </div>
          </div>
        </section>

        {/* ── Who Is This For ─────────────────────────────── */}
        <section className="agentbank-section agentbank-divider">
          <div className="agentbank-section-inner" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
            <div>
              <span className="agentbank-section-label">Designed For</span>
              <h2 className="agentbank-section-title" style={{ marginBottom: "1rem" }}>Built for Banking Professionals</h2>
              <p className="agentbank-section-sub" style={{ marginBottom: "2rem" }}>
                AgentBank ERP is exclusively for banking institutions and their staff. 
                No general public access — only authorized bank owners and officers can register and operate.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {[
                  "Bank Owners who manage one or multiple branches",
                  "Bank Admins overseeing daily operations and staff",
                  "Bank Officers handling deposits, withdrawals, and cash",
                  "Managers requiring daily audit logs and reports",
                  "Loan officers managing credit issuance and collections",
                ].map((item) => (
                  <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                    <IconCheck />
                    <span style={{ fontSize: "0.9rem", color: "var(--ab-text)" }}>{item}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <Link href="/sign-up" className="agentbank-btn-primary">Create Your Bank</Link>
                <Link href="/sign-in" className="agentbank-btn-ghost">Officer Sign In</Link>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {[
                { label: "Bank Owner", icon: "👑", desc: "Full control over bank setup, accounts, and team management" },
                { label: "Admin", icon: "🛡️", desc: "Manage staff, configure accounts, oversee all transactions" },
                { label: "Operator", icon: "💼", desc: "Record daily transactions, deposits, and withdrawals" },
                { label: "Loan Officer", icon: "📋", desc: "Issue and track loans, schedule returns, monitor overdue" },
              ].map((role) => (
                <div key={role.label} style={{
                  background: "var(--ab-glass)", border: "1px solid var(--ab-border)",
                  borderRadius: "16px", padding: "1.5rem", transition: "all 0.3s",
                }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{role.icon}</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>{role.label}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--ab-muted)", lineHeight: 1.5 }}>{role.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────────────── */}
        <section className="agentbank-section" id="pricing">
          <div className="agentbank-section-inner">
            <div className="agentbank-section-header">
              <span className="agentbank-section-label">Pricing Plans</span>
              <h2 className="agentbank-section-title">Simple, Transparent Pricing</h2>
              <p className="agentbank-section-sub">
                Choose the plan that fits your banking operations. Upgrade or downgrade anytime.
              </p>
            </div>
            <div className="agentbank-plans-grid">
              <div className="agentbank-plan-card">
                <div className="agentbank-plan-name">Starter</div>
                <div className="agentbank-plan-price">৳0 <span>/ month</span></div>
                <div className="agentbank-plan-desc">Perfect for a single branch getting started.</div>
                <div className="agentbank-plan-features">
                  {["1 Bank Branch", "Up to 3 Team Members", "Basic Transactions", "Daily Logs", "Email Support"].map(f => (
                    <div key={f} className="agentbank-plan-feature"><IconCheck />{f}</div>
                  ))}
                </div>
                <Link href="/sign-up" className="agentbank-btn-ghost" style={{ justifyContent: "center", marginTop: "0.5rem" }}>Get Started Free</Link>
              </div>
              <div className="agentbank-plan-card popular">
                <div className="agentbank-plan-badge">Most Popular</div>
                <div className="agentbank-plan-name">Professional</div>
                <div className="agentbank-plan-price">৳2,500 <span>/ month</span></div>
                <div className="agentbank-plan-desc">For growing banks with multiple staff and accounts.</div>
                <div className="agentbank-plan-features">
                  {["Unlimited Team Members", "Multi-Account Management", "Loan & Credit Tracking", "Advanced Reports", "Expense Categories", "Priority Support"].map(f => (
                    <div key={f} className="agentbank-plan-feature"><IconCheck />{f}</div>
                  ))}
                </div>
                <Link href="/sign-up" className="agentbank-btn-primary" style={{ justifyContent: "center", marginTop: "0.5rem" }}>Start Free Trial</Link>
              </div>
              <div className="agentbank-plan-card">
                <div className="agentbank-plan-name">Enterprise</div>
                <div className="agentbank-plan-price">Custom</div>
                <div className="agentbank-plan-desc">For banking groups managing multiple branches.</div>
                <div className="agentbank-plan-features">
                  {["Multi-Branch Management", "Custom Integrations", "Dedicated Account Manager", "SLA Guarantee", "On-premise Option", "24/7 Support"].map(f => (
                    <div key={f} className="agentbank-plan-feature"><IconCheck />{f}</div>
                  ))}
                </div>
                <Link href="/sign-in" className="agentbank-btn-ghost" style={{ justifyContent: "center", marginTop: "0.5rem" }}>Contact Sales</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Banner ──────────────────────────────────── */}
        <section className="agentbank-section">
          <div className="agentbank-section-inner">
            <div className="agentbank-cta-banner">
              <div className="agentbank-cta-inner">
                <h2 className="agentbank-cta-title">Ready to Modernize Your Banking Operations?</h2>
                <p className="agentbank-cta-sub">
                  Join hundreds of banking officers already using AgentBank ERP to run error-free, efficient operations every day.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "center" }}>
                  <Link href="/sign-up" className="agentbank-btn-hero-primary">
                    Create Your Bank Now <IconArrowRight />
                  </Link>
                  <Link href="/sign-in" className="agentbank-btn-hero-ghost">
                    Officer Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────── */}
        <footer style={{ background: "var(--ab-navy2)" }}>
          <div className="agentbank-footer">
            <div>
              <div className="agentbank-logo" style={{ marginBottom: "0.5rem" }}>
                <div className="agentbank-logo-icon">A</div>
                <span className="agentbank-logo-text">Agent<span>Bank</span> ERP</span>
              </div>
              <div className="agentbank-footer-copy">© 2026 AgentBank ERP. All rights reserved.</div>
            </div>
            <div className="agentbank-footer-links">
              <Link href="/sign-in" className="agentbank-footer-link">Sign In</Link>
              <Link href="/sign-up" className="agentbank-footer-link">Register</Link>
              <a href="#features" className="agentbank-footer-link">Features</a>
              <a href="#pricing" className="agentbank-footer-link">Pricing</a>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
