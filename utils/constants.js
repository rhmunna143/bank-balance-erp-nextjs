export const CURRENCIES = [
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Office Stationery',
  'Paper Cost',
  'Ink',
  'Printer Cartridge',
  'Furniture',
  'Advertisements',
  'Electricity Bill',
  'Room Rent',
  'Internet Bill',
  'Other',
];

export const TRANSACTION_TYPES = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  cash_in: 'Cash In',
};

export const ACCOUNT_TYPES = {
  MOTHER_ACCOUNT: 'mother_account',
  HAND_CASH: 'hand_cash',
  PROFIT_ACCOUNT: 'profit_account',
};

export const ROLES = {
  superadmin: 'SuperAdmin',
  owner: 'Owner',
  admin: 'Admin',
  operator: 'Operator',
};

export const RESERVED_SLUGS = [
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'create-bank',
  'superadmin',
  'api',
  'profile',
  'settings',
  'dashboard',
  'admin',
];

export const REPORT_PERIODS = {
  today: 'Today',
  week: 'Last 7 Days',
  month: 'This Month',
  quarter: 'Last 3 Months',
  custom: 'Custom Range',
};

export const ITEMS_PER_PAGE = 20;

export const CASH_IN_SOURCES = [
  'Head Office',
  'Branch',
  'Personal',
  'Other',
];

export const LOAN_STATUSES = {
  active: 'Active',
  partially_returned: 'Partially Returned',
  returned: 'Returned',
};

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'AgentBank ERP';
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
