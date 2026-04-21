# Complyra

Complyra is an intelligent compliance and finance operations workspace built with Next.js. It combines onboarding, policy controls, transaction analysis, investigations, and AI-assisted insights into a single dashboard for modern finance teams.

## What this app does

- Shows a polished landing page with entry points into login and onboarding.
- Provides a dashboard for compliance KPIs, charts, recent flags, and AI recommendations.
- Includes dedicated experiences for chat, copilot, insights, integrations, investigator, policy, and policy builder workflows.
- Exposes API routes for auth, onboarding, overview, policy rules, chat, copilot, integrations, and investigations.
- Supports mock auth for local development and optional Supabase auth for real sessions.

## Tech stack

- Next.js 16 app router
- React 19
- Tailwind CSS v4
- Supabase client for optional auth
- XLSX helpers for data import and export workflows

## Getting started

1. Install dependencies.

```bash
npm install
```

2. Create your environment file from `.env.example` and fill in the values you need.

3. Start the dev server.

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Environment variables

The app uses mock auth by default and can be switched to Supabase if configured.

- `MOCK_AUTH_EMAIL` and `MOCK_AUTH_PASSWORD` control local demo login credentials.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` enable Supabase auth.
- `COMPLYRA_STORAGE_MODE` selects `json` or `sqlite` storage.
- `SLACK_WEBHOOK_URL` enables Slack delivery.
- `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and `WHATSAPP_TO_NUMBER` enable WhatsApp delivery.

## Key routes

- `/` landing page
- `/auth/login` login page
- `/onboarding` onboarding flow
- `/dashboard` executive overview
- `/dashboard/chat` chat workspace
- `/dashboard/copilot` AI copilot
- `/dashboard/insights` analytics and findings
- `/dashboard/integrations` connected systems
- `/dashboard/investigator` investigation workspace
- `/dashboard/policy` policy management
- `/dashboard/policy-builder` policy authoring

## Repo layout

- `src/app` application routes, layouts, and API handlers
- `src/components/app` dashboard UI components and widgets
- `src/lib` business logic, storage, analytics, auth, and formatting helpers
- `public` static assets

## Notes

The repository also includes `.complyra/mock-db.json` for local mock data. If you are searching the repo, this README now reflects the real product instead of the default Next.js starter text.
