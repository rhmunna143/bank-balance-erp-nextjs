-- =====================================================
-- Expense Reverse Feature (April 2026)
-- - Add reversal metadata columns for expenses
-- - Add reverse_expense RPC to rollback balances and mark expense reversed
-- =====================================================

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reversed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reversal_reason TEXT,
  ADD COLUMN IF NOT EXISTS reversed_trn_id TEXT;

CREATE INDEX IF NOT EXISTS idx_expenses_reversed ON public.expenses(is_reversed);

CREATE OR REPLACE FUNCTION public.reverse_expense(
  p_expense_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_reversed_trn_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_expense public.expenses%ROWTYPE;
BEGIN
  SELECT *
  INTO v_expense
  FROM public.expenses
  WHERE id = p_expense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;

  IF COALESCE(v_expense.is_reversed, FALSE) THEN
    RAISE EXCEPTION 'Expense is already reversed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.bank_members bm
    WHERE bm.bank_id = v_expense.bank_id
      AND bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only owner/admin can reverse expenses';
  END IF;

  -- Roll back the original deduction.
  IF v_expense.deduct_from = 'hand_cash' THEN
    UPDATE public.hand_cash_accounts
    SET balance = balance + v_expense.amount
    WHERE bank_id = v_expense.bank_id;
  ELSIF v_expense.deduct_from = 'profit_account' AND v_expense.profit_account_id IS NOT NULL THEN
    UPDATE public.profit_accounts
    SET balance = balance + v_expense.amount
    WHERE id = v_expense.profit_account_id;
  ELSIF v_expense.deduct_from = 'mother_account' AND v_expense.mother_account_id IS NOT NULL THEN
    UPDATE public.mother_accounts
    SET balance = balance + v_expense.amount
    WHERE id = v_expense.mother_account_id;
  END IF;

  UPDATE public.expenses
  SET
    is_reversed = TRUE,
    reversed_at = NOW(),
    reversed_by = auth.uid(),
    reversal_reason = p_reason,
    reversed_trn_id = p_reversed_trn_id
  WHERE id = p_expense_id;

  RETURN p_expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

  IF COALESCE(v_old.is_reversed, FALSE) THEN
    RAISE EXCEPTION 'Reversed expenses cannot be edited';
  END IF;

  v_diff := COALESCE(p_amount, v_old.amount) - v_old.amount;

  IF v_diff <> 0 THEN
    IF v_old.deduct_from = 'hand_cash' THEN
      UPDATE public.hand_cash_accounts SET balance = balance + v_old.amount WHERE bank_id = v_old.bank_id;
    ELSIF v_old.deduct_from = 'profit_account' AND v_old.profit_account_id IS NOT NULL THEN
      UPDATE public.profit_accounts SET balance = balance + v_old.amount WHERE id = v_old.profit_account_id;
    ELSIF v_old.deduct_from = 'mother_account' AND v_old.mother_account_id IS NOT NULL THEN
      UPDATE public.mother_accounts SET balance = balance + v_old.amount WHERE id = v_old.mother_account_id;
    END IF;

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
    description = COALESCE(p_description, description)
  WHERE id = p_expense_id;

  RETURN p_expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
