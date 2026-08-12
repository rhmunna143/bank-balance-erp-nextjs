"use client";

import { Menu, Bell, LogOut, User, ChevronDown, RefreshCw, RotateCcw } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useBank } from '@/hooks/useBank';
import { useAlerts } from '@/hooks/useAlerts';
import { useTransactionStore } from '@/stores/transactionStore';

export function Topbar({ onMenuClick }) {
  const { profile, signOut } = useAuth();
  const { bank } = useBank();
  const { alerts } = useAlerts(bank?.id);
  const { triggerRefresh } = useTransactionStore();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-surface px-4 md:px-6">
      {/* Mobile menu button */}
      <button onClick={onMenuClick} className="lg:hidden rounded-md p-2 hover:bg-gray-100">
        <Menu className="h-5 w-5" />
      </button>

      {/* Bank name (mobile) */}
      <div className="lg:hidden flex-1">
        <h2 className="text-sm font-semibold truncate">{bank?.name || 'AgentBank ERP'}</h2>
      </div>

      <div className="hidden lg:block flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Soft Refresh button */}
        <button
          onClick={() => {
            setSpinning(true);
            triggerRefresh();
            setTimeout(() => setSpinning(false), 800);
          }}
          className="rounded-md p-2 hover:bg-gray-100"
          title="Refresh data"
        >
          <RefreshCw className={`h-5 w-5 text-[var(--color-text-muted)] transition-transform ${spinning ? 'animate-spin' : ''}`} />
        </button>

        {/* Hard Refresh button */}
        <button
          onClick={() => window.location.reload()}
          className="rounded-md p-2 hover:bg-gray-100"
          title="Hard refresh (reload page)"
        >
          <RotateCcw className="h-5 w-5 text-[var(--color-text-muted)]" />
        </button>

        {/* Alerts bell */}
        <button
          onClick={() => router.push('/dashboard')}
          className="relative rounded-md p-2 hover:bg-gray-100"
        >
          <Bell className="h-5 w-5 text-[var(--color-text-muted)]" />
          {alerts.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] text-white font-bold">
              {alerts.length}
            </span>
          )}
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-md p-2 hover:bg-gray-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-sm font-medium">
              {profile?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="hidden md:block text-sm font-medium text-[var(--color-text)]">
              {profile?.full_name || 'User'}
            </span>
            <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-surface shadow-lg py-1 z-50">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  router.push('/profile');
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
              >
                <User className="h-4 w-4" />
                Profile
              </button>
              <hr className="my-1 border-border" />
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
