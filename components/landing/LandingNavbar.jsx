"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { SignedIn, SignedOut, UserButton, useAuth } from "@clerk/nextjs";

export function LandingNavbar({ siteName, logoUrl, primaryColor, bankSlug }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isSignedIn } = useAuth();
  const homeHref = bankSlug ? `/${bankSlug}` : '/';

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={homeHref} className="flex items-center gap-2">
            {logoUrl && (
              <img src={logoUrl} alt={siteName} className="h-8 w-auto" />
            )}
            <span className="text-xl font-bold" style={{ color: primaryColor || '#1a56db' }}>
              {siteName || 'Agent Banking'}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#about" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">About</a>
            <a href="#services" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Services</a>
            <a href="#testimonials" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Testimonials</a>
            <a href="#faq" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">FAQ</a>
            <a href="#contact" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
          </div>

          {/* Auth Actions */}
          <div className="hidden md:flex items-center gap-4 ml-4">
            {!isSignedIn ? (
              <>
                <Link href="/sign-in" className="text-sm font-medium text-gray-700 hover:text-gray-900">Sign In</Link>
                <Link href="/sign-up" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Get Started</Link>
              </>
            ) : (
              <>
                <Link href="/dashboard" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Dashboard</Link>
                <UserButton afterSignOutUrl="/" />
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden p-2 ml-auto" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t py-4 space-y-2">
            <a href="#about" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded">About</a>
            <a href="#services" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded">Services</a>
            <a href="#testimonials" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded">Testimonials</a>
            <a href="#faq" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded">FAQ</a>
            <a href="#contact" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded">Contact</a>
          </div>
        )}
      </div>
    </nav>
  );
}
