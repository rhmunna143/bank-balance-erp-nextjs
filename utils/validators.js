import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const createBankSchema = z.object({
  name: z.string().min(2, 'Bank name must be at least 2 characters'),
  currency: z.string().min(1, 'Please select a currency'),
  currencySymbol: z.string().min(1, 'Currency symbol is required'),
});

export const motherAccountSchema = z.object({
  name: z.string().min(2, 'Account name must be at least 2 characters'),
  accountNumber: z.string().min(1, 'Account number is required'),
  balance: z.coerce.number().min(0, 'Balance cannot be negative').default(0),
  lowThreshold: z.coerce.number().min(0).default(0),
});

export const profitAccountSchema = z.object({
  name: z.string().min(2, 'Account name must be at least 2 characters'),
  description: z.string().optional(),
  balance: z.coerce.number().min(0, 'Balance cannot be negative').default(0),
});

export const depositSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().optional(),
  customer_account_no: z.string().optional(),
  trn_id: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  mother_account_id: z.string().uuid('Please select a mother account'),
  description: z.string().optional(),
  created_at: z.string().optional(),
});

export const withdrawalSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().optional(),
  customer_account_no: z.string().optional(),
  trn_id: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  mother_account_id: z.string().uuid('Please select a mother account'),
  shortage_enabled: z.boolean().default(false),
  shortage_mother_account_id: z.string().optional(),
  shortage_deduction_amount: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
  created_at: z.string().optional(),
});

export const cashInSchema = z.object({
  target_type: z.enum(['hand_cash', 'mother_account', 'profit_account'], {
    required_error: 'Please select a target account type',
  }),
  target_id: z.string().optional(),
  trn_id: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  source: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  created_at: z.string().optional(),
});

export const expenseSchema = z.object({
  category_id: z.string().uuid('Please select a category'),
  trn_id: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  particulars: z.string().optional(),
  deducted_from_type: z.enum(['profit_account', 'mother_account', 'hand_cash']),
  deducted_from_id: z.string().uuid('Please select an account'),
  created_at: z.string().optional(),
});

export const inviteUserSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});

export const changePasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loanIssueSchema = z.object({
  borrower_user_id: z.string().min(1, 'Please select a borrower'),
  trn_id: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  source_type: z.enum(['hand_cash', 'mother_account', 'profit_account'], {
    required_error: 'Please select a source type',
  }),
  source_account_id: z.string().optional(),
  due_date: z.string().optional(),
  notes: z.string().optional(),
});

export const loanReturnSchema = z.object({
  trn_id: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  destination_type: z.enum(['hand_cash', 'mother_account', 'profit_account'], {
    required_error: 'Please select return destination',
  }),
  destination_account_id: z.string().optional(),
  notes: z.string().optional(),
  created_at: z.string().optional(),
});

export const fundTransferSchema = z.object({
  trn_id: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  source_type: z.enum(['mother_account', 'profit_account', 'hand_cash'], {
    required_error: 'Please select a source account type',
  }),
  source_account_id: z.string().optional(),
  destination_type: z.enum(['mother_account', 'profit_account', 'hand_cash', 'external_holder'], {
    required_error: 'Please select destination account type',
  }),
  destination_account_id: z.string().optional(),
  destination_name: z.string().optional(),
  destination_account: z.string().optional(),
  notes: z.string().optional(),
  created_at: z.string().optional(),
});
