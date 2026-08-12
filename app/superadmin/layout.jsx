"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { FullPageSpinner } from "@/components/common/LoadingSpinner";
import Link from "next/link";

export default function SuperAdminLayout({ children }) {
  const router = useRouter();
  const { isSuperAdmin, initialized } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!initialized) return;
    if (!isSuperAdmin) {
      router.replace("/");
      return;
    }
    setChecked(true);
  }, [initialized, isSuperAdmin, router]);

  if (!checked) return <FullPageSpinner />;

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="border-b border-border bg-[var(--color-surface)] px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--color-text)]">
          SuperAdmin Panel
        </h1>
        <nav className="flex items-center gap-4">
          <Link href="/superadmin" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            Banks
          </Link>
          <Link href="/superadmin/settings" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            Settings
          </Link>
          <Link href="/" className="text-sm text-[var(--color-primary)] hover:underline">
            ← Back to App
          </Link>
        </nav>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
