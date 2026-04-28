# UPDATE-INSTRUCTION.md

## Multi-Tenant General-Purpose Upgrade — Root Route Ownership & SuperAdmin System

**Date:** 2026-03-10
**Goal:** Transform the current single-bank-owner system into a general-purpose multi-tenant platform where:

1. Multiple bank owners can use the system independently.
2. Only **one** owner's landing page is served at the root route (`/`).
3. Other owners access their landing pages via unique slug-based routes (`/:bankSlug`).
4. A **SuperAdmin** role is introduced to manage platform-level settings, including selecting which owner gets the root route. (top powerful role)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Changes (Supabase)](#2-database-changes-supabase)
3. [Constants & Role Updates](#3-constants--role-updates)
4. [Service Layer Changes](#4-service-layer-changes)
5. [Store Layer Changes](#5-store-layer-changes)
6. [Middleware Changes](#6-middleware-changes)
7. [Routing & Page Structure Changes](#7-routing--page-structure-changes)
8. [SuperAdmin Dashboard](#8-superadmin-dashboard)
9. [Component Updates](#9-component-updates)
10. [RLS Policy Updates](#10-rls-policy-updates)
11. [Environment Variables](#11-environment-variables)
12. [Migration Checklist](#12-migration-checklist)

---

## 1. Architecture Overview

### Current State

```
/ (root) → Single bank owner's dashboard (via AppLayout)
/(auth)  → Login / Register / Forgot Password
/create-bank → Bank creation wizard
```

- One user registers → creates one bank → becomes owner → sees dashboard at `/`.
- Roles: `owner`, `admin`, `operator` (within a single bank).

### Target State

```
/                       → Landing page for the "featured" bank (selected by SuperAdmin)
/:bankSlug              → Landing page / dashboard for any other bank owner
/:bankSlug/dashboard    → Bank-specific dashboard
/:bankSlug/transactions → Bank-specific transactions
/:bankSlug/settings     → Bank-specific settings
/superadmin             → SuperAdmin panel (platform-level management)
/(auth)                 → Login / Register / Forgot Password (unchanged)
/create-bank            → Bank creation wizard (unchanged, but now creates with slug)
```

- Roles: `superadmin`, `owner`, `admin`, `operator`.
- The SuperAdmin selects which bank owner's landing page is served at `/`.
- All other owners use `/:bankSlug` as their base path.

---

## 2. Database Changes (Supabase)

### 2.1 New Migration File: `supabase/multi-tenant-upgrade.sql`

Run this in the **Supabase SQL Editor**:

```sql name=supabase/multi-tenant-upgrade.sql
-- =====================================================
-- Multi-Tenant Upgrade: Root Route Ownership & SuperAdmin
-- Run this in Supabase SQL Editor
-- =====================================================

-- 2.1.1: Add `slug` column to `banks` table
ALTER TABLE public.banks
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Backfill existing banks with a slug derived from their name
UPDATE public.banks
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Make slug NOT NULL after backfill
ALTER TABLE public.banks
  ALTER COLUMN slug SET NOT NULL;

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_banks_slug ON public.banks(slug);

-- 2.1.2: Create `platform_settings` table (singleton row for global config)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  root_bank_id UUID REFERENCES public.banks(id) ON DELETE SET NULL,
  platform_name TEXT DEFAULT 'AgentBank ERP',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default singleton row
INSERT INTO public.platform_settings (id, platform_name)
VALUES (gen_random_uuid(), 'AgentBank ERP')
ON CONFLICT DO NOTHING;

-- 2.1.3: Add `is_superadmin` flag to `profiles` table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT FALSE;

-- 2.1.4: Update `bank_members` role CHECK to include 'superadmin' awareness
-- (SuperAdmin is profile-level, not bank-level, so no change needed to bank_members)

-- 2.1.5: RPC to get the root bank slug
CREATE OR REPLACE FUNCTION public.get_root_bank()
RETURNS TABLE(bank_id UUID, bank_slug TEXT, bank_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT ps.root_bank_id, b.slug, b.name
  FROM public.platform_settings ps
  LEFT JOIN public.banks b ON b.id = ps.root_bank_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.1.6: RPC to set the root bank (SuperAdmin only)
CREATE OR REPLACE FUNCTION public.set_root_bank(p_bank_id UUID)
RETURNS VOID AS $$
DECLARE
  v_is_superadmin BOOLEAN;
BEGIN
  SELECT is_superadmin INTO v_is_superadmin
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT v_is_superadmin THEN
    RAISE EXCEPTION 'Only superadmins can change the root bank';
  END IF;

  UPDATE public.platform_settings
  SET root_bank_id = p_bank_id, updated_at = NOW(), updated_by = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.1.7: RPC to get bank by slug
CREATE OR REPLACE FUNCTION public.get_bank_by_slug(p_slug TEXT)
RETURNS TABLE(
  id UUID, name TEXT, slug TEXT, currency TEXT,
  address TEXT, phone TEXT, logo_url TEXT, theme TEXT,
  owner_id UUID, is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.name, b.slug, b.currency,
         b.address, b.phone, b.logo_url, b.theme,
         b.owner_id, b.is_active
  FROM public.banks b
  WHERE b.slug = p_slug AND b.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.1.8: RPC to list all banks (for SuperAdmin panel)
CREATE OR REPLACE FUNCTION public.list_all_banks()
RETURNS TABLE(
  id UUID, name TEXT, slug TEXT, currency TEXT,
  owner_id UUID, owner_email TEXT, is_active BOOLEAN,
  is_root BOOLEAN, created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_is_superadmin BOOLEAN;
BEGIN
  SELECT p.is_superadmin INTO v_is_superadmin
  FROM public.profiles p WHERE p.id = auth.uid();

  IF NOT v_is_superadmin THEN
    RAISE EXCEPTION 'Only superadmins can list all banks';
  END IF;

  RETURN QUERY
  SELECT b.id, b.name, b.slug, b.currency,
         b.owner_id, pr.email AS owner_email, b.is_active,
         (ps.root_bank_id = b.id) AS is_root,
         b.created_at
  FROM public.banks b
  LEFT JOIN public.profiles pr ON pr.id = b.owner_id
  CROSS JOIN public.platform_settings ps
  ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 3. Constants & Role Updates

### 3.1 Update `utils/constants.js`

```javascript name=utils/constants.js
// ADD 'superadmin' role to the ROLES object
export const ROLES = {
  superadmin: 'SuperAdmin',
  owner: 'Owner',
  admin: 'Admin',
  operator: 'Operator',
};

// ADD reserved slugs that cannot be used by bank owners
export const RESERVED_SLUGS = [
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'create-bank',
  'superadmin',
  'api',
  'profile',
  'settings',
];
```

> **Note:** All other constants remain unchanged.

---

## 4. Service Layer Changes

### 4.1 Update `services/bankService.js`

Add the following methods to the existing `bankService` object:

```javascript name=services/bankService.js
// ADD these methods to the existing bankService object:

  // Generate a URL-safe slug from bank name
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  },

  // Get bank by slug
  async getBySlug(slug) {
    const { data, error } = await supabase.rpc('get_bank_by_slug', {
      p_slug: slug,
    });
    if (error) throw error;
    return data?.[0] || null;
  },

  // Get the root bank info
  async getRootBank() {
    const { data, error } = await supabase.rpc('get_root_bank');
    if (error) throw error;
    return data?.[0] || null;
  },
```

Update the existing `create` method to include `slug`:

```javascript name=services/bankService.js
  // MODIFY: In the create() method, add slug to the insert payload:
  async create(bankData, userId) {
    const slug = this.generateSlug(bankData.name);

    // Validate slug is not reserved
    const { RESERVED_SLUGS } = await import('@/utils/constants');
    if (RESERVED_SLUGS.includes(slug)) {
      throw new Error(`The name "${bankData.name}" generates a reserved URL. Please choose a different name.`);
    }

    const { data: bankRows, error: bankError } = await supabase
      .from('banks')
      .insert({
        name: bankData.name,
        slug,                          // ← NEW
        currency: bankData.currency,
        owner_id: userId,
      })
      .select();

    // ... rest of the create method remains the same ...
  },
```

### 4.2 New File: `services/superadminService.js`

```javascript name=services/superadminService.js
import { supabase } from './supabaseClient';

export const superadminService = {
  // Check if current user is superadmin
  async isSuperAdmin(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data?.is_superadmin === true;
  },

  // List all banks (SuperAdmin only — RPC enforces permission)
  async listAllBanks() {
    const { data, error } = await supabase.rpc('list_all_banks');
    if (error) throw error;
    return data || [];
  },

  // Set root bank (SuperAdmin only — RPC enforces permission)
  async setRootBank(bankId) {
    const { error } = await supabase.rpc('set_root_bank', {
      p_bank_id: bankId,
    });
    if (error) throw error;
  },

  // Get current root bank
  async getRootBank() {
    const { data, error } = await supabase.rpc('get_root_bank');
    if (error) throw error;
    return data?.[0] || null;
  },

  // Toggle bank active status
  async toggleBankActive(bankId, isActive) {
    const { data, error } = await supabase
      .from('banks')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', bankId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Get platform settings
  async getPlatformSettings() {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  // Update platform settings
  async updatePlatformSettings(updates) {
    const { data, error } = await supabase
      .from('platform_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
```

---

## 5. Store Layer Changes

### 5.1 Update `stores/authStore.js`

Add `isSuperAdmin` flag to the store state:

```javascript name=stores/authStore.js
// MODIFY: Add is_superadmin to the state and initialization logic

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  session: null,
  isSuperAdmin: false,    // ← NEW
  loading: true,
  initialized: false,

  initialize: async () => {
    try {
      const session = await authService.getSession();
      if (session?.user) {
        let profile = null;
        try {
          profile = await authService.getProfile(session.user.id);
        } catch (e) {
          console.warn('Profile not found, continuing without it');
        }
        set({
          user: session.user,
          profile,
          session,
          isSuperAdmin: profile?.is_superadmin === true,  // ← NEW
          loading: false,
          initialized: true,
        });
      } else {
        set({
          user: null,
          profile: null,
          session: null,
          isSuperAdmin: false,
          loading: false,
          initialized: true,
        });
      }

      // Listen for auth state changes
      authService.onAuthStateChange(async (event, newSession) => {
        if (newSession?.user) {
          let profile = null;
          try {
            profile = await authService.getProfile(newSession.user.id);
          } catch (e) { /* ignore */ }
          set({
            user: newSession.user,
            profile,
            session: newSession,
            isSuperAdmin: profile?.is_superadmin === true,  // ← NEW
            loading: false,
            initialized: true,
          });
        } else {
          set({
            user: null,
            profile: null,
            session: null,
            isSuperAdmin: false,
            loading: false,
            initialized: true,
          });
        }
      });
    } catch (error) {
      console.error('Auth init error:', error);
      set({ loading: false, initialized: true });
    }
  },

  // ... rest of existing methods remain unchanged
}));
```

### 5.2 Update `stores/bankStore.js`

Add slug awareness and root-bank resolution:

```javascript name=stores/bankStore.js
import { create } from 'zustand';
import { bankService } from '@/services/bankService';

export const useBankStore = create((set, get) => ({
  bank: null,
  userRole: null,
  bankSlug: null,              // ← NEW
  expenseCategories: [],
  loading: true,
  loaded: false,

  loadBank: async (userId) => {
    set({ loading: true });
    try {
      const result = await bankService.getByMember(userId);
      if (result) {
        const { userRole, ...bank } = result;
        const categories = await bankService.getExpenseCategories(bank.id);
        set({
          bank,
          userRole,
          bankSlug: bank.slug,       // ← NEW
          expenseCategories: categories,
          loading: false,
          loaded: true,
        });
        return bank;
      }
      set({ bank: null, userRole: null, bankSlug: null, loading: false, loaded: true });
      return null;
    } catch (error) {
      console.error('Load bank error:', error);
      set({ bank: null, userRole: null, bankSlug: null, loading: false, loaded: true });
      return null;
    }
  },

  // Load a specific bank by slug (for visiting another bank's page)
  loadBankBySlug: async (slug) => {                         // ← NEW
    set({ loading: true });
    try {
      const bank = await bankService.getBySlug(slug);
      if (bank) {
        set({ bank, bankSlug: slug, loading: false, loaded: true });
        return bank;
      }
      set({ bank: null, bankSlug: null, loading: false, loaded: true });
      return null;
    } catch (error) {
      console.error('Load bank by slug error:', error);
      set({ bank: null, bankSlug: null, loading: false, loaded: true });
      return null;
    }
  },

  createBank: async (bankData, userId) => {
    const bank = await bankService.create(bankData, userId);
    let categories = [];
    try {
      categories = await bankService.getExpenseCategories(bank.id);
    } catch (e) {
      console.warn('Could not load categories after bank creation:', e);
    }
    set({
      bank,
      userRole: 'owner',
      bankSlug: bank.slug,             // ← NEW
      expenseCategories: categories,
      loading: false,
    });
    return bank;
  },

  // ... rest of existing methods remain unchanged

  isAdmin: () => {
    const role = get().userRole;
    return role === 'owner' || role === 'admin';
  },
}));
```

---

## 6. Middleware Changes

### 6.1 Update `lib/supabase/middleware.js`

The middleware must now handle:
- SuperAdmin routes → only accessible by superadmins
- Bank slug routes → resolve dynamically
- Root route → serve the "featured" bank's dashboard

```javascript name=lib/supabase/middleware.js
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];
const SUPERADMIN_PREFIX = "/superadmin";

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isApiPath = pathname.startsWith("/api");
  const isSuperAdminPath = pathname.startsWith(SUPERADMIN_PREFIX);

  // Always allow API routes
  if (isApiPath) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login (except public paths)
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Guard SuperAdmin routes
  if (user && isSuperAdminPath) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_superadmin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_superadmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
```

---

## 7. Routing & Page Structure Changes

### 7.1 New Directory Structure

```
app/
├── (auth)/                          # Unchanged
│   ├── layout.jsx
│   ├── login/page.jsx
│   ├── register/page.jsx
│   └── forgot-password/page.jsx
├── (app)/                           # Now handles root route for featured bank
│   ├── layout.jsx                   # Updated — resolves root bank
│   └── page.jsx                     # NEW — root landing page (featured bank)
├── [bankSlug]/                      # NEW — dynamic bank routes
│   ├── layout.jsx                   # Resolves bank by slug
│   ├── page.jsx                     # Bank dashboard
│   ├── transactions/page.jsx
│   ├── mother-accounts/page.jsx
│   ├── hand-cash/page.jsx
│   ├── expenses/page.jsx
│   ├── reports/page.jsx
│   ├── users/page.jsx
│   ├── settings/page.jsx
│   └── profile/page.jsx
├── superadmin/                      # NEW — SuperAdmin panel
│   ├── layout.jsx
│   ├── page.jsx                     # Dashboard: list all banks
│   └── settings/page.jsx           # Platform settings
├── create-bank/page.jsx             # Unchanged (but creates with slug)
├── layout.jsx                       # Unchanged
├── loading.jsx                      # Unchanged
├── not-found.jsx                    # Unchanged
└── globals.css                      # Unchanged
```

### 7.2 Root Route: `app/(app)/page.jsx`

```jsx name=app/(app)/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { bankService } from "@/services/bankService";
import { useBankStore } from "@/stores/bankStore";
import { useAuthStore } from "@/stores/authStore";
import { FullPageSpinner } from "@/components/common/LoadingSpinner";

// This page handles the root "/" route.
// It checks if the current user's bank IS the root bank.
// If yes → render dashboard. If no → redirect to /:bankSlug.
export default function RootPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const bank = useBankStore((state) => state.bank);
  const bankSlug = useBankStore((state) => state.bankSlug);
  const loaded = useBankStore((state) => state.loaded);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    if (!loaded || !user) return;

    const resolve = async () => {
      try {
        // SuperAdmin goes to superadmin panel
        if (isSuperAdmin && !bank) {
          router.replace("/superadmin");
          return;
        }

        // No bank → create one
        if (!bank) {
          router.replace("/create-bank");
          return;
        }

        // Check if this bank is the root bank
        const rootBank = await bankService.getRootBank();
        if (rootBank && rootBank.bank_id === bank.id) {
          // Current user's bank IS the root bank → stay here (render dashboard)
          setResolving(false);
        } else {
          // Redirect to the user's bank-specific route
          router.replace(`/${bankSlug}`);
        }
      } catch (error) {
        console.error("Root resolution error:", error);
        if (bankSlug) {
          router.replace(`/${bankSlug}`);
        }
      }
    };

    resolve();
  }, [loaded, user, bank, bankSlug, isSuperAdmin, router]);

  if (resolving) return <FullPageSpinner />;

  // If we reach here, current user owns the root bank — render dashboard
  // Import and render the same dashboard component used in [bankSlug]
  const DashboardContent = require("@/components/dashboard/DashboardContent").default;
  return <DashboardContent />;
}
```

### 7.3 Dynamic Bank Layout: `app/[bankSlug]/layout.jsx`

```jsx name=app/[bankSlug]/layout.jsx
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

    // Skip reserved slugs — let Next.js handle those routes
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
```

### 7.4 Dynamic Bank Dashboard: `app/[bankSlug]/page.jsx`

```jsx name=app/[bankSlug]/page.jsx
"use client";

import DashboardContent from "@/components/dashboard/DashboardContent";

export default function BankDashboardPage() {
  return <DashboardContent />;
}
```

### 7.5 Extract Dashboard Content Component

Move the existing dashboard logic from the current `app/(app)/page.jsx` into a reusable component:

```jsx name=components/dashboard/DashboardContent.jsx
"use client";

// Extract the existing dashboard JSX from app/(app)/page.jsx into this component.
// This component should use useBankStore() to access the current bank context.
// It will be reused in both:
//   - app/(app)/page.jsx       (root route for the featured bank)
//   - app/[bankSlug]/page.jsx  (slug-based routes for other banks)

import { useBankStore } from "@/stores/bankStore";

export default function DashboardContent() {
  const bank = useBankStore((state) => state.bank);

  if (!bank) return null;

  // TODO: Move existing dashboard page content here
  return (
    <div>
      <h1>Dashboard — {bank.name}</h1>
      {/* ... existing dashboard components ... */}
    </div>
  );
}
```

### 7.6 Replicate Existing `(app)` Pages Under `[bankSlug]`

For **each page** currently under `app/(app)/`, create a thin wrapper under `app/[bankSlug]/`:

| Current Path | New Slug-Based Path | Action |
|---|---|---|
| `app/(app)/transactions/page.jsx` | `app/[bankSlug]/transactions/page.jsx` | Import & re-export existing component |
| `app/(app)/mother-accounts/page.jsx` | `app/[bankSlug]/mother-accounts/page.jsx` | Import & re-export existing component |
| `app/(app)/hand-cash/page.jsx` | `app/[bankSlug]/hand-cash/page.jsx` | Import & re-export existing component |
| `app/(app)/expenses/page.jsx` | `app/[bankSlug]/expenses/page.jsx` | Import & re-export existing component |
| `app/(app)/reports/page.jsx` | `app/[bankSlug]/reports/page.jsx` | Import & re-export existing component |
| `app/(app)/users/page.jsx` | `app/[bankSlug]/users/page.jsx` | Import & re-export existing component |
| `app/(app)/settings/page.jsx` | `app/[bankSlug]/settings/page.jsx` | Import & re-export existing component |
| `app/(app)/profile/page.jsx` | `app/[bankSlug]/profile/page.jsx` | Import & re-export existing component |

**Example wrapper pattern (DRY approach):**

```jsx name=app/[bankSlug]/transactions/page.jsx
// Thin re-export — avoids duplicating page logic
export { default } from "@/app/(app)/transactions/page";
```

> **Important:** You should extract the actual page logic from `app/(app)/*/page.jsx` into `components/pages/` shared components and import them from both route groups. This keeps the code DRY.

---

## 8. SuperAdmin Dashboard

### 8.1 SuperAdmin Layout: `app/superadmin/layout.jsx`

```jsx name=app/superadmin/layout.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { FullPageSpinner } from "@/components/common/LoadingSpinner";

export default function SuperAdminLayout({ children }) {
  const router = useRouter();
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const initialized = useAuthStore((state) => state.initialized);
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
      <header className="border-b border-border bg-surface px-6 py-4">
        <h1 className="text-xl font-bold text-[var(--color-text)]">
          SuperAdmin Panel
        </h1>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

### 8.2 SuperAdmin Dashboard Page: `app/superadmin/page.jsx`

```jsx name=app/superadmin/page.jsx
"use client";

import { useEffect, useState } from "react";
import { superadminService } from "@/services/superadminService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Building2, Star, ToggleLeft, ToggleRight } from "lucide-react";
import toast from "react-hot-toast";

export default function SuperAdminDashboard() {
  const [banks, setBanks] = useState([]);
  const [rootBankId, setRootBankId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bankList, rootBank] = await Promise.all([
        superadminService.listAllBanks(),
        superadminService.getRootBank(),
      ]);
      setBanks(bankList);
      setRootBankId(rootBank?.bank_id || null);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSetRoot = async (bankId) => {
    try {
      await superadminService.setRootBank(bankId);
      setRootBankId(bankId);
      toast.success("Root bank updated!");
    } catch (error) {
      toast.error(error.message || "Failed to set root bank");
    }
  };

  const handleToggleActive = async (bankId, currentState) => {
    try {
      await superadminService.toggleBankActive(bankId, !currentState);
      setBanks((prev) =>
        prev.map((b) =>
          b.id === bankId ? { ...b, is_active: !currentState } : b
        )
      );
      toast.success("Bank status updated!");
    } catch (error) {
      toast.error("Failed to update bank status");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-text)]">
          All Registered Banks
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select which bank gets the root route (<code>/</code>) landing page.
        </p>
      </div>

      <div className="grid gap-4">
        {banks.map((bank) => (
          <Card key={bank.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle className="text-lg">{bank.name}</CardTitle>
                {bank.id === rootBankId && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <Star className="h-3 w-3" /> Root
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Slug: <code>/{bank.slug}</code></p>
                  <p>Owner: {bank.owner_email}</p>
                  <p>Currency: {bank.currency}</p>
                  <p>
                    Status:{" "}
                    <span className={bank.is_active ? "text-green-600" : "text-red-600"}>
                      {bank.is_active ? "Active" : "Inactive"}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(bank.id, bank.is_active)}
                  >
                    {bank.is_active ? (
                      <ToggleRight className="h-4 w-4 mr-1" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 mr-1" />
                    )}
                    {bank.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  {bank.id !== rootBankId && bank.is_active && (
                    <Button
                      size="sm"
                      onClick={() => handleSetRoot(bank.id)}
                    >
                      <Star className="h-4 w-4 mr-1" />
                      Set as Root
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## 9. Component Updates

### 9.1 Update `components/layout/Sidebar.jsx`

Update all navigation links to be slug-aware:

```javascript name=components/layout/Sidebar.jsx
// MODIFY: Navigation links should use the current bank's slug.
// Use the bankSlug from useBankStore to build URLs.
//
// Example:
//   Before: href="/"
//   After:  href={isRootBank ? "/" : `/${bankSlug}`}
//
//   Before: href="/transactions"
//   After:  href={isRootBank ? "/transactions" : `/${bankSlug}/transactions`}

// ADD to Sidebar component:
import { useBankStore } from "@/stores/bankStore";
import { useEffect, useState } from "react";
import { bankService } from "@/services/bankService";

// Inside the component:
const bankSlug = useBankStore((state) => state.bankSlug);
const bank = useBankStore((state) => state.bank);
const [isRootBank, setIsRootBank] = useState(false);

useEffect(() => {
  const checkRoot = async () => {
    if (!bank) return;
    const rootBank = await bankService.getRootBank();
    setIsRootBank(rootBank?.bank_id === bank.id);
  };
  checkRoot();
}, [bank]);

// Helper function for building links:
const buildLink = (path) => {
  const base = isRootBank ? "" : `/${bankSlug}`;
  return `${base}${path}`;
};

// Then use:  href={buildLink("/")}  or  href={buildLink("/transactions")}
```

### 9.2 Update `components/layout/AppLayout.jsx`

Update the redirect logic — instead of always pushing to `/`, redirect to the appropriate bank-slug path:

```javascript name=components/layout/AppLayout.jsx
// MODIFY the redirect logic in AppLayout:

// Before:
// router.push('/create-bank');

// After:
// router.push('/create-bank');  ← This stays the same

// But REMOVE the assumption that "/" is always this user's dashboard.
// The AppLayout should be bank-context-aware through bankStore.
```

### 9.3 Update `components/forms/BankForm.jsx`

Add a `slug` preview field so owners can see their generated URL:

```jsx name=components/forms/BankForm.jsx
// ADD: A slug preview below the bank name field

// Inside the form, after the name input:
<div className="text-sm text-muted-foreground mt-1">
  Your bank URL: <code>/{name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}</code>
</div>
```

---

## 10. RLS Policy Updates

### 10.1 New RLS Policies: `supabase/multi-tenant-rls.sql`

```sql name=supabase/multi-tenant-rls.sql
-- =====================================================
-- RLS Policies for Multi-Tenant Upgrade
-- Run AFTER multi-tenant-upgrade.sql
-- =====================================================

-- Platform Settings: only superadmins can modify
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Anyone can read platform settings" ON public.platform_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Superadmins can update platform settings" ON public.platform_settings;
CREATE POLICY "Superadmins can update platform settings" ON public.platform_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_superadmin = TRUE
    )
  );

-- Banks: Allow public read of active banks (for slug resolution)
-- Keep existing member-based policies for write operations
DROP POLICY IF EXISTS "Public can read active banks by slug" ON public.banks;
CREATE POLICY "Public can read active banks by slug" ON public.banks
  FOR SELECT USING (is_active = TRUE);
```

---

## 11. Environment Variables

No new env vars are strictly required. However, optionally add:

```env name=.env.local
# Optional: Pre-set the default superadmin email during first deployment
SUPERADMIN_EMAIL=admin@example.com
```

### 11.1 Seed Script for First SuperAdmin: `scripts/seed-superadmin.js`

```javascript name=scripts/seed-superadmin.js
// Run once to promote a user to superadmin:
// node scripts/seed-superadmin.js <user-email>
//
// OR run this SQL directly in Supabase SQL Editor:
//
//   UPDATE public.profiles
//   SET is_superadmin = TRUE
//   WHERE email = 'your-email@example.com';
```

---

## 12. Migration Checklist

### Phase 1: Database
- [ ] Run `supabase/multi-tenant-upgrade.sql` in Supabase SQL Editor
- [ ] Run `supabase/multi-tenant-rls.sql` in Supabase SQL Editor
- [ ] Verify all existing banks now have a `slug` column populated
- [ ] Promote your user to superadmin via SQL:
  ```sql
  UPDATE public.profiles SET is_superadmin = TRUE WHERE email = 'your-email@example.com';
  ```
- [ ] Insert a `platform_settings` row with `root_bank_id` pointing to the desired bank

### Phase 2: Backend / Services
- [ ] Update `utils/constants.js` — add `superadmin` role, add `RESERVED_SLUGS`
- [ ] Update `services/bankService.js` — add `slug`, `getBySlug()`, `getRootBank()`, `generateSlug()`
- [ ] Create `services/superadminService.js`
- [ ] Update `stores/authStore.js` — add `isSuperAdmin`
- [ ] Update `stores/bankStore.js` — add `bankSlug`, `loadBankBySlug()`

### Phase 3: Middleware
- [ ] Update `lib/supabase/middleware.js` — add superadmin route guard

### Phase 4: Routing & Pages
- [ ] Extract dashboard content into `components/dashboard/DashboardContent.jsx`
- [ ] Create `app/[bankSlug]/layout.jsx`
- [ ] Create `app/[bankSlug]/page.jsx`
- [ ] Create slug-based thin wrappers for all existing `(app)` pages
- [ ] Update `app/(app)/page.jsx` — add root bank resolution logic
- [ ] Create `app/superadmin/layout.jsx`
- [ ] Create `app/superadmin/page.jsx`

### Phase 5: Components
- [ ] Update Sidebar navigation to be slug-aware
- [ ] Update AppLayout redirect logic
- [ ] Update BankForm to include slug preview
- [ ] Update any hardcoded `href="/"` links throughout components

### Phase 6: Testing
- [ ] Test: Owner of root bank sees dashboard at `/`
- [ ] Test: Owner of non-root bank is redirected to `/:bankSlug`
- [ ] Test: SuperAdmin can access `/superadmin`
- [ ] Test: SuperAdmin can change which bank owns the root route
- [ ] Test: Non-superadmin users cannot access `/superadmin`
- [ ] Test: New bank creation generates a valid, unique slug
- [ ] Test: Reserved slugs are rejected during bank creation
- [ ] Test: Existing auth flows (login/register/logout) still work
- [ ] Test: All existing bank operations work under `/:bankSlug` routes

---

## Summary of Key Design Decisions

| Decision | Rationale |
|---|---|
| **Slug on `banks` table** | Clean URLs (`/my-bank`) instead of UUIDs; SEO-friendly |
| **`platform_settings` singleton** | Single source of truth for which bank owns `/` |
| **SuperAdmin is profile-level** | Not tied to any bank; platform-wide privilege |
| **RPC functions for sensitive ops** | `SECURITY DEFINER` ensures permission checks bypass RLS when needed |
| **Thin re-export pages** | DRY pattern: logic lives in shared components, route files are minimal wrappers |
| **Middleware guards** | Server-side protection before any page renders — cannot be bypassed client-side |
| **`RESERVED_SLUGS` constant** | Prevents conflicts between bank slugs and system routes |