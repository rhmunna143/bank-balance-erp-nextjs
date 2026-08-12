"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useBankStore } from "@/stores/bankStore";
import { useUser } from "@clerk/nextjs";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardSkeleton } from "@/components/common/DashboardSkeleton";
import { RESERVED_SLUGS } from "@/utils/constants";

export default function BankSlugLayout({ children }) {
  const { bankSlug } = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const loadBankBySlug = useBankStore((state) => state.loadBankBySlug);
  const bank = useBankStore((state) => state.bank);
  const [loading, setLoading] = useState(true);

  // Check if we're on the public landing page (exact /{bankSlug})
  const isLandingPage = pathname === `/${bankSlug}`;

  useEffect(() => {
    if (!bankSlug) return;

    if (RESERVED_SLUGS.includes(bankSlug)) {
      setLoading(false);
      return;
    }

    // Landing page doesn't require auth — just resolve the bank
    if (isLandingPage) {
      const load = async () => {
        const resolved = await loadBankBySlug(bankSlug);
        if (!resolved) {
          router.replace("/not-found");
        }
        setLoading(false);
      };
      load();
      return;
    }

    // All other pages require auth
    if (!user) return;

    const load = async () => {
      const resolved = await loadBankBySlug(bankSlug);
      if (!resolved) {
        router.replace("/not-found");
      }
      setLoading(false);
    };

    load();
  }, [user, bankSlug, loadBankBySlug, router, isLandingPage]);

  if (loading) return <DashboardSkeleton />;

  // Landing page: render without AppLayout wrapper
  if (isLandingPage) {
    return <div className="min-h-screen">{children}</div>;
  }

  return <AppLayout>{children}</AppLayout>;
}
