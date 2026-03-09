"use client";

import { CreditCard } from 'lucide-react';
import { APP_NAME } from '@/utils/constants';

export function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <CreditCard className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-[var(--color-text)]">{APP_NAME}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
