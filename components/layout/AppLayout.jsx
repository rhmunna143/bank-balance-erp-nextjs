"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuthStore } from '@/stores/authStore';
import { useBankStore } from '@/stores/bankStore';
import { FullPageSpinner } from '@/components/common/LoadingSpinner';

export function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const bank = useBankStore((state) => state.bank);
  const bankLoading = useBankStore((state) => state.loading);
  const bankLoaded = useBankStore((state) => state.loaded);
  const loadBank = useBankStore((state) => state.loadBank);
  const router = useRouter();

  useEffect(() => {
    if (user && !bank && !bankLoaded) {
      loadBank(user.id);
    }
  }, [user, bank, bankLoaded, loadBank]);

  // Only redirect after loadBank has actually completed and found no bank
  useEffect(() => {
    if (bankLoaded && !bank && user) {
      router.push('/create-bank');
    }
  }, [bankLoaded, bank, user, router]);

  if (bankLoading || !bankLoaded) return <FullPageSpinner />;

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
