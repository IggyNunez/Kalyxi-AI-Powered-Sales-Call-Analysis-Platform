/**
 * Kalyxi AI - Deterministic Test Data Seed Script
 *
 * Creates test data for all scenarios:
 * - 3 organizations (small, medium, enterprise)
 * - Users with different roles per org
 * - Callers with varying performance
 * - Calls across all statuses
 * - Analyses with different scores
 * - Edge cases (long transcripts, special characters)
 *
 * Usage: npx tsx scripts/seed-test-data.ts
 * Reset: npx tsx scripts/seed-test-data.ts --reset
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Deterministic seed for reproducibility
const SEED = 12345;
let seedCounter = SEED;

function seededRandom(): number {
  seedCounter = (seedCounter * 9301 + 49297) % 233280;
  return seedCounter / 233280;
}

function randomInt(min: number, max: number): number {
  return Math.floor(seededRandom() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(seededRandom() * arr.length)];
}

function randomDate(daysBack: number): Date {
  const now = new Date();
  const daysAgo = randomInt(0, daysBack);
  return new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
}

// Environment setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Test data definitions
const ORGS = [
  { name: "Acme Small Co", slug: "acme-small", plan: "starter", callerCount: 3, callsPerCaller: 5 },
  { name: "TechMed Solutions", slug: "techmed", plan: "professional", callerCount: 8, callsPerCaller: 15 },
  { name: "Global Enterprise Inc", slug: "global-enterprise", plan: "enterprise", callerCount: 20, callsPerCaller: 50 },
];

const FIRST_NAMES = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Quinn", "Avery", "Cameron", "Drew"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Martinez", "Wilson"];
const COMPANIES = ["Acme Corp", "TechStart Inc", "Global Solutions", "Innovate LLC", "Prime Services", "NextGen Co"];
const TEAMS = ["Sales Team Alpha", "Enterprise Sales", "SMB Team", "Outbound", "Inbound"];

const CALL_NOTES_TEMPLATES = [
  `Sales Representative: Good morning, this is {caller} from {company}. Am I speaking with {customer}?

Customer: Yes, this is {customer}. What can I do for you?

Sales Rep: Great! I'm reaching out because we noticed your company has been growing rapidly, and I wanted to share how our solution has helped similar businesses increase their efficiency by 40%.

Customer: I'm actually quite busy right now. Can you make it quick?

Sales Rep: Absolutely, I respect your time. In just 30 seconds - we offer a platform that automates your workflow processes. Companies like yours typically save 10+ hours per week. Would it be worth a brief 15-minute call next week to explore if we could help you achieve similar results?

Customer: That does sound interesting. What's the cost?

Sales Rep: Great question! Our pricing is based on your specific needs, but most companies our size invest between $500-2000 per month. The ROI typically shows within the first month. How about I send you some case studies and we schedule a call to discuss your specific situation?

Customer: Alright, send me the information and let's talk next Tuesday.

Sales Rep: Perfect! I'll email you the details right away and send a calendar invite for Tuesday at 10 AM. Does that work?

Customer: Yes, that works.

Sales Rep: Excellent! Thank you for your time, {customer}. Looking forward to speaking with you Tuesday!`,

  `Rep: Hi, this is {caller} calling from {company}. I'm trying to reach the person responsible for your IT decisions.

Gatekeeper: That would be our CTO. May I ask what this is regarding?

Rep: Of course! We specialize in helping companies reduce their cloud infrastructure costs by 30-50%. I wanted to share some insights that might be valuable for your team.

Gatekeeper: He's in meetings all day. Can you send an email?

Rep: I'd be happy to! However, I find that a brief conversation is usually more valuable. When might be a better time to reach him directly?

Gatekeeper: Try calling back Thursday afternoon.

Rep: Thursday afternoon works. Would 2 PM or 4 PM be better?

Gatekeeper: 2 PM should be fine.

Rep: Perfect. Could I get your name so I can mention you referred me?

Gatekeeper: It's Sarah.

Rep: Thank you, Sarah! I'll call back Thursday at 2 PM. Have a great day!`,

  `Agent: Hello {customer}, this is {caller} from {company}. How are you doing today?

Customer: I'm doing well, thanks. I'm not interested in buying anything though.

Agent: I completely understand, and I'm not here to sell you anything today. I'm actually conducting a brief market research survey about challenges businesses face with their current software solutions. Would you have 2 minutes to share your thoughts?

Customer: Well... I suppose I have a couple minutes.

Agent: Thank you! First question: On a scale of 1-10, how satisfied are you with your current CRM system?

Customer: I'd say about a 6. It works, but there are definitely frustrations.

Agent: That's helpful to know. What would you say is the biggest frustration?

Customer: Honestly, the reporting is terrible. Takes forever to pull any meaningful data.

Agent: That's a common pain point we hear. If there was a solution that could generate reports in real-time, would that be something worth exploring?

Customer: Possibly. But I've looked at alternatives before and the migration is always a nightmare.

Agent: That's a valid concern. What if I told you we've developed a migration process that typically takes less than a week with zero downtime?

Customer: That would definitely change things. Tell me more about that.

Agent: I'd love to! Let me schedule a 20-minute demo where our specialist can walk you through the process. What does your Wednesday look like?`,
];

const EDGE_CASE_NOTES = [
  // Very long transcript
  "A".repeat(40000) + " This is a very long transcript for testing purposes. " + "B".repeat(5000),
  // Special characters
  "Customer said: \"I don't think it's worth $1,000\" and the rep replied: 'Let me explain the value...' <script>alert('xss')</script> & more text",
  // Unicode
  "The customer from Japan (日本) said: ありがとうございます. The price is 10,000\u00A5.",
  // Empty-ish
  "Short call. Customer hung up.",
  // Numbers heavy
  "Deal size: $50,000. Timeline: Q3 2026. Budget: $75,000. Decision makers: 3. Competitors: 2.",
];

interface CreatedData {
  orgs: Array<{ id: string; name: string; slug: string }>;
  users: Array<{ id: string; email: string; org_id: string; role: string }>;
  callers: Array<{ id: string; name: string; org_id: string }>;
  calls: Array<{ id: string; caller_id: string; org_id: string; status: string }>;
}

async function resetData() {
  console.log("Resetting test data...\n");

  // Delete in order to respect foreign keys
  const tables = [
    "reports",
    "analyses",
    "processing_queue",
    "webhook_logs",
    "audit_logs",
    "invitations",
    "api_keys",
    "calls",
    "callers",
    "scorecard_configs",
    "grading_templates",
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      console.log(`Warning: Could not clear ${table}: ${error.message}`);
    } else {
      console.log(`Cleared ${table}`);
    }
  }

  // Delete users (must delete auth users first)
  const { data: users } = await supabase.from("users").select("id");
  if (users) {
    for (const user of users) {
      await supabase.auth.admin.deleteUser(user.id);
    }
    console.log(`Deleted ${users.length} auth users`);
  }

  // Delete test organizations (keep production data safe by filtering on test slugs)
  const testSlugs = ORGS.map(o => o.slug);
  const { error: orgError } = await supabase
    .from("organizations")
    .delete()
    .in("slug", testSlugs);

  if (orgError) {
    console.log(`Warning: Could not clear organizations: ${orgError.message}`);
  } else {
    console.log("Cleared test organizations");
  }

  console.log("\nReset complete!");
}

async function seedData(): Promise<CreatedData> {
  const created: CreatedData = { orgs: [], users: [], callers: [], calls: [] };

  console.log("Seeding test data...\n");
  console.log("=" .repeat(50));

  for (const orgDef of ORGS) {
    console.log(`\nCreating organization: ${orgDef.name}`);
    console.log("-".repeat(40));

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: orgDef.name,
        slug: orgDef.slug,
        plan: orgDef.plan,
        settings_json: {
          branding: { primaryColor: "#8B5CF6", companyName: orgDef.name },
          timezone: "America/New_York",
          notifications: {
            emailOnNewCall: true,
            emailOnLowScore: true,
            lowScoreThreshold: 60,
            dailyDigest: true,
          },
          ai: { model: "gpt-4o", temperature: 0.3 },
          features: {
            gatekeeperDetection: true,
            autoAnalyze: true,
            competitorTracking: true,
          },
        },
      })
      .select()
      .single();

    if (orgError) {
      console.error(`Failed to create org ${orgDef.name}:`, orgError);
      continue;
    }

    created.orgs.push({ id: org.id, name: org.name, slug: org.slug });
    console.log(`  Created org: ${org.id}`);

    // Create users for this org
    const userRoles: Array<{ role: string; count: number }> = [
      { role: "admin", count: 1 },
      { role: "superadmin", count: orgDef.name.includes("Enterprise") ? 1 : 0 },
      { role: "caller", count: Math.max(1, orgDef.callerCount - 1) },
    ];

    for (const { role, count } of userRoles) {
      for (let i = 0; i < count; i++) {
        const email = `${role}${i + 1}@${orgDef.slug}.test`;
        const name = `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`;

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password: "TestPassword123!",
          email_confirm: true,
        });

        if (authError) {
          console.error(`  Failed to create auth user ${email}:`, authError.message);
          continue;
        }

        // Create user profile
        const { error: userError } = await supabase.from("users").insert({
          id: authData.user.id,
          org_id: org.id,
          email,
          name,
          role,
          is_active: true,
        });

        if (userError) {
          console.error(`  Failed to create user profile ${email}:`, userError.message);
          await supabase.auth.admin.deleteUser(authData.user.id);
          continue;
        }

        created.users.push({ id: authData.user.id, email, org_id: org.id, role });
        console.log(`  Created ${role}: ${email}`);
      }
    }

    // Create callers for this org
    for (let i = 0; i < orgDef.callerCount; i++) {
      const name = `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`;
      const email = `caller${i + 1}@${orgDef.slug}.test`;
      const team = randomChoice(TEAMS);

      // Find matching user if exists
      const matchingUser = created.users.find(
        u => u.org_id === org.id && u.email === email
      );

      const { data: caller, error: callerError } = await supabase
        .from("callers")
        .insert({
          org_id: org.id,
          user_id: matchingUser?.id || null,
          name,
          email,
          team,
          department: "Sales",
          is_active: seededRandom() > 0.1, // 90% active
          metadata: { hire_date: randomDate(365).toISOString() },
        })
        .select()
        .single();

      if (callerError) {
        console.error(`  Failed to create caller ${name}:`, callerError.message);
        continue;
      }

      created.callers.push({ id: caller.id, name: caller.name, org_id: org.id });
    }

    console.log(`  Created ${orgDef.callerCount} callers`);

    // Create calls for each caller
    const orgCallers = created.callers.filter(c => c.org_id === org.id);
    const statuses = ["pending", "processing", "analyzed", "failed"];

    for (const caller of orgCallers) {
      const callCount = orgDef.callsPerCaller + randomInt(-2, 2);

      for (let i = 0; i < callCount; i++) {
        const status = randomChoice(statuses);
        const template = randomChoice(CALL_NOTES_TEMPLATES);
        const customerName = `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`;
        const customerCompany = randomChoice(COMPANIES);

        const rawNotes = template
          .replace(/{caller}/g, caller.name)
          .replace(/{customer}/g, customerName)
          .replace(/{company}/g, customerCompany);

        const { data: call, error: callError } = await supabase
          .from("calls")
          .insert({
            org_id: org.id,
            caller_id: caller.id,
            raw_notes: rawNotes,
            source: randomChoice(["manual", "webhook", "api"]),
            status,
            customer_name: customerName,
            customer_company: customerCompany,
            customer_email: `${customerName.toLowerCase().replace(" ", ".")}@${customerCompany.toLowerCase().replace(" ", "")}.com`,
            duration: randomInt(120, 1800),
            call_timestamp: randomDate(90).toISOString(),
            metadata: { campaign: `Campaign ${randomInt(1, 5)}` },
          })
          .select()
          .single();

        if (callError) {
          console.error(`  Failed to create call:`, callError.message);
          continue;
        }

        created.calls.push({ id: call.id, caller_id: caller.id, org_id: org.id, status });

        // Create analysis for analyzed calls
        if (status === "analyzed") {
          const overallScore = randomInt(40, 98);
          const compositeScore = overallScore + randomInt(-5, 5);

          await supabase.from("analyses").insert({
            call_id: call.id,
            ai_model: "gpt-4o",
            grading_results_json: {
              overallScore,
              compositeScore,
              strengths: ["Good rapport building", "Clear value proposition"],
              improvements: ["Ask more discovery questions", "Better objection handling"],
              executiveSummary: `Call with ${customerName} from ${customerCompany}. ${overallScore > 70 ? "Strong" : "Needs improvement"} performance overall.`,
              actionItems: ["Send follow-up email", "Schedule demo"],
              objections: [
                { objection: "Price concern", response: "Explained ROI", effectiveness: randomInt(5, 10) },
              ],
              gatekeeperDetected: seededRandom() > 0.7,
              competitorMentions: seededRandom() > 0.5 ? ["Competitor A"] : [],
              sentiment: {
                overall: overallScore > 70 ? "positive" : overallScore > 50 ? "neutral" : "negative",
                score: (overallScore - 50) / 50,
                progression: [],
              },
              callMetrics: {
                talkRatio: seededRandom() * 0.3 + 0.3,
                questionCount: randomInt(3, 12),
                interruptionCount: randomInt(0, 3),
                silenceDuration: randomInt(5, 30),
              },
              recommendations: ["Practice active listening", "Use more open-ended questions"],
              gradingResults: [
                { criterionId: "objection_handling", criterionName: "Objection Handling", type: "score", value: randomInt(5, 10), score: randomInt(60, 95), feedback: "Good effort" },
                { criterionId: "value_proposition", criterionName: "Value Proposition", type: "score", value: randomInt(5, 10), score: randomInt(60, 95), feedback: "Clear presentation" },
              ],
            },
            overall_score: overallScore,
            composite_score: compositeScore,
            processing_time_ms: randomInt(2000, 8000),
            token_usage: { prompt: randomInt(500, 2000), completion: randomInt(300, 1000), total: randomInt(800, 3000) },
          });

          // Create report
          await supabase.from("reports").insert({
            call_id: call.id,
            analysis_id: call.id, // Simplified - in real app would be the actual analysis ID
            report_json: {
              version: "1.0",
              generatedAt: new Date().toISOString(),
              callSummary: { title: `Call Analysis`, date: call.call_timestamp, callerName: caller.name },
              analysis: { overallScore, compositeScore },
              scorecard: { finalScore: compositeScore, passed: compositeScore >= 70 },
              coaching: { topStrengths: [], priorityImprovements: [], actionPlan: [] },
            },
            status: "ready",
          });
        }
      }
    }

    const orgCalls = created.calls.filter(c => c.org_id === org.id);
    console.log(`  Created ${orgCalls.length} calls (${orgCalls.filter(c => c.status === "analyzed").length} analyzed)`);
  }

  // Create edge case calls in the first org
  const firstOrg = created.orgs[0];
  const firstCaller = created.callers.find(c => c.org_id === firstOrg?.id);

  if (firstOrg && firstCaller) {
    console.log("\nCreating edge case calls...");

    for (const [i, notes] of EDGE_CASE_NOTES.entries()) {
      const { data: call, error } = await supabase
        .from("calls")
        .insert({
          org_id: firstOrg.id,
          caller_id: firstCaller.id,
          raw_notes: notes,
          source: "manual",
          status: "pending",
          customer_name: `Edge Case ${i + 1}`,
          customer_company: "Test Corp",
          call_timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (!error && call) {
        created.calls.push({ id: call.id, caller_id: firstCaller.id, org_id: firstOrg.id, status: "pending" });
        console.log(`  Created edge case call ${i + 1}`);
      }
    }
  }

  return created;
}

async function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes("--reset");

  if (shouldReset) {
    await resetData();
    return;
  }

  // Reset first, then seed
  await resetData();
  const created = await seedData();

  console.log("\n" + "=".repeat(50));
  console.log("SEED COMPLETE");
  console.log("=".repeat(50));
  console.log(`Organizations: ${created.orgs.length}`);
  console.log(`Users: ${created.users.length}`);
  console.log(`Callers: ${created.callers.length}`);
  console.log(`Calls: ${created.calls.length}`);

  console.log("\nTest Credentials:");
  console.log("-".repeat(40));
  for (const org of created.orgs) {
    const admin = created.users.find(u => u.org_id === org.id && u.role === "admin");
    if (admin) {
      console.log(`${org.name}:`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Password: TestPassword123!`);
    }
  }

  console.log("\n Run `npm run test:rls` to verify RLS policies.");
}

main().catch(console.error);
