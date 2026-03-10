"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useBankStore } from "@/stores/bankStore";
import { useAuthStore } from "@/stores/authStore";
import { AppLayout } from "@/components/layout/AppLayout";
import { FullPageSpinner } from "@/components/common/LoadingSpinner";
import { RESERVED_SLUGS } from "@/utils/constants";

export default function BankSlugLayout({ children }) {
  const { bankSlug } = useParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const loadBankBySlug = useBankStore((state) => state.loadBankBySlug);
  const bank = useBankStore((state) => state.bank);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !bankSlug) return;

    if (RESERVED_SLUGS.includes(bankSlug)) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const resolved = await loadBankBySlug(bankSlug);
      if (!resolved) {
        router.replace("/not-found");
      }
      setLoading(false);
    };

    load();
  }, [user, bankSlug, loadBankBySlug, router]);

  if (loading) return <FullPageSpinner />;

  return <AppLayout>{children}</AppLayout>;
}
