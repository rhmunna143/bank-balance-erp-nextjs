-- Migration: Add "Hand Cash" source support to process_cash_in
-- When source = 'Hand Cash', deduct from hand_cash_accounts in addition to crediting the target account.
-- This enables transferring money from hand cash to a mother account (or other targets).

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
  v_hand_cash_balance NUMERIC;
BEGIN
  -- If source is Hand Cash, validate sufficient balance
  IF p_source = 'Hand Cash' THEN
    SELECT balance INTO v_hand_cash_balance
    FROM public.hand_cash_accounts
    WHERE bank_id = p_bank_id;

    IF v_hand_cash_balance IS NULL OR v_hand_cash_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient hand cash balance. Available: %, Required: %', COALESCE(v_hand_cash_balance, 0), p_amount;
    END IF;
  END IF;

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

  -- Debit hand cash if source is Hand Cash
  IF p_source = 'Hand Cash' THEN
    UPDATE public.hand_cash_accounts SET balance = balance - p_amount WHERE bank_id = p_bank_id;
  END IF;

  RETURN v_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
