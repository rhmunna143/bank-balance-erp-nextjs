-- =====================================================
-- COMPLETE RLS POLICY FIX + UPDATED RPC FUNCTIONS
-- Run this ENTIRE script in your Supabase SQL Editor
-- It drops ALL existing policies and recreates them
-- =====================================================

-- Step 0a: Add FK from transactions.performed_by → profiles so PostgREST can join
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_transactions_performed_by_profiles'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT fk_transactions_performed_by_profiles
      FOREIGN KEY (performed_by) REFERENCES public.profiles(id);
  END IF;
END $$;

-- Step 0a2: Update expenses.deduct_from CHECK constraint to allow mother_account and profit_account
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_deduct_from_check;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_deduct_from_check
  CHECK (deduct_from IN ('hand_cash', 'profit_account', 'mother_account', 'profit'));

-- Step 0a3: Add mother_account_id column to expenses if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'mother_account_id'
  ) THEN
    ALTER TABLE public.expenses ADD COLUMN mother_account_id UUID REFERENCES public.mother_accounts(id);
  END IF;
END $$;

-- Step 0b: Update the process_cash_in RPC to support target account selection
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
  INSERT INTO public.transactions (bank_id, type, amount, source, mother_account_id, profit_account_id, reference, notes, performed_by)
  VALUES (
    p_bank_id, 'cash_in', p_amount, p_source,
    CASE WHEN p_target_type = 'mother_account' THEN p_target_id ELSE NULL END,
    CASE WHEN p_target_type = 'profit_account' THEN p_target_id ELSE NULL END,
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

-- Step 0b: Update process_deposit — hand cash UP, mother account DOWN
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
  INSERT INTO public.transactions (bank_id, type, amount, commission, customer_name, customer_account, mother_account_id, reference, notes, performed_by)
  VALUES (p_bank_id, 'deposit', p_amount, p_commission, p_customer_name, p_customer_account, p_mother_account_id, p_reference, p_notes, auth.uid())
  RETURNING id INTO v_txn_id;

  -- Increase hand cash (agent receives physical cash)
  UPDATE public.hand_cash_accounts SET balance = balance + p_amount WHERE bank_id = p_bank_id;

  -- Decrease mother account (money sent from mother account to customer's bank)
  UPDATE public.mother_accounts SET balance = balance - p_amount WHERE id = p_mother_account_id;

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

-- Step 0c: Update process_withdrawal — only hand cash decreases (mother account is reference only)
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

  UPDATE public.hand_cash_accounts SET balance = balance - p_amount WHERE bank_id = p_bank_id;

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

-- Step 0d: Update process_withdrawal_with_shortage — user specifies mother account deduction
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

  UPDATE public.hand_cash_accounts SET balance = balance - (p_amount - p_shortage_amount) WHERE bank_id = p_bank_id;
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

-- Step 0e: Update process_expense — support mother_account deduction
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

-- Step 1: Create/replace SECURITY DEFINER helper functions
CREATE OR REPLACE FUNCTION public.get_my_bank_ids()
RETURNS SETOF UUID AS $$
  SELECT bank_id FROM public.bank_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_my_admin_bank_ids()
RETURNS SETOF UUID AS $$
  SELECT bank_id FROM public.bank_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 2: Drop ALL existing policies on ALL tables
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles', 'banks', 'bank_members', 'mother_accounts',
        'hand_cash_accounts', 'profit_accounts', 'transactions',
        'expense_categories', 'expenses', 'daily_logs', 'alert_configs'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END;
$$;

-- Step 3: Enable RLS on all tables (idempotent)
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

-- Step 4: Recreate ALL policies

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Banks (owner_id = auth.uid() allows owner to see/manage bank even before bank_members row exists)
CREATE POLICY "Members can view bank" ON public.banks FOR SELECT
  USING (id IN (SELECT public.get_my_bank_ids()) OR owner_id = auth.uid());
CREATE POLICY "Owners can create bank" ON public.banks FOR INSERT
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Admins can update bank" ON public.banks FOR UPDATE
  USING (id IN (SELECT public.get_my_admin_bank_ids()) OR owner_id = auth.uid());

-- Bank members
CREATE POLICY "Members can view bank members" ON public.bank_members FOR SELECT
  USING (bank_id IN (SELECT public.get_my_bank_ids()));
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

-- Hand cash accounts
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
CREATE POLICY "Members can update daily logs" ON public.daily_logs FOR UPDATE
  USING (bank_id IN (SELECT public.get_my_bank_ids()));

-- Alert configs
CREATE POLICY "Members can view alerts" ON public.alert_configs FOR SELECT
  USING (bank_id IN (SELECT public.get_my_bank_ids()));
CREATE POLICY "Admins can manage alerts" ON public.alert_configs FOR INSERT
  WITH CHECK (bank_id IN (SELECT public.get_my_admin_bank_ids()));
CREATE POLICY "Admins can update alerts" ON public.alert_configs FOR UPDATE
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));

-- =====================================================
-- Update Transaction RPC (reverses old balance, applies new)
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_transaction(
  p_txn_id UUID,
  p_customer_name TEXT DEFAULT NULL,
  p_customer_account TEXT DEFAULT NULL,
  p_amount NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_source TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_old RECORD;
  v_diff NUMERIC;
BEGIN
  -- Fetch old transaction
  SELECT * INTO v_old FROM public.transactions WHERE id = p_txn_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Calculate amount difference
  v_diff := COALESCE(p_amount, v_old.amount) - v_old.amount;

  -- Adjust balances based on type if amount changed
  IF v_diff <> 0 THEN
    IF v_old.type = 'deposit' THEN
      -- Deposit: hand cash increases, mother account decreases
      UPDATE public.hand_cash_accounts SET balance = balance + v_diff WHERE bank_id = v_old.bank_id;
      IF v_old.mother_account_id IS NOT NULL THEN
        UPDATE public.mother_accounts SET balance = balance - v_diff WHERE id = v_old.mother_account_id;
      END IF;
    ELSIF v_old.type = 'withdrawal' THEN
      -- Withdrawal: hand cash decreases (so diff is subtracted)
      UPDATE public.hand_cash_accounts SET balance = balance - v_diff WHERE bank_id = v_old.bank_id;
      -- If it had shortage, also adjust mother account
      IF v_old.has_shortage AND v_old.mother_account_id IS NOT NULL THEN
        UPDATE public.mother_accounts SET balance = balance - v_diff WHERE id = v_old.mother_account_id;
      END IF;
    ELSIF v_old.type = 'cash_in' THEN
      -- Cash-in: depends on where the cash went
      IF v_old.mother_account_id IS NOT NULL THEN
        UPDATE public.mother_accounts SET balance = balance + v_diff WHERE id = v_old.mother_account_id;
      ELSIF v_old.profit_account_id IS NOT NULL THEN
        UPDATE public.profit_accounts SET balance = balance + v_diff WHERE id = v_old.profit_account_id;
      ELSE
        -- default: hand cash
        UPDATE public.hand_cash_accounts SET balance = balance + v_diff WHERE bank_id = v_old.bank_id;
      END IF;
    END IF;
  END IF;

  -- Update the transaction record
  UPDATE public.transactions SET
    customer_name = COALESCE(p_customer_name, customer_name),
    customer_account = COALESCE(p_customer_account, customer_account),
    amount = COALESCE(p_amount, amount),
    notes = COALESCE(p_notes, notes),
    source = COALESCE(p_source, source)
  WHERE id = p_txn_id;

  RETURN p_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Generate Daily Log RPC (bypasses RLS for upsert)
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_daily_log(
  p_bank_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_date DATE := CURRENT_DATE;
  v_start TIMESTAMPTZ := v_date::timestamptz;
  v_end   TIMESTAMPTZ := (v_date + 1)::timestamptz;
  v_deposits  NUMERIC;
  v_withdrawals NUMERIC;
  v_cash_ins  NUMERIC;
  v_expenses  NUMERIC;
  v_hand_cash NUMERIC;
  v_result    RECORD;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_deposits
    FROM public.transactions WHERE bank_id = p_bank_id AND type = 'deposit'
    AND created_at >= v_start AND created_at < v_end;

  SELECT COALESCE(SUM(amount), 0) INTO v_withdrawals
    FROM public.transactions WHERE bank_id = p_bank_id AND type = 'withdrawal'
    AND created_at >= v_start AND created_at < v_end;

  SELECT COALESCE(SUM(amount), 0) INTO v_cash_ins
    FROM public.transactions WHERE bank_id = p_bank_id AND type = 'cash_in'
    AND created_at >= v_start AND created_at < v_end;

  SELECT COALESCE(SUM(amount), 0) INTO v_expenses
    FROM public.expenses WHERE bank_id = p_bank_id
    AND created_at >= v_start AND created_at < v_end;

  SELECT COALESCE(balance, 0) INTO v_hand_cash
    FROM public.hand_cash_accounts WHERE bank_id = p_bank_id;

  INSERT INTO public.daily_logs (bank_id, log_date, total_deposits, total_withdrawals, total_cash_in, total_expenses, total_commissions, closing_hand_cash, generated_by)
  VALUES (p_bank_id, v_date, v_deposits, v_withdrawals, v_cash_ins, v_expenses, 0, v_hand_cash, p_user_id)
  ON CONFLICT (bank_id, log_date)
  DO UPDATE SET
    total_deposits = EXCLUDED.total_deposits,
    total_withdrawals = EXCLUDED.total_withdrawals,
    total_cash_in = EXCLUDED.total_cash_in,
    total_expenses = EXCLUDED.total_expenses,
    total_commissions = EXCLUDED.total_commissions,
    closing_hand_cash = EXCLUDED.closing_hand_cash,
    generated_by = EXCLUDED.generated_by
  RETURNING * INTO v_result;

  RETURN row_to_json(v_result)::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Backup / Restore RPC functions
-- =====================================================

-- Table to store backups
CREATE TABLE IF NOT EXISTS public.bank_backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  backup_data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.bank_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view backups" ON public.bank_backups FOR SELECT
  USING (bank_id IN (SELECT public.get_my_bank_ids()));
CREATE POLICY "Admins can create backups" ON public.bank_backups FOR INSERT
  WITH CHECK (bank_id IN (SELECT public.get_my_admin_bank_ids()));
CREATE POLICY "Admins can delete backups" ON public.bank_backups FOR DELETE
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));

-- Create backup RPC
CREATE OR REPLACE FUNCTION public.create_bank_backup(
  p_bank_id UUID,
  p_label TEXT,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_backup JSONB;
  v_result RECORD;
  v_count  INT;
BEGIN
  SELECT jsonb_build_object(
    'bank', (SELECT row_to_json(b) FROM public.banks b WHERE b.id = p_bank_id),
    'mother_accounts', COALESCE((SELECT jsonb_agg(row_to_json(ma)) FROM public.mother_accounts ma WHERE ma.bank_id = p_bank_id), '[]'::jsonb),
    'hand_cash_accounts', COALESCE((SELECT jsonb_agg(row_to_json(hc)) FROM public.hand_cash_accounts hc WHERE hc.bank_id = p_bank_id), '[]'::jsonb),
    'profit_accounts', COALESCE((SELECT jsonb_agg(row_to_json(pa)) FROM public.profit_accounts pa WHERE pa.bank_id = p_bank_id), '[]'::jsonb),
    'transactions', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM public.transactions t WHERE t.bank_id = p_bank_id), '[]'::jsonb),
    'expenses', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM public.expenses e WHERE e.bank_id = p_bank_id), '[]'::jsonb),
    'expense_categories', COALESCE((SELECT jsonb_agg(row_to_json(ec)) FROM public.expense_categories ec WHERE ec.bank_id = p_bank_id), '[]'::jsonb),
    'daily_logs', COALESCE((SELECT jsonb_agg(row_to_json(dl)) FROM public.daily_logs dl WHERE dl.bank_id = p_bank_id), '[]'::jsonb)
  ) INTO v_backup;

  INSERT INTO public.bank_backups (bank_id, label, backup_data, created_by)
  VALUES (p_bank_id, p_label, v_backup, p_user_id)
  RETURNING * INTO v_result;

  -- Keep only the 3 most recent backups
  SELECT COUNT(*) INTO v_count FROM public.bank_backups WHERE bank_id = p_bank_id;
  IF v_count > 3 THEN
    DELETE FROM public.bank_backups
    WHERE id IN (
      SELECT id FROM public.bank_backups
      WHERE bank_id = p_bank_id
      ORDER BY created_at ASC
      LIMIT v_count - 3
    );
  END IF;

  RETURN row_to_json(v_result)::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore from backup RPC
CREATE OR REPLACE FUNCTION public.restore_bank_backup(
  p_backup_id UUID,
  p_bank_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_backup JSONB;
  v_item   JSONB;
BEGIN
  SELECT backup_data INTO v_backup FROM public.bank_backups WHERE id = p_backup_id AND bank_id = p_bank_id;
  IF v_backup IS NULL THEN
    RAISE EXCEPTION 'Backup not found';
  END IF;

  DELETE FROM public.daily_logs WHERE bank_id = p_bank_id;
  DELETE FROM public.expenses WHERE bank_id = p_bank_id;
  DELETE FROM public.transactions WHERE bank_id = p_bank_id;
  DELETE FROM public.expense_categories WHERE bank_id = p_bank_id;
  DELETE FROM public.profit_accounts WHERE bank_id = p_bank_id;
  DELETE FROM public.mother_accounts WHERE bank_id = p_bank_id;
  DELETE FROM public.hand_cash_accounts WHERE bank_id = p_bank_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup->'hand_cash_accounts') LOOP
    INSERT INTO public.hand_cash_accounts (id, bank_id, balance, created_at)
    VALUES ((v_item->>'id')::uuid, p_bank_id, (v_item->>'balance')::numeric, (v_item->>'created_at')::timestamptz)
    ON CONFLICT (id) DO UPDATE SET balance = EXCLUDED.balance;
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup->'mother_accounts') LOOP
    INSERT INTO public.mother_accounts (id, bank_id, name, account_number, balance, created_at)
    VALUES ((v_item->>'id')::uuid, p_bank_id, v_item->>'name', v_item->>'account_number', (v_item->>'balance')::numeric, (v_item->>'created_at')::timestamptz)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, account_number = EXCLUDED.account_number, balance = EXCLUDED.balance;
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup->'profit_accounts') LOOP
    INSERT INTO public.profit_accounts (id, bank_id, name, balance, created_at)
    VALUES ((v_item->>'id')::uuid, p_bank_id, v_item->>'name', (v_item->>'balance')::numeric, (v_item->>'created_at')::timestamptz)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, balance = EXCLUDED.balance;
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup->'expense_categories') LOOP
    INSERT INTO public.expense_categories (id, bank_id, name)
    VALUES ((v_item->>'id')::uuid, p_bank_id, v_item->>'name')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup->'transactions') LOOP
    INSERT INTO public.transactions (id, bank_id, type, amount, customer_name, customer_account, source, notes, mother_account_id, profit_account_id, has_shortage, shortage_amount, commission, created_by, created_at)
    VALUES (
      (v_item->>'id')::uuid, p_bank_id, v_item->>'type', (v_item->>'amount')::numeric,
      v_item->>'customer_name', v_item->>'customer_account', v_item->>'source', v_item->>'notes',
      (v_item->>'mother_account_id')::uuid, (v_item->>'profit_account_id')::uuid,
      COALESCE((v_item->>'has_shortage')::boolean, false), COALESCE((v_item->>'shortage_amount')::numeric, 0),
      COALESCE((v_item->>'commission')::numeric, 0), (v_item->>'created_by')::uuid, (v_item->>'created_at')::timestamptz
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup->'expenses') LOOP
    INSERT INTO public.expenses (id, bank_id, category_id, amount, description, created_by, created_at)
    VALUES (
      (v_item->>'id')::uuid, p_bank_id, (v_item->>'category_id')::uuid,
      (v_item->>'amount')::numeric, v_item->>'description',
      (v_item->>'created_by')::uuid, (v_item->>'created_at')::timestamptz
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup->'daily_logs') LOOP
    INSERT INTO public.daily_logs (id, bank_id, log_date, total_deposits, total_withdrawals, total_cash_in, total_expenses, total_commissions, closing_hand_cash, generated_by, created_at)
    VALUES (
      (v_item->>'id')::uuid, p_bank_id, (v_item->>'log_date')::date,
      (v_item->>'total_deposits')::numeric, (v_item->>'total_withdrawals')::numeric,
      (v_item->>'total_cash_in')::numeric, (v_item->>'total_expenses')::numeric,
      (v_item->>'total_commissions')::numeric, (v_item->>'closing_hand_cash')::numeric,
      (v_item->>'generated_by')::uuid, (v_item->>'created_at')::timestamptz
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  UPDATE public.banks SET
    name = COALESCE(v_backup->'bank'->>'name', name),
    currency = COALESCE(v_backup->'bank'->>'currency', currency)
  WHERE id = p_bank_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset all bank data RPC
CREATE OR REPLACE FUNCTION public.reset_bank_data(
  p_bank_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.daily_logs WHERE bank_id = p_bank_id;
  DELETE FROM public.expenses WHERE bank_id = p_bank_id;
  DELETE FROM public.transactions WHERE bank_id = p_bank_id;
  UPDATE public.hand_cash_accounts SET balance = 0 WHERE bank_id = p_bank_id;
  UPDATE public.mother_accounts SET balance = 0 WHERE bank_id = p_bank_id;
  UPDATE public.profit_accounts SET balance = 0 WHERE bank_id = p_bank_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;