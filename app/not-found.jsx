"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
      <div className="text-center space-y-4">
        <FileQuestion className="mx-auto h-16 w-16 text-[var(--color-text-muted)]" />
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-[var(--color-text-muted)]">Page not found</p>
        <Link href="/dashboard">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
