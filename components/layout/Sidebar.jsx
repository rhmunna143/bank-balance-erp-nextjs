"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  HandCoins,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  History,
  Receipt,
  FileBarChart,
  Users,
  Settings,
  Palette,
  User,
  X,
  CreditCard,
  Landmark,
  Globe,
  Layers,
  Image as ImageIcon,
  Search,
  ArrowRightLeft,
} from "lucide-react";
import { useBank } from "@/hooks/useBank";
import { useAuth } from "@/hooks/useAuth";
import * as bankService from "@/services/bankService";
import { APP_NAME } from "@/utils/constants";
import { useState, useEffect } from "react";

const navItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Accounts",
    children: [
      { label: "Mother Accounts", path: "/mother-accounts", icon: Building2 },
      { label: "Hand Cash", path: "/hand-cash", icon: HandCoins },
      {
        label: "Profit Accounts",
        path: "/profit-accounts",
        icon: TrendingUp,
        adminOnly: true,
      },
    ],
  },
  {
    label: "Transactions",
    children: [
      { label: "Cash-In", path: "/cash-in", icon: ArrowDownToLine },
      { label: "Deposit", path: "/deposit", icon: Wallet },
      { label: "Withdraw", path: "/withdraw", icon: ArrowUpFromLine },
      { label: "Fund Transfer", path: "/fund-transfer", icon: ArrowRightLeft },
      { label: "History", path: "/transactions", icon: History },
      { label: "Global Search", path: "/search", icon: Search },
    ],
  },
  {
    label: "Management",
    children: [
      { label: "Expenses", path: "/expenses", icon: Receipt },
      { label: "Loans", path: "/loans", icon: Landmark, adminOnly: true },
      { label: "Reports", path: "/reports", icon: FileBarChart },
      { label: "Users", path: "/users", icon: Users, adminOnly: true },
    ],
  },
  {
    label: "Settings",
    children: [
      {
        label: "Bank Settings",
        path: "/settings",
        icon: Settings,
        adminOnly: true,
      },
      {
        label: "Theme",
        path: "/settings/theme",
        icon: Palette,
        adminOnly: true,
      },
      { label: "Profile", path: "/profile", icon: User },
    ],
  },
  // {
  //   label: 'Website',
  //   children: [
  //     { label: 'CMS Dashboard', path: '/admin', icon: Globe, adminOnly: true },
  //     { label: 'Site Settings', path: '/admin/site-settings', icon: Settings, adminOnly: true },
  //     { label: 'Services', path: '/admin/services', icon: Layers, adminOnly: true },
  //     { label: 'Gallery', path: '/admin/gallery', icon: ImageIcon, adminOnly: true },
  //   ],
  // },
];

function NavItem({ item, isAdmin, onClose, pathname, buildLink }) {
  if (item.adminOnly && !isAdmin) return null;

  const href = buildLink(item.path);
  const isActive =
    pathname === href ||
    (item.path !== "/dashboard" && pathname.startsWith(href + "/"));

  return (
    <Link
      href={href}
      onClick={onClose}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        isActive
          ? "bg-primary text-white font-medium"
          : "text-[var(--color-text-muted)] hover:bg-primary-light hover:text-primary"
      }`}
    >
      {item.icon && <item.icon className="h-4 w-4 flex-shrink-0" />}
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar({ open, onClose }) {
  const { isAdmin, bank, bankSlug } = useBank();
  const { isSuperAdmin } = useAuth();
  const pathname = usePathname();
  const [isRootBank, setIsRootBank] = useState(false);

  useEffect(() => {
    const checkRoot = async () => {
      if (!bank) return;
      try {
        const rootBank = await bankService.getRootBank();
        setIsRootBank(rootBank?.bank_id === bank.id);
      } catch {
        setIsRootBank(false);
      }
    };
    checkRoot();
  }, [bank]);

  const buildLink = (path) => {
    const base = isRootBank ? "" : `/${bankSlug}`;
    return `${base}${path}`;
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-surface border-r border-border transition-transform duration-300 lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-sm font-bold text-[var(--color-text)]">
              {bank?.name || APP_NAME}
            </h1>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              {APP_NAME}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden rounded-md p-1 hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {isSuperAdmin && (
          <Link
            href="/superadmin"
            onClick={onClose}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors mb-2 ${
              pathname.startsWith("/superadmin")
                ? "bg-yellow-100 text-yellow-800 font-medium"
                : "text-yellow-600 hover:bg-yellow-50"
            }`}
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            <span>SuperAdmin Panel</span>
          </Link>
        )}
        {navItems.map((item) => {
          if (item.children) {
            const visibleChildren = item.children.filter(
              (child) => !child.adminOnly || isAdmin,
            );
            if (visibleChildren.length === 0) return null;

            return (
              <div key={item.label} className="mt-4 first:mt-0">
                <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {item.label}
                </p>
                <div className="space-y-0.5">
                  {visibleChildren.map((child) => (
                    <NavItem
                      key={child.path}
                      item={child}
                      isAdmin={isAdmin}
                      onClose={onClose}
                      pathname={pathname}
                      buildLink={buildLink}
                    />
                  ))}
                </div>
              </div>
            );
          }

          if (item.adminOnly && !isAdmin) return null;

          return (
            <NavItem
              key={item.path}
              item={item}
              isAdmin={isAdmin}
              onClose={onClose}
              pathname={pathname}
              buildLink={buildLink}
            />
          );
        })}
      </nav>
    </aside>
  );
}
