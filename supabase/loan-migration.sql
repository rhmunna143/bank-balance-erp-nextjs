-- =====================================================
-- Short-Term Loan System Migration
-- Run this in Supabase SQL Editor
-- =====================================================
-- 1. LOANS TABLE
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
    borrower_user_id UUID NOT NULL REFERENCES public.profiles(id),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    returned_amount NUMERIC(15, 2) DEFAULT 0 CHECK (returned_amount >= 0),
    source_type TEXT NOT NULL CHECK (
        source_type IN ('hand_cash', 'mother_account', 'profit_account')
    ),
    source_account_id UUID,
    -- NULL for hand_cash, references mother_accounts or profit_accounts
    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'partially_returned', 'returned')
    ),
    expense_id UUID REFERENCES public.expenses(id),
    -- links to the expense created on disbursal
    due_date DATE,
    notes TEXT,
    issued_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE
    public.loans ENABLE ROW LEVEL SECURITY;

-- 2. LOAN RETURNS TABLE (tracks each return payment)
CREATE TABLE IF NOT EXISTS public.loan_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    returned_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE
    public.loan_returns ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Members can view loans" ON public.loans;

CREATE POLICY "Members can view loans" ON public.loans FOR
SELECT
    USING (
        bank_id IN (
            SELECT
                public.get_my_bank_ids()
        )
    );

DROP POLICY IF EXISTS "Admins can insert loans" ON public.loans;

CREATE POLICY "Admins can insert loans" ON public.loans FOR
INSERT
    WITH CHECK (
        bank_id IN (
            SELECT
                public.get_my_admin_bank_ids()
        )
    );

DROP POLICY IF EXISTS "Admins can update loans" ON public.loans;

CREATE POLICY "Admins can update loans" ON public.loans FOR
UPDATE
    USING (
        bank_id IN (
            SELECT
                public.get_my_admin_bank_ids()
        )
    );

DROP POLICY IF EXISTS "Members can view loan returns" ON public.loan_returns;

CREATE POLICY "Members can view loan returns" ON public.loan_returns FOR
SELECT
    USING (
        bank_id IN (
            SELECT
                public.get_my_bank_ids()
        )
    );

DROP POLICY IF EXISTS "Admins can insert loan returns" ON public.loan_returns;

CREATE POLICY "Admins can insert loan returns" ON public.loan_returns FOR
INSERT
    WITH CHECK (
        bank_id IN (
            SELECT
                public.get_my_admin_bank_ids()
        )
    );

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
BEGIN
  -- Ensure "Loan" expense category exists
  INSERT INTO public.expense_categories (bank_id, name)
  SELECT p_bank_id, 'Loan'
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.expense_categories
    WHERE bank_id = p_bank_id
      AND name = 'Loan'
  );

  -- Create expense (deducts from source)
  v_expense_id := public.process_expense(
    p_bank_id,
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

  -- Credit back to source account
  UPDATE public.hand_cash_accounts
  SET balance = balance + p_amount
  WHERE bank_id = (
    SELECT bank_id
    FROM public.loans
    WHERE id = p_loan_id
      AND source_type = 'hand_cash'
  );

  UPDATE public.mother_accounts
  SET balance = balance + p_amount
  WHERE id = (
    SELECT source_account_id
    FROM public.loans
    WHERE id = p_loan_id
      AND source_type = 'mother_account'
      AND source_account_id IS NOT NULL
  );

  UPDATE public.profit_accounts
  SET balance = balance + p_amount
  WHERE id = (
    SELECT source_account_id
    FROM public.loans
    WHERE id = p_loan_id
      AND source_type = 'profit_account'
      AND source_account_id IS NOT NULL
  );

  -- Record the return
  INSERT INTO public.loan_returns (loan_id, bank_id, amount, returned_by, notes)
  VALUES (p_loan_id, (SELECT bank_id FROM public.loans WHERE id = p_loan_id), p_amount, auth.uid(), p_notes)
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

-- Fix foreign key constraints: change from auth.users to profiles
ALTER TABLE
    public.loans DROP CONSTRAINT IF EXISTS loans_borrower_user_id_fkey,
    DROP CONSTRAINT IF EXISTS loans_issued_by_fkey,
ADD
    CONSTRAINT loans_borrower_user_id_fkey FOREIGN KEY (borrower_user_id) REFERENCES public.profiles(id),
ADD
    CONSTRAINT loans_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.profiles(id);

ALTER TABLE
    public.loan_returns DROP CONSTRAINT IF EXISTS loan_returns_returned_by_fkey,
ADD
    CONSTRAINT loan_returns_returned_by_fkey FOREIGN KEY (returned_by) REFERENCES public.profiles(id);