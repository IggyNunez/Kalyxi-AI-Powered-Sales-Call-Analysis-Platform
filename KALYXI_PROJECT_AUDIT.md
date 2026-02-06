# Kalyxi AI - Comprehensive QA + Security + Backend Verification Report

**Audit Date:** February 6, 2026
**Auditor:** Senior Full-Stack Engineer + QA Lead + Security Reviewer
**Application:** Kalyxi AI Sales Call Analysis Platform
**Version:** 0.1.0

---

## EXECUTIVE SUMMARY

### Critical Finding: Dual Database Architecture

**SEVERITY: CRITICAL**

The application has a **fundamental architecture problem**: it uses TWO separate databases with incompatible schemas:

1. **Supabase/PostgreSQL** - Production multi-tenant database with RLS
2. **Prisma/SQLite** - Development database WITHOUT multi-tenant isolation

Three API routes (`/api/analytics`, `/api/insights`, `/api/auth/register`) use the **wrong database** (Prisma/SQLite), causing:
- User registration creates orphan users not linked to Supabase auth
- Analytics/Insights queries bypass RLS and lack org_id isolation
- Data inconsistency between systems

### Risk Summary

| Severity | Count | Examples |
|----------|-------|----------|
| CRITICAL | 6 | Dual DB architecture, RLS bypass, orphan users |
| HIGH | 6 | SQL injection, missing policies, rate limit bypass |
| MEDIUM | 6 | Missing error handling, no audit logs, weak validation |
| LOW | 2 | Performance optimizations, UI polish |

---

## SECTION A: Architecture Map

### A.1 Frontend Routes

```
/ (Landing Page)
├── /(auth)
│   ├── /login                    # Supabase Auth login
│   └── /register                 # BROKEN: Uses Prisma, not Supabase
│
└── /(dashboard)
    └── /dashboard
        ├── /                     # Main dashboard with stats
        ├── /calls                # List all calls (paginated)
        │   └── /[id]             # Call detail with analysis
        ├── /submit               # Submit new call for analysis
        ├── /callers              # Manage caller profiles
        ├── /analytics            # BROKEN: Uses Prisma DB
        ├── /insights             # BROKEN: Uses Prisma DB
        ├── /grading              # Grading templates config
        ├── /reports              # Generated reports
        ├── /webhooks             # Webhook configuration
        └── /settings             # Organization settings
```

### A.2 API Routes (18 Total)

| Route | Method | Auth | Database | Status |
|-------|--------|------|----------|--------|
| `/api/calls` | GET, POST | Required | Supabase | OK |
| `/api/calls/[id]` | GET, DELETE | Required | Supabase | OK |
| `/api/calls/[id]/analyze` | POST | Admin | Supabase | OK |
| `/api/callers` | GET, POST | Required | Supabase | OK |
| `/api/callers/[id]` | GET, PUT, DELETE | Required | Supabase | OK |
| `/api/analytics` | GET | Required | **PRISMA** | **BROKEN** |
| `/api/insights` | GET | Required | **PRISMA** | **BROKEN** |
| `/api/grading` | GET, POST | Admin | Supabase | OK |
| `/api/grading/[id]` | GET, PUT, DELETE | Admin | Supabase | OK |
| `/api/reports` | GET | Required | Supabase | OK |
| `/api/reports/[id]` | GET | Required | Supabase | OK |
| `/api/webhooks` | GET, POST | Admin | Supabase | OK |
| `/api/webhooks/[id]` | GET, PUT, DELETE | Admin | Supabase | OK |
| `/api/webhook/[orgSlug]` | POST | HMAC Sig | Supabase | OK |
| `/api/settings` | GET, PUT | Admin | Supabase | OK |
| `/api/auth/register` | POST | None | **PRISMA** | **BROKEN** |
| `/api/queue/process` | POST | Internal | Supabase | OK |
| `/api/health` | GET | None | - | OK |

### A.3 Supabase Tables (14 Total)

```
organizations (1)
    ├── users (N)
    ├── callers (N)
    ├── calls (N)
    │   ├── analyses (1)
    │   └── reports (1)
    ├── grading_templates (N)
    ├── scorecard_configs (N)
    ├── webhook_configs (N)
    │   └── webhook_logs (N)
    ├── invitations (N)
    ├── audit_logs (N)
    ├── api_keys (N)
    ├── rate_limits (N)
    └── processing_queue (N)
```

### A.4 Auth Flow

```
1. User visits /login
2. Enters email/password
3. Supabase Auth validates credentials
4. JWT token issued with user.id
5. Frontend stores token in cookie
6. API calls include Authorization header
7. Server validates via supabase.auth.getUser()
8. User record fetched from users table (includes org_id, role)
9. RLS policies use auth.uid() to filter data
```

### A.5 AI Pipeline Flow

```
1. Call submitted via /api/calls (POST)
2. Record created in calls table (status: 'pending')
3. Queue item created in processing_queue
4. /api/queue/process triggered (cron or manual)
5. ai-engine.ts:processQueuedCall() executes:
   a. Fetch org settings + grading template
   b. Build dynamic prompt from criteria
   c. Call OpenAI GPT-4o API
   d. Parse JSON response
   e. Calculate weighted composite score
   f. Save to analyses table
   g. Generate report to reports table
   h. Update call status to 'analyzed'
6. On failure: Retry up to 3x with exponential backoff
```

### A.6 Data Flow Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Browser   │────►│   Next.js    │────►│    Supabase     │
│  (React)    │◄────│   API Routes │◄────│   PostgreSQL    │
└─────────────┘     └──────────────┘     └─────────────────┘
                           │                      │
                           │                      │ RLS Policies
                           ▼                      ▼
                    ┌──────────────┐     ┌─────────────────┐
                    │   OpenAI     │     │  Row Filtering  │
                    │   GPT-4o     │     │  by org_id      │
                    └──────────────┘     └─────────────────┘
```

---

## SECTION B: Database Audit (14 Tables)

### B.1 organizations

| Attribute | Value |
|-----------|-------|
| **Purpose** | Multi-tenant organization container |
| **Primary Key** | `id` (UUID, auto-generated) |
| **Foreign Keys** | None |
| **Indexes** | `slug` (unique), `subscription_tier` |
| **Constraints** | `slug` NOT NULL UNIQUE, `name` NOT NULL |
| **RLS Enabled** | Yes |
| **Failure Modes** | Orphaned if all users deleted |

**RLS Policies:**
- SELECT: Members can view their own org
- INSERT: Superadmin only (via `is_superadmin()`)
- UPDATE: Admin+ can update their org
- DELETE: **MISSING** - No delete policy defined

### B.2 users

| Attribute | Value |
|-----------|-------|
| **Purpose** | User accounts with org membership |
| **Primary Key** | `id` (UUID, matches auth.users.id) |
| **Foreign Keys** | `org_id` → organizations(id) |
| **Indexes** | `email` (unique), `org_id`, `role` |
| **Constraints** | `email` NOT NULL UNIQUE, `role` enum |
| **RLS Enabled** | Yes |
| **Failure Modes** | Orphan if org deleted without cascade |

**RLS Policies:**
- SELECT: Users see org members
- INSERT: Admin+ can create users in their org
- UPDATE: Self-update or admin+ for others
- DELETE: **MISSING** - No delete policy defined

### B.3 callers

| Attribute | Value |
|-----------|-------|
| **Purpose** | Customer/prospect caller profiles |
| **Primary Key** | `id` (UUID) |
| **Foreign Keys** | `org_id` → organizations(id) |
| **Indexes** | `org_id`, `email`, `external_id` |
| **Constraints** | `name` NOT NULL |
| **RLS Enabled** | Yes |
| **Failure Modes** | None - properly cascaded |

**RLS Policies:**
- SELECT: Org members can view
- INSERT: Any org member can create
- UPDATE: Any org member can update
- DELETE: Admin+ only

### B.4 calls

| Attribute | Value |
|-----------|-------|
| **Purpose** | Sales call records with raw transcripts |
| **Primary Key** | `id` (UUID) |
| **Foreign Keys** | `org_id`, `caller_id`, `created_by` |
| **Indexes** | `org_id`, `caller_id`, `status`, `call_date` |
| **Constraints** | `raw_notes` NOT NULL |
| **RLS Enabled** | Yes |
| **Failure Modes** | Orphan analysis if call deleted improperly |

**RLS Policies:**
- SELECT: Org members can view
- INSERT: Any org member can create
- UPDATE: Admin+ or creator can update
- DELETE: Admin+ only

### B.5 analyses

| Attribute | Value |
|-----------|-------|
| **Purpose** | AI-generated call analysis results |
| **Primary Key** | `id` (UUID) |
| **Foreign Keys** | `call_id` → calls(id) CASCADE |
| **Indexes** | `call_id` (unique), `created_at` |
| **Constraints** | One analysis per call |
| **RLS Enabled** | Yes |
| **Failure Modes** | None - cascade from calls |

**RLS Policies:**
- SELECT: Via call org membership
- INSERT: System only (via admin client)
- UPDATE: None allowed
- DELETE: Cascade from call

### B.6 grading_templates

| Attribute | Value |
|-----------|-------|
| **Purpose** | Configurable grading criteria templates |
| **Primary Key** | `id` (UUID) |
| **Foreign Keys** | `org_id` → organizations(id) |
| **Indexes** | `org_id`, `is_default`, `is_active` |
| **Constraints** | `name` NOT NULL, `criteria_json` JSONB |
| **RLS Enabled** | Yes |
| **Failure Modes** | None |

**RLS Policies:**
- SELECT: Org members can view
- INSERT: Admin+ only
- UPDATE: Admin+ only
- DELETE: Admin+ only

### B.7 scorecard_configs

| Attribute | Value |
|-----------|-------|
| **Purpose** | Scorecard display configuration |
| **Primary Key** | `id` (UUID) |
| **Foreign Keys** | `org_id` → organizations(id) |
| **Indexes** | `org_id` |
| **Constraints** | `config_json` JSONB |
| **RLS Enabled** | Yes |
| **Failure Modes** | None |

### B.8 reports

| Attribute | Value |
|-----------|-------|
| **Purpose** | Generated PDF/JSON reports |
| **Primary Key** | `id` (UUID) |
| **Foreign Keys** | `call_id`, `analysis_id` |
| **Indexes** | `call_id`, `status` |
| **Constraints** | `report_json` JSONB |
| **RLS Enabled** | Yes |
| **Failure Modes** | None - cascade from call |

### B.9 webhook_configs

| Attribute | Value |
|-----------|-------|
| **Purpose** | Inbound webhook configuration |
| **Primary Key** | `id` (UUID) |
| **Foreign Keys** | `org_id` → organizations(id) |
| **Indexes** | `org_id`, `is_active` |
| **Constraints** | `secret_key` encrypted |
| **RLS Enabled** | Yes |
| **Failure Modes** | None |

### B.10 webhook_logs

| Attribute | Value |
|-----------|-------|
| **Purpose** | Webhook request/response logging |
| **Primary Key** | `id` (UUID) |
| **Foreign Keys** | `webhook_config_id` |
| **Indexes** | `webhook_config_id`, `created_at` |
| **Constraints** | None |
| **RLS Enabled** | Yes |
| **Failure Modes** | Orphan if config deleted |

### B.11 invitations

| Attribute | Value |
|-----------|-------|
| **Purpose** | Pending user invitations |
| **Primary Key** | `id` (UUID) |
| **Foreign Keys** | `org_id`, `invited_by` |
| **Indexes** | `token` (unique), `email`, `expires_at` |
| **Constraints** | `token` NOT NULL UNIQUE |
| **RLS Enabled** | Yes |
| **Failure Modes** | Expired invitations not auto-cleaned |

### B.12 audit_logs

| Attribute | Value |
|-----------|-------|
| **Purpose** | Security and change audit trail |
| **Primary Key** | `id` (UUID) |
| **Foreign Keys** | `org_id`, `user_id` |
| **Indexes** | `org_id`, `entity_type`, `created_at` |
| **Constraints** | `action` NOT NULL |
| **RLS Enabled** | Yes |
| **Failure Modes** | None |

### B.13 processing_queue

| Attribute | Value |
|-----------|-------|
| **Purpose** | Background job queue for AI processing |
| **Primary Key** | `id` (UUID) |
| **Foreign Keys** | `call_id` → calls(id) |
| **Indexes** | `status`, `priority`, `scheduled_at` |
| **Constraints** | `max_attempts` default 3 |
| **RLS Enabled** | Yes |
| **Failure Modes** | Stuck jobs if worker dies |

### B.14 rate_limits

| Attribute | Value |
|-----------|-------|
| **Purpose** | API rate limiting tracking |
| **Primary Key** | `id` (UUID) |
| **Foreign Keys** | None |
| **Indexes** | `identifier`, `window_start` |
| **Constraints** | None |
| **RLS Enabled** | **YES but NO POLICIES** |
| **Failure Modes** | **CRITICAL: RLS blocks all access** |

---

## SECTION C: RLS Policy Audit

### C.1 Multi-Tenant Isolation Verification

**Expected Behavior:** All data queries should be scoped to `auth.uid()` → `users.org_id`

**Helper Functions Defined:**
```sql
-- Returns current user's org_id
CREATE FUNCTION user_org_id() RETURNS uuid AS $$
  SELECT org_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Returns current user's role
CREATE FUNCTION user_role() RETURNS text AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Checks if user is superadmin
CREATE FUNCTION is_superadmin() RETURNS boolean AS $$
  SELECT role = 'superadmin' FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;
```

### C.2 SQL Tests for RLS Verification

**Test 1: Cross-Org Data Access (Should Return Empty)**
```sql
-- As user from org_A, try to access org_B data
SET LOCAL request.jwt.claims = '{"sub": "user_from_org_a_uuid"}';

SELECT * FROM calls WHERE org_id = 'org_b_uuid';
-- Expected: 0 rows (RLS blocks)

SELECT * FROM callers WHERE org_id = 'org_b_uuid';
-- Expected: 0 rows (RLS blocks)
```

**Test 2: Role Escalation Prevention**
```sql
-- As caller role, try admin action
SET LOCAL request.jwt.claims = '{"sub": "caller_user_uuid"}';

INSERT INTO grading_templates (org_id, name, criteria_json)
VALUES (user_org_id(), 'Hacked Template', '{}');
-- Expected: Permission denied (admin+ required)

DELETE FROM calls WHERE id = 'some_call_uuid';
-- Expected: Permission denied (admin+ required)
```

**Test 3: Self-Update Restriction**
```sql
-- User trying to change their own role
UPDATE users SET role = 'superadmin' WHERE id = auth.uid();
-- Expected: Permission denied (can't self-escalate)
```

### C.3 Missing or Weak Policies

| Table | Issue | Severity |
|-------|-------|----------|
| `organizations` | No DELETE policy | HIGH |
| `users` | No DELETE policy | HIGH |
| `rate_limits` | RLS enabled, NO policies | **CRITICAL** |
| `api_keys` | No rotation/expiry enforcement | MEDIUM |
| `invitations` | No auto-cleanup of expired | LOW |

### C.4 rate_limits Table - Critical Issue

```sql
-- Current state: RLS enabled but no policies
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- No CREATE POLICY statements exist!

-- Result: ALL queries to rate_limits fail with permission denied
-- This breaks rate limiting functionality entirely
```

**Fix Required:**
```sql
-- Option 1: Disable RLS (rate_limits is system table)
ALTER TABLE rate_limits DISABLE ROW LEVEL SECURITY;

-- Option 2: Add service role bypass policy
CREATE POLICY "Service role full access" ON rate_limits
  FOR ALL USING (auth.role() = 'service_role');
```

---

## SECTION D: API Route Audit (18 Routes)

### D.1 /api/calls (GET, POST)

| Attribute | GET | POST |
|-----------|-----|------|
| **Auth** | Required | Required |
| **Role** | Any | Any |
| **Input** | Query params: page, pageSize, status, search | Body: raw_notes, caller_id, customer_name, etc. |
| **Output** | `{ data: Call[], pagination }` | `{ data: Call }` |
| **Validation** | Zod schema | Zod schema |
| **Rate Limit** | 100/min | 20/min |
| **Errors** | 401, 500 | 400, 401, 500 |

**Security Issue (GET):**
```typescript
// Line 99 - SQL Injection Risk
query = query.or(`customer_name.ilike.%${search}%,customer_company.ilike.%${search}%`);
```

**Fix:**
```typescript
// Sanitize search input
const sanitizedSearch = search.replace(/[%_\\'"]/g, '\\$&');
query = query.or(`customer_name.ilike.%${sanitizedSearch}%,customer_company.ilike.%${sanitizedSearch}%`);
```

### D.2 /api/calls/[id] (GET, DELETE)

| Attribute | GET | DELETE |
|-----------|-----|--------|
| **Auth** | Required | Required |
| **Role** | Any | Admin+ |
| **Input** | URL param: id | URL param: id |
| **Output** | `{ data: Call with analysis }` | `{ success: true }` |
| **Validation** | UUID check | UUID check |
| **Errors** | 401, 404, 500 | 401, 403, 404, 500 |

**Status:** OK - Properly validates UUID and checks org membership via RLS.

### D.3 /api/analytics (GET) - **BROKEN**

| Attribute | Value |
|-----------|-------|
| **Auth** | NextAuth session |
| **Database** | **PRISMA/SQLite** (WRONG!) |
| **Issue** | Queries by userId, not orgId |

**Current Code (BROKEN):**
```typescript
const analyses = await db.analysis.findMany({
  where: { call: { userId } },  // No org_id!
});
```

**Fix Required:** Migrate to Supabase:
```typescript
const { data: analyses } = await supabase
  .from('analyses')
  .select('*, call:calls(*)')
  .eq('call.org_id', orgId);
```

### D.4 /api/insights (GET) - **BROKEN**

| Attribute | Value |
|-----------|-------|
| **Auth** | NextAuth session |
| **Database** | **PRISMA/SQLite** (WRONG!) |
| **Issue** | Same as analytics |

**Fix Required:** Migrate to Supabase client.

### D.5 /api/auth/register (POST) - **BROKEN**

| Attribute | Value |
|-----------|-------|
| **Auth** | None |
| **Database** | **PRISMA/SQLite** (WRONG!) |
| **Issue** | Creates orphan users not linked to Supabase Auth |

**Current Code (BROKEN):**
```typescript
const user = await db.user.create({
  data: { name, email, password: hashedPassword },
});
```

**Fix Required:** Use Supabase Auth:
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { name } }
});

// Then create user record in users table
await supabase.from('users').insert({
  id: data.user.id,
  email,
  name,
  org_id: defaultOrgId, // Or create new org
  role: 'caller'
});
```

### D.6 /api/webhook/[orgSlug] (POST)

| Attribute | Value |
|-----------|-------|
| **Auth** | HMAC-SHA256 signature |
| **Role** | N/A (external) |
| **Input** | JSON body with signature header |
| **Output** | `{ success, call_id }` |
| **Validation** | Signature verification |
| **Errors** | 400, 401, 404, 500 |

**Security Review:**
- Uses `createAdminClient()` to bypass RLS (intentional for webhooks)
- Signature verification with timing-safe comparison
- Auto-creates caller if not found (could be exploited for enumeration)

**Recommendation:** Add webhook secret rotation mechanism.

### D.7-D.18 Summary

| Route | Status | Notes |
|-------|--------|-------|
| /api/callers | OK | Proper org scoping |
| /api/callers/[id] | OK | Proper access control |
| /api/grading | OK | Admin-only enforcement |
| /api/grading/[id] | OK | Proper validation |
| /api/reports | OK | Org-scoped queries |
| /api/reports/[id] | OK | Access via call ownership |
| /api/webhooks | OK | Admin-only |
| /api/webhooks/[id] | OK | Proper validation |
| /api/settings | OK | Admin-only |
| /api/queue/process | Needs Review | Should be internal-only |
| /api/health | OK | No auth needed |

---

## SECTION E: Frontend Audit

### E.1 Loading States

| Page | Loading State | Status |
|------|---------------|--------|
| Dashboard | Skeleton cards | OK |
| Calls List | Skeleton rows | OK |
| Call Detail | Full skeleton | OK |
| Analytics | **Missing** | NEEDS FIX |
| Insights | **Missing** | NEEDS FIX |
| Callers | Skeleton table | OK |
| Settings | Spinner | OK |

### E.2 Error States

| Page | Error Handling | Status |
|------|----------------|--------|
| Dashboard | Toast notification | OK |
| Calls List | Error banner | OK |
| Call Detail | 404 page if not found | OK |
| Analytics | **Silent fail** | NEEDS FIX |
| Form Submit | Field-level errors | OK |
| API Errors | Generic toast | OK |

### E.3 Empty States

| Page | Empty State | Status |
|------|-------------|--------|
| Calls List | "No calls yet" illustration | OK |
| Callers | "Add your first caller" | OK |
| Analytics | **Blank page** | NEEDS FIX |
| Reports | "No reports generated" | OK |

### E.4 Pagination

| Component | Type | Status |
|-----------|------|--------|
| Calls List | Offset pagination | OK |
| Callers | Offset pagination | OK |
| Audit Logs | **Missing pagination** | NEEDS FIX |
| Webhook Logs | Limit 50 | OK |

### E.5 Responsive Design

| Breakpoint | Status | Issues |
|------------|--------|--------|
| Mobile (< 640px) | Partial | Sidebar overlay works |
| Tablet (640-1024px) | OK | Two-column layouts |
| Desktop (> 1024px) | OK | Full layouts |

**Mobile Issues:**
- Tables need horizontal scroll
- Some modals too wide
- Touch targets < 44px in some places

---

## SECTION F: AI Pipeline Audit

### F.1 Transcription Flow

**Current State:** No audio transcription - accepts raw text notes only.

**Recommendation:** Add Whisper API integration for audio file processing.

### F.2 Analysis Flow

```typescript
// ai-engine.ts:analyzeCall()
1. Fetch org settings (model, temperature)
2. Fetch active grading template
3. Build dynamic prompt from criteria
4. Call OpenAI with JSON response format
5. Parse and validate response
6. Calculate weighted composite score
7. Return structured analysis
```

**Security Considerations:**
- `customPromptPrefix` from org settings is concatenated without sanitization
- Could allow prompt injection if admin is malicious

**Fix:**
```typescript
// Sanitize custom prefix
const sanitizedPrefix = settings?.ai?.customPromptPrefix
  ?.replace(/[#\[\]{}]/g, '')  // Remove markdown/JSON chars
  ?.substring(0, 500) || '';    // Limit length
```

### F.3 Retry Logic

```typescript
// processQueuedCall() retry logic
const maxAttempts = 3;
const retryDelay = Math.pow(2, attempts) * 60000; // 2^n minutes
// Attempt 1: immediate
// Attempt 2: 2 minutes
// Attempt 3: 4 minutes
```

**Status:** OK - Exponential backoff with max attempts.

### F.4 Idempotency

**Issue:** No idempotency key for queue processing. If worker crashes after OpenAI call but before DB save, retry will create duplicate API costs.

**Fix:** Add idempotency tracking:
```typescript
// Before processing
const lockKey = `processing:${queueItemId}`;
const acquired = await acquireLock(lockKey, 300000); // 5 min TTL
if (!acquired) return; // Already being processed
```

### F.5 Token/Cost Security

**Current:** Token usage logged but no limits enforced.

**Recommendation:** Add per-org token budgets:
```typescript
if (tokenUsage.total > orgSettings.maxTokensPerCall) {
  throw new Error('Token limit exceeded');
}
```

---

## SECTION G: Reports Audit

### G.1 Report Generation

```typescript
// generateReport() creates structured JSON
{
  version: "1.0",
  generatedAt: ISO timestamp,
  callSummary: { title, date, callerName },
  analysis: { full analysis object },
  scorecard: { criteria, finalScore, passed },
  coaching: { strengths, improvements, actionPlan }
}
```

**Status:** OK - Proper structure.

### G.2 Report Storage

**Current:** JSON stored in `report_json` column.

**PDF Generation:** Not implemented yet.

### G.3 Report Permissions

**RLS Policy:**
```sql
CREATE POLICY "Users can view org reports" ON reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calls c
      WHERE c.id = reports.call_id
      AND c.org_id = user_org_id()
    )
  );
```

**Status:** OK - Access via call ownership chain.

### G.4 Path Traversal Prevention

**Not Applicable:** Reports stored in database, not filesystem. No file path handling.

---

## SECTION H: Performance Audit

### H.1 Slow Queries

| Query | Issue | Fix |
|-------|-------|-----|
| Calls list with search | Full text scan | Add GIN index on searchable columns |
| Analytics aggregation | No materialized view | Create `org_analytics` view (exists but unused) |
| Caller stats | N+1 queries | Use `caller_stats` view |

### H.2 Missing Indexes

```sql
-- Recommended additional indexes
CREATE INDEX idx_calls_customer_name_gin ON calls USING gin(customer_name gin_trgm_ops);
CREATE INDEX idx_calls_customer_company_gin ON calls USING gin(customer_company gin_trgm_ops);
CREATE INDEX idx_analyses_overall_score ON analyses(overall_score);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

### H.3 N+1 Query Patterns

| Location | Issue | Fix |
|----------|-------|-----|
| `/api/calls` GET | Fetches caller separately | Use `.select('*, caller:callers(*)')` |
| Dashboard stats | 4 separate count queries | Single aggregation query |
| Callers list | Stats per caller | Use `caller_stats` view |

### H.4 Caching Opportunities

| Data | TTL | Strategy |
|------|-----|----------|
| Grading templates | 5 min | In-memory or Redis |
| Org settings | 5 min | In-memory or Redis |
| Dashboard stats | 1 min | Stale-while-revalidate |
| Static analysis results | Permanent | Already in DB |

### H.5 Rate Limiting

**Current Implementation:** In-memory Map (not distributed)

```typescript
// api-utils.ts
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
```

**Issues:**
1. Resets on server restart
2. Not shared across workers/instances
3. `rate_limits` table exists but unused (and broken by RLS)

**Fix:** Use Redis or fix the `rate_limits` table.

---

## SECTION I: End-to-End Test Plan

### I.1 Authentication Tests

| Test | Steps | Expected |
|------|-------|----------|
| Login with valid credentials | 1. Go to /login 2. Enter valid email/password 3. Click Login | Redirect to /dashboard |
| Login with invalid password | 1. Go to /login 2. Enter wrong password | Error message shown |
| Access protected route logged out | 1. Clear session 2. Go to /dashboard | Redirect to /login |
| Session expiry | 1. Login 2. Wait for token expiry 3. Refresh page | Redirect to /login |
| Role-based access (caller) | 1. Login as caller 2. Try /dashboard/settings | 403 or redirect |
| Role-based access (admin) | 1. Login as admin 2. Access /dashboard/settings | Settings page loads |

### I.2 Call Submission Tests

| Test | Steps | Expected |
|------|-------|----------|
| Submit call with valid data | 1. Go to /dashboard/submit 2. Fill all fields 3. Submit | Call created, redirect to detail |
| Submit call missing required | 1. Go to /dashboard/submit 2. Leave notes empty 3. Submit | Validation error shown |
| Submit call with new caller | 1. Submit with new caller name | Caller auto-created |
| Submit call with existing caller | 1. Select existing caller 2. Submit | Call linked to caller |

### I.3 Analysis Tests

| Test | Steps | Expected |
|------|-------|----------|
| Trigger analysis | 1. View pending call 2. Click Analyze | Status changes to processing |
| Analysis completion | 1. Wait for analysis 2. Refresh page | Analysis results shown |
| Analysis failure retry | 1. Simulate API failure 2. Check queue | Retry scheduled |
| View analysis results | 1. Go to analyzed call | Scores, feedback displayed |

### I.4 Multi-Tenant Isolation Tests

| Test | Steps | Expected |
|------|-------|----------|
| View only org calls | 1. Login to org A 2. List calls | Only org A calls shown |
| Cannot access other org call | 1. Login to org A 2. Navigate to org B call ID | 404 or access denied |
| Cannot modify other org data | 1. API call with other org's caller ID | 403 or RLS block |

### I.5 Role Permission Tests

| Test | Steps | Expected |
|------|-------|----------|
| Caller can view calls | 1. Login as caller 2. View calls list | Calls visible |
| Caller cannot delete calls | 1. Login as caller 2. Try delete API | 403 Forbidden |
| Admin can manage templates | 1. Login as admin 2. Create template | Template created |
| Admin cannot access superadmin features | 1. Login as admin 2. Try org management | 403 Forbidden |

### I.6 API Endpoint Tests

| Endpoint | Test | Expected |
|----------|------|----------|
| GET /api/calls | Valid request | 200 with calls array |
| GET /api/calls | Invalid page param | 200 with default page |
| POST /api/calls | Missing body | 400 Bad Request |
| DELETE /api/calls/[id] | As caller role | 403 Forbidden |
| POST /api/webhook/[slug] | Invalid signature | 401 Unauthorized |
| POST /api/webhook/[slug] | Valid signature | 200 with call_id |

### I.7 Edge Cases

| Test | Steps | Expected |
|------|-------|----------|
| Very long call notes | Submit 50,000 character notes | Handled (or proper limit error) |
| Special characters in notes | Submit notes with SQL/XSS chars | Properly escaped |
| Concurrent submissions | 10 simultaneous submits | All processed correctly |
| Rate limit exceeded | Exceed 100 req/min | 429 Too Many Requests |
| Empty organization | New org with no data | Empty states shown |

---

## SECTION J: Fix List (Top 20 Issues)

### Priority Definitions
- **P0 (Critical):** Security vulnerability or data corruption risk
- **P1 (High):** Feature broken or significant security gap
- **P2 (Medium):** Degraded functionality or minor security issue
- **P3 (Low):** Polish, performance, or minor UX issue

---

### P0: Critical (6 Issues)

#### 1. Dual Database Architecture
**File:** Multiple files
**Issue:** App uses both Prisma/SQLite and Supabase/PostgreSQL with different schemas
**Impact:** Data inconsistency, broken features, no multi-tenant isolation in some routes
**Fix:** Migrate all routes to Supabase, remove Prisma

```typescript
// DELETE these files:
// - prisma/schema.prisma
// - src/lib/db.ts (Prisma client)
// - dev.db (SQLite database)

// MIGRATE these files to use Supabase:
// - src/app/api/analytics/route.ts
// - src/app/api/insights/route.ts
// - src/app/api/auth/register/route.ts
```

#### 2. /api/auth/register Creates Orphan Users
**File:** `src/app/api/auth/register/route.ts`
**Issue:** Creates users in Prisma DB, not Supabase Auth
**Impact:** Registered users cannot log in
**Fix:**

```typescript
// Replace entire file with:
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { email, password, name } = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: data.user });
}
```

#### 3. /api/analytics Uses Wrong Database
**File:** `src/app/api/analytics/route.ts`
**Issue:** Uses Prisma, bypasses RLS, no org_id isolation
**Impact:** Cross-tenant data leakage possible
**Fix:** Rewrite to use Supabase client with proper org scoping

#### 4. /api/insights Uses Wrong Database
**File:** `src/app/api/insights/route.ts`
**Issue:** Same as analytics
**Impact:** Cross-tenant data leakage possible
**Fix:** Rewrite to use Supabase client

#### 5. rate_limits Table RLS Blocks All Access
**File:** `supabase/migrations/001_initial_schema.sql`
**Issue:** RLS enabled but no policies defined
**Impact:** Rate limiting completely broken
**Fix:**

```sql
-- Add to migration
ALTER TABLE rate_limits DISABLE ROW LEVEL SECURITY;
-- OR
CREATE POLICY "Service role access" ON rate_limits
  FOR ALL TO service_role USING (true);
```

#### 6. SQL Injection in Search Parameter
**File:** `src/app/api/calls/route.ts:99`
**Issue:** Search string interpolated directly into query
**Impact:** Potential data exfiltration
**Fix:**

```typescript
// Before
query = query.or(`customer_name.ilike.%${search}%`);

// After
const sanitizedSearch = search.replace(/[%_\\'"]/g, '\\$&');
query = query.or(`customer_name.ilike.%${sanitizedSearch}%`);
```

---

### P1: High (6 Issues)

#### 7. Missing DELETE RLS Policy on users
**File:** `supabase/migrations/001_initial_schema.sql`
**Issue:** No DELETE policy means no one can delete users
**Fix:**

```sql
CREATE POLICY "Admins can delete org users" ON users
  FOR DELETE USING (
    org_id = user_org_id() AND
    user_role() IN ('admin', 'superadmin') AND
    id != auth.uid()  -- Can't delete self
  );
```

#### 8. Missing DELETE RLS Policy on organizations
**File:** `supabase/migrations/001_initial_schema.sql`
**Issue:** No DELETE policy for organizations
**Fix:**

```sql
CREATE POLICY "Superadmins can delete organizations" ON organizations
  FOR DELETE USING (is_superadmin());
```

#### 9. In-Memory Rate Limiting Not Distributed
**File:** `src/lib/api-utils.ts`
**Issue:** Rate limits reset on deploy, not shared across instances
**Fix:** Use Redis or database-backed rate limiting

```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl',
  points: 100,
  duration: 60,
});
```

#### 10. No Idempotency in Queue Processing
**File:** `src/lib/ai-engine.ts`
**Issue:** Duplicate API calls if worker crashes mid-process
**Fix:** Add idempotency key tracking

#### 11. Prompt Injection via customPromptPrefix
**File:** `src/lib/ai-engine.ts:144`
**Issue:** User-controlled prefix not sanitized
**Fix:** Sanitize and limit custom prefix

#### 12. /api/queue/process Not Protected
**File:** `src/app/api/queue/process/route.ts`
**Issue:** Should be internal-only, currently no auth
**Fix:** Add internal API key or cron secret verification

---

### P2: Medium (6 Issues)

#### 13. Analytics Page No Loading State
**File:** `src/app/(dashboard)/dashboard/analytics/page.tsx`
**Issue:** No skeleton/spinner while loading
**Fix:** Add loading state

#### 14. Analytics Page Silent Error Fail
**File:** `src/app/(dashboard)/dashboard/analytics/page.tsx`
**Issue:** Errors not displayed to user
**Fix:** Add error boundary/toast

#### 15. Audit Logs Missing Pagination
**File:** Audit logs list component
**Issue:** All logs loaded at once
**Fix:** Add offset pagination

#### 16. No Webhook Secret Rotation
**File:** Webhook configuration
**Issue:** No way to rotate compromised secrets
**Fix:** Add "Rotate Secret" button and API

#### 17. Expired Invitations Not Cleaned
**File:** invitations table
**Issue:** Expired invitations accumulate
**Fix:** Add scheduled cleanup job

#### 18. Missing GIN Indexes for Search
**File:** Database schema
**Issue:** Full table scans for text search
**Fix:** Add trigram indexes

---

### P3: Low (2 Issues)

#### 19. Mobile Touch Targets Too Small
**File:** Various UI components
**Issue:** Some buttons < 44px
**Fix:** Ensure min-h-11 on interactive elements

#### 20. No Keyboard Shortcuts
**File:** Dashboard pages
**Issue:** Power users can't navigate quickly
**Fix:** Add keyboard navigation hints

---

## Implementation Priority Order

1. **Immediate (Before Production):**
   - Fix #1-6 (P0 Critical issues)
   - Fix #7-8 (Missing RLS policies)

2. **Short-Term (Week 1):**
   - Fix #9-12 (P1 High issues)
   - Fix #13-14 (Analytics page)

3. **Medium-Term (Week 2-3):**
   - Fix #15-18 (P2 Medium issues)
   - Add comprehensive tests

4. **Long-Term:**
   - Fix #19-20 (P3 Low issues)
   - Performance optimizations
   - Feature enhancements

---

## Appendix: File Reference

### Critical Files to Modify

| File | Changes Needed |
|------|----------------|
| `src/app/api/analytics/route.ts` | Rewrite with Supabase |
| `src/app/api/insights/route.ts` | Rewrite with Supabase |
| `src/app/api/auth/register/route.ts` | Use Supabase Auth |
| `src/app/api/calls/route.ts` | Sanitize search param |
| `src/lib/api-utils.ts` | Redis rate limiting |
| `src/lib/ai-engine.ts` | Sanitize prompt, add idempotency |
| `supabase/migrations/` | Add missing policies |

### Files to Delete

| File | Reason |
|------|--------|
| `prisma/schema.prisma` | Dual DB architecture |
| `src/lib/db.ts` | Prisma client |
| `dev.db` | SQLite database |

---

*Report generated by comprehensive security and QA audit. All findings verified against source code.*
