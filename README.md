# Agent Bank ERP — Next.js

Live demo: https://bankasia-khalishakundi.vercel.app

Agent Bank ERP is a multi-tenant, production-oriented banking/agent management web application built with Next.js. It provides a full-featured admin and agent interface for handling deposits, withdrawals, cash-in, expenses, loans, reports, and multi-account management with a focus on real-world banking operations for micro/agent banking.

**Repository**: `agent-bank-erp-next`

---

**Why this project matters (TL;DR for recruiters)**

- Built as a real-world banking/agent management system demonstrating multi-tenant data handling, transaction flows, reporting, role-based access, and integrations with subbase as a backend.
- Production-ready UI and UX patterns, detailed reporting (PDF export), and robust services layering make this a portfolio-ready project for backend/front-end roles and full-stack candidates.

---

**Key Features**

- Multi-tenant bank views (per-bank dashboard and operations)
- Full transaction lifecycle: deposits, withdrawals, fund transfers, cash-in, loan returns
- Expense management with categories and account-level tracking
- Hand-cash verification and mother-account aggregation
- PDF reporting with detailed transaction, expense, and signature-ready export
- Role-based pages for admin, superadmin and agents
- Search, user management, and reporting modules

**Unique / Notable Features**

- Sophisticated PDF report generator with automatic pagination and signature layout
- Multi-account (mother/profit/hand cash) handling designed for agent-banking workflows
- Realistic seeded SQL migrations and RLS (row-level security) policies (in `supabase/`)
- Modular services layer (under `services/`) for clean separation of concerns and easier testing

---

**Impact & Real-life Usefulness**

- Enables management of agent banking operations used by microfinance, community banks, and agent networks.
- Simplifies daily reconciliation via hand-cash verification and detailed PDF exports for audit trails.
- Supports operational transparency with per-transaction metadata (TRN IDs, sources, destinations).

**Who should use / Why it’s needed**

- Recruiters/interviewers: shows ability to build full-stack financial applications with real-world constraints.
- Backend engineers: demonstrates multi-tenant DB design and secure access patterns.
- Frontend engineers: shows complex UI construction in Next.js including data tables, forms, and print-ready exports.
- Product teams at fintechs or microfinance organizations looking for prototype workflows.

---

**Technologies & Architecture**

- Frontend: Next.js (app router), React, Tailwind CSS
- Backend: Supabase (Postgres, auth, storage), SQL migrations in `supabase/`
- State & Services: modular `services/` and `stores/` folders for business logic and state management
- Utilities: `utils/` contains helpers for currency, date formatting, and PDF generation
- PDF generation: `jspdf` + `jspdf-autotable` (see `utils/generateReportPdf.js`)

Project structure highlights:

- `app/` — Next.js UI routes and pages (multi-tenant under `[bankSlug]`)
- `services/` — API-facing business logic wrappers
- `supabase/` — SQL migrations, RLS policies, and seed scripts
- `utils/` — helpers, formatters, and the PDF generator

---

**Setup & Local Development**

Prerequisites:

- Node.js 18+ (or compatible runtime)
- npm / pnpm / yarn
- Supabase project (local or hosted) if you want full backend features

Quick start (frontend only, dev mode):

```bash
# install
npm install

# run dev
npm run dev

# open http://localhost:3000
```

If you want to connect to Supabase, create a `.env.local` at project root with the expected keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, etc.) matching `services/supabaseClient.js` usage.

For database migrations and SQL scripts, review `supabase/` and run them against your Supabase instance.

---

**Deployment**

The project is configured to deploy on Vercel. The provided live demo is hosted at the link above. To deploy:

1. Connect the repository to Vercel.
2. Set environment variables in the Vercel dashboard (Supabase keys and any runtime secrets).
3. Deploy (Vercel will build the Next.js app automatically).

---

**Testing & Validation**

- Manual QA flows: create banks, perform deposits/withdrawals, upload/verify hand cash, and export PDF reports.
- Check generated reports: `utils/generateReportPdf.js` includes formatting and totals.

---

**Security & Production Notes**

- SQL scripts and RLS policies are included under `supabase/` — validate them before production use.
- Secrets must be stored in environment variables and not committed to source control.

---

**Contributing**

Contributions are welcome. Typical workflow:

1. Fork the repo
2. Create a feature branch
3. Open a pull request with a clear description

Please follow code style in existing files and avoid mixing formatting conventions.

---

**Author & Contact**

- Author: @rhmunna143
- Live demo: https://bankasia-khalishakundi.vercel.app

If you'd like a walkthrough for interviews or a demo recording for recruiters, ping the author for a short guided tour.

---

**License**

This project does not include a license file by default. Add a `LICENSE` file (MIT or similar) if you want to open-source this repository.

---

_Short note for recruiters:_ This repository demonstrates building a production-oriented fintech web app end-to-end: multi-tenant flows, secure DB considerations, PDF exports for auditing, and a maintainable services architecture — an excellent artifact to evaluate a candidate's full-stack capabilities.
