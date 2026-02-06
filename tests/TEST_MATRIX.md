# KALYXI TEST MATRIX
**Generated:** 2026-02-06
**Coverage:** All UI routes, API routes, database tables, and security policies

---

## 1. UI ROUTE TEST MATRIX

### 1.1 Public Routes
| Route | Auth Test | Guest Access | Render Test | E2E File | Status |
|-------|-----------|--------------|-------------|----------|--------|
| `/` | N/A | Should work | ✅ | N/A (static) | Ready |
| `/login` | Redirect if logged in | ✅ | ✅ | `login.spec.ts` | Ready |
| `/register` | Redirect if logged in | ✅ | ✅ | N/A | TODO |

### 1.2 Dashboard Routes (Auth Required)
| Route | Auth Guard | Role Guard | Data Load | E2E File | Status |
|-------|------------|------------|-----------|----------|--------|
| `/dashboard` | ✅ | Any | Stats API | `dashboard.spec.ts` | Ready |
| `/dashboard/calls` | ✅ | Any | Calls API | `calls.spec.ts` | Ready |
| `/dashboard/calls/[id]` | ✅ | Any | Call detail | `calls.spec.ts` | Ready |
| `/dashboard/submit` | ✅ | Admin+ | Form submit | N/A | TODO |
| `/dashboard/upload` | ✅ | Admin+ | File upload | N/A | TODO |
| `/dashboard/callers` | ✅ | Admin+ | Callers API | `callers.spec.ts` | Ready |
| `/dashboard/team` | ✅ | Admin+ | Users API | N/A | TODO |
| `/dashboard/analytics` | ✅ | Any | Analytics API | N/A | TODO |
| `/dashboard/insights` | ✅ | Any | Insights API | N/A | TODO |
| `/dashboard/reports` | ✅ | Any | Reports API | N/A | TODO |
| `/dashboard/settings` | ✅ | Admin+ | Org settings | `settings.spec.ts` | Ready |
| `/dashboard/grading` | ✅ | Admin+ | Templates API | `grading.spec.ts` | Ready |
| `/dashboard/webhooks` | ✅ | Admin+ | Webhook config | N/A | TODO |
| `/dashboard/scorecard` | ✅ | Admin+ | Scorecard API | N/A | TODO |
| `/dashboard/scorecard/builder` | ✅ | Admin+ | Builder UI | N/A | TODO |

### 1.3 Admin Routes (Superadmin Required)
| Route | Auth Guard | Role Guard | Data Load | E2E File | Status |
|-------|------------|------------|-----------|----------|--------|
| `/admin/organizations` | ✅ | Superadmin | Admin orgs API | N/A | TODO |
| `/admin/platform` | ✅ | Superadmin | Platform stats | N/A | TODO |

---

## 2. API ROUTE TEST MATRIX

### 2.1 Authentication APIs
| Endpoint | Method | Auth | Rate Limit | Input Validation | Test File | Status |
|----------|--------|------|------------|------------------|-----------|--------|
| `/api/auth/register` | POST | None | ✅ | Zod schema | `api-integration-tests.ts` | Ready |
| `/api/auth/setup` | POST | Auth | ✅ | Zod schema | N/A | TODO |

### 2.2 Calls APIs
| Endpoint | Method | Auth | Rate Limit | RLS | Test File | Status |
|----------|--------|------|------------|-----|-----------|--------|
| `/api/calls` | GET | Auth | ✅ | org_id filter | `comprehensive-api-tests.ts` | Ready |
| `/api/calls` | POST | Admin+ | ✅ | org_id inject | `comprehensive-api-tests.ts` | Ready |
| `/api/calls/[id]` | GET | Auth | ✅ | org_id check | `comprehensive-api-tests.ts` | Ready |
| `/api/calls/[id]` | PUT | Admin+ | ✅ | org_id check | `comprehensive-api-tests.ts` | Ready |
| `/api/calls/[id]` | DELETE | Admin+ | ✅ | org_id check | `comprehensive-api-tests.ts` | Ready |
| `/api/calls/[id]/analyze` | POST | Admin+ | ✅ | org_id check | `ai-pipeline-tests.ts` | Ready |
| `/api/calls/upload` | POST | Admin+ | ✅ | File validation | N/A | TODO |

### 2.3 Callers APIs
| Endpoint | Method | Auth | Rate Limit | RLS | Test File | Status |
|----------|--------|------|------------|-----|-----------|--------|
| `/api/callers` | GET | Auth | ✅ | org_id filter | `comprehensive-api-tests.ts` | Ready |
| `/api/callers` | POST | Admin+ | ✅ | org_id inject | `comprehensive-api-tests.ts` | Ready |
| `/api/callers/[id]` | GET | Auth | ✅ | org_id check | `comprehensive-api-tests.ts` | Ready |
| `/api/callers/[id]` | PUT | Admin+ | ✅ | org_id check | `comprehensive-api-tests.ts` | Ready |
| `/api/callers/[id]` | DELETE | Admin+ | ✅ | org_id check | `comprehensive-api-tests.ts` | Ready |

### 2.4 Analytics APIs
| Endpoint | Method | Auth | Rate Limit | RLS | Test File | Status |
|----------|--------|------|------------|-----|-----------|--------|
| `/api/analytics` | GET | Auth | ✅ | org_id filter | N/A | TODO |
| `/api/stats` | GET | Auth | ✅ | org_id filter | N/A | TODO |
| `/api/dashboard/stats` | GET | Auth | ✅ | org_id filter | N/A | TODO |
| `/api/insights` | GET | Auth | ✅ | org_id filter | N/A | TODO |

### 2.5 Configuration APIs
| Endpoint | Method | Auth | Rate Limit | RLS | Test File | Status |
|----------|--------|------|------------|-----|-----------|--------|
| `/api/grading-templates` | GET | Auth | ✅ | org_id filter | `comprehensive-api-tests.ts` | Ready |
| `/api/grading-templates` | POST | Admin+ | ✅ | org_id inject | `comprehensive-api-tests.ts` | Ready |
| `/api/grading-templates/[id]` | * | Admin+ | ✅ | org_id check | `comprehensive-api-tests.ts` | Ready |
| `/api/scorecards` | GET | Auth | ✅ | org_id filter | N/A | TODO |
| `/api/scorecards` | POST | Admin+ | ✅ | org_id inject | N/A | TODO |
| `/api/scorecards/[id]` | * | Admin+ | ✅ | org_id check | N/A | TODO |
| `/api/scorecards/active` | GET | Auth | ✅ | org_id filter | N/A | TODO |
| `/api/scripts` | * | Auth/Admin+ | ✅ | org_id filter | N/A | TODO |
| `/api/insight-templates` | * | Auth/Admin+ | ✅ | org_id filter | N/A | TODO |

### 2.6 Demo Data APIs
| Endpoint | Method | Auth | Rate Limit | Enabled Check | Test File | Status |
|----------|--------|------|------------|---------------|-----------|--------|
| `/api/demo-data/generate` | POST | Admin+ | ✅ | DEMO_DATA_ENABLED | N/A | TODO |
| `/api/demo-data/delete` | DELETE | Admin+ | ✅ | DEMO_DATA_ENABLED | N/A | TODO |
| `/api/demo-data/status` | GET | Admin+ | ✅ | DEMO_DATA_ENABLED | N/A | TODO |

### 2.7 Admin APIs
| Endpoint | Method | Auth | Rate Limit | Superadmin Check | Test File | Status |
|----------|--------|------|------------|------------------|-----------|--------|
| `/api/admin/organizations` | GET | Superadmin | ✅ | ✅ | N/A | NEW |

### 2.8 Webhook APIs
| Endpoint | Method | Auth | Rate Limit | Signature Check | Test File | Status |
|----------|--------|------|------------|-----------------|-----------|--------|
| `/api/webhook/[orgSlug]` | GET | None | TODO | N/A | N/A | TODO |
| `/api/webhook/[orgSlug]` | POST | Webhook | TODO | HMAC/Bearer | N/A | TODO |

---

## 3. DATABASE TEST MATRIX

### 3.1 Table Constraint Tests
| Table | FK Tests | Unique Tests | NotNull Tests | Enum Tests | Test File | Status |
|-------|----------|--------------|---------------|------------|-----------|--------|
| organizations | ✅ | slug | name, slug | plan_type | `constraint-tests.ts` | Ready |
| users | org_id | email | org_id, role | user_role | `constraint-tests.ts` | Ready |
| callers | org_id, user_id | - | org_id, name | - | `constraint-tests.ts` | Ready |
| calls | org_id, caller_id | external_id | org_id, raw_notes | status, source | `constraint-tests.ts` | Ready |
| analyses | call_id | - | call_id | - | `constraint-tests.ts` | Ready |
| reports | call_id, analysis_id | - | call_id | status | `constraint-tests.ts` | Ready |
| grading_templates | org_id | - | org_id, name | - | `constraint-tests.ts` | Ready |
| scorecards | org_id, script_id | - | org_id, name | status | N/A | TODO |
| scripts | org_id | - | org_id, name | status | N/A | TODO |
| insight_templates | org_id | - | org_id, name | - | N/A | TODO |
| invitations | org_id, invited_by | token | org_id, token | role | `constraint-tests.ts` | Ready |
| audit_logs | org_id, user_id | - | org_id, action | - | N/A | TODO |
| webhook_logs | org_id | - | org_id | - | N/A | TODO |
| processing_queue | org_id, call_id | - | org_id, call_id | status | N/A | TODO |
| call_score_results | call_id, scorecard_id | - | call_id | - | N/A | TODO |

### 3.2 Cascade Delete Tests
| Parent Table | Child Table | Expected Behavior | Test File | Status |
|--------------|-------------|-------------------|-----------|--------|
| organizations | users | CASCADE | `constraint-tests.ts` | Ready |
| organizations | callers | CASCADE | `constraint-tests.ts` | Ready |
| organizations | calls | CASCADE | N/A | TODO |
| callers | calls | SET NULL | N/A | TODO |
| calls | analyses | CASCADE | N/A | TODO |
| calls | reports | CASCADE | N/A | TODO |

---

## 4. RLS POLICY TEST MATRIX

### 4.1 Cross-Tenant Isolation Tests
| Table | SELECT | INSERT | UPDATE | DELETE | Test File | Status |
|-------|--------|--------|--------|--------|-----------|--------|
| organizations | ✅ | ✅ | ✅ | ✅ | `rls-attack-tests.ts` | Ready |
| users | ✅ | ✅ | ✅ | ✅ | `rls-attack-tests.ts` | Ready |
| callers | ✅ | ✅ | ✅ | ✅ | `rls-attack-tests.ts` | Ready |
| calls | ✅ | ✅ | ✅ | ✅ | `rls-attack-tests.ts` | Ready |
| analyses | ✅ | N/A | N/A | N/A | `rls-attack-tests.ts` | Ready |
| reports | ✅ | N/A | N/A | N/A | `rls-attack-tests.ts` | Ready |
| grading_templates | ✅ | ✅ | ✅ | ✅ | `rls-attack-tests.ts` | Ready |
| scorecards | ✅ | ✅ | ✅ | ✅ | `comprehensive-rls-tests.ts` | Ready |
| scripts | ✅ | ✅ | ✅ | ✅ | N/A | TODO |
| insight_templates | ✅ | ✅ | ✅ | ✅ | N/A | TODO |
| webhook_logs | ✅ | N/A | N/A | N/A | `rls-attack-tests.ts` | Ready |
| audit_logs | ✅ | N/A | N/A | N/A | `rls-attack-tests.ts` | Ready |

### 4.2 Role-Based Access Tests
| Operation | Caller | Admin | Superadmin | Test File | Status |
|-----------|--------|-------|------------|-----------|--------|
| View own calls | ✅ | ✅ | ✅ | `rls-attack-tests.ts` | Ready |
| View all org calls | ❌ | ✅ | ✅ | `rls-attack-tests.ts` | Ready |
| Create calls | ❌ | ✅ | ✅ | `rls-attack-tests.ts` | Ready |
| Update calls | ❌ | ✅ | ✅ | `rls-attack-tests.ts` | Ready |
| Delete calls | ❌ | ✅ | ✅ | `rls-attack-tests.ts` | Ready |
| Manage templates | ❌ | ✅ | ✅ | `rls-attack-tests.ts` | Ready |
| View admin pages | ❌ | ❌ | ✅ | N/A | TODO |

### 4.3 Superadmin Override Tests
| Table | Can access all orgs | Test File | Status |
|-------|---------------------|-----------|--------|
| organizations | ✅ | N/A | TODO |
| users | ✅ | N/A | TODO |
| calls | ✅ | N/A | TODO |

---

## 5. SECURITY TEST MATRIX

### 5.1 Authentication Tests
| Test | Expected Result | Test File | Status |
|------|-----------------|-----------|--------|
| Access protected route without auth | Redirect to login | E2E tests | Ready |
| Access admin route as caller | Redirect to dashboard | N/A | TODO |
| Access superadmin route as admin | Redirect to dashboard | N/A | TODO |
| JWT tampering | Auth failure | N/A | TODO |
| Session expiration | Force re-login | N/A | TODO |

### 5.2 Input Validation Tests
| Endpoint | XSS Prevention | SQL Injection | Input Sanitization | Test File | Status |
|----------|---------------|---------------|-------------------|-----------|--------|
| `/api/calls` | ✅ | ✅ | ✅ | N/A | TODO |
| `/api/callers` | ✅ | ✅ | ✅ | N/A | TODO |
| `/api/webhook/[orgSlug]` | ✅ | ✅ | ✅ | N/A | TODO |

### 5.3 Rate Limiting Tests
| Endpoint | Limit | Window | Test File | Status |
|----------|-------|--------|-----------|--------|
| `/api/auth/register` | 5 | 15 min | N/A | TODO |
| `/api/calls` | 100 | 1 min | N/A | TODO |
| `/api/webhook/[orgSlug]` | 60 | 1 min | N/A | MISSING |

---

## 6. AI PIPELINE TEST MATRIX

| Test | Expected Result | Test File | Status |
|------|-----------------|-----------|--------|
| Analysis with valid call | Success + scores | `ai-pipeline-tests.ts` | Ready |
| Analysis with empty notes | Graceful handling | `ai-pipeline-tests.ts` | Ready |
| Analysis with special chars | Proper escaping | `ai-pipeline-tests.ts` | Ready |
| Analysis with long content | Truncation/handling | `ai-pipeline-tests.ts` | Ready |
| Queue processing | Status updates | `ai-pipeline-tests.ts` | Ready |
| Retry on failure | Exponential backoff | `ai-pipeline-tests.ts` | Ready |

---

## 7. TEST COVERAGE SUMMARY

| Category | Total Tests | Implemented | Coverage |
|----------|-------------|-------------|----------|
| UI Routes | 18 | 6 | 33% |
| API Routes | 27 | 12 | 44% |
| DB Constraints | 19 tables | 8 | 42% |
| RLS Policies | 14 tables | 10 | 71% |
| Security | 15 | 3 | 20% |
| AI Pipeline | 6 | 6 | 100% |

**Overall Estimated Coverage: 52%**

---

## 8. PRIORITY TESTS TO ADD

### P0 - Blocker (Must have before production)
1. ✅ Admin organizations API tests (route created)
2. Webhook rate limiting tests
3. Superadmin access control tests
4. Cross-tenant data isolation for new tables (scripts, scorecards, insight_templates)

### P1 - High Priority
1. Demo data API tests
2. Scorecard API tests
3. File upload validation tests
4. Input sanitization tests for all endpoints

### P2 - Medium Priority
1. E2E tests for new pages (scorecard builder, team, analytics)
2. Registration flow E2E test
3. Webhook signature verification tests

### P3 - Nice to Have
1. Performance tests
2. Stress tests
3. Browser compatibility tests

---

**Next Steps:**
1. Run existing test suite: `npx tsx tests/run-all-tests.ts --seed`
2. Add missing P0 tests
3. Run full audit and fix issues
4. Generate final report
