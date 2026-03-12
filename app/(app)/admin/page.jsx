"use client";

import { useBank } from "@/hooks/useBank";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import Link from "next/link";
import {
  Globe,
  Settings,
  Image,
  Layers,
  MessageSquareQuote,
  HelpCircle,
  LayoutDashboard,
  ImageIcon,
} from "lucide-react";

const cmsPages = [
  {
    label: "Site Settings",
    description: "Manage site name, colors, logo, contact info, and social links",
    href: "/admin/site-settings",
    icon: Settings,
  },
  {
    label: "Hero Section",
    description: "Edit the hero banner — title, subtitle, background image, CTA",
    href: "/admin/hero",
    icon: Image,
  },
  {
    label: "About Section",
    description: "Edit the about section — text content and image",
    href: "/admin/about",
    icon: LayoutDashboard,
  },
  {
    label: "Services",
    description: "Add, edit, or remove service cards shown on the landing page",
    href: "/admin/services",
    icon: Layers,
  },
  {
    label: "Testimonials",
    description: "Manage customer testimonials and reviews",
    href: "/admin/testimonials",
    icon: MessageSquareQuote,
  },
  {
    label: "FAQs",
    description: "Manage frequently asked questions",
    href: "/admin/faqs",
    icon: HelpCircle,
  },
  {
    label: "Gallery",
    description: "Upload and manage images for the landing page",
    href: "/admin/gallery",
    icon: ImageIcon,
  },
];

export default function AdminCMSPage() {
  const { bank, isAdmin, loading } = useBank();

  if (loading) return <LoadingSpinner />;
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[var(--color-text-muted)]">You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Website CMS</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Manage your public landing page content
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          target="_blank"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <Globe className="h-4 w-4" />
          View Landing Page
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cmsPages.map((page) => (
          <Link key={page.href} href={page.href}>
            <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <page.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{page.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--color-text-muted)]">{page.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
