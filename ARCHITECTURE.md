# TerasMatrix

TerasMatrix is a browser-based UMKM organizational health assessment and dashboard. Its static frontend uses Supabase Auth and PostgreSQL; PHP/MySQL is no longer part of the active application flow.

## Application flow

```text
Browser (index.html, CSS, vanilla JS)
  ├── Supabase Auth: account registration, login, and session
  ├── profiles: UMKM identity, role, and registration details
  ├── submit_assessment RPC: validates answers, computes scores, and saves results
  └── submissions / answers: results and individual responses
```

`js/supabase-config.js` contains the Supabase project URL and public publishable key. Never put a `service_role` key in browser code. Database access is protected by Row Level Security; form writes and score calculations happen in the `submit_assessment` database function.

## Important files

| File | Purpose |
|---|---|
| `index.html` | Landing page, sign-in/sign-up forms, and dashboard |
| `css/classic.css` | Classic, minimal visual theme |
| `js/api.js` | Supabase Auth and database client |
| `js/supabase-config.js` | Local Supabase URL and publishable key |
| `js/form.js` | Assessment questions and form behavior |
| `backend/supabase/schema.sql` | Supabase tables, RLS policies, signup trigger, and submit RPC |
| `SUPABASE_SETUP.md` | Supabase and local setup tutorial |

## Assessment rules

- Owners answer INS, OPS, and ECT; employees answer OV, LDI, and WEQ.
- Each account can submit one complete assessment.
- Owners receive a generated invitation code; employees must use that code to join the UMKM.
- An employee can submit only after the owner for the same UMKM has submitted.
- Factor scores are normalized to 0–1 and combined using the weights in `factor_definitions`.
- RLS scopes profiles, submissions, and answers to the organization linked to the signed-in user's invitation.

## Backend

Supabase is the application's backend-as-a-service. The `backend/` folder contains the database schema and policies for the hosted Supabase project; browser authentication and API calls use the project URL and publishable key configured in `js/supabase-config.js`. The old PHP/MySQL API, import utility, and API stress-test script have been removed. Use `backend/supabase/schema.sql` for new installations.
