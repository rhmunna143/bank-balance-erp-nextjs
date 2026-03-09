-- =====================================================
-- FIX: Deposit should deduct mother account balance
-- FIX: Profiles RLS so admins can see other members
-- FIX: Expenses should be updatable
-- Run this script in Supabase SQL Editor
-- =====================================================

-- 1. Fix process_deposit: hand cash UP, mother account DOWN
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

  -- Increase hand cash (agent receives physical cash from customer)
  UPDATE public.hand_cash_accounts SET balance = balance + p_amount WHERE bank_id = p_bank_id;

  -- Decrease mother account (agent sends money from mother account to customer's bank)
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

-- 2. Fix update_transaction to also handle mother account for deposits
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
  SELECT * INTO v_old FROM public.transactions WHERE id = p_txn_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  v_diff := COALESCE(p_amount, v_old.amount) - v_old.amount;

  IF v_diff <> 0 THEN
    IF v_old.type = 'deposit' THEN
      -- Deposit: hand cash increases, mother account decreases
      UPDATE public.hand_cash_accounts SET balance = balance + v_diff WHERE bank_id = v_old.bank_id;
      IF v_old.mother_account_id IS NOT NULL THEN
        UPDATE public.mother_accounts SET balance = balance - v_diff WHERE id = v_old.mother_account_id;
      END IF;
    ELSIF v_old.type = 'withdrawal' THEN
      UPDATE public.hand_cash_accounts SET balance = balance - v_diff WHERE bank_id = v_old.bank_id;
      IF v_old.has_shortage AND v_old.mother_account_id IS NOT NULL THEN
        UPDATE public.mother_accounts SET balance = balance - v_diff WHERE id = v_old.mother_account_id;
      END IF;
    ELSIF v_old.type = 'cash_in' THEN
      IF v_old.mother_account_id IS NOT NULL THEN
        UPDATE public.mother_accounts SET balance = balance + v_diff WHERE id = v_old.mother_account_id;
      ELSIF v_old.profit_account_id IS NOT NULL THEN
        UPDATE public.profit_accounts SET balance = balance + v_diff WHERE id = v_old.profit_account_id;
      ELSE
        UPDATE public.hand_cash_accounts SET balance = balance + v_diff WHERE bank_id = v_old.bank_id;
      END IF;
    END IF;
  END IF;

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

-- 3. Fix profiles RLS: bank members can view profiles of other members in same bank
-- Drop the old restrictive policy and replace with one that allows co-member visibility
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Bank members can view co-member profiles" ON public.profiles;
CREATE POLICY "Bank members can view co-member profiles" ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR id IN (
      SELECT bm.user_id FROM public.bank_members bm
      WHERE bm.bank_id IN (SELECT public.get_my_bank_ids())
    )
  );

-- 4. Allow expense updates by members
DROP POLICY IF EXISTS "Members can update expenses" ON public.expenses;
CREATE POLICY "Members can update expenses" ON public.expenses FOR UPDATE
  USING (bank_id IN (SELECT public.get_my_bank_ids()));

-- 5. Update expense RPC for editing
CREATE OR REPLACE FUNCTION public.update_expense(
  p_expense_id UUID,
  p_amount NUMERIC DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_deduct_from TEXT DEFAULT NULL,
  p_mother_account_id UUID DEFAULT NULL,
  p_profit_account_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_old RECORD;
  v_diff NUMERIC;
BEGIN
  SELECT * INTO v_old FROM public.expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;

  v_diff := COALESCE(p_amount, v_old.amount) - v_old.amount;

  -- If amount changed, reverse old deduction and apply new
  IF v_diff <> 0 THEN
    -- Reverse old deduction (add back)
    IF v_old.deduct_from = 'hand_cash' THEN
      UPDATE public.hand_cash_accounts SET balance = balance + v_old.amount WHERE bank_id = v_old.bank_id;
    ELSIF v_old.deduct_from = 'profit_account' AND v_old.profit_account_id IS NOT NULL THEN
      UPDATE public.profit_accounts SET balance = balance + v_old.amount WHERE id = v_old.profit_account_id;
    ELSIF v_old.deduct_from = 'mother_account' AND v_old.mother_account_id IS NOT NULL THEN
      UPDATE public.mother_accounts SET balance = balance + v_old.amount WHERE id = v_old.mother_account_id;
    END IF;

    -- Apply new deduction
    IF COALESCE(p_deduct_from, v_old.deduct_from) = 'hand_cash' THEN
      UPDATE public.hand_cash_accounts SET balance = balance - COALESCE(p_amount, v_old.amount) WHERE bank_id = v_old.bank_id;
    ELSIF COALESCE(p_deduct_from, v_old.deduct_from) = 'profit_account' THEN
      UPDATE public.profit_accounts SET balance = balance - COALESCE(p_amount, v_old.amount) WHERE id = COALESCE(p_profit_account_id, v_old.profit_account_id);
    ELSIF COALESCE(p_deduct_from, v_old.deduct_from) = 'mother_account' THEN
      UPDATE public.mother_accounts SET balance = balance - COALESCE(p_amount, v_old.amount) WHERE id = COALESCE(p_mother_account_id, v_old.mother_account_id);
    END IF;
  END IF;

  UPDATE public.expenses SET
    amount = COALESCE(p_amount, amount),
    category_id = COALESCE(p_category_id, category_id),
    description = COALESCE(p_description, description),
    updated_at = NOW()
  WHERE id = p_expense_id;

  RETURN p_expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
