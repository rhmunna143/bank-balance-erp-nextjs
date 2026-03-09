-- =====================================================
-- Run this STANDALONE in Supabase SQL Editor
-- It creates/replaces all backup & restore functions
-- =====================================================

-- 1. Create backups table (IF NOT EXISTS = safe to re-run)
CREATE TABLE IF NOT EXISTS public.bank_backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  backup_data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.bank_backups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid "already exists" errors
DROP POLICY IF EXISTS "Members can view backups" ON public.bank_backups;
DROP POLICY IF EXISTS "Admins can create backups" ON public.bank_backups;
DROP POLICY IF EXISTS "Admins can delete backups" ON public.bank_backups;

CREATE POLICY "Members can view backups" ON public.bank_backups FOR SELECT
  USING (bank_id IN (SELECT public.get_my_bank_ids()));
CREATE POLICY "Admins can create backups" ON public.bank_backups FOR INSERT
  WITH CHECK (bank_id IN (SELECT public.get_my_admin_bank_ids()));
CREATE POLICY "Admins can delete backups" ON public.bank_backups FOR DELETE
  USING (bank_id IN (SELECT public.get_my_admin_bank_ids()));

-- 2. Generate Daily Log RPC
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

-- 3. Create Backup RPC
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

-- 4. Restore Backup RPC (profit_accounts has NO account_number column)
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

  -- hand_cash_accounts
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup->'hand_cash_accounts') LOOP
    INSERT INTO public.hand_cash_accounts (id, bank_id, balance, created_at)
    VALUES ((v_item->>'id')::uuid, p_bank_id, (v_item->>'balance')::numeric, (v_item->>'created_at')::timestamptz)
    ON CONFLICT (id) DO UPDATE SET balance = EXCLUDED.balance;
  END LOOP;

  -- mother_accounts (HAS account_number)
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup->'mother_accounts') LOOP
    INSERT INTO public.mother_accounts (id, bank_id, name, account_number, balance, created_at)
    VALUES ((v_item->>'id')::uuid, p_bank_id, v_item->>'name', v_item->>'account_number', (v_item->>'balance')::numeric, (v_item->>'created_at')::timestamptz)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, account_number = EXCLUDED.account_number, balance = EXCLUDED.balance;
  END LOOP;

  -- profit_accounts (NO account_number column!)
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup->'profit_accounts') LOOP
    INSERT INTO public.profit_accounts (id, bank_id, name, balance, created_at)
    VALUES ((v_item->>'id')::uuid, p_bank_id, v_item->>'name', (v_item->>'balance')::numeric, (v_item->>'created_at')::timestamptz)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, balance = EXCLUDED.balance;
  END LOOP;

  -- expense_categories
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup->'expense_categories') LOOP
    INSERT INTO public.expense_categories (id, bank_id, name)
    VALUES ((v_item->>'id')::uuid, p_bank_id, v_item->>'name')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
  END LOOP;

  -- transactions
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup->'transactions') LOOP
    INSERT INTO public.transactions (id, bank_id, type, amount, customer_name, customer_account, source, notes, mother_account_id, profit_account_id, has_shortage, shortage_amount, commission, performed_by, created_at)
    VALUES (
      (v_item->>'id')::uuid, p_bank_id, v_item->>'type', (v_item->>'amount')::numeric,
      v_item->>'customer_name', v_item->>'customer_account', v_item->>'source', v_item->>'notes',
      (v_item->>'mother_account_id')::uuid, (v_item->>'profit_account_id')::uuid,
      COALESCE((v_item->>'has_shortage')::boolean, false), COALESCE((v_item->>'shortage_amount')::numeric, 0),
      COALESCE((v_item->>'commission')::numeric, 0), (v_item->>'performed_by')::uuid, (v_item->>'created_at')::timestamptz
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- expenses
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup->'expenses') LOOP
    INSERT INTO public.expenses (id, bank_id, category_id, amount, description, performed_by, created_at)
    VALUES (
      (v_item->>'id')::uuid, p_bank_id, (v_item->>'category_id')::uuid,
      (v_item->>'amount')::numeric, v_item->>'description',
      (v_item->>'performed_by')::uuid, (v_item->>'created_at')::timestamptz
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- daily_logs
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

-- 5. Reset Bank Data RPC
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
