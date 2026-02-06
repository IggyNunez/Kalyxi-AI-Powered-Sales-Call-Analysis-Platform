# KALYXI SYSTEM MAP - COMPREHENSIVE AUDIT
**Generated:** 2026-02-06
**Audit Type:** Phase 0 - Complete System Remapping
**Status:** COMPLETE

---

## 1. UI ROUTE CATALOG

### 1.1 Public Routes
| Route | File | Auth Required | Description |
|-------|------|---------------|-------------|
| `/` | `src/app/page.tsx` | No | Marketing landing page |
| `/login` | `src/app/(auth)/login/page.tsx` | No | User login |
| `/register` | `src/app/(auth)/register/page.tsx` | No | User registration |

### 1.2 Dashboard Routes (Authentication Required)
| Route | File | Role Required | Description |
|-------|------|---------------|-------------|
| `/dashboard` | `src/app/(dashboard)/dashboard/page.tsx` | Any | Main dashboard |
| `/dashboard/calls` | `src/app/(dashboard)/dashboard/calls/page.tsx` | Any | Call list |
| `/dashboard/calls/[id]` | `src/app/(dashboard)/dashboard/calls/[id]/page.tsx` | Any | Call details |
| `/dashboard/submit` | `src/app/(dashboard)/dashboard/submit/page.tsx` | Admin+ | Submit new call |
| `/dashboard/upload` | `src/app/(dashboard)/dashboard/upload/page.tsx` | Admin+ | Upload calls |
| `/dashboard/callers` | `src/app/(dashboard)/dashboard/callers/page.tsx` | Admin+ | Caller management |
| `/dashboard/team` | `src/app/(dashboard)/dashboard/team/page.tsx` | Admin+ | Team management |
| `/dashboard/analytics` | `src/app/(dashboard)/dashboard/analytics/page.tsx` | Any | Analytics dashboard |
| `/dashboard/insights` | `src/app/(dashboard)/dashboard/insights/page.tsx` | Any | AI insights |
| `/dashboard/reports` | `src/app/(dashboard)/dashboard/reports/page.tsx` | Any | Reports |
| `/dashboard/settings` | `src/app/(dashboard)/dashboard/settings/page.tsx` | Admin+ | Organization settings |
| `/dashboard/grading` | `src/app/(dashboard)/dashboard/grading/page.tsx` | Admin+ | Grading templates |
| `/dashboard/webhooks` | `src/app/(dashboard)/dashboard/webhooks/page.tsx` | Admin+ | Webhook management |
| `/dashboard/scorecard` | `src/app/(dashboard)/dashboard/scorecard/page.tsx` | Admin+ | Scorecard management |
| `/dashboard/scorecard/builder` | `src/app/(dashboard)/dashboard/scorecard/builder/page.tsx` | Admin+ | Scorecard builder |

### 1.3 Admin Routes (Superadmin Required)
| Route | File | Role Required | Description |
|-------|------|---------------|-------------|
| `/admin/organizations` | `src/app/(admin)/admin/organizations/page.tsx` | Superadmin | Org management |
| `/admin/platform` | `src/app/(admin)/admin/platform/page.tsx` | Superadmin | Platform health |

**Total UI Routes:** 18

---

## 2. API ROUTE CATALOG

### 2.1 Authentication APIs
| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/auth/register` | POST | Public | User registration |
| `/api/auth/setup` | POST | Authenticated | Initial setup |

### 2.2 Calls APIs
| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/calls` | GET, POST | Auth | List/create calls |
| `/api/calls/[id]` | GET, PUT, DELETE | Auth | Single call CRUD |
| `/api/calls/[id]/analyze` | POST | Admin+ | Trigger analysis |
| `/api/calls/upload` | POST | Admin+ | Upload call data |

### 2.3 Callers APIs
| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/callers` | GET, POST | Auth | List/create callers |
| `/api/callers/[id]` | GET, PUT, DELETE | Auth | Single caller CRUD |

### 2.4 Analytics & Stats APIs
| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/analytics` | GET | Auth | Analytics data |
| `/api/stats` | GET | Auth | Dashboard stats |
| `/api/dashboard/stats` | GET | Auth | Dashboard overview |
| `/api/insights` | GET | Auth | AI insights |

### 2.5 Configuration APIs
| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/grading-templates` | GET, POST | Auth | Grading templates |
| `/api/grading-templates/[id]` | GET, PUT, DELETE | Admin+ | Template CRUD |
| `/api/scorecard-configs` | GET, POST | Auth | Legacy scorecards |
| `/api/scorecard-configs/[id]` | GET, PUT, DELETE | Admin+ | Config CRUD |
| `/api/scorecards` | GET, POST | Auth | New scorecards |
| `/api/scorecards/[id]` | GET, PUT, PATCH, DELETE | Admin+ | Scorecard CRUD |
| `/api/scorecards/active` | GET | Auth | Active scorecard |
| `/api/scripts` | GET, POST | Auth | Scripts |
| `/api/scripts/[id]` | GET, PUT, DELETE | Admin+ | Script CRUD |
| `/api/insight-templates` | GET, POST | Auth | Insight templates |
| `/api/insight-templates/[id]` | GET, PUT, DELETE | Admin+ | Template CRUD |

### 2.6 Demo Data APIs
| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/demo-data/generate` | POST | Admin+ | Generate demo data |
| `/api/demo-data/delete` | DELETE | Admin+ | Delete demo data |
| `/api/demo-data/status` | GET | Admin+ | Demo data status |

### 2.7 Webhook APIs
| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/webhook/[orgSlug]` | GET, POST | Webhook Auth | External webhooks |

**Total API Routes:** 27

---

## 3. DATABASE SCHEMA CATALOG

### 3.1 Core Tables
| Table | RLS Enabled | Description |
|-------|-------------|-------------|
| `organizations` | Yes | Multi-tenant organizations |
| `users` | Yes | User accounts linked to auth.users |
| `callers` | Yes | Sales reps being evaluated |
| `calls` | Yes | Individual call records |
| `analyses` | Yes | AI-generated analysis per call |

### 3.2 Configuration Tables
| Table | RLS Enabled | Description |
|-------|-------------|-------------|
| `grading_templates` | Yes | Legacy grading criteria |
| `scorecard_configs` | Yes | Legacy scorecard configs |
| `scorecards` | Yes | New enhanced scorecards |
| `scripts` | Yes | Sales scripts |
| `insight_templates` | Yes | AI insight templates |

### 3.3 Results Tables
| Table | RLS Enabled | Description |
|-------|-------------|-------------|
| `call_score_results` | Yes | Detailed scoring per call |
| `criteria_optimizations` | Yes | Aggregated criteria stats |
| `reports` | Yes | Generated reports |

### 3.4 Operational Tables
| Table | RLS Enabled | Description |
|-------|-------------|-------------|
| `processing_queue` | Yes | AI processing queue |
| `webhook_logs` | Yes | Webhook request logs |
| `audit_logs` | Yes | Action audit trail |
| `invitations` | Yes | User invitations |
| `api_keys` | Yes | API key management |
| `rate_limits` | Yes | Rate limiting data |

### 3.5 Views
| View | Description |
|------|-------------|
| `caller_stats` | Aggregated caller statistics |
| `org_analytics` | Organization-level analytics |

**Total Tables:** 19
**Total Views:** 2

---

## 4. RLS POLICY CATALOG

### 4.1 Helper Functions (SECURITY DEFINER)
| Function | Returns | Purpose |
|----------|---------|---------|
| `user_org_id()` | UUID | Current user's org_id |
| `user_role()` | user_role | Current user's role |
| `is_superadmin()` | BOOLEAN | Check if superadmin |
| `user_caller_id()` | UUID | Current user's caller_id |

### 4.2 Organizations Policies
| Policy Name | Operation | Rule |
|-------------|-----------|------|
| Users can view their own organization | SELECT | `id = user_org_id() OR is_superadmin()` |
| Superadmins can create organizations | INSERT | `is_superadmin()` |
| Admins can update their organization | UPDATE | `id = user_org_id() AND role IN (admin, superadmin)` |
| Superadmins can delete organizations | DELETE | `is_superadmin()` |

### 4.3 Users Policies
| Policy Name | Operation | Rule |
|-------------|-----------|------|
| Users can view users in their org | SELECT | `org_id = user_org_id() OR is_superadmin()` |
| Admins can create users in their org | INSERT | `org_id = user_org_id() AND role IN (admin, superadmin)` |
| Admins can update users in their org | UPDATE | `org_id = user_org_id() AND role IN (admin, superadmin)` |
| Users can update their own profile | UPDATE | `id = auth.uid()` |
| Admins can delete users in their org | DELETE | `org_id = user_org_id() AND role IN (admin, superadmin) AND id != auth.uid()` |

### 4.4 Calls Policies
| Policy Name | Operation | Rule |
|-------------|-----------|------|
| Callers can view their own calls | SELECT | `(org_id = user_org_id() AND role IN admin/superadmin) OR caller_id = user_caller_id() OR is_superadmin()` |
| Admins can create calls | INSERT | `org_id = user_org_id() AND role IN (admin, superadmin)` |
| Admins can update calls | UPDATE | `org_id = user_org_id() AND role IN (admin, superadmin)` |
| Admins can delete calls | DELETE | `org_id = user_org_id() AND role IN (admin, superadmin)` |

### 4.5 New Tables (Migration 003)
All new tables have consistent policies:
- **SELECT:** `org_id = user_org_id() OR is_superadmin()`
- **INSERT:** `org_id = user_org_id() [AND role check for admin+]`
- **UPDATE:** `org_id = user_org_id() AND role IN (admin, superadmin)`
- **DELETE:** `org_id = user_org_id() AND role IN (admin, superadmin)`

---

## 5. MIGRATIONS HISTORY

| Version | File | Description |
|---------|------|-------------|
| 000 | `000_reset_schema.sql` | Schema reset (dev only) |
| 001 | `001_initial_schema.sql` | Core tables, RLS, triggers |
| 002 | `002_add_delete_policies.sql` | Missing DELETE policies |
| 003 | `003_scripts_scorecards_insights.sql` | Enhanced scorecard system |
| 004 | `004_demo_data_tracking.sql` | Demo data batch tracking |

---

## 6. NEW PAGES DISCOVERED (vs. previous audit)

1. ✅ `/admin/organizations` - Superadmin org management (NEW)
2. ✅ `/admin/platform` - Superadmin platform monitoring (NEW)
3. ✅ `/dashboard/scorecard/builder` - Scorecard builder (NEW)
4. ✅ `/dashboard/upload` - Call upload page
5. ✅ `/dashboard/grading` - Grading templates page
6. ✅ `/dashboard/webhooks` - Webhook management page
7. ✅ `/dashboard/team` - Team management page

---

## 7. RISK REGISTER - CRITICAL ISSUES

### 🔴 CRITICAL - P0 (Immediate Fix Required)

#### RISK-001: Missing Admin API Route
**Severity:** CRITICAL
**Location:** `/api/admin/organizations` - DOES NOT EXIST
**Impact:** Admin organizations page fails to load data (fetch to non-existent endpoint)
**Evidence:**
- Page `src/app/(admin)/admin/organizations/page.tsx:61` calls `fetch("/api/admin/organizations")`
- No file exists at `src/app/api/admin/organizations/route.ts`
**Fix Required:** Create the missing API route

---

### 🟠 HIGH - P1 (Fix Before Production)

#### RISK-002: Potential RLS Bypass in Demo Data
**Severity:** HIGH
**Location:** `/api/demo-data/generate/route.ts:46-49`
**Issue:** Uses service role client which bypasses RLS
**Evidence:** Creates `supabase` client with `SUPABASE_SERVICE_ROLE_KEY`
**Mitigation:** Acceptable for demo data if properly role-gated (is admin-only)
**Status:** ACCEPTABLE with conditions - requires admin role check (verified at line 22)

#### RISK-003: Webhook Authentication Without Rate Limiting
**Severity:** HIGH
**Location:** `/api/webhook/[orgSlug]/route.ts`
**Issue:** Webhook endpoint has auth but no visible rate limiting
**Evidence:** No call to `checkRateLimit` in webhook route
**Impact:** Potential for webhook flooding/abuse
**Fix Required:** Add rate limiting to webhook endpoint

#### RISK-004: Hardcoded AI Model Fallback
**Severity:** MEDIUM-HIGH
**Location:** `src/lib/ai-engine.ts:205`
**Issue:** Hardcodes "gpt-4o" as fallback model
**Evidence:** `const model = settings?.ai?.model || "gpt-4o";`
**Impact:** Cost implications if default is used unexpectedly
**Fix:** Should be configurable via environment variable

---

### 🟡 MEDIUM - P2 (Fix Soon)

#### RISK-005: Missing Error Boundaries
**Severity:** MEDIUM
**Location:** All dashboard pages
**Issue:** No React Error Boundaries wrapping pages
**Impact:** Errors could crash entire UI sections
**Fix:** Add ErrorBoundary components

#### RISK-006: Inconsistent UUID Validation
**Severity:** MEDIUM
**Location:** Various API routes
**Issue:** Some routes validate UUIDs, others don't
**Evidence:**
- `api/calls/route.ts:76` validates with `isValidUUID`
- Other routes may not
**Fix:** Audit all routes for consistent UUID validation

#### RISK-007: Demo Batch Cleanup Risk
**Severity:** MEDIUM
**Location:** Migration 004 - demo_batch_id columns
**Issue:** No foreign key constraint on demo_batch_id
**Evidence:** Just adds nullable UUID column
**Impact:** Orphaned demo data tracking possible
**Status:** Acceptable for demo tracking purposes

---

### 🟢 LOW - P3 (Track and Fix)

#### RISK-008: Missing Index on Common Queries
**Severity:** LOW
**Location:** Various tables
**Issue:** Some query patterns may lack optimal indexes
**Evidence:** Need to analyze slow query logs
**Fix:** Add indexes based on query patterns

#### RISK-009: Hydration Fix Uses Hardcoded Values
**Severity:** LOW
**Location:** `src/components/marketing/cta-section.tsx:16-32`
**Issue:** Particles use hardcoded positions (fixed hydration issue)
**Status:** Fixed - acceptable solution

---

## 8. AUTH/ROLES MODEL

### 8.1 Role Hierarchy
```
superadmin
    └── admin
         └── caller
```

### 8.2 Role Capabilities
| Capability | caller | admin | superadmin |
|------------|--------|-------|------------|
| View own calls | ✅ | ✅ | ✅ |
| View all org calls | ❌ | ✅ | ✅ |
| Create calls | ❌ | ✅ | ✅ |
| Manage callers | ❌ | ✅ | ✅ |
| Manage org settings | ❌ | ✅ | ✅ |
| View admin pages | ❌ | ❌ | ✅ |
| Manage all orgs | ❌ | ❌ | ✅ |

### 8.3 Auth Flow
1. User registers → Creates org + user (as admin) OR joins via invite
2. Login via Supabase Auth
3. Session stored in cookies (httpOnly)
4. AuthProvider fetches profile from `users` table
5. Role checked client-side via `useAuth()` hook
6. Role checked server-side via `requireAuth()`/`requireAdmin()`/`requireSuperadmin()`

---

## 9. DATA FLOW DIAGRAMS

### 9.1 Call Analysis Flow
```
[Webhook/Manual Submit]
        ↓
   [calls table] (status: pending)
        ↓
[processing_queue] (status: queued)
        ↓
   [AI Engine] (OpenAI GPT-4o)
        ↓
  [analyses table]
        ↓
[call_score_results] (if scorecard)
        ↓
  [reports table]
        ↓
   [calls table] (status: analyzed)
```

### 9.2 Multi-Tenant Data Isolation
```
All queries automatically filtered by:
  org_id = user_org_id()

Exception: superadmins can see all data
```

---

## 10. ENVIRONMENT VARIABLES REQUIRED

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `DEMO_DATA_ENABLED` | No | Enable demo data (default: false) |
| `REDIS_URL` | No | Redis for rate limiting |

---

## 11. IMMEDIATE ACTION ITEMS

1. **[P0] Create `/api/admin/organizations` route** - Admin page broken
2. **[P1] Add rate limiting to webhook endpoint** - Security risk
3. **[P1] Add default AI model environment variable** - Cost control
4. **[P2] Add Error Boundaries to all pages** - UX improvement
5. **[P2] Audit all routes for UUID validation** - Security hardening

---

## 12. AUDIT METRICS

| Metric | Value |
|--------|-------|
| Total UI Routes | 18 |
| Total API Routes | 27 |
| Total DB Tables | 19 |
| Total DB Views | 2 |
| Total Migrations | 5 |
| RLS-Protected Tables | 19/19 (100%) |
| Critical Issues Found | 1 |
| High Issues Found | 3 |
| Medium Issues Found | 3 |
| Low Issues Found | 2 |

---

**Phase 0 Complete** - System map generated successfully.
**Next:** Phase 1 - Demo data generation scripts
