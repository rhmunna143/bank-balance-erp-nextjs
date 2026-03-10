# INSTRUCTION.md — AgentBank ERP Feature Implementation Guide

> **Purpose**: This file is a context-engineering document for GitHub Copilot in VS Code. Open this file alongside your codebase so Copilot has full context when you use inline chat (`Ctrl+I`), chat panel, or Copilot Edits.

---

## 📌 Project Overview

**Repo**: `rhmunna143/bank-balance-erp-nextjs`
**Stack**: Next.js 16 (App Router, JSX), Supabase (Auth + Postgres + RLS), Zustand, Tailwind CSS 3.4, Radix UI, React Hook Form + Zod, Lucide Icons
**Architecture**:
- `app/(app)/` — authenticated ERP dashboard (route group with sidebar layout)
- `app/(auth)/` — login/register/forgot-password pages
- `app/api/` — API routes (auth callback)
- `services/` — client-side Supabase service layer (singleton browser client via `services/supabaseClient.js`)
- `stores/` — Zustand stores (`authStore`, `bankStore`, `transactionStore`, `themeStore`)
- `components/` — `ui/`, `layout/`, `forms/`, `tables/`, `charts/`, `alerts/`, `reports/`, `transactions/`, `common/`
- `lib/supabase/` — server-side Supabase client + middleware
- `supabase/` — SQL migrations
- `utils/constants.js` — shared constants
- `hooks/` — custom hooks (e.g., `useBank`)
- `themes/` — theme CSS variables
- `providers/` — React context providers

**Database tables** (Supabase Postgres): `profiles`, `banks`, `bank_members`, `mother_accounts`, `hand_cash_accounts`, `profit_accounts`, `transactions`, `expenses`, `expense_categories`, `daily_logs`, `bank_backups`

**Key patterns to follow**:
- Services use `import { supabase } from './supabaseClient'` (browser client singleton)
- Server components use `import { createClient } from '@/lib/supabase/server'`
- All financial mutations go through Supabase RPC functions (`SECURITY DEFINER`)
- RLS policies use helper functions: `get_my_bank_ids()`, `get_my_admin_bank_ids()`
- Zustand stores are imported directly (no providers needed)
- UI components follow shadcn/ui pattern (Radix + CVA + Tailwind)
- Currency formatting via `utils/currency.js` → `formatCurrency()`
- Multi-tenant: everything is scoped by `bank_id`

---

## 🎯 Feature 1: Short-Term Loan System

### 1.1 Business Logic

- System **users** (bank members) can take short-term loans from **hand cash**, **mother account**, or **profit account**.
- When a loan is **issued**, it is recorded as an **expense** (deducted from the source account).
- When a loan is **returned**, the expense is **healed** (reversed) — the returned amount is credited back to the source account.
- Partial returns are supported. Loan status: `active` → `partially_returned` → `returned`.
- Each loan tracks: borrower (user), source account, amount, returned amount, status, due date (optional), notes.

### 1.2 Database Migration — `supabase/loan-migration.sql`

Create this file. Run in Supabase SQL Editor.

```sql
-- =====================================================
-- Short-Term Loan System Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. LOANS TABLE
CREATE TABLE IF NOT EXISTS public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  borrower_user_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  returned_amount NUMERIC(15,2) DEFAULT 0 CHECK (returned_amount >= 0),
  source_type TEXT NOT NULL CHECK (source_type IN ('hand_cash', 'mother_account', 'profit_account')),
  source_account_id UUID, -- NULL for hand_cash, references mother_accounts or profit_accounts
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partially_returned', 'returned')),
  expense_id UUID REFERENCES public.expenses(id), -- links to the expense created on disbursal
  due_date DATE,
  notes TEXT,
  issued_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- 2. LOAN RETURNS TABLE (tracks each return payment)
CREATE TABLE IF NOT EXISTS public.loan_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  returned_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.loan_returns ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Members can view loans" ON public.loans;
CREATE POLICY "Members can view loans" ON public.loans FOR SELECT
  USING (bank_id IN (SELECT public.get_my_bank_ids()));

DROP POLICY IF EXISTS "Admins can insert loans" ON public.loans;
CREATE POLICY "Admins can insert loans" ON public.loans FOR INSERT
  WITH CHECK (bank_id IN (SELECT public.get_my_admin_bank_ids()));

DROP POLICY IF EXISTS "Admins can update loans" ON public.loans;
CREATE POLICY "Admins can update loans" ON public.loans FOR UPDATE
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));

DROP POLICY IF EXISTS "Members can view loan returns" ON public.loan_returns;
CREATE POLICY "Members can view loan returns" ON public.loan_returns FOR SELECT
  USING (bank_id IN (SELECT public.get_my_bank_ids()));

DROP POLICY IF EXISTS "Admins can insert loan returns" ON public.loan_returns;
CREATE POLICY "Admins can insert loan returns" ON public.loan_returns FOR INSERT
  WITH CHECK (bank_id IN (SELECT public.get_my_admin_bank_ids()));

-- 4. RPC: Issue Loan (creates expense + loan record atomically)
CREATE OR REPLACE FUNCTION public.process_loan_issue(
  p_bank_id UUID,
  p_borrower_user_id UUID,
  p_amount NUMERIC,
  p_source_type TEXT,
  p_source_account_id UUID DEFAULT NULL,
  p_due_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_expense_id UUID;
  v_loan_id UUID;
  v_category_id UUID;
BEGIN
  -- Get or create "Loan" expense category
  SELECT id INTO v_category_id FROM public.expense_categories
    WHERE bank_id = p_bank_id AND name = 'Loan' LIMIT 1;
  IF v_category_id IS NULL THEN
    INSERT INTO public.expense_categories (bank_id, name)
    VALUES (p_bank_id, 'Loan') RETURNING id INTO v_category_id;
  END IF;

  -- Create expense (deducts from source)
  v_expense_id := public.process_expense(
    p_bank_id,
    p_amount,
    v_category_id,
    p_source_type,
    CASE WHEN p_source_type = 'profit_account' THEN p_source_account_id ELSE NULL END,
    CASE WHEN p_source_type = 'mother_account' THEN p_source_account_id ELSE NULL END,
    COALESCE(p_notes, 'Short-term loan issued'),
    NULL
  );

  -- Create loan record
  INSERT INTO public.loans (bank_id, borrower_user_id, amount, source_type, source_account_id, expense_id, due_date, notes, issued_by)
  VALUES (p_bank_id, p_borrower_user_id, p_amount, p_source_type, p_source_account_id, v_expense_id, p_due_date, p_notes, auth.uid())
  RETURNING id INTO v_loan_id;

  RETURN v_loan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: Return Loan (credits back to source account)
CREATE OR REPLACE FUNCTION public.process_loan_return(
  p_loan_id UUID,
  p_amount NUMERIC,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_loan RECORD;
  v_return_id UUID;
  v_remaining NUMERIC;
BEGIN
  SELECT * INTO v_loan FROM public.loans WHERE id = p_loan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Loan not found'; END IF;
  IF v_loan.status = 'returned' THEN RAISE EXCEPTION 'Loan already fully returned'; END IF;

  v_remaining := v_loan.amount - v_loan.returned_amount;
  IF p_amount > v_remaining THEN RAISE EXCEPTION 'Return amount exceeds remaining balance'; END IF;

  -- Credit back to source account
  IF v_loan.source_type = 'hand_cash' THEN
    UPDATE public.hand_cash_accounts SET balance = balance + p_amount WHERE bank_id = v_loan.bank_id;
  ELSIF v_loan.source_type = 'mother_account' AND v_loan.source_account_id IS NOT NULL THEN
    UPDATE public.mother_accounts SET balance = balance + p_amount WHERE id = v_loan.source_account_id;
  ELSIF v_loan.source_type = 'profit_account' AND v_loan.source_account_id IS NOT NULL THEN
    UPDATE public.profit_accounts SET balance = balance + p_amount WHERE id = v_loan.source_account_id;
  END IF;

  -- Record the return
  INSERT INTO public.loan_returns (loan_id, bank_id, amount, returned_by, notes)
  VALUES (p_loan_id, v_loan.bank_id, p_amount, auth.uid(), p_notes)
  RETURNING id INTO v_return_id;

  -- Update loan
  UPDATE public.loans SET
    returned_amount = returned_amount + p_amount,
    status = CASE
      WHEN (returned_amount + p_amount) >= amount THEN 'returned'
      ELSE 'partially_returned'
    END,
    updated_at = NOW()
  WHERE id = p_loan_id;

  RETURN v_return_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 1.3 Service Layer — `services/loanService.js`

Create this file following the existing service pattern (import from `./supabaseClient`):

```javascript
import { supabase } from './supabaseClient';

export const loanService = {
  // Issue a new loan
  async issueLoan(params) {
    const { data, error } = await supabase.rpc('process_loan_issue', {
      p_bank_id: params.bank_id,
      p_borrower_user_id: params.borrower_user_id,
      p_amount: parseFloat(params.amount),
      p_source_type: params.source_type,
      p_source_account_id: params.source_account_id || null,
      p_due_date: params.due_date || null,
      p_notes: params.notes || null,
    });
    if (error) throw error;
    return data;
  },

  // Return (full or partial) a loan
  async returnLoan(params) {
    const { data, error } = await supabase.rpc('process_loan_return', {
      p_loan_id: params.loan_id,
      p_amount: parseFloat(params.amount),
      p_notes: params.notes || null,
    });
    if (error) throw error;
    return data;
  },

  // Get all loans for a bank
  async getAll(bankId, filters = {}) {
    let query = supabase
      .from('loans')
      .select('*, borrower:profiles!borrower_user_id(full_name, email), issuer:profiles!issued_by(full_name)', { count: 'exact' })
      .eq('bank_id', bankId)
      .order('created_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.borrower_user_id) query = query.eq('borrower_user_id', filters.borrower_user_id);
    if (filters.limit) query = query.limit(filters.limit);
    if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data, count };
  },

  // Get returns for a specific loan
  async getReturns(loanId) {
    const { data, error } = await supabase
      .from('loan_returns')
      .select('*, returned_by_profile:profiles!returned_by(full_name)')
      .eq('loan_id', loanId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
};
```

### 1.4 Constants Update — `utils/constants.js`

Add to the existing file:

```javascript
export const LOAN_STATUSES = {
  active: 'Active',
  partially_returned: 'Partially Returned',
  returned: 'Returned',
};
```

### 1.5 UI Components to Create

**File structure:**
```
app/(app)/loans/page.jsx           — Main loans list page
components/forms/LoanIssueForm.jsx — Form to issue a new loan
components/forms/LoanReturnForm.jsx — Form to return a loan (full/partial)
components/tables/LoanTable.jsx    — Table displaying loans with status badges
```

**Loans page** (`app/(app)/loans/page.jsx`):
- Copilot prompt: "Create a loans management page following the pattern of `app/(app)/expenses/page.jsx`. Use `loanService` for data. Show a table of loans with columns: Borrower, Amount, Returned, Remaining, Source, Status (badge), Due Date, Actions. Include a dialog to issue new loan (LoanIssueForm) and a dialog to return loan (LoanReturnForm). Add filters for status. Admin-only page."

**LoanIssueForm** (`components/forms/LoanIssueForm.jsx`):
- Copilot prompt: "Create a loan issue form using react-hook-form + zod. Fields: borrower (select from bank members via `userService.getMembers`), amount (number), source type (radio: hand_cash, mother_account, profit_account), source account (conditional select — show mother accounts or profit accounts based on source type), due date (optional date input), notes (textarea). On submit call `loanService.issueLoan()`. Follow the pattern of existing forms in `components/forms/`."

**LoanReturnForm** (`components/forms/LoanReturnForm.jsx`):
- Copilot prompt: "Create a loan return form. Show loan details (borrower, total amount, already returned, remaining). Fields: return amount (max = remaining), notes. On submit call `loanService.returnLoan()`. Use react-hook-form + zod."

**LoanTable** (`components/tables/LoanTable.jsx`):
- Copilot prompt: "Create a loan table component following `components/tables/TransactionTable.jsx` pattern. Columns: Borrower Name, Amount, Returned Amount, Remaining, Source (hand_cash/mother_account/profit_account with account name), Status (colored badge: green=returned, yellow=partially_returned, red=active), Due Date, Issued Date, Actions (Return button if not fully returned)."

### 1.6 Sidebar Navigation Update

In `components/layout/Sidebar.jsx`, add the loan nav item inside the existing nav items array:

```javascript
// Add after the 'Expenses' item:
{
  label: 'Loans',
  path: '/loans',
  icon: HandCoins, // or use a different lucide icon like "Landmark"
  adminOnly: true,
},
```

---

## 🎯 Feature 2: Dynamic Landing Page

### 2.1 Route Architecture Changes

**Current state**: The root `/` route is inside `app/(app)/page.jsx` which is the authenticated dashboard.

**Target state**:
| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/` | Public landing page | ❌ |
| `/dashboard` | ERP dashboard (currently at `/`) | ✅ |
| `/admin` | Landing page CMS | ✅ (owner/admin) |
| `/login`, `/register`, etc. | Auth pages | ❌ |

**Steps**:

1. **Create `app/(landing)/` route group** — public, no sidebar layout
   - `app/(landing)/layout.jsx` — minimal layout (no auth check, no sidebar)
   - `app/(landing)/page.jsx` — landing page (fetches dynamic content from DB)

2. **Move current `app/(app)/page.jsx`** → `app/(app)/dashboard/page.jsx`
   - Update all internal links from `/` to `/dashboard` in `Sidebar.jsx` (the Dashboard nav item path)

3. **Create `app/(app)/admin/` route group** for CMS:
   - `app/(app)/admin/page.jsx` — CMS dashboard
   - `app/(app)/admin/hero/page.jsx` — hero section editor
   - `app/(app)/admin/services/page.jsx` — services section editor
   - `app/(app)/admin/about/page.jsx` — about section editor
   - `app/(app)/admin/contact/page.jsx` — contact info editor
   - `app/(app)/admin/gallery/page.jsx` — image gallery manager
   - `app/(app)/admin/settings/page.jsx` — site-wide settings (logo, name, colors, footer)

4. **Update middleware** (`lib/supabase/middleware.js`):
   - Add `/` to `publicPaths` so the landing page is accessible without auth
   - Change authenticated redirect from `/` to `/dashboard`

### 2.2 Middleware Update — `lib/supabase/middleware.js`

```javascript
// Update publicPaths:
const publicPaths = ["/login", "/register", "/forgot-password"];
const isPublicPath = publicPaths.some((path) =>
  request.nextUrl.pathname.startsWith(path)
);

// The root "/" is a special public path (landing page)
const isLandingPage = request.nextUrl.pathname === "/";

// Update redirect logic:
if (!user && !isPublicPath && !isLandingPage) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

if (user && isPublicPath) {
  const url = request.nextUrl.clone();
  url.pathname = "/dashboard"; // Changed from "/"
  return NextResponse.redirect(url);
}
```

### 2.3 Database Migration — `supabase/landing-page-migration.sql`

```sql
-- =====================================================
-- Landing Page CMS Migration
-- =====================================================

-- 1. SITE SETTINGS (one row per bank — stores global landing page config)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL DEFAULT 'Agent Banking',
  tagline TEXT DEFAULT 'Your Trusted Banking Partner',
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#1a56db',
  secondary_color TEXT DEFAULT '#7c3aed',
  footer_text TEXT DEFAULT '© 2026 Agent Banking. All rights reserved.',
  contact_email TEXT,
  contact_phone TEXT,
  contact_address TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bank_id)
);

-- 2. LANDING SECTIONS (dynamic content blocks)
CREATE TABLE IF NOT EXISTS public.landing_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL, -- 'hero', 'about', 'services', 'features', 'stats', 'testimonials', 'cta', 'faq'
  title TEXT,
  subtitle TEXT,
  content JSONB DEFAULT '{}', -- flexible JSON for section-specific data
  image_url TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bank_id, section_key)
);

-- 3. LANDING IMAGES (gallery / media library)
CREATE TABLE IF NOT EXISTS public.landing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL, -- ImgBB URL
  delete_url TEXT, -- ImgBB delete URL for cleanup
  section_key TEXT, -- optional: which section this image belongs to
  alt_text TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. LANDING SERVICES (individual service cards)
CREATE TABLE IF NOT EXISTS public.landing_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon_name TEXT DEFAULT 'Banknote', -- Lucide icon name
  image_url TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. LANDING TESTIMONIALS
CREATE TABLE IF NOT EXISTS public.landing_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designation TEXT,
  avatar_url TEXT,
  quote TEXT NOT NULL,
  rating INT DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. LANDING FAQ
CREATE TABLE IF NOT EXISTS public.landing_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_faqs ENABLE ROW LEVEL SECURITY;

-- Public read policies (anyone can view published landing page content)
CREATE POLICY "Public can view site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Public can view active sections" ON public.landing_sections FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view images" ON public.landing_images FOR SELECT USING (true);
CREATE POLICY "Public can view active services" ON public.landing_services FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view active testimonials" ON public.landing_testimonials FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view active faqs" ON public.landing_faqs FOR SELECT USING (is_active = true);

-- Admin write policies
CREATE POLICY "Admins can manage site settings" ON public.site_settings FOR ALL
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));
CREATE POLICY "Admins can manage sections" ON public.landing_sections FOR ALL
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));
CREATE POLICY "Admins can manage images" ON public.landing_images FOR ALL
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));
CREATE POLICY "Admins can manage services" ON public.landing_services FOR ALL
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));
CREATE POLICY "Admins can manage testimonials" ON public.landing_testimonials FOR ALL
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));
CREATE POLICY "Admins can manage faqs" ON public.landing_faqs FOR ALL
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));
```

### 2.4 ImgBB Image Upload — `services/imageService.js`

```javascript
export const imageService = {
  /**
   * Upload image to ImgBB and return the URL.
   * Requires NEXT_PUBLIC_IMGBB_API_KEY env variable.
   */
  async upload(file) {
    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
    if (!apiKey) throw new Error('IMGBB_API_KEY not configured');

    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', apiKey);

    const res = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Image upload failed');

    return {
      url: json.data.display_url,
      thumb_url: json.data.thumb?.url || json.data.display_url,
      delete_url: json.data.delete_url,
    };
  },
};
```

### 2.5 Landing Page CMS Service — `services/landingService.js`

```javascript
import { supabase } from './supabaseClient';

export const landingService = {
  // ---- Site Settings ----
  async getSettings(bankId) {
    const { data, error } = await supabase
      .from('site_settings').select('*').eq('bank_id', bankId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async upsertSettings(bankId, settings) {
    const { data, error } = await supabase
      .from('site_settings')
      .upsert({ bank_id: bankId, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'bank_id' })
      .select().single();
    if (error) throw error;
    return data;
  },

  // ---- Sections ----
  async getSections(bankId) {
    const { data, error } = await supabase
      .from('landing_sections').select('*').eq('bank_id', bankId).order('sort_order');
    if (error) throw error;
    return data;
  },

  async upsertSection(bankId, sectionKey, updates) {
    const { data, error } = await supabase
      .from('landing_sections')
      .upsert({ bank_id: bankId, section_key: sectionKey, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'bank_id,section_key' })
      .select().single();
    if (error) throw error;
    return data;
  },

  // ---- Services ----
  async getServices(bankId) {
    const { data, error } = await supabase
      .from('landing_services').select('*').eq('bank_id', bankId).order('sort_order');
    if (error) throw error;
    return data;
  },

  async createService(service) {
    const { data, error } = await supabase
      .from('landing_services').insert(service).select().single();
    if (error) throw error;
    return data;
  },

  async updateService(id, updates) {
    const { data, error } = await supabase
      .from('landing_services').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteService(id) {
    const { error } = await supabase.from('landing_services').delete().eq('id', id);
    if (error) throw error;
  },

  // ---- Testimonials ----
  async getTestimonials(bankId) {
    const { data, error } = await supabase
      .from('landing_testimonials').select('*').eq('bank_id', bankId).order('sort_order');
    if (error) throw error;
    return data;
  },

  async createTestimonial(testimonial) {
    const { data, error } = await supabase
      .from('landing_testimonials').insert(testimonial).select().single();
    if (error) throw error;
    return data;
  },

  async updateTestimonial(id, updates) {
    const { data, error } = await supabase
      .from('landing_testimonials').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteTestimonial(id) {
    const { error } = await supabase.from('landing_testimonials').delete().eq('id', id);
    if (error) throw error;
  },

  // ---- FAQs ----
  async getFaqs(bankId) {
    const { data, error } = await supabase
      .from('landing_faqs').select('*').eq('bank_id', bankId).order('sort_order');
    if (error) throw error;
    return data;
  },

  async createFaq(faq) {
    const { data, error } = await supabase
      .from('landing_faqs').insert(faq).select().single();
    if (error) throw error;
    return data;
  },

  async updateFaq(id, updates) {
    const { data, error } = await supabase
      .from('landing_faqs').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteFaq(id) {
    const { error } = await supabase.from('landing_faqs').delete().eq('id', id);
    if (error) throw error;
  },

  // ---- Images ----
  async getImages(bankId) {
    const { data, error } = await supabase
      .from('landing_images').select('*').eq('bank_id', bankId).order('sort_order');
    if (error) throw error;
    return data;
  },

  async addImage(imageData) {
    const { data, error } = await supabase
      .from('landing_images').insert(imageData).select().single();
    if (error) throw error;
    return data;
  },

  async deleteImage(id) {
    const { error } = await supabase.from('landing_images').delete().eq('id', id);
    if (error) throw error;
  },

  // ---- Public API (no auth — for landing page SSR) ----
  // These use the server client for SSR
};
```

### 2.6 Server-side data fetching for Landing Page — `app/(landing)/page.jsx`

The landing page must be a **Server Component** for SEO. It fetches data using the server Supabase client:

```javascript
// app/(landing)/page.jsx
import { createClient } from '@/lib/supabase/server';
// Import landing page section components (see 2.8)

export const revalidate = 60; // ISR: revalidate every 60 seconds

async function getLandingData() {
  const supabase = await createClient();

  // Get the first active bank (for single-tenant deployment)
  // Or use a domain/subdomain mapping for multi-tenant
  const { data: bank } = await supabase.from('banks').select('id, name').eq('is_active', true).limit(1).single();
  if (!bank) return null;

  const [settings, sections, services, testimonials, faqs] = await Promise.all([
    supabase.from('site_settings').select('*').eq('bank_id', bank.id).single(),
    supabase.from('landing_sections').select('*').eq('bank_id', bank.id).eq('is_active', true).order('sort_order'),
    supabase.from('landing_services').select('*').eq('bank_id', bank.id).eq('is_active', true).order('sort_order'),
    supabase.from('landing_testimonials').select('*').eq('bank_id', bank.id).eq('is_active', true).order('sort_order'),
    supabase.from('landing_faqs').select('*').eq('bank_id', bank.id).eq('is_active', true).order('sort_order'),
  ]);

  return {
    bank,
    settings: settings.data,
    sections: sections.data || [],
    services: services.data || [],
    testimonials: testimonials.data || [],
    faqs: faqs.data || [],
  };
}

export default async function LandingPage() {
  const data = await getLandingData();
  if (!data) return <div>Site not configured</div>;

  const { settings, sections, services, testimonials, faqs } = data;
  const getSection = (key) => sections.find(s => s.section_key === key);

  return (
    <main>
      {/* Render dynamic sections based on DB data */}
      {/* Hero, About, Services, Stats, Testimonials, FAQ, CTA, Footer */}
    </main>
  );
}
```

### 2.7 Landing Page Layout — `app/(landing)/layout.jsx`

```javascript
export default function LandingLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

> **Note**: Since the root `app/layout.jsx` already wraps everything, this route group layout should NOT include `<html>` and `<body>` — it should just return `{children}` with a minimal wrapper div. The root layout handles the document shell.

Corrected:
```javascript
export default function LandingLayout({ children }) {
  return <div className="min-h-screen">{children}</div>;
}
```

### 2.8 Landing Page Section Components

Create in `components/landing/`:

```
components/landing/LandingNavbar.jsx     — sticky top navbar with logo, nav links, "Login" button
components/landing/HeroSection.jsx       — hero banner with background image, title, subtitle, CTA
components/landing/AboutSection.jsx      — about the bank with image + text
components/landing/ServicesSection.jsx   — grid of service cards (icon + title + description)
components/landing/StatsSection.jsx      — animated counter stats (e.g., "10,000+ Customers")
components/landing/TestimonialsSection.jsx — testimonial carousel/grid
components/landing/FAQSection.jsx        — accordion FAQ
components/landing/CTASection.jsx        — call-to-action banner
components/landing/FooterSection.jsx     — footer with contact info, social links, copyright
```

**Design motivation**: Based on https://www.bankasia-bd.com/agentbanking — professional banking look with:
- Green/blue color scheme (configurable via `site_settings`)
- Hero with overlay text on background image
- Service cards in a 3-column grid
- Stats counter section with a colored background
- Testimonials in a card carousel
- Clean footer with columns

**Copilot prompts for each component:**

For `HeroSection.jsx`:
> "Create a hero section component for an agent banking landing page. Props: title, subtitle, backgroundImageUrl, ctaText, ctaLink. Full-width background image with dark overlay, centered white text, and a prominent CTA button. Use Tailwind CSS. Make it responsive."

For `ServicesSection.jsx`:
> "Create a services grid section. Props: title, subtitle, services (array of {title, description, icon_name, image_url}). Render as a responsive 3-column grid of cards. Each card has an icon (use lucide-react dynamic import by icon_name string), title, and description. Use Tailwind."

For `FAQSection.jsx`:
> "Create an FAQ accordion section using Radix UI accordion or a simple custom toggle. Props: title, faqs (array of {question, answer}). Clean design with Tailwind."

### 2.9 Admin CMS Pages

Create under `app/(app)/admin/`:

```
app/(app)/admin/page.jsx              — CMS dashboard overview (links to each section editor)
app/(app)/admin/layout.jsx            — admin sub-layout (optional: adds a secondary nav)
app/(app)/admin/site-settings/page.jsx — edit site name, colors, logo (upload to ImgBB), contact, social
app/(app)/admin/hero/page.jsx         — edit hero section (title, subtitle, bg image, CTA)
app/(app)/admin/about/page.jsx        — edit about section (title, content, image)
app/(app)/admin/services/page.jsx     — CRUD for landing services
app/(app)/admin/testimonials/page.jsx — CRUD for testimonials
app/(app)/admin/faqs/page.jsx         — CRUD for FAQs
app/(app)/admin/gallery/page.jsx      — image gallery manager (upload to ImgBB, manage)
```

**Copilot prompt for admin services page:**
> "Create a CRUD page for managing landing page services. Use `landingService` methods. Show a table of services with title, description, icon, active toggle. Add dialog for create/edit with form (react-hook-form + zod). Fields: title, description, icon_name (select from common Lucide icon names), image (file upload via imageService.upload()). Include delete confirmation. Follow the existing page pattern of `app/(app)/expenses/page.jsx`."

**Copilot prompt for gallery page:**
> "Create an image gallery management page. Upload images using `imageService.upload()` (ImgBB), save the returned URL to DB via `landingService.addImage()`. Show images in a masonry/grid layout with delete option. Show the ImgBB URL for each image. Include drag-to-reorder (optional). Follow existing patterns."

### 2.10 Sidebar Update for Admin Section

In `components/layout/Sidebar.jsx`, update the `navItems` array:

```javascript
// Add to the Settings section children, or create a new section:
{
  label: 'Website',
  children: [
    { label: 'CMS Dashboard', path: '/admin', icon: Globe, adminOnly: true },
    { label: 'Site Settings', path: '/admin/site-settings', icon: Settings, adminOnly: true },
    { label: 'Hero Section', path: '/admin/hero', icon: Image, adminOnly: true },
    { label: 'Services', path: '/admin/services', icon: Layers, adminOnly: true },
    { label: 'Gallery', path: '/admin/gallery', icon: ImageIcon, adminOnly: true },
  ],
},
```

Import the needed Lucide icons: `Globe, Layers, Image as ImageIcon`

### 2.11 Dashboard Route Migration

1. Move `app/(app)/page.jsx` → `app/(app)/dashboard/page.jsx`
2. Update `Sidebar.jsx`: change Dashboard path from `'/'` to `'/dashboard'`
3. Update `NavItem` active check: `item.path === '/dashboard'`
4. Update `AppLayout.jsx` redirect: when bank is loaded, default to `/dashboard`
5. Update middleware redirect for authenticated users on public auth pages: redirect to `/dashboard` instead of `/`

### 2.12 Environment Variables to Add

```env
# Add to .env.local
NEXT_PUBLIC_IMGBB_API_KEY=your_imgbb_api_key_here
```

---

## 🔧 Implementation Order (Step-by-Step)

### Phase 1: Short-Term Loan Feature
1. Run `supabase/loan-migration.sql` in Supabase SQL Editor
2. Create `services/loanService.js`
3. Add `LOAN_STATUSES` to `utils/constants.js`
4. Create `components/tables/LoanTable.jsx`
5. Create `components/forms/LoanIssueForm.jsx`
6. Create `components/forms/LoanReturnForm.jsx`
7. Create `app/(app)/loans/page.jsx`
8. Add Loans to sidebar navigation in `Sidebar.jsx`
9. Test: issue loan → verify expense created + balance deducted → return loan → verify balance restored

### Phase 2: Route Restructuring
1. Create `app/(landing)/layout.jsx`
2. Move `app/(app)/page.jsx` → `app/(app)/dashboard/page.jsx`
3. Update `Sidebar.jsx` Dashboard path to `/dashboard`
4. Update `lib/supabase/middleware.js` with new public path logic
5. Test: unauthenticated user sees landing page at `/`, authenticated user can access `/dashboard`

### Phase 3: Landing Page CMS Database
1. Run `supabase/landing-page-migration.sql` in Supabase SQL Editor
2. Create `services/imageService.js`
3. Create `services/landingService.js`
4. Add `NEXT_PUBLIC_IMGBB_API_KEY` to `.env.local`

### Phase 4: Landing Page Frontend
1. Create all `components/landing/*.jsx` section components
2. Create `app/(landing)/page.jsx` (server component with data fetching)
3. Style with Tailwind, using dynamic colors from `site_settings`
4. Test: landing page renders with default/fallback content

### Phase 5: Admin CMS
1. Create `app/(app)/admin/page.jsx` — CMS dashboard
2. Create `app/(app)/admin/site-settings/page.jsx`
3. Create `app/(app)/admin/hero/page.jsx`
4. Create `app/(app)/admin/services/page.jsx`
5. Create `app/(app)/admin/testimonials/page.jsx`
6. Create `app/(app)/admin/faqs/page.jsx`
7. Create `app/(app)/admin/gallery/page.jsx`
8. Add Website section to sidebar in `Sidebar.jsx`
9. Test: full CRUD flow — create content in admin → see it on landing page

### Phase 6: Seed Default Data
1. Update `bankService.create()` to also seed default `site_settings` and `landing_sections` when a new bank is created
2. Add a seed script or a "Setup Landing Page" button in the admin CMS dashboard

---

## 📁 New File Tree Summary

```
├── app/
│   ├── (landing)/
│   │   ├── layout.jsx                    # Minimal public layout
│   │   └── page.jsx                      # SSR landing page
│   ├── (app)/
│   │   ├── dashboard/
│   │   │   └── page.jsx                  # Moved from app/(app)/page.jsx
│   │   ├── loans/
│   │   │   └── page.jsx                  # Loan management page
│   │   ├── admin/
│   │   │   ├── page.jsx                  # CMS dashboard
│   │   │   ├── site-settings/page.jsx
│   │   │   ├── hero/page.jsx
│   │   │   ├── about/page.jsx
│   │   │   ├── services/page.jsx
│   │   │   ├── testimonials/page.jsx
│   │   │   ├── faqs/page.jsx
│   │   │   └── gallery/page.jsx
│   │   └── ...existing pages
│   └── api/
│       └── ...existing
├── components/
│   ├── landing/
│   │   ├── LandingNavbar.jsx
│   │   ├── HeroSection.jsx
│   │   ├── AboutSection.jsx
│   │   ├── ServicesSection.jsx
│   │   ├── StatsSection.jsx
│   │   ├── TestimonialsSection.jsx
│   │   ├── FAQSection.jsx
│   │   ├── CTASection.jsx
│   │   └── FooterSection.jsx
│   ├── forms/
│   │   ├── LoanIssueForm.jsx
│   │   └── LoanReturnForm.jsx
│   ├── tables/
│   │   └── LoanTable.jsx
│   └── ...existing
├── services/
│   ├── loanService.js
│   ├── landingService.js
│   ├── imageService.js
│   └── ...existing
├── supabase/
│   ├── loan-migration.sql
│   ├── landing-page-migration.sql
│   └── ...existing
└── utils/
    └── constants.js                       # Updated with LOAN_STATUSES
```

---

## 🧠 Copilot Context Tips

When working in VS Code with Copilot:

1. **Keep this file open** in a tab — Copilot reads open files for context.
2. **Open the related existing file** when creating a new one. For example, open `services/expenseService.js` when creating `services/loanService.js`.
3. **Use `@workspace`** in Copilot Chat to reference the whole codebase.
4. **Use inline comments** like `// Follow the pattern of expenseService.js` before asking Copilot to generate code.
5. **Reference specific files** in Copilot Chat: "Create LoanTable.jsx following the exact pattern of components/tables/TransactionTable.jsx".
6. **For SQL migrations**: open `supabase/migration.sql` and `supabase/fix-rls-policies.sql` for Copilot to understand the existing schema.
7. **For landing page components**: describe the visual design in comments before asking Copilot to generate. Reference "Bank Asia Agent Banking" style.

---

## ⚠️ Important Gotchas

1. **RLS**: All new tables need RLS enabled + policies. The landing page tables need **public SELECT** policies (no auth required for reading).
2. **ImgBB API**: The free tier has rate limits. Consider caching image URLs in the DB and only uploading new images.
3. **`next.config.mjs`**: You may need to add `imgbb.com` to `images.remotePatterns` for `<Image>` component:
   ```javascript
   images: {
     remotePatterns: [
       { protocol: 'https', hostname: 'i.ibb.co' },
       { protocol: 'https', hostname: 'image.imgbb.com' },
     ],
   },
   ```
4. **Route group conflict**: `app/(landing)/page.jsx` and `app/(app)/page.jsx` would conflict on `/`. After moving dashboard to `/dashboard`, only `(landing)` should have a root `page.jsx`.
5. **Multi-tenant landing page**: For selling to multiple banks, use the first active bank's data, or implement subdomain/domain-based bank resolution in the landing page's data fetching.
6. **Loan expense connection**: When a loan is fully returned, consider marking the related expense as "recovered" or adding a visual indicator in the expenses list.