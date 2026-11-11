# Complyra

A Next.js financial statement workspace with a public product website and verified-email access to private user records. Intended for INR statements and an India-based operator.

## Implemented

- Public home page with services, workflow, privacy/security overview, FAQs and account entry points.
- Email verification **before account creation**, password recovery/change, memory-hard scrypt password hashing, opaque revocable sessions, origin checks, rate limits and server-side role checks. No demo-password login or user-selected administrator role.
- Allow/block rules for email addresses and domains, and a separate admin panel for account access, aggregate operational analytics, security events and configuration status.
- Private per-account data storage with development files or production PostgreSQL/Oracle adapters, authenticated AES-256-GCM encryption, database row locks, bind variables and stale-update checks. Existing mock records are not migrated into live accounts.
- CSV/Excel imports with row/size limits, debit/credit tracking, confidence-aware category rules, duplicate/amount review prompts, transaction remarks, explicit category confirmation and optional remembered merchant rules.
- A workspace-side assistant and optional OpenAI categorization suggestions. External AI processing is off until each user opts in. Unclear transactions still require human review.
- In-app statement reminders 24 hours after signup/last import; opt-in email reminders through a secret-protected scheduler endpoint.
- Actual profile saving, password controls, session revocation, data export, optional-processing preferences and account deletion.
- India-oriented draft privacy, terms, cookies and acceptable-use pages with versioned acceptance. Production registration is gated on operator identity/contact and policy review.
- CSP nonces, browser security headers, escaped exports, and a separate synthetic-data decoy service for an operator-managed isolated DMZ.

## Local setup

Use Node 22 or newer supported by the installed Next.js version.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. To test administrator controls, set your chosen address in `ADMIN_EMAILS` before registering it. Register at `/auth/register`, open the verification link from the local `.complyra/secure/mail-outbox` file, confirm verification, and sign in. Outbox mode does not send real email and cannot run in production. There are no default credentials.

## Checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

The integration test starts its own local server and uses isolated synthetic records. Real PostgreSQL/Oracle, Resend/SMTP and AI smoke tests need your own staging credentials.

## Deployment

Read [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for GitHub Pages and Actions, Render API hosting, Neon PostgreSQL, Resend email, DNS/domain setup, encryption keys, admin bootstrap, hourly reminders, India launch requirements and limitations. GitHub Pages serves only the static frontend; the API still needs a Node.js host. Apply either [db/postgres.sql](db/postgres.sql) for Neon or [db/oracle.sql](db/oracle.sql) for Oracle to the dedicated application database.

**External setup remains required:** no database or cloud network was provisioned; no live email or AI provider was connected; no scheduler was deployed. The legal operator and contact are undecided, so the legal pages remain drafts. Application code alone cannot establish legal compliance or guarantee protection after a compromise.

The storage model is encrypted per-account documents, with a global security record suitable for this initial application, not a high-volume accounting ledger. Each account has its own workspace; shared organization membership is not implemented. Free-text policy rules are review drafts and are not automatically executed as regulatory controls. MFA is not implemented. PDF statement import is not supported. Maximum active statement: 2,000 rows / 5 MB. Only INR imports are supported; no silent currency conversion is applied.

## Main routes

`/` | `/auth/register` | `/auth/verify` | `/auth/login` | `/auth/reset` | `/dashboard` | `/dashboard/upload` | `/dashboard/transactions` | `/dashboard/chat` | `/dashboard/settings` | `/admin` | `/legal/privacy`
