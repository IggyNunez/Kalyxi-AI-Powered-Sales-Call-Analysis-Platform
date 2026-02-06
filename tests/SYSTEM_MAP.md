# KALYXI AI - DISCOVERED SYSTEM MAP
## Phase 0: Complete System Audit

Generated: 2026-02-06

---

## 1. STACK OVERVIEW

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15.3.1 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS v4, Radix UI primitives |
| Charts | Recharts |
| Backend | Next.js Route Handlers (API routes) |
| Database | Supabase PostgreSQL with Row Level Security |
| Auth | Supabase Auth (email/password) |
| AI | OpenAI GPT-4o |
| File Storage | Supabase Storage |
| Rate Limiting | In-memory (optional Redis) |
| Testing | Custom test runners (tsx) |

---

## 2. UI ROUTE CATALOG

| Route | File Path | Auth Required | Role Required | Data Sources |
|-------|-----------|---------------|---------------|--------------|
| `/` | `src/app/page.tsx` | No | - | None (static) |
| `/login` | `src/app/(auth)/login/page.tsx` | No | - | Supabase Auth |
| `/register` | `src/app/(auth)/register/page.tsx` | No | - | Supabase Auth, /api/auth/setup |
| `/dashboard` | `src/app/(dashboard)/dashboard/page.tsx` | Yes | any | /api/dashboard/stats, /api/calls |
| `/dashboard/calls` | `src/app/(dashboard)/dashboard/calls/page.tsx` | Yes | any | /api/calls |
| `/dashboard/calls/[id]` | `src/app/(dashboard)/dashboard/calls/[id]/page.tsx` | Yes | any | /api/calls/[id] |
| `/dashboard/analytics` | `src/app/(dashboard)/dashboard/analytics/page.tsx` | Yes | any | /api/analytics |
| `/dashboard/insights` | `src/app/(dashboard)/dashboard/insights/page.tsx` | Yes | any | /api/insights |
| `/dashboard/reports` | `src/app/(dashboard)/dashboard/reports/page.tsx` | Yes | any | /api/calls (with reports) |
| `/dashboard/settings` | `src/app/(dashboard)/dashboard/settings/page.tsx` | Yes | any | User profile, org settings |
| `/dashboard/submit` | `src/app/(dashboard)/dashboard/submit/page.tsx` | Yes | admin | /api/calls, /api/callers |
| `/dashboard/upload` | `src/app/(dashboard)/dashboard/upload/page.tsx` | Yes | admin | /api/calls/upload |
| `/dashboard/team` | `src/app/(dashboard)/dashboard/team/page.tsx` | Yes | admin | /api/users |
| `/dashboard/callers` | `src/app/(dashboard)/dashboard/callers/page.tsx` | Yes | admin | /api/callers |
| `/dashboard/grading` | `src/app/(dashboard)/dashboard/grading/page.tsx` | Yes | admin | /api/grading-templates |
| `/dashboard/webhooks` | `src/app/(dashboard)/dashboard/webhooks/page.tsx` | Yes | admin | /api/webhook-logs |
| `/dashboard/scorecard` | `src/app/(dashboard)/dashboard/scorecard/page.tsx` | Yes | admin | /api/scorecards |

---

## 3. API ROUTE CATALOG

### Authentication APIs
| Method | Endpoint | Auth | Role | File Path | Description |
|--------|----------|------|------|-----------|-------------|
| POST | `/api/auth/setup` | No* | - | `src/app/api/auth/setup/route.ts` | Create org + user after signup |
| POST | `/api/auth/register` | No | - | `src/app/api/auth/register/route.ts` | Register new user |

### Calls APIs
| Method | Endpoint | Auth | Role | File Path | Description |
|--------|----------|------|------|-----------|-------------|
| GET | `/api/calls` | Yes | any | `src/app/api/calls/route.ts` | List calls (paginated) |
| POST | `/api/calls` | Yes | admin | `src/app/api/calls/route.ts` | Create call |
| GET | `/api/calls/[id]` | Yes | any | `src/app/api/calls/[id]/route.ts` | Get single call |
| PUT | `/api/calls/[id]` | Yes | admin | `src/app/api/calls/[id]/route.ts` | Update call |
| DELETE | `/api/calls/[id]` | Yes | admin | `src/app/api/calls/[id]/route.ts` | Delete call |
| POST | `/api/calls/[id]/analyze` | Yes | admin | `src/app/api/calls/[id]/analyze/route.ts` | Trigger AI analysis |
| POST | `/api/calls/upload` | Yes | admin | `src/app/api/calls/upload/route.ts` | Upload audio file |

### Callers APIs
| Method | Endpoint | Auth | Role | File Path | Description |
|--------|----------|------|------|-----------|-------------|
| GET | `/api/callers` | Yes | any | `src/app/api/callers/route.ts` | List callers |
| POST | `/api/callers` | Yes | admin | `src/app/api/callers/route.ts` | Create caller |
| GET | `/api/callers/[id]` | Yes | any | `src/app/api/callers/[id]/route.ts` | Get single caller |
| PATCH | `/api/callers/[id]` | Yes | admin | `src/app/api/callers/[id]/route.ts` | Update caller |
| DELETE | `/api/callers/[id]` | Yes | admin | `src/app/api/callers/[id]/route.ts` | Deactivate caller |

### Analytics & Stats APIs
| Method | Endpoint | Auth | Role | File Path | Description |
|--------|----------|------|------|-----------|-------------|
| GET | `/api/dashboard/stats` | Yes | any | `src/app/api/dashboard/stats/route.ts` | Dashboard statistics |
| GET | `/api/analytics` | Yes | any | `src/app/api/analytics/route.ts` | Analytics data |
| GET | `/api/stats` | Yes | any | `src/app/api/stats/route.ts` | General stats |
| GET | `/api/insights` | Yes | any | `src/app/api/insights/route.ts` | AI insights |

### Grading & Scorecards APIs
| Method | Endpoint | Auth | Role | File Path | Description |
|--------|----------|------|------|-----------|-------------|
| GET | `/api/grading-templates` | Yes | any | `src/app/api/grading-templates/route.ts` | List templates |
| POST | `/api/grading-templates` | Yes | admin | `src/app/api/grading-templates/route.ts` | Create template |
| GET | `/api/grading-templates/[id]` | Yes | any | `src/app/api/grading-templates/[id]/route.ts` | Get template |
| PUT | `/api/grading-templates/[id]` | Yes | admin | `src/app/api/grading-templates/[id]/route.ts` | Update template |
| DELETE | `/api/grading-templates/[id]` | Yes | admin | `src/app/api/grading-templates/[id]/route.ts` | Delete template |
| GET | `/api/scorecards` | Yes | any | `src/app/api/scorecards/route.ts` | List scorecards |
| POST | `/api/scorecards` | Yes | admin | `src/app/api/scorecards/route.ts` | Create scorecard |
| GET | `/api/scorecards/[id]` | Yes | any | `src/app/api/scorecards/[id]/route.ts` | Get scorecard |
| PUT | `/api/scorecards/[id]` | Yes | admin | `src/app/api/scorecards/[id]/route.ts` | Update scorecard |
| DELETE | `/api/scorecards/[id]` | Yes | admin | `src/app/api/scorecards/[id]/route.ts` | Delete scorecard |
| GET | `/api/scorecards/active` | Yes | any | `src/app/api/scorecards/active/route.ts` | Get active scorecard |
| GET | `/api/scorecard-configs` | Yes | any | `src/app/api/scorecard-configs/route.ts` | List configs |
| POST | `/api/scorecard-configs` | Yes | admin | `src/app/api/scorecard-configs/route.ts` | Create config |
| GET | `/api/scorecard-configs/[id]` | Yes | any | `src/app/api/scorecard-configs/[id]/route.ts` | Get config |
| PUT | `/api/scorecard-configs/[id]` | Yes | admin | `src/app/api/scorecard-configs/[id]/route.ts` | Update config |
| DELETE | `/api/scorecard-configs/[id]` | Yes | admin | `src/app/api/scorecard-configs/[id]/route.ts` | Delete config |

### Scripts & Insight Templates APIs
| Method | Endpoint | Auth | Role | File Path | Description |
|--------|----------|------|------|-----------|-------------|
| GET | `/api/scripts` | Yes | any | `src/app/api/scripts/route.ts` | List scripts |
| POST | `/api/scripts` | Yes | admin | `src/app/api/scripts/route.ts` | Create script |
| GET | `/api/scripts/[id]` | Yes | any | `src/app/api/scripts/[id]/route.ts` | Get script |
| PUT | `/api/scripts/[id]` | Yes | admin | `src/app/api/scripts/[id]/route.ts` | Update script |
| DELETE | `/api/scripts/[id]` | Yes | admin | `src/app/api/scripts/[id]/route.ts` | Delete script |
| GET | `/api/insight-templates` | Yes | any | `src/app/api/insight-templates/route.ts` | List templates |
| POST | `/api/insight-templates` | Yes | admin | `src/app/api/insight-templates/route.ts` | Create template |
| GET | `/api/insight-templates/[id]` | Yes | any | `src/app/api/insight-templates/[id]/route.ts` | Get template |
| PUT | `/api/insight-templates/[id]` | Yes | admin | `src/app/api/insight-templates/[id]/route.ts` | Update template |
| DELETE | `/api/insight-templates/[id]` | Yes | admin | `src/app/api/insight-templates/[id]/route.ts` | Delete template |

### Webhook API
| Method | Endpoint | Auth | Role | File Path | Description |
|--------|----------|------|------|-----------|-------------|
| GET | `/api/webhook/[orgSlug]` | No | - | `src/app/api/webhook/[orgSlug]/route.ts` | Test webhook endpoint |
| POST | `/api/webhook/[orgSlug]` | Signature/Bearer | - | `src/app/api/webhook/[orgSlug]/route.ts` | Receive call data |

---

## 4. DATABASE SCHEMA CATALOG

### Core Tables (Migration 001)

| Table | Description | RLS | Key Fields |
|-------|-------------|-----|------------|
| `organizations` | Tenant accounts | Yes | id, slug, settings_json, plan, webhook_secret |
| `users` | Application users (linked to auth.users) | Yes | id (FK auth.users), org_id, email, role |
| `callers` | Sales reps being evaluated | Yes | id, org_id, user_id (optional), name, email |
| `calls` | Individual call records | Yes | id, org_id, caller_id, raw_notes, status, source |
| `analyses` | AI-generated analysis | Yes | id, call_id, grading_results_json, overall_score |
| `grading_templates` | Configurable grading criteria | Yes | id, org_id, criteria_json, is_default |
| `scorecard_configs` | Scorecard configurations | Yes | id, org_id, fields_json, passing_threshold |
| `reports` | Generated reports | Yes | id, call_id, analysis_id, report_json, pdf_url |
| `webhook_logs` | Webhook request logs | Yes | id, org_id, payload, status_code |
| `invitations` | Team invitations | Yes | id, org_id, email, token, expires_at |
| `audit_logs` | Audit trail | Yes | id, org_id, user_id, action, entity_type |
| `processing_queue` | Call processing queue | Yes | id, org_id, call_id, status, priority |
| `api_keys` | API key management | Yes | id, org_id, key_hash, scopes |
| `rate_limits` | Rate limiting records | Yes | id, identifier, endpoint, requests |

### Additional Tables (Migration 003)

| Table | Description | RLS | Key Fields |
|-------|-------------|-----|------------|
| `scripts` | Sales scripts | Yes | id, org_id, sections, status, is_default |
| `scorecards` | Scorecard definitions | Yes | id, org_id, criteria, total_weight, status |
| `call_score_results` | Call scoring results | Yes | id, call_id, scorecard_id, scores |
| `insight_templates` | AI insight templates | Yes | id, org_id, prompt_template, category |

### Enums

| Enum | Values |
|------|--------|
| `user_role` | caller, admin, superadmin |
| `call_status` | pending, processing, analyzed, failed |
| `call_source` | webhook, google_notes, manual, api |
| `plan_type` | free, starter, professional, enterprise |
| `report_status` | generating, ready, failed |
| `queue_status` | queued, processing, completed, failed |
| `grading_field_type` | score, text, checklist, boolean, percentage |

---

## 5. RLS POLICY CATALOG

### Helper Functions
- `user_org_id()` - Returns current user's org_id
- `user_role()` - Returns current user's role
- `is_superadmin()` - Checks if user is superadmin
- `user_caller_id()` - Returns caller_id if user is a caller

### Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| organizations | Own org OR superadmin | Superadmin only | Admin in org | - |
| users | Own org OR superadmin | Admin in org | Admin in org OR self | - |
| callers | Own org OR superadmin | Admin in org | Admin in org | Admin in org |
| calls | Own calls OR admin in org | Admin in org | Admin in org | Admin in org |
| analyses | Via accessible calls | Via org calls | - | - |
| grading_templates | Own org OR superadmin | Admin in org | Admin in org | Admin in org |
| scorecard_configs | Own org OR superadmin | Admin in org | Admin in org | Admin in org |
| reports | Via accessible calls | System | System | - |
| webhook_logs | Admin in org | - | - | - |
| invitations | Admin in org | Admin in org | - | Admin in org |
| audit_logs | Admin in org | - | - | - |
| processing_queue | Admin in org | - | - | - |
| api_keys | Admin in org | Admin in org | Admin in org | Admin in org |

---

## 6. AUTH & ROLES MODEL

### Authentication Flow
1. User signs up via Supabase Auth (email/password)
2. POST `/api/auth/setup` creates org + user record
3. Session managed via Supabase cookies
4. Middleware validates session and protected routes

### Role Hierarchy
```
superadmin (highest)
    └── admin
        └── caller (lowest)
```

### Role Permissions

| Permission | caller | admin | superadmin |
|------------|--------|-------|------------|
| View own calls | Yes | Yes | Yes |
| View all org calls | No | Yes | Yes |
| Create calls | No | Yes | Yes |
| Manage callers | No | Yes | Yes |
| Manage templates | No | Yes | Yes |
| View analytics | Limited | Yes | Yes |
| Org settings | No | Yes | Yes |
| Cross-org access | No | No | Yes |

---

## 7. ENVIRONMENT VARIABLES

| Variable | Required | Location | Description |
|----------|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client + Server | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only | Supabase service role key (bypasses RLS) |
| `OPENAI_API_KEY` | Yes | Server only | OpenAI API key for GPT-4o |
| `REDIS_URL` | No | Server only | Redis URL for rate limiting |
| `NODE_ENV` | No | Server | Environment (development/production) |
| `TEST_BASE_URL` | No | Tests | Base URL for API tests |

---

## 8. EXISTING TEST INFRASTRUCTURE

### Files
- `tests/rls/rls-attack-tests.ts` - RLS security tests
- `tests/api/api-integration-tests.ts` - API integration tests
- `scripts/seed-test-data.ts` - Deterministic test data seeding

### Test Coverage (Current)
- RLS: Cross-tenant isolation, role-based access
- API: Auth, calls CRUD, callers CRUD, grading templates, dashboard stats, webhook

### Gaps Identified
- Missing: Scripts API tests
- Missing: Scorecards API tests
- Missing: Insight templates API tests
- Missing: File upload tests
- Missing: AI analysis tests (mocked)
- Missing: E2E UI tests
- Missing: Database constraint tests
- Missing: Storage security tests

---

## 9. KEY SECURITY CONSIDERATIONS

### Implemented
1. Row Level Security on all tables
2. HMAC signature verification for webhooks
3. Timing-safe string comparison
4. Input sanitization via `sanitizeInput()`
5. UUID validation via `isValidUUID()`
6. Zod schema validation on all inputs
7. Rate limiting infrastructure (needs Redis for production)
8. Audit logging for sensitive operations

### Potential Concerns (To Test)
1. Cross-tenant data access via joins
2. Caller role accessing admin-only endpoints
3. Forged org_id in POST requests
4. SQL injection via JSONB fields
5. Privilege escalation via role update
6. Webhook secret exposure
7. Storage bucket access controls

---

## 10. FILE STRUCTURE SUMMARY

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       ├── page.tsx (main dashboard)
│   │       ├── calls/
│   │       ├── analytics/
│   │       ├── insights/
│   │       ├── reports/
│   │       ├── settings/
│   │       ├── submit/
│   │       ├── upload/
│   │       ├── team/
│   │       ├── callers/
│   │       ├── grading/
│   │       ├── webhooks/
│   │       └── scorecard/
│   ├── api/
│   │   ├── auth/
│   │   ├── calls/
│   │   ├── callers/
│   │   ├── analytics/
│   │   ├── insights/
│   │   ├── dashboard/
│   │   ├── grading-templates/
│   │   ├── scorecard-configs/
│   │   ├── scorecards/
│   │   ├── scripts/
│   │   ├── insight-templates/
│   │   ├── stats/
│   │   └── webhook/
│   ├── page.tsx (landing)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── providers/
│   ├── layout/
│   ├── ui/
│   └── calls/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── api-utils.ts
│   ├── ai-engine.ts
│   ├── rate-limiter.ts
│   └── utils.ts
└── types/
    └── database.ts

supabase/
└── migrations/
    ├── 001_initial_schema.sql
    ├── 002_add_delete_policies.sql
    └── 003_scripts_scorecards_insights.sql

tests/
├── rls/
│   └── rls-attack-tests.ts
└── api/
    └── api-integration-tests.ts

scripts/
├── seed-test-data.ts
└── seed-admin.ts
```

---

## PHASE 0 COMPLETE

System mapping is complete. Ready to proceed with:
- Phase 1: Create test mode and observability
- Phase 2: Generate deterministic fake data
- Phase 3: Database constraint tests
- Phase 4: RLS attack suite
- Phase 5: API integration tests
- Phase 6: UI E2E tests with Playwright
- Phase 7: AI pipeline tests
- Phase 8: Storage security tests
- Phase 9: Final report and fixes
