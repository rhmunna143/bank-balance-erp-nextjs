-- =====================================================
-- AgentBank ERP - Supabase SQL Migration
-- Run this in the Supabase SQL Editor
-- =====================================================

-- 1. PROFILES TABLE (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BANKS TABLE
CREATE TABLE IF NOT EXISTS public.banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BDT',
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  theme TEXT DEFAULT 'default',
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BANK MEMBERS (multi-tenant membership)
CREATE TABLE IF NOT EXISTS public.bank_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('owner', 'admin', 'operator')),
  is_active BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bank_id, user_id)
);

-- 4. MOTHER ACCOUNTS
CREATE TABLE IF NOT EXISTS public.mother_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_number TEXT,
  balance NUMERIC(15,2) DEFAULT 0,
  low_threshold NUMERIC(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. HAND CASH ACCOUNTS
CREATE TABLE IF NOT EXISTS public.hand_cash_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  balance NUMERIC(15,2) DEFAULT 0,
  low_threshold NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bank_id)
);

-- 6. PROFIT ACCOUNTS
CREATE TABLE IF NOT EXISTS public.profit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  balance NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TRANSACTIONS (deposits, withdrawals, cash-in)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'cash_in')),
  amount NUMERIC(15,2) NOT NULL,
  commission NUMERIC(15,2) DEFAULT 0,
  customer_name TEXT,
  customer_account TEXT,
  mother_account_id UUID REFERENCES public.mother_accounts(id),
  profit_account_id UUID REFERENCES public.profit_accounts(id),
  source TEXT, -- for cash_in: 'mother_account' or 'external'
  reference TEXT,
  notes TEXT,
  has_shortage BOOLEAN DEFAULT FALSE,
  shortage_amount NUMERIC(15,2) DEFAULT 0,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_transactions_performed_by_profiles FOREIGN KEY (performed_by) REFERENCES public.profiles(id)
);

-- 8. EXPENSE CATEGORIES
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  category_id UUID REFERENCES public.expense_categories(id),
  deduct_from TEXT NOT NULL DEFAULT 'hand_cash' CHECK (deduct_from IN ('hand_cash', 'profit_account', 'mother_account')),
  profit_account_id UUID REFERENCES public.profit_accounts(id),
  mother_account_id UUID REFERENCES public.mother_accounts(id),
  description TEXT,
  receipt_url TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. DAILY LOGS
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_deposits NUMERIC(15,2) DEFAULT 0,
  total_withdrawals NUMERIC(15,2) DEFAULT 0,
  total_cash_in NUMERIC(15,2) DEFAULT 0,
  total_expenses NUMERIC(15,2) DEFAULT 0,
  total_commissions NUMERIC(15,2) DEFAULT 0,
  opening_hand_cash NUMERIC(15,2) DEFAULT 0,
  closing_hand_cash NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bank_id, log_date)
);

-- 11. ALERT CONFIGS
CREATE TABLE IF NOT EXISTS public.alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL, -- 'mother_account', 'hand_cash'
  account_id UUID,
  threshold NUMERIC(15,2) DEFAULT 0,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_bank_members_bank ON public.bank_members(bank_id);
CREATE INDEX IF NOT EXISTS idx_bank_members_user ON public.bank_members(user_id);
CREATE INDEX IF NOT EXISTS idx_mother_accounts_bank ON public.mother_accounts(bank_id);
CREATE INDEX IF NOT EXISTS idx_hand_cash_bank ON public.hand_cash_accounts(bank_id);
CREATE INDEX IF NOT EXISTS idx_profit_accounts_bank ON public.profit_accounts(bank_id);
CREATE INDEX IF NOT EXISTS idx_transactions_bank ON public.transactions(bank_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_bank ON public.expenses(bank_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created ON public.expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_logs_bank_date ON public.daily_logs(bank_id, log_date);
CREATE INDEX IF NOT EXISTS idx_expense_categories_bank ON public.expense_categories(bank_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Helper functions (SECURITY DEFINER bypasses RLS, avoids recursion)
CREATE OR REPLACE FUNCTION public.get_my_bank_ids()
RETURNS SETOF UUID AS $$
  SELECT bank_id FROM public.bank_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_my_admin_bank_ids()
RETURNS SETOF UUID AS $$
  SELECT bank_id FROM public.bank_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mother_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hand_cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_configs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Banks
CREATE POLICY "Members can view bank" ON public.banks FOR SELECT
  USING (id IN (SELECT public.get_my_bank_ids()) OR owner_id = auth.uid());
CREATE POLICY "Owners can create bank" ON public.banks FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Admins can update bank" ON public.banks FOR UPDATE
  USING (id IN (SELECT public.get_my_admin_bank_ids()) OR owner_id = auth.uid());

-- Bank members: use user_id directly to avoid self-referencing recursion
CREATE POLICY "Members can view bank members" ON public.bank_members FOR SELECT
  USING (bank_id IN (SELECT public.get_my_bank_ids()));
-- Allow owner to insert first membership when creating a bank, or admins to add members
CREATE POLICY "Owner or admin can insert members" ON public.bank_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR bank_id IN (SELECT public.get_my_admin_bank_ids())
  );
CREATE POLICY "Admins can update members" ON public.bank_members FOR UPDATE
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));
CREATE POLICY "Admins can delete members" ON public.bank_members FOR DELETE
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));

-- Mother accounts
CREATE POLICY "Members can view mother accounts" ON public.mother_accounts FOR SELECT
  USING (bank_id IN (SELECT public.get_my_bank_ids()));
CREATE POLICY "Admins can manage mother accounts" ON public.mother_accounts FOR INSERT
  WITH CHECK (bank_id IN (SELECT public.get_my_admin_bank_ids()));
CREATE POLICY "Admins can update mother accounts" ON public.mother_accounts FOR UPDATE
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));

-- Hand cash
CREATE POLICY "Members can view hand cash" ON public.hand_cash_accounts FOR SELECT
  USING (bank_id IN (SELECT public.get_my_bank_ids()));
CREATE POLICY "Members can insert hand cash" ON public.hand_cash_accounts FOR INSERT
  WITH CHECK (bank_id IN (SELECT public.get_my_bank_ids()));
CREATE POLICY "Admins can update hand cash" ON public.hand_cash_accounts FOR UPDATE
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));

-- Profit accounts
CREATE POLICY "Members can view profit accounts" ON public.profit_accounts FOR SELECT
  USING (bank_id IN (SELECT public.get_my_bank_ids()));
CREATE POLICY "Admins can manage profit accounts" ON public.profit_accounts FOR INSERT
  WITH CHECK (bank_id IN (SELECT public.get_my_admin_bank_ids()));
CREATE POLICY "Admins can update profit accounts" ON public.profit_accounts FOR UPDATE
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));

-- Transactions
CREATE POLICY "Members can view transactions" ON public.transactions FOR SELECT
  USING (bank_id IN (SELECT public.get_my_bank_ids()));
CREATE POLICY "Members can create transactions" ON public.transactions FOR INSERT
  WITH CHECK (bank_id IN (SELECT public.get_my_bank_ids()));

-- Expense categories
CREATE POLICY "Members can view categories" ON public.expense_categories FOR SELECT
  USING (bank_id IN (SELECT public.get_my_bank_ids()));
CREATE POLICY "Admins can manage categories" ON public.expense_categories FOR INSERT
  WITH CHECK (bank_id IN (SELECT public.get_my_admin_bank_ids()));
CREATE POLICY "Admins can delete categories" ON public.expense_categories FOR DELETE
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));

-- Expenses
CREATE POLICY "Members can view expenses" ON public.expenses FOR SELECT
  USING (bank_id IN (SELECT public.get_my_bank_ids()));
CREATE POLICY "Members can create expenses" ON public.expenses FOR INSERT
  WITH CHECK (bank_id IN (SELECT public.get_my_bank_ids()));

-- Daily logs
CREATE POLICY "Members can view daily logs" ON public.daily_logs FOR SELECT
  USING (bank_id IN (SELECT public.get_my_bank_ids()));
CREATE POLICY "Members can create daily logs" ON public.daily_logs FOR INSERT
  WITH CHECK (bank_id IN (SELECT public.get_my_bank_ids()));

-- Alert configs
CREATE POLICY "Members can view alerts" ON public.alert_configs FOR SELECT
  USING (bank_id IN (SELECT public.get_my_bank_ids()));
CREATE POLICY "Admins can manage alerts" ON public.alert_configs FOR INSERT
  WITH CHECK (bank_id IN (SELECT public.get_my_admin_bank_ids()));
CREATE POLICY "Admins can update alerts" ON public.alert_configs FOR UPDATE
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger helper
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_banks_updated_at BEFORE UPDATE ON public.banks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_mother_accounts_updated_at BEFORE UPDATE ON public.mother_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_hand_cash_updated_at BEFORE UPDATE ON public.hand_cash_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_profit_accounts_updated_at BEFORE UPDATE ON public.profit_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- RPC FUNCTIONS (atomic transactions)
-- =====================================================

-- Process Deposit: customer deposits cash → hand_cash UP, mother_account UP, commission → profit
CREATE OR REPLACE FUNCTION public.process_deposit(
  p_bank_id UUID,
  p_customer_name TEXT,
  p_customer_account TEXT,
  p_amount NUMERIC,
  p_commission NUMERIC,
  p_mother_account_id UUID,
  p_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_txn_id UUID;
  v_profit_account_id UUID;
BEGIN
  -- Create transaction record
  INSERT INTO public.transactions (bank_id, type, amount, commission, customer_name, customer_account, mother_account_id, reference, notes, performed_by)
  VALUES (p_bank_id, 'deposit', p_amount, p_commission, p_customer_name, p_customer_account, p_mother_account_id, p_reference, p_notes, auth.uid())
  RETURNING id INTO v_txn_id;

  -- Increase hand cash (agent receives physical cash from customer)
  UPDATE public.hand_cash_accounts SET balance = balance + p_amount WHERE bank_id = p_bank_id;

  -- Decrease mother account (money sent from mother account to customer's bank)
  UPDATE public.mother_accounts SET balance = balance - p_amount WHERE id = p_mother_account_id;

  -- Add commission to first profit account (if exists & commission > 0)
  IF p_commission > 0 THEN
    SELECT id INTO v_profit_account_id FROM public.profit_accounts WHERE bank_id = p_bank_id LIMIT 1;
    IF v_profit_account_id IS NOT NULL THEN
      UPDATE public.profit_accounts SET balance = balance + p_commission WHERE id = v_profit_account_id;
      UPDATE public.transactions SET profit_account_id = v_profit_account_id WHERE id = v_txn_id;
    END IF;
  END IF;

  RETURN v_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process Withdrawal: customer withdraws → hand_cash DOWN, mother_account DOWN, commission → profit
CREATE OR REPLACE FUNCTION public.process_withdrawal(
  p_bank_id UUID,
  p_customer_name TEXT,
  p_customer_account TEXT,
  p_amount NUMERIC,
  p_commission NUMERIC,
  p_mother_account_id UUID,
  p_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_txn_id UUID;
  v_profit_account_id UUID;
BEGIN
  INSERT INTO public.transactions (bank_id, type, amount, commission, customer_name, customer_account, mother_account_id, reference, notes, performed_by)
  VALUES (p_bank_id, 'withdrawal', p_amount, p_commission, p_customer_name, p_customer_account, p_mother_account_id, p_reference, p_notes, auth.uid())
  RETURNING id INTO v_txn_id;

  -- Decrease hand cash only (mother account is for reference)
  UPDATE public.hand_cash_accounts SET balance = balance - p_amount WHERE bank_id = p_bank_id;

  -- Increase mother account balance (customer is depositing into their account via the agent)
  UPDATE public.mother_accounts SET balance = balance + p_amount WHERE id = p_mother_account_id;

  -- Add commission to profit
  IF p_commission > 0 THEN
    SELECT id INTO v_profit_account_id FROM public.profit_accounts WHERE bank_id = p_bank_id LIMIT 1;
    IF v_profit_account_id IS NOT NULL THEN
      UPDATE public.profit_accounts SET balance = balance + p_commission WHERE id = v_profit_account_id;
      UPDATE public.transactions SET profit_account_id = v_profit_account_id WHERE id = v_txn_id;
    END IF;
  END IF;

  RETURN v_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process Withdrawal with Shortage
CREATE OR REPLACE FUNCTION public.process_withdrawal_with_shortage(
  p_bank_id UUID,
  p_customer_name TEXT,
  p_customer_account TEXT,
  p_amount NUMERIC,
  p_commission NUMERIC,
  p_mother_account_id UUID,
  p_shortage_amount NUMERIC,
  p_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_txn_id UUID;
  v_profit_account_id UUID;
BEGIN
  INSERT INTO public.transactions (bank_id, type, amount, commission, customer_name, customer_account, mother_account_id, reference, notes, has_shortage, shortage_amount, performed_by)
  VALUES (p_bank_id, 'withdrawal', p_amount, p_commission, p_customer_name, p_customer_account, p_mother_account_id, p_reference, p_notes, TRUE, p_shortage_amount, auth.uid())
  RETURNING id INTO v_txn_id;

  -- Decrease hand cash by (total amount - amount taken from mother account)
  UPDATE public.hand_cash_accounts SET balance = balance - (p_amount - p_shortage_amount) WHERE bank_id = p_bank_id;

  -- Decrease mother account by user-specified deduction amount
  UPDATE public.mother_accounts SET balance = balance - p_shortage_amount WHERE id = p_mother_account_id;

  IF p_commission > 0 THEN
    SELECT id INTO v_profit_account_id FROM public.profit_accounts WHERE bank_id = p_bank_id LIMIT 1;
    IF v_profit_account_id IS NOT NULL THEN
      UPDATE public.profit_accounts SET balance = balance + p_commission WHERE id = v_profit_account_id;
      UPDATE public.transactions SET profit_account_id = v_profit_account_id WHERE id = v_txn_id;
    END IF;
  END IF;

  RETURN v_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process Cash-In: fund hand cash from mother account or external
CREATE OR REPLACE FUNCTION public.process_cash_in(
  p_bank_id UUID,
  p_amount NUMERIC,
  p_target_type TEXT,
  p_target_id UUID DEFAULT NULL,
  p_source TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_txn_id UUID;
BEGIN
  INSERT INTO public.transactions (bank_id, type, amount, source, mother_account_id, reference, notes, performed_by)
  VALUES (
    p_bank_id, 'cash_in', p_amount, p_source,
    CASE WHEN p_target_type = 'mother_account' THEN p_target_id ELSE NULL END,
    p_reference, p_notes, auth.uid()
  )
  RETURNING id INTO v_txn_id;

  -- Credit the chosen target account
  IF p_target_type = 'hand_cash' THEN
    UPDATE public.hand_cash_accounts SET balance = balance + p_amount WHERE bank_id = p_bank_id;
  ELSIF p_target_type = 'mother_account' AND p_target_id IS NOT NULL THEN
    UPDATE public.mother_accounts SET balance = balance + p_amount WHERE id = p_target_id;
  ELSIF p_target_type = 'profit_account' AND p_target_id IS NOT NULL THEN
    UPDATE public.profit_accounts SET balance = balance + p_amount WHERE id = p_target_id;
  END IF;

  RETURN v_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process Expense
CREATE OR REPLACE FUNCTION public.process_expense(
  p_bank_id UUID,
  p_amount NUMERIC,
  p_category_id UUID,
  p_deduct_from TEXT,
  p_profit_account_id UUID DEFAULT NULL,
  p_mother_account_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_receipt_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_expense_id UUID;
BEGIN
  INSERT INTO public.expenses (bank_id, amount, category_id, deduct_from, profit_account_id, mother_account_id, description, receipt_url, performed_by)
  VALUES (p_bank_id, p_amount, p_category_id, p_deduct_from, p_profit_account_id, p_mother_account_id, p_description, p_receipt_url, auth.uid())
  RETURNING id INTO v_expense_id;

  IF p_deduct_from = 'hand_cash' THEN
    UPDATE public.hand_cash_accounts SET balance = balance - p_amount WHERE bank_id = p_bank_id;
  ELSIF p_deduct_from = 'profit_account' AND p_profit_account_id IS NOT NULL THEN
    UPDATE public.profit_accounts SET balance = balance - p_amount WHERE id = p_profit_account_id;
  ELSIF p_deduct_from = 'mother_account' AND p_mother_account_id IS NOT NULL THEN
    UPDATE public.mother_accounts SET balance = balance - p_amount WHERE id = p_mother_account_id;
  END IF;

  RETURN v_expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate Daily Log
CREATE OR REPLACE FUNCTION public.generate_daily_log(
  p_bank_id UUID,
  p_log_date DATE DEFAULT CURRENT_DATE,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_total_deposits NUMERIC;
  v_total_withdrawals NUMERIC;
  v_total_cash_in NUMERIC;
  v_total_expenses NUMERIC;
  v_total_commissions NUMERIC;
  v_hand_cash_balance NUMERIC;
BEGIN
  -- Calculate day totals
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposits
  FROM public.transactions WHERE bank_id = p_bank_id AND type = 'deposit' AND created_at::DATE = p_log_date;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawals
  FROM public.transactions WHERE bank_id = p_bank_id AND type = 'withdrawal' AND created_at::DATE = p_log_date;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_cash_in
  FROM public.transactions WHERE bank_id = p_bank_id AND type = 'cash_in' AND created_at::DATE = p_log_date;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
  FROM public.expenses WHERE bank_id = p_bank_id AND created_at::DATE = p_log_date;

  SELECT COALESCE(SUM(commission), 0) INTO v_total_commissions
  FROM public.transactions WHERE bank_id = p_bank_id AND created_at::DATE = p_log_date;

  SELECT balance INTO v_hand_cash_balance FROM public.hand_cash_accounts WHERE bank_id = p_bank_id;

  INSERT INTO public.daily_logs (bank_id, log_date, total_deposits, total_withdrawals, total_cash_in, total_expenses, total_commissions, closing_hand_cash, notes, generated_by)
  VALUES (p_bank_id, p_log_date, v_total_deposits, v_total_withdrawals, v_total_cash_in, v_total_expenses, v_total_commissions, COALESCE(v_hand_cash_balance, 0), p_notes, auth.uid())
  ON CONFLICT (bank_id, log_date) DO UPDATE SET
    total_deposits = EXCLUDED.total_deposits,
    total_withdrawals = EXCLUDED.total_withdrawals,
    total_cash_in = EXCLUDED.total_cash_in,
    total_expenses = EXCLUDED.total_expenses,
    total_commissions = EXCLUDED.total_commissions,
    closing_hand_cash = EXCLUDED.closing_hand_cash,
    notes = EXCLUDED.notes,
    generated_by = EXCLUDED.generated_by
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DEFAULT SEED DATA FUNCTION (called by app on bank creation)
-- =====================================================
-- The app handles seeding via bankService.create():
--   1. Creates bank
--   2. Creates bank_member (owner)
--   3. Creates hand_cash_account
--   4. Seeds default expense categories
-- =====================================================
