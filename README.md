# Agent Bank ERP — Next.js

Live demo: https://bankasia-khalishakundi.vercel.app

Agent Bank ERP is a multi-tenant, production-oriented banking/agent management web application built with Next.js. It provides a full-featured admin and agent interface for handling deposits, withdrawals, cash-in, expenses, loans, reports, and multi-account management with a focus on real-world banking operations for micro/agent banking.

**Repository**: `agent-bank-erp-next`

---

**Why this project matters (TL;DR for recruiters)**

- Built as a real-world banking/agent management system demonstrating multi-tenant data handling, transaction flows, reporting, role-based access, and integrations with PostgreSQL and Prisma ORM.
- Production-ready UI and UX patterns, sleek dark mode, detailed reporting (PDF export), and robust Server Actions architecture make this a portfolio-ready project for backend/front-end roles and full-stack candidates.

---

**Key Features**

- Multi-tenant bank views (dashboard and operations per bank)
- Full transaction lifecycle: deposits, withdrawals, fund transfers, cash-in, loan returns
- Expense management with categories and account-level tracking
- User-wise loan tracking and summary metrics
- Hand-cash verification, daily log generation, and mother-account aggregation
- PDF reporting with detailed transaction, expense, and signature-ready export
- Role-based pages for admins, superadmins, and agents via Clerk authentication
- Built-in Dark Mode and customizable UI themes
- Automated database backups & restore functionality

**Unique / Notable Features**

- Sophisticated PDF report generator with automatic pagination and signature layout
- Multi-account (mother/profit/hand cash) handling designed for agent-banking workflows
- Strongly typed database operations using Prisma ORM (schema in `prisma/schema.prisma`)
- Modular services layer (under `services/`) leveraging Next.js Server Actions for clean separation of concerns and data mutation

---

**Impact & Real-life Usefulness**

- Enables management of agent banking operations used by microfinance, community banks, and agent networks.
- Simplifies daily reconciliation via hand-cash verification, automated daily logs, and detailed PDF exports for audit trails.
- Supports operational transparency with per-transaction metadata (TRN IDs, sources, destinations).

**Who should use / Why it’s needed**

- Recruiters/interviewers: shows ability to build full-stack financial applications with real-world constraints.
- Backend engineers: demonstrates multi-tenant DB design, Prisma relations, and secure Server Actions.
- Frontend engineers: shows complex UI construction in Next.js including data tables, forms, print-ready exports, and dynamic theming.
- Product teams at fintechs or microfinance organizations looking for prototype workflows.

---

**Technologies & Architecture**

- Frontend: Next.js (App Router), React, Tailwind CSS, shadcn/ui
- Backend: Next.js Server Actions, PostgreSQL (via Prisma ORM)
- Authentication: Clerk
- State & Services: modular `services/` and Zustand `stores/` for business logic and state management
- Utilities: `utils/` contains helpers for currency, date formatting, and PDF generation
- PDF generation: `jspdf` + `jspdf-autotable` (see `utils/generateReportPdf.js`)

Project structure highlights:

- `app/` — Next.js UI routes and pages
- `services/` — Next.js Server Actions handling direct database interactions
- `prisma/` — Database schema (`schema.prisma`) and migrations
- `components/` — Reusable UI components, tables, charts, and layout elements
- `utils/` — Helpers, formatters, and the PDF generator

---

**Setup & Local Development**

Prerequisites:

- Node.js 18+ (or compatible runtime)
- npm / pnpm / yarn
- A PostgreSQL database instance
- A Clerk application (for authentication keys)

Quick start:

```bash
# install
npm install

# push Prisma schema to database
npx prisma db push

# generate Prisma client
npx prisma generate

# run dev
npm run dev

# open http://localhost:3000
```

Environment Variables (`.env.local`):
Create a `.env.local` at project root with the following keys:
```env
# Prisma / PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/agent_bank"
DIRECT_URL="postgresql://user:password@localhost:5432/agent_bank"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

---

**Deployment**

The project is configured to deploy on Vercel. The provided live demo is hosted at the link above. To deploy:

1. Connect the repository to Vercel.
2. Set the environment variables (`DATABASE_URL`, Clerk keys) in the Vercel dashboard.
3. Add a build command or `postinstall` script to run `prisma generate`.
4. Deploy (Vercel will build the Next.js app automatically).

---

**Testing & Validation**

- Manual QA flows: create banks, perform deposits/withdrawals, upload/verify hand cash, and export PDF reports.
- Check generated reports: `utils/generateReportPdf.js` includes formatting and totals.

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

_Short note for recruiters:_ This repository demonstrates building a production-oriented fintech web app end-to-end: multi-tenant flows, secure DB considerations with Prisma, Clerk authentication, PDF exports for auditing, and a maintainable Server Actions architecture — an excellent artifact to evaluate a candidate's full-stack capabilities.
