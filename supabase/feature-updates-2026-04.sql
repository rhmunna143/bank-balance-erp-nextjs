-- =====================================================
-- Feature Updates (April 2026)
-- - Optional TRN ID for transactions/expenses/loans/loan returns
-- - User-selected transaction dates (defaults handled in app)
-- - Reverse transaction system
-- - Fund transfer system
-- - Loan full return removes linked loan expense entry
-- =====================================================

-- 1) Schema updates
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS trn_id TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS destination_type TEXT,
  ADD COLUMN IF NOT EXISTS destination_account_id UUID,
  ADD COLUMN IF NOT EXISTS destination_name TEXT,
  ADD COLUMN IF NOT EXISTS destination_account TEXT,
  ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reversed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reversal_reason TEXT,
  ADD COLUMN IF NOT EXISTS reversed_trn_id TEXT;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS trn_id TEXT;

ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS trn_id TEXT;

ALTER TABLE public.loan_returns
  ADD COLUMN IF NOT EXISTS trn_id TEXT,
  ADD COLUMN IF NOT EXISTS destination_type TEXT,
  ADD COLUMN IF NOT EXISTS destination_account_id UUID;

ALTER TABLE public.loan_returns DROP CONSTRAINT IF EXISTS loan_returns_destination_type_check;
ALTER TABLE public.loan_returns
  ADD CONSTRAINT loan_returns_destination_type_check
  CHECK (
    destination_type IS NULL
    OR destination_type IN ('hand_cash', 'mother_account', 'profit_account')
  );

-- Extend transaction type check for fund transfer
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('deposit', 'withdrawal', 'cash_in', 'fund_transfer'));

CREATE INDEX IF NOT EXISTS idx_transactions_trn_id ON public.transactions(trn_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reversed ON public.transactions(is_reversed);
CREATE INDEX IF NOT EXISTS idx_expenses_trn_id ON public.expenses(trn_id);
CREATE INDEX IF NOT EXISTS idx_loans_trn_id ON public.loans(trn_id);
CREATE INDEX IF NOT EXISTS idx_loan_returns_trn_id ON public.loan_returns(trn_id);

-- Ensure deleting an expense does not violate loans.expense_id FK
ALTER TABLE public.loans
  DROP CONSTRAINT IF EXISTS loans_expense_id_fkey;

ALTER TABLE public.loans
  ADD CONSTRAINT loans_expense_id_fkey
  FOREIGN KEY (expense_id)
  REFERENCES public.expenses(id)
  ON DELETE SET NULL;

-- 2) RPC updates with optional trn_id + created_at

CREATE OR REPLACE FUNCTION public.process_deposit(
  p_bank_id UUID,
  p_customer_name TEXT,
  p_customer_account TEXT,
  p_trn_id TEXT,
  p_amount NUMERIC,
  p_commission NUMERIC,
  p_mother_account_id UUID,
  p_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_txn_id UUID;
BEGIN
  INSERT INTO public.transactions (
    bank_id, type, amount, commission, customer_name, customer_account,
    trn_id, mother_account_id, reference, notes, performed_by, created_at
  )
  VALUES (
    p_bank_id, 'deposit', p_amount, p_commission, p_customer_name, p_customer_account,
    p_trn_id, p_mother_account_id, p_reference, p_notes, auth.uid(), COALESCE(p_created_at, NOW())
  )
  RETURNING id INTO v_txn_id;

  UPDATE public.hand_cash_accounts SET balance = balance + p_amount WHERE bank_id = p_bank_id;
  UPDATE public.mother_accounts SET balance = balance - p_amount WHERE id = p_mother_account_id;

  IF p_commission > 0 THEN
    UPDATE public.profit_accounts
    SET balance = balance + p_commission
    WHERE id = (
      SELECT id FROM public.profit_accounts WHERE bank_id = p_bank_id LIMIT 1
    );

    UPDATE public.transactions
    SET profit_account_id = (
      SELECT id FROM public.profit_accounts WHERE bank_id = p_bank_id LIMIT 1
    )
    WHERE id = v_txn_id;
  END IF;

  RETURN v_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.process_withdrawal(
  p_bank_id UUID,
  p_customer_name TEXT,
  p_customer_account TEXT,
  p_trn_id TEXT,
  p_amount NUMERIC,
  p_commission NUMERIC,
  p_mother_account_id UUID,
  p_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_txn_id UUID;
BEGIN
  INSERT INTO public.transactions (
    bank_id, type, amount, commission, customer_name, customer_account,
    trn_id, mother_account_id, reference, notes, performed_by, created_at
  )
  VALUES (
    p_bank_id, 'withdrawal', p_amount, p_commission, p_customer_name, p_customer_account,
    p_trn_id, p_mother_account_id, p_reference, p_notes, auth.uid(), COALESCE(p_created_at, NOW())
  )
  RETURNING id INTO v_txn_id;

  UPDATE public.hand_cash_accounts SET balance = balance - p_amount WHERE bank_id = p_bank_id;
  UPDATE public.mother_accounts SET balance = balance + p_amount WHERE id = p_mother_account_id;

  IF p_commission > 0 THEN
    UPDATE public.profit_accounts
    SET balance = balance + p_commission
    WHERE id = (
      SELECT id FROM public.profit_accounts WHERE bank_id = p_bank_id LIMIT 1
    );

    UPDATE public.transactions
    SET profit_account_id = (
      SELECT id FROM public.profit_accounts WHERE bank_id = p_bank_id LIMIT 1
    )
    WHERE id = v_txn_id;
  END IF;

  RETURN v_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.process_withdrawal_with_shortage(
  p_bank_id UUID,
  p_customer_name TEXT,
  p_customer_account TEXT,
  p_trn_id TEXT,
  p_amount NUMERIC,
  p_commission NUMERIC,
  p_mother_account_id UUID,
  p_shortage_amount NUMERIC,
  p_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_txn_id UUID;
BEGIN
  INSERT INTO public.transactions (
    bank_id, type, amount, commission, customer_name, customer_account,
    trn_id, mother_account_id, reference, notes, has_shortage, shortage_amount,
    performed_by, created_at
  )
  VALUES (
    p_bank_id, 'withdrawal', p_amount, p_commission, p_customer_name, p_customer_account,
    p_trn_id, p_mother_account_id, p_reference, p_notes, TRUE, p_shortage_amount,
    auth.uid(), COALESCE(p_created_at, NOW())
  )
  RETURNING id INTO v_txn_id;

  UPDATE public.hand_cash_accounts SET balance = balance - (p_amount - p_shortage_amount) WHERE bank_id = p_bank_id;
  UPDATE public.mother_accounts SET balance = balance - p_shortage_amount WHERE id = p_mother_account_id;

  IF p_commission > 0 THEN
    UPDATE public.profit_accounts
    SET balance = balance + p_commission
    WHERE id = (
      SELECT id FROM public.profit_accounts WHERE bank_id = p_bank_id LIMIT 1
    );

    UPDATE public.transactions
    SET profit_account_id = (
      SELECT id FROM public.profit_accounts WHERE bank_id = p_bank_id LIMIT 1
    )
    WHERE id = v_txn_id;
  END IF;

  RETURN v_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.process_cash_in(
  p_bank_id UUID,
  p_trn_id TEXT,
  p_amount NUMERIC,
  p_target_type TEXT,
  p_target_id UUID DEFAULT NULL,
  p_source TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_txn_id UUID;
BEGIN
  IF p_source = 'Hand Cash' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.hand_cash_accounts
      WHERE bank_id = p_bank_id
        AND balance >= p_amount
    ) THEN
      RAISE EXCEPTION 'Insufficient hand cash balance';
    END IF;
  END IF;

  INSERT INTO public.transactions (
    bank_id, type, amount, trn_id, source, mother_account_id, profit_account_id,
    reference, notes, performed_by, created_at
  )
  VALUES (
    p_bank_id, 'cash_in', p_amount, p_trn_id, p_source,
    CASE WHEN p_target_type = 'mother_account' THEN p_target_id ELSE NULL END,
    CASE WHEN p_target_type = 'profit_account' THEN p_target_id ELSE NULL END,
    p_reference, p_notes, auth.uid(), COALESCE(p_created_at, NOW())
  )
  RETURNING id INTO v_txn_id;

  IF p_target_type = 'hand_cash' THEN
    UPDATE public.hand_cash_accounts SET balance = balance + p_amount WHERE bank_id = p_bank_id;
  ELSIF p_target_type = 'mother_account' AND p_target_id IS NOT NULL THEN
    UPDATE public.mother_accounts SET balance = balance + p_amount WHERE id = p_target_id;
  ELSIF p_target_type = 'profit_account' AND p_target_id IS NOT NULL THEN
    UPDATE public.profit_accounts SET balance = balance + p_amount WHERE id = p_target_id;
  END IF;

  IF p_source = 'Hand Cash' THEN
    UPDATE public.hand_cash_accounts SET balance = balance - p_amount WHERE bank_id = p_bank_id;
  END IF;

  RETURN v_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.process_expense(
  p_bank_id UUID,
  p_trn_id TEXT,
  p_amount NUMERIC,
  p_category_id UUID,
  p_deduct_from TEXT,
  p_profit_account_id UUID DEFAULT NULL,
  p_mother_account_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_receipt_url TEXT DEFAULT NULL,
  p_created_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_expense_id UUID;
BEGIN
  INSERT INTO public.expenses (
    bank_id, trn_id, amount, category_id, deduct_from, profit_account_id,
    mother_account_id, description, receipt_url, performed_by, created_at
  )
  VALUES (
    p_bank_id, p_trn_id, p_amount, p_category_id, p_deduct_from, p_profit_account_id,
    p_mother_account_id, p_description, p_receipt_url, auth.uid(), COALESCE(p_created_at, NOW())
  )
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

CREATE OR REPLACE FUNCTION public.process_loan_issue(
  p_bank_id UUID,
  p_borrower_user_id UUID,
  p_trn_id TEXT,
  p_amount NUMERIC,
  p_source_type TEXT,
  p_source_account_id UUID DEFAULT NULL,
  p_due_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_expense_id UUID;
  v_loan_id UUID;
BEGIN
  INSERT INTO public.expense_categories (bank_id, name)
  SELECT p_bank_id, 'Loan'
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.expense_categories
    WHERE bank_id = p_bank_id
      AND name = 'Loan'
  );

  v_expense_id := public.process_expense(
    p_bank_id,
    p_trn_id,
    p_amount,
    (
      SELECT id
      FROM public.expense_categories
      WHERE bank_id = p_bank_id AND name = 'Loan'
      ORDER BY created_at ASC
      LIMIT 1
    ),
    p_source_type,
    CASE WHEN p_source_type = 'profit_account' THEN p_source_account_id ELSE NULL END,
    CASE WHEN p_source_type = 'mother_account' THEN p_source_account_id ELSE NULL END,
    COALESCE(p_notes, 'Short-term loan issued'),
    NULL,
    p_created_at
  );

  INSERT INTO public.loans (
    bank_id, borrower_user_id, trn_id, amount, source_type, source_account_id,
    expense_id, due_date, notes, issued_by, created_at, updated_at
  )
  VALUES (
    p_bank_id, p_borrower_user_id, p_trn_id, p_amount, p_source_type, p_source_account_id,
    v_expense_id, p_due_date, p_notes, auth.uid(), COALESCE(p_created_at, NOW()), NOW()
  )
  RETURNING id INTO v_loan_id;

  RETURN v_loan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.process_loan_return(
  p_loan_id UUID,
  p_trn_id TEXT,
  p_amount NUMERIC,
  p_destination_type TEXT DEFAULT NULL,
  p_destination_account_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_return_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.loans WHERE id = p_loan_id) THEN
    RAISE EXCEPTION 'Loan not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.loans
    WHERE id = p_loan_id
      AND status = 'returned'
  ) THEN
    RAISE EXCEPTION 'Loan already fully returned';
  END IF;

  IF p_amount > (
    SELECT (amount - returned_amount)
    FROM public.loans
    WHERE id = p_loan_id
  ) THEN
    RAISE EXCEPTION 'Return amount exceeds remaining balance';
  END IF;

  IF COALESCE(p_destination_type, (SELECT source_type FROM public.loans WHERE id = p_loan_id))
     NOT IN ('hand_cash', 'mother_account', 'profit_account') THEN
    RAISE EXCEPTION 'Invalid destination type';
  END IF;

  IF COALESCE(p_destination_type, (SELECT source_type FROM public.loans WHERE id = p_loan_id)) = 'mother_account'
     AND COALESCE(
       p_destination_account_id,
       (
         SELECT source_account_id
         FROM public.loans
         WHERE id = p_loan_id AND source_type = 'mother_account'
       )
     ) IS NULL THEN
    RAISE EXCEPTION 'Destination mother account is required';
  END IF;

  IF COALESCE(p_destination_type, (SELECT source_type FROM public.loans WHERE id = p_loan_id)) = 'profit_account'
     AND COALESCE(
       p_destination_account_id,
       (
         SELECT source_account_id
         FROM public.loans
         WHERE id = p_loan_id AND source_type = 'profit_account'
       )
     ) IS NULL THEN
    RAISE EXCEPTION 'Destination profit account is required';
  END IF;

  UPDATE public.hand_cash_accounts
  SET balance = balance + p_amount
  WHERE bank_id = (
    SELECT bank_id
    FROM public.loans
    WHERE id = p_loan_id
      AND COALESCE(p_destination_type, source_type) = 'hand_cash'
  );

  UPDATE public.mother_accounts
  SET balance = balance + p_amount
  WHERE id = (
    SELECT COALESCE(
      p_destination_account_id,
      source_account_id
    )
    FROM public.loans
    WHERE id = p_loan_id
      AND COALESCE(p_destination_type, source_type) = 'mother_account'
  );

  UPDATE public.profit_accounts
  SET balance = balance + p_amount
  WHERE id = (
    SELECT COALESCE(
      p_destination_account_id,
      source_account_id
    )
    FROM public.loans
    WHERE id = p_loan_id
      AND COALESCE(p_destination_type, source_type) = 'profit_account'
  );

  INSERT INTO public.loan_returns (
    loan_id, bank_id, trn_id, amount,
    destination_type, destination_account_id,
    returned_by, notes, created_at
  )
  VALUES (
    p_loan_id,
    (SELECT bank_id FROM public.loans WHERE id = p_loan_id),
    p_trn_id,
    p_amount,
    COALESCE(p_destination_type, (SELECT source_type FROM public.loans WHERE id = p_loan_id)),
    COALESCE(
      p_destination_account_id,
      (
        SELECT source_account_id
        FROM public.loans
        WHERE id = p_loan_id
          AND source_type IN ('mother_account', 'profit_account')
      )
    ),
    auth.uid(),
    p_notes,
    COALESCE(p_created_at, NOW())
  )
  RETURNING id INTO v_return_id;

  UPDATE public.loans SET
    returned_amount = returned_amount + p_amount,
    status = CASE
      WHEN (returned_amount + p_amount) >= amount THEN 'returned'
      ELSE 'partially_returned'
    END,
    updated_at = NOW()
  WHERE id = p_loan_id;

  -- Full return: remove linked expense record for cleaner reports
  IF EXISTS (
    SELECT 1
    FROM public.loans
    WHERE id = p_loan_id
      AND returned_amount >= amount
      AND expense_id IS NOT NULL
  ) THEN
    WITH linked_expense AS (
      SELECT expense_id AS id
      FROM public.loans
      WHERE id = p_loan_id
        AND returned_amount >= amount
        AND expense_id IS NOT NULL
    ), detach AS (
      UPDATE public.loans
      SET expense_id = NULL
      WHERE id = p_loan_id
        AND EXISTS (SELECT 1 FROM linked_expense)
      RETURNING 1
    )
    DELETE FROM public.expenses
    WHERE id IN (SELECT id FROM linked_expense);
  END IF;

  RETURN v_return_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Fund transfer RPC
CREATE OR REPLACE FUNCTION public.process_fund_transfer(
  p_bank_id UUID,
  p_trn_id TEXT,
  p_amount NUMERIC,
  p_source_type TEXT,
  p_source_account_id UUID DEFAULT NULL,
  p_destination_type TEXT DEFAULT NULL,
  p_destination_account_id UUID DEFAULT NULL,
  p_destination_name TEXT DEFAULT NULL,
  p_destination_account TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_txn_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be greater than zero';
  END IF;

  -- Debit source
  IF p_source_type = 'hand_cash' THEN
    UPDATE public.hand_cash_accounts SET balance = balance - p_amount WHERE bank_id = p_bank_id;
  ELSIF p_source_type = 'mother_account' THEN
    IF p_source_account_id IS NULL THEN RAISE EXCEPTION 'Source mother account is required'; END IF;
    UPDATE public.mother_accounts SET balance = balance - p_amount WHERE id = p_source_account_id;
  ELSIF p_source_type = 'profit_account' THEN
    IF p_source_account_id IS NULL THEN RAISE EXCEPTION 'Source profit account is required'; END IF;
    UPDATE public.profit_accounts SET balance = balance - p_amount WHERE id = p_source_account_id;
  ELSE
    RAISE EXCEPTION 'Invalid source type';
  END IF;

  -- Credit destination for internal transfers
  IF p_destination_type = 'hand_cash' THEN
    UPDATE public.hand_cash_accounts SET balance = balance + p_amount WHERE bank_id = p_bank_id;
  ELSIF p_destination_type = 'mother_account' THEN
    IF p_destination_account_id IS NULL THEN RAISE EXCEPTION 'Destination mother account is required'; END IF;
    UPDATE public.mother_accounts SET balance = balance + p_amount WHERE id = p_destination_account_id;
  ELSIF p_destination_type = 'profit_account' THEN
    IF p_destination_account_id IS NULL THEN RAISE EXCEPTION 'Destination profit account is required'; END IF;
    UPDATE public.profit_accounts SET balance = balance + p_amount WHERE id = p_destination_account_id;
  ELSIF p_destination_type = 'external_holder' THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Invalid destination type';
  END IF;

  INSERT INTO public.transactions (
    bank_id, type, trn_id, amount,
    source_type, destination_type,
    mother_account_id, profit_account_id,
    destination_account_id, destination_name, destination_account,
    customer_name, customer_account,
    notes, performed_by, created_at
  ) VALUES (
    p_bank_id, 'fund_transfer', p_trn_id, p_amount,
    p_source_type, p_destination_type,
    CASE WHEN p_source_type = 'mother_account' THEN p_source_account_id ELSE NULL END,
    CASE WHEN p_source_type = 'profit_account' THEN p_source_account_id ELSE NULL END,
    p_destination_account_id, p_destination_name, p_destination_account,
    p_destination_name, p_destination_account,
    p_notes, auth.uid(), COALESCE(p_created_at, NOW())
  )
  RETURNING id INTO v_txn_id;

  RETURN v_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Reverse transaction RPC
CREATE OR REPLACE FUNCTION public.reverse_transaction(
  p_txn_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_reversed_trn_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.transactions WHERE id = p_txn_id) THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.transactions
    WHERE id = p_txn_id AND COALESCE(is_reversed, FALSE)
  ) THEN
    RAISE EXCEPTION 'Transaction is already reversed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.bank_members bm
    WHERE bm.bank_id = (SELECT bank_id FROM public.transactions WHERE id = p_txn_id)
      AND bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only owner/admin can reverse transactions';
  END IF;

  IF EXISTS (SELECT 1 FROM public.transactions WHERE id = p_txn_id AND type = 'deposit') THEN
    UPDATE public.hand_cash_accounts
    SET balance = balance - (SELECT amount FROM public.transactions WHERE id = p_txn_id)
    WHERE bank_id = (SELECT bank_id FROM public.transactions WHERE id = p_txn_id);

    IF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE id = p_txn_id AND mother_account_id IS NOT NULL
    ) THEN
      UPDATE public.mother_accounts
      SET balance = balance + (SELECT amount FROM public.transactions WHERE id = p_txn_id)
      WHERE id = (SELECT mother_account_id FROM public.transactions WHERE id = p_txn_id);
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE id = p_txn_id
        AND COALESCE(commission, 0) > 0
        AND profit_account_id IS NOT NULL
    ) THEN
      UPDATE public.profit_accounts
      SET balance = balance - (SELECT COALESCE(commission, 0) FROM public.transactions WHERE id = p_txn_id)
      WHERE id = (SELECT profit_account_id FROM public.transactions WHERE id = p_txn_id);
    END IF;

  ELSIF EXISTS (SELECT 1 FROM public.transactions WHERE id = p_txn_id AND type = 'withdrawal') THEN
    IF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE id = p_txn_id AND COALESCE(has_shortage, FALSE)
    ) THEN
      UPDATE public.hand_cash_accounts
      SET balance = balance + (
        (SELECT amount FROM public.transactions WHERE id = p_txn_id)
        - (SELECT COALESCE(shortage_amount, 0) FROM public.transactions WHERE id = p_txn_id)
      )
      WHERE bank_id = (SELECT bank_id FROM public.transactions WHERE id = p_txn_id);

      IF EXISTS (
        SELECT 1 FROM public.transactions
        WHERE id = p_txn_id AND mother_account_id IS NOT NULL
      ) THEN
        UPDATE public.mother_accounts
        SET balance = balance + (SELECT COALESCE(shortage_amount, 0) FROM public.transactions WHERE id = p_txn_id)
        WHERE id = (SELECT mother_account_id FROM public.transactions WHERE id = p_txn_id);
      END IF;
    ELSE
      UPDATE public.hand_cash_accounts
      SET balance = balance + (SELECT amount FROM public.transactions WHERE id = p_txn_id)
      WHERE bank_id = (SELECT bank_id FROM public.transactions WHERE id = p_txn_id);
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE id = p_txn_id
        AND COALESCE(commission, 0) > 0
        AND profit_account_id IS NOT NULL
    ) THEN
      UPDATE public.profit_accounts
      SET balance = balance - (SELECT COALESCE(commission, 0) FROM public.transactions WHERE id = p_txn_id)
      WHERE id = (SELECT profit_account_id FROM public.transactions WHERE id = p_txn_id);
    END IF;

  ELSIF EXISTS (SELECT 1 FROM public.transactions WHERE id = p_txn_id AND type = 'cash_in') THEN
    IF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE id = p_txn_id AND mother_account_id IS NOT NULL
    ) THEN
      UPDATE public.mother_accounts
      SET balance = balance - (SELECT amount FROM public.transactions WHERE id = p_txn_id)
      WHERE id = (SELECT mother_account_id FROM public.transactions WHERE id = p_txn_id);
    ELSIF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE id = p_txn_id AND profit_account_id IS NOT NULL
    ) THEN
      UPDATE public.profit_accounts
      SET balance = balance - (SELECT amount FROM public.transactions WHERE id = p_txn_id)
      WHERE id = (SELECT profit_account_id FROM public.transactions WHERE id = p_txn_id);
    ELSE
      UPDATE public.hand_cash_accounts
      SET balance = balance - (SELECT amount FROM public.transactions WHERE id = p_txn_id)
      WHERE bank_id = (SELECT bank_id FROM public.transactions WHERE id = p_txn_id);
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE id = p_txn_id AND source = 'Hand Cash'
    ) THEN
      UPDATE public.hand_cash_accounts
      SET balance = balance + (SELECT amount FROM public.transactions WHERE id = p_txn_id)
      WHERE bank_id = (SELECT bank_id FROM public.transactions WHERE id = p_txn_id);
    END IF;

  ELSIF EXISTS (SELECT 1 FROM public.transactions WHERE id = p_txn_id AND type = 'fund_transfer') THEN
    -- Give money back to source
    IF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE id = p_txn_id AND source_type = 'hand_cash'
    ) THEN
      UPDATE public.hand_cash_accounts
      SET balance = balance + (SELECT amount FROM public.transactions WHERE id = p_txn_id)
      WHERE bank_id = (SELECT bank_id FROM public.transactions WHERE id = p_txn_id);
    ELSIF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE id = p_txn_id AND source_type = 'mother_account' AND mother_account_id IS NOT NULL
    ) THEN
      UPDATE public.mother_accounts
      SET balance = balance + (SELECT amount FROM public.transactions WHERE id = p_txn_id)
      WHERE id = (SELECT mother_account_id FROM public.transactions WHERE id = p_txn_id);
    ELSIF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE id = p_txn_id AND source_type = 'profit_account' AND profit_account_id IS NOT NULL
    ) THEN
      UPDATE public.profit_accounts
      SET balance = balance + (SELECT amount FROM public.transactions WHERE id = p_txn_id)
      WHERE id = (SELECT profit_account_id FROM public.transactions WHERE id = p_txn_id);
    END IF;

    -- Remove money from destination if internal
    IF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE id = p_txn_id AND destination_type = 'hand_cash'
    ) THEN
      UPDATE public.hand_cash_accounts
      SET balance = balance - (SELECT amount FROM public.transactions WHERE id = p_txn_id)
      WHERE bank_id = (SELECT bank_id FROM public.transactions WHERE id = p_txn_id);
    ELSIF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE id = p_txn_id AND destination_type = 'mother_account' AND destination_account_id IS NOT NULL
    ) THEN
      UPDATE public.mother_accounts
      SET balance = balance - (SELECT amount FROM public.transactions WHERE id = p_txn_id)
      WHERE id = (SELECT destination_account_id FROM public.transactions WHERE id = p_txn_id);
    ELSIF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE id = p_txn_id AND destination_type = 'profit_account' AND destination_account_id IS NOT NULL
    ) THEN
      UPDATE public.profit_accounts
      SET balance = balance - (SELECT amount FROM public.transactions WHERE id = p_txn_id)
      WHERE id = (SELECT destination_account_id FROM public.transactions WHERE id = p_txn_id);
    END IF;
  END IF;

  UPDATE public.transactions
  SET
    is_reversed = TRUE,
    reversed_at = NOW(),
    reversed_by = auth.uid(),
    reversal_reason = p_reason,
    reversed_trn_id = p_reversed_trn_id
  WHERE id = p_txn_id;

  RETURN p_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) update_transaction with trn_id support
CREATE OR REPLACE FUNCTION public.update_transaction(
  p_txn_id UUID,
  p_customer_name TEXT DEFAULT NULL,
  p_customer_account TEXT DEFAULT NULL,
  p_amount NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_source TEXT DEFAULT NULL,
  p_trn_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.transactions WHERE id = p_txn_id) THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.transactions
    WHERE id = p_txn_id AND COALESCE(is_reversed, FALSE)
  ) THEN
    RAISE EXCEPTION 'Reversed transactions cannot be edited';
  END IF;

  IF (COALESCE(p_amount, (SELECT amount FROM public.transactions WHERE id = p_txn_id))
      - (SELECT amount FROM public.transactions WHERE id = p_txn_id)) <> 0 THEN

    IF EXISTS (SELECT 1 FROM public.transactions WHERE id = p_txn_id AND type = 'deposit') THEN
      UPDATE public.hand_cash_accounts
      SET balance = balance + (
        COALESCE(p_amount, (SELECT amount FROM public.transactions WHERE id = p_txn_id))
        - (SELECT amount FROM public.transactions WHERE id = p_txn_id)
      )
      WHERE bank_id = (SELECT bank_id FROM public.transactions WHERE id = p_txn_id);

      IF EXISTS (
        SELECT 1 FROM public.transactions
        WHERE id = p_txn_id AND mother_account_id IS NOT NULL
      ) THEN
        UPDATE public.mother_accounts
        SET balance = balance - (
          COALESCE(p_amount, (SELECT amount FROM public.transactions WHERE id = p_txn_id))
          - (SELECT amount FROM public.transactions WHERE id = p_txn_id)
        )
        WHERE id = (SELECT mother_account_id FROM public.transactions WHERE id = p_txn_id);
      END IF;

    ELSIF EXISTS (SELECT 1 FROM public.transactions WHERE id = p_txn_id AND type = 'withdrawal') THEN
      UPDATE public.hand_cash_accounts
      SET balance = balance - (
        COALESCE(p_amount, (SELECT amount FROM public.transactions WHERE id = p_txn_id))
        - (SELECT amount FROM public.transactions WHERE id = p_txn_id)
      )
      WHERE bank_id = (SELECT bank_id FROM public.transactions WHERE id = p_txn_id);

      IF EXISTS (
        SELECT 1 FROM public.transactions
        WHERE id = p_txn_id AND COALESCE(has_shortage, FALSE) AND mother_account_id IS NOT NULL
      ) THEN
        UPDATE public.mother_accounts
        SET balance = balance - (
          COALESCE(p_amount, (SELECT amount FROM public.transactions WHERE id = p_txn_id))
          - (SELECT amount FROM public.transactions WHERE id = p_txn_id)
        )
        WHERE id = (SELECT mother_account_id FROM public.transactions WHERE id = p_txn_id);
      END IF;

    ELSIF EXISTS (SELECT 1 FROM public.transactions WHERE id = p_txn_id AND type = 'cash_in') THEN
      IF EXISTS (
        SELECT 1 FROM public.transactions
        WHERE id = p_txn_id AND mother_account_id IS NOT NULL
      ) THEN
        UPDATE public.mother_accounts
        SET balance = balance + (
          COALESCE(p_amount, (SELECT amount FROM public.transactions WHERE id = p_txn_id))
          - (SELECT amount FROM public.transactions WHERE id = p_txn_id)
        )
        WHERE id = (SELECT mother_account_id FROM public.transactions WHERE id = p_txn_id);
      ELSIF EXISTS (
        SELECT 1 FROM public.transactions
        WHERE id = p_txn_id AND profit_account_id IS NOT NULL
      ) THEN
        UPDATE public.profit_accounts
        SET balance = balance + (
          COALESCE(p_amount, (SELECT amount FROM public.transactions WHERE id = p_txn_id))
          - (SELECT amount FROM public.transactions WHERE id = p_txn_id)
        )
        WHERE id = (SELECT profit_account_id FROM public.transactions WHERE id = p_txn_id);
      ELSE
        UPDATE public.hand_cash_accounts
        SET balance = balance + (
          COALESCE(p_amount, (SELECT amount FROM public.transactions WHERE id = p_txn_id))
          - (SELECT amount FROM public.transactions WHERE id = p_txn_id)
        )
        WHERE bank_id = (SELECT bank_id FROM public.transactions WHERE id = p_txn_id);
      END IF;
    END IF;
  END IF;

  UPDATE public.transactions SET
    customer_name = COALESCE(p_customer_name, customer_name),
    customer_account = COALESCE(p_customer_account, customer_account),
    trn_id = COALESCE(p_trn_id, trn_id),
    amount = COALESCE(p_amount, amount),
    notes = COALESCE(p_notes, notes),
    source = COALESCE(p_source, source)
  WHERE id = p_txn_id;

  RETURN p_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
