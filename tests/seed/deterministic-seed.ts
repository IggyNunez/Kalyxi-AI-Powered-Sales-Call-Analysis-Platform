/**
 * Kalyxi AI - Deterministic Test Data Seeding
 *
 * Creates reproducible test data with known IDs for testing.
 * All IDs are deterministic based on a seed value.
 *
 * Run: npx tsx tests/seed/deterministic-seed.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "../config";
import crypto from "crypto";

// Admin client (bypasses RLS)
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Deterministic UUID generator
function deterministicUUID(namespace: string, index: number): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${config.seed}-${namespace}-${index}`)
    .digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "4" + hash.slice(13, 16),
    "8" + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-");
}

// Test data definitions
export const testData = {
  organizations: [
    {
      id: deterministicUUID("org", 1),
      name: "Acme Sales Testing",
      slug: config.org1Slug,
      plan: "professional",
      settings_json: {
        branding: { primaryColor: "#4F46E5", companyName: "Acme Sales" },
        timezone: "America/New_York",
        notifications: { emailOnNewCall: true, emailOnLowScore: true, lowScoreThreshold: 50 },
        ai: { model: "gpt-4o", temperature: 0.3 },
        features: { gatekeeperDetection: true, autoAnalyze: true, competitorTracking: true },
      },
    },
    {
      id: deterministicUUID("org", 2),
      name: "Beta Corp Testing",
      slug: config.org2Slug,
      plan: "starter",
      settings_json: {
        branding: { primaryColor: "#10B981", companyName: "Beta Corp" },
        timezone: "America/Los_Angeles",
        features: { autoAnalyze: true },
      },
    },
    {
      id: deterministicUUID("org", 3),
      name: "Gamma Inc Testing",
      slug: config.org3Slug,
      plan: "free",
      settings_json: {
        branding: { companyName: "Gamma Inc" },
        features: { autoAnalyze: false },
      },
    },
  ],

  users: [
    // Org 1 users
    {
      id: deterministicUUID("user", 1),
      org_index: 0,
      email: "admin1@acme-testing.com",
      name: "Alice Admin",
      role: "admin",
    },
    {
      id: deterministicUUID("user", 2),
      org_index: 0,
      email: "caller1@acme-testing.com",
      name: "Bob Caller",
      role: "caller",
    },
    {
      id: deterministicUUID("user", 3),
      org_index: 0,
      email: "caller2@acme-testing.com",
      name: "Charlie Caller",
      role: "caller",
    },
    // Org 2 users
    {
      id: deterministicUUID("user", 4),
      org_index: 1,
      email: "admin2@beta-testing.com",
      name: "Diana Admin",
      role: "admin",
    },
    {
      id: deterministicUUID("user", 5),
      org_index: 1,
      email: "caller3@beta-testing.com",
      name: "Eve Caller",
      role: "caller",
    },
    // Org 3 users
    {
      id: deterministicUUID("user", 6),
      org_index: 2,
      email: "admin3@gamma-testing.com",
      name: "Frank Admin",
      role: "admin",
    },
  ],

  callers: [
    // Org 1 callers
    {
      id: deterministicUUID("caller", 1),
      org_index: 0,
      user_index: 1, // Bob Caller
      name: "Bob Caller",
      email: "caller1@acme-testing.com",
      team: "Team Alpha",
      department: "Sales",
    },
    {
      id: deterministicUUID("caller", 2),
      org_index: 0,
      user_index: 2, // Charlie Caller
      name: "Charlie Caller",
      email: "caller2@acme-testing.com",
      team: "Team Beta",
      department: "Sales",
    },
    {
      id: deterministicUUID("caller", 3),
      org_index: 0,
      user_index: null, // No linked user
      name: "External Rep 1",
      email: "external1@acme-testing.com",
      team: "Team Alpha",
    },
    // Org 2 callers
    {
      id: deterministicUUID("caller", 4),
      org_index: 1,
      user_index: 4, // Eve Caller
      name: "Eve Caller",
      email: "caller3@beta-testing.com",
      team: "Main Team",
    },
    {
      id: deterministicUUID("caller", 5),
      org_index: 1,
      user_index: null,
      name: "External Rep 2",
      email: "external2@beta-testing.com",
    },
    // Org 3 callers
    {
      id: deterministicUUID("caller", 6),
      org_index: 2,
      user_index: null,
      name: "Gamma Rep",
      email: "rep@gamma-testing.com",
    },
  ],

  calls: [
    // Org 1 calls
    {
      id: deterministicUUID("call", 1),
      org_index: 0,
      caller_index: 0,
      raw_notes: `Sales Call - Introduction and Discovery

I called John Smith at TechCorp today to discuss their CRM needs.

Opening:
"Hi John, this is Bob from Acme Sales. How are you doing today? I'm reaching out because I noticed TechCorp recently expanded to 3 new offices and wanted to see if you're facing any challenges with your current sales tracking system."

John mentioned they're currently using spreadsheets and it's becoming a nightmare.

Value Proposition:
"I completely understand. Many companies in your situation find that they're losing about 20% of potential sales due to poor follow-up tracking. Our platform helps teams like yours increase close rates by 35% on average."

He seemed interested but mentioned budget concerns.

Objection Handling:
"That's a very valid concern. What I've found is that the ROI typically pays for itself within 3 months. Would it be helpful if I shared a case study from a similar company?"

He agreed to a follow-up demo next week.

Next Steps:
- Demo scheduled for Thursday 2pm
- Send case study via email
- Prepare custom pricing proposal`,
      status: "analyzed",
      customer_name: "John Smith",
      customer_company: "TechCorp",
      customer_email: "john@techcorp.com",
      duration: 1200,
    },
    {
      id: deterministicUUID("call", 2),
      org_index: 0,
      caller_index: 0,
      raw_notes: `Cold call to Sarah at StartupXYZ

Call did not go well. Sarah was clearly busy and not interested.

Opening was weak - didn't establish rapport.

Sarah: "I'm in a meeting, can you call back?"
Me: "This will only take 30 seconds..."
Sarah: "I really can't talk right now."
Me: "Okay, when would be a good time?"
Sarah: "Just email me." *hangs up*

Notes:
- Should have respected her time
- Need to ask if it's a good time first
- Follow up with email but don't expect response`,
      status: "analyzed",
      customer_name: "Sarah Chen",
      customer_company: "StartupXYZ",
      duration: 45,
    },
    {
      id: deterministicUUID("call", 3),
      org_index: 0,
      caller_index: 1,
      raw_notes: `Product demo follow-up with Mike from RetailPlus

Mike had seen the demo last week and had some questions.

Q: "Can it integrate with our existing POS system?"
A: "Absolutely. We have native integrations with all major POS systems including the one you mentioned. The setup typically takes about 2 hours."

Q: "What about training for our team?"
A: "We provide comprehensive onboarding including video tutorials, live training sessions, and dedicated support for the first month."

Mike seemed satisfied with the answers. He mentioned they're comparing us to two competitors.

Asked about decision timeline:
"We're aiming to make a decision by end of month. I need to present to our CFO next week."

Offered to provide ROI calculator and competitive comparison sheet.

Action items:
- Send ROI calculator
- Prepare competitive analysis
- Schedule follow-up for after CFO meeting`,
      status: "pending",
      customer_name: "Mike Johnson",
      customer_company: "RetailPlus",
      customer_phone: "+1-555-0123",
      duration: 1800,
    },
    // Org 2 calls
    {
      id: deterministicUUID("call", 4),
      org_index: 1,
      caller_index: 3,
      raw_notes: `Initial call with Lisa from HealthTech Solutions

Great conversation! Lisa is the VP of Sales looking for a better way to track her team's performance.

Key pain points:
- No visibility into call quality
- Reps not following the script
- High turnover and training costs

I explained how our AI analysis can:
1. Automatically score calls
2. Identify coaching opportunities
3. Track script adherence

She was very enthusiastic and wants to set up a pilot program.

Next steps:
- Send pilot proposal
- Schedule technical review with their IT team
- Plan for 2-week pilot with 5 reps`,
      status: "analyzed",
      customer_name: "Lisa Wang",
      customer_company: "HealthTech Solutions",
      customer_email: "lisa@healthtech.com",
      duration: 2100,
    },
    {
      id: deterministicUUID("call", 5),
      org_index: 1,
      caller_index: 4,
      raw_notes: `Gatekeeper call - could not reach decision maker

Receptionist: "XYZ Company, how may I direct your call?"
Me: "Hi, I'm trying to reach the head of sales. Is that James Parker?"
Receptionist: "Mr. Parker is not available. Would you like to leave a message?"
Me: "Sure, could you let him know that Eve from Beta Corp called regarding sales performance solutions? My number is..."

Need to try again tomorrow morning.`,
      status: "pending",
      customer_company: "XYZ Company",
      duration: 120,
    },
    // Org 3 call
    {
      id: deterministicUUID("call", 6),
      org_index: 2,
      caller_index: 5,
      raw_notes: `Brief introductory call with potential lead from trade show.

Met briefly at the convention. Following up on their interest.

They're a small business with 3 sales reps. Current using nothing but email.

Seemed interested but very price sensitive. Will need to emphasize ROI.

Scheduled callback for next week when owner is available.`,
      status: "pending",
      customer_name: "Trade Show Lead",
      duration: 300,
    },
  ],

  analyses: [
    {
      id: deterministicUUID("analysis", 1),
      call_index: 0,
      ai_model: "gpt-4o",
      overall_score: 85,
      composite_score: 82,
      grading_results_json: {
        strengths: [
          "Excellent rapport building",
          "Strong value proposition delivery",
          "Effective objection handling with case study offer",
          "Clear next steps established",
        ],
        improvements: [
          "Could have asked more discovery questions",
          "Budget objection could have been probed deeper",
        ],
        scores: {
          opening: 9,
          discovery: 7,
          value_proposition: 9,
          objection_handling: 8,
          closing: 9,
          overall_professionalism: 9,
        },
        recommendations: [
          "Practice deeper discovery questioning",
          "Develop more budget justification talking points",
        ],
        gatekeeper_detected: false,
        appointment_set: true,
      },
      processing_time_ms: 2500,
      token_usage: { prompt: 1200, completion: 800, total: 2000 },
    },
    {
      id: deterministicUUID("analysis", 2),
      call_index: 1,
      ai_model: "gpt-4o",
      overall_score: 35,
      composite_score: 30,
      grading_results_json: {
        strengths: ["Attempted to schedule callback"],
        improvements: [
          "Did not ask if it was a good time",
          "Pushed too hard when customer was clearly busy",
          "No rapport building attempted",
          "Weak recovery when rebuffed",
        ],
        scores: {
          opening: 3,
          discovery: 2,
          value_proposition: 1,
          objection_handling: 4,
          closing: 4,
          overall_professionalism: 5,
        },
        recommendations: [
          "Always ask if it's a good time to talk",
          "Respect customer's time constraints",
          "Have a quick 10-second pitch ready for busy prospects",
          "Practice graceful exits that leave door open",
        ],
        gatekeeper_detected: false,
        appointment_set: false,
      },
      processing_time_ms: 1800,
      token_usage: { prompt: 800, completion: 600, total: 1400 },
    },
    {
      id: deterministicUUID("analysis", 3),
      call_index: 3,
      ai_model: "gpt-4o",
      overall_score: 92,
      composite_score: 90,
      grading_results_json: {
        strengths: [
          "Outstanding discovery of pain points",
          "Tailored solution presentation",
          "Created urgency with pilot program",
          "Enthusiastic customer engagement",
        ],
        improvements: ["Could have asked about budget earlier"],
        scores: {
          opening: 9,
          discovery: 10,
          value_proposition: 9,
          objection_handling: 9,
          closing: 10,
          overall_professionalism: 9,
        },
        recommendations: ["Ask about budget and timeline earlier in conversation"],
        gatekeeper_detected: false,
        appointment_set: true,
      },
      processing_time_ms: 2200,
      token_usage: { prompt: 1100, completion: 750, total: 1850 },
    },
  ],

  gradingTemplates: [
    {
      id: deterministicUUID("template", 1),
      org_index: 0,
      name: "Standard Sales Call Grading",
      description: "Default grading template for sales calls",
      is_default: true,
      criteria_json: [
        {
          id: "opening",
          name: "Opening",
          description: "Quality of call opening and rapport building",
          type: "score",
          weight: 15,
          isRequired: true,
          order: 1,
          minValue: 1,
          maxValue: 10,
        },
        {
          id: "discovery",
          name: "Discovery",
          description: "Effectiveness of discovery questions",
          type: "score",
          weight: 20,
          isRequired: true,
          order: 2,
          minValue: 1,
          maxValue: 10,
        },
        {
          id: "value_proposition",
          name: "Value Proposition",
          description: "Clarity and relevance of value proposition",
          type: "score",
          weight: 20,
          isRequired: true,
          order: 3,
          minValue: 1,
          maxValue: 10,
        },
        {
          id: "objection_handling",
          name: "Objection Handling",
          description: "Ability to address concerns and objections",
          type: "score",
          weight: 20,
          isRequired: true,
          order: 4,
          minValue: 1,
          maxValue: 10,
        },
        {
          id: "closing",
          name: "Closing",
          description: "Effectiveness of close attempt and next steps",
          type: "score",
          weight: 15,
          isRequired: true,
          order: 5,
          minValue: 1,
          maxValue: 10,
        },
        {
          id: "professionalism",
          name: "Professionalism",
          description: "Overall professionalism and communication",
          type: "score",
          weight: 10,
          isRequired: true,
          order: 6,
          minValue: 1,
          maxValue: 10,
        },
      ],
    },
    {
      id: deterministicUUID("template", 2),
      org_index: 1,
      name: "Beta Corp Template",
      description: "Custom template for Beta Corp",
      is_default: true,
      criteria_json: [
        {
          id: "engagement",
          name: "Customer Engagement",
          description: "Level of customer engagement achieved",
          type: "score",
          weight: 50,
          isRequired: true,
          order: 1,
          minValue: 1,
          maxValue: 10,
        },
        {
          id: "outcome",
          name: "Call Outcome",
          description: "Did the call achieve its objective",
          type: "boolean",
          weight: 50,
          isRequired: true,
          order: 2,
        },
      ],
    },
  ],

  scorecards: [
    {
      id: deterministicUUID("scorecard", 1),
      org_index: 0,
      name: "Standard Scorecard",
      description: "Default scorecard for evaluating calls",
      status: "active",
      is_default: true,
      total_weight: 100,
      criteria: [
        {
          id: "communication",
          name: "Communication Skills",
          description: "Clarity, tone, and effectiveness of communication",
          weight: 25,
          max_score: 10,
          scoring_guide: "1-3: Poor, 4-6: Average, 7-8: Good, 9-10: Excellent",
          order: 1,
        },
        {
          id: "product_knowledge",
          name: "Product Knowledge",
          description: "Demonstration of product/service expertise",
          weight: 25,
          max_score: 10,
          scoring_guide: "Evaluate accuracy and depth of product information shared",
          order: 2,
        },
        {
          id: "sales_technique",
          name: "Sales Technique",
          description: "Application of effective sales methodologies",
          weight: 30,
          max_score: 10,
          scoring_guide: "Consider discovery, qualification, and closing techniques",
          order: 3,
        },
        {
          id: "customer_focus",
          name: "Customer Focus",
          description: "Attention to customer needs and concerns",
          weight: 20,
          max_score: 10,
          scoring_guide: "How well did rep listen and respond to customer needs",
          order: 4,
        },
      ],
    },
  ],

  scripts: [
    {
      id: deterministicUUID("script", 1),
      org_index: 0,
      name: "Cold Call Script v1",
      description: "Standard cold calling script for outbound",
      status: "active",
      is_default: true,
      sections: [
        {
          id: "intro",
          name: "Introduction",
          content:
            "Hi [Name], this is [Your Name] from [Company]. How are you doing today?",
          tips: ["Be warm and friendly", "Smile while talking"],
          order: 1,
        },
        {
          id: "hook",
          name: "Hook",
          content:
            "I'm reaching out because [relevant reason]. I noticed that [observation about their company].",
          tips: ["Make it personalized", "Show you've done research"],
          order: 2,
        },
        {
          id: "value",
          name: "Value Statement",
          content:
            "We help companies like yours [benefit]. Our clients typically see [specific result].",
          tips: ["Use specific numbers", "Mention similar companies"],
          order: 3,
        },
        {
          id: "qualify",
          name: "Qualification",
          content: "Can I ask you a few quick questions to see if this might be a fit?",
          tips: ["Get permission", "Keep it brief"],
          order: 4,
        },
        {
          id: "close",
          name: "Close",
          content:
            "Based on what you've shared, I think a quick 15-minute call would be valuable. How does [day/time] look?",
          tips: ["Be specific with time", "Offer alternatives"],
          order: 5,
        },
      ],
    },
  ],

  insightTemplates: [
    {
      id: deterministicUUID("insight_template", 1),
      org_index: 0,
      name: "Coaching Insights",
      description: "Generate coaching recommendations from call analysis",
      category: "coaching",
      prompt_template:
        "Based on this call analysis, provide specific coaching recommendations for the sales rep. Focus on: 1) Communication skills, 2) Product knowledge gaps, 3) Closing techniques. Be constructive and actionable.",
      output_format: "bullets",
      max_insights: 5,
      is_active: true,
      is_default: true,
      display_order: 1,
    },
    {
      id: deterministicUUID("insight_template", 2),
      org_index: 0,
      name: "Performance Summary",
      description: "Quick performance summary for managers",
      category: "performance",
      prompt_template:
        "Summarize this call performance in 2-3 sentences highlighting the key strengths and one area for improvement.",
      output_format: "text",
      max_insights: 1,
      is_active: true,
      is_default: false,
      display_order: 2,
    },
  ],
};

// Export IDs for test reference
export const testIds = {
  org1: testData.organizations[0].id,
  org2: testData.organizations[1].id,
  org3: testData.organizations[2].id,
  admin1: testData.users[0].id,
  caller1: testData.users[1].id,
  caller2: testData.users[2].id,
  admin2: testData.users[3].id,
  caller3: testData.users[4].id,
  admin3: testData.users[5].id,
  callerRecord1: testData.callers[0].id,
  callerRecord2: testData.callers[1].id,
  callerRecord3: testData.callers[2].id,
  callerRecord4: testData.callers[3].id,
  call1: testData.calls[0].id,
  call2: testData.calls[1].id,
  call3: testData.calls[2].id,
  call4: testData.calls[3].id,
  call5: testData.calls[4].id,
  call6: testData.calls[5].id,
  analysis1: testData.analyses[0].id,
  analysis2: testData.analyses[1].id,
  analysis3: testData.analyses[2].id,
  template1: testData.gradingTemplates[0].id,
  template2: testData.gradingTemplates[1].id,
  scorecard1: testData.scorecards[0].id,
  script1: testData.scripts[0].id,
  insightTemplate1: testData.insightTemplates[0].id,
  insightTemplate2: testData.insightTemplates[1].id,
};

async function cleanupTestData() {
  console.log("Cleaning up existing test data...");

  // Delete in reverse order of dependencies
  const tables = [
    "processing_queue",
    "call_score_results",
    "reports",
    "analyses",
    "calls",
    "callers",
    "insight_templates",
    "scripts",
    "scorecards",
    "scorecard_configs",
    "grading_templates",
    "invitations",
    "api_keys",
    "audit_logs",
    "webhook_logs",
    "users",
    "organizations",
  ];

  for (const table of tables) {
    const slugs = [config.org1Slug, config.org2Slug, config.org3Slug];

    if (table === "organizations") {
      await supabase.from(table).delete().in("slug", slugs);
    } else if (table === "users") {
      // Get org IDs first
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id")
        .in("slug", slugs);
      if (orgs && orgs.length > 0) {
        await supabase
          .from(table)
          .delete()
          .in(
            "org_id",
            orgs.map((o) => o.id)
          );
      }
    }
  }

  // Also delete auth users with test emails
  const testEmails = testData.users.map((u) => u.email);
  for (const email of testEmails) {
    const { data: users } = await supabase.auth.admin.listUsers();
    const testUser = users?.users?.find((u) => u.email === email);
    if (testUser) {
      await supabase.auth.admin.deleteUser(testUser.id);
    }
  }

  console.log("Cleanup complete.");
}

async function seedOrganizations() {
  console.log("Seeding organizations...");

  for (const org of testData.organizations) {
    const { error } = await supabase.from("organizations").insert({
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      settings_json: org.settings_json,
      webhook_secret: `test_secret_${org.slug}`,
    });

    if (error) {
      console.error(`Failed to create org ${org.slug}:`, error.message);
      throw error;
    }
  }

  console.log(`Created ${testData.organizations.length} organizations`);
}

async function seedUsers() {
  console.log("Seeding users...");

  for (const user of testData.users) {
    const org = testData.organizations[user.org_index];

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: config.testPassword,
      email_confirm: true,
      user_metadata: { name: user.name },
    });

    if (authError) {
      console.error(`Failed to create auth user ${user.email}:`, authError.message);
      throw authError;
    }

    // Create user record with specific ID
    const { error: userError } = await supabase.from("users").insert({
      id: authUser.user.id,
      org_id: org.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: true,
    });

    if (userError) {
      console.error(`Failed to create user record ${user.email}:`, userError.message);
      throw userError;
    }

    // Store actual auth ID for reference
    (user as { authId?: string }).authId = authUser.user.id;
  }

  console.log(`Created ${testData.users.length} users`);
}

async function seedCallers() {
  console.log("Seeding callers...");

  for (const caller of testData.callers) {
    const org = testData.organizations[caller.org_index];
    const user =
      caller.user_index !== null
        ? (testData.users[caller.user_index] as { authId?: string })
        : null;

    const { error } = await supabase.from("callers").insert({
      id: caller.id,
      org_id: org.id,
      user_id: user?.authId || null,
      name: caller.name,
      email: caller.email,
      team: caller.team || null,
      department: caller.department || null,
      is_active: true,
    });

    if (error) {
      console.error(`Failed to create caller ${caller.name}:`, error.message);
      throw error;
    }
  }

  console.log(`Created ${testData.callers.length} callers`);
}

async function seedCalls() {
  console.log("Seeding calls...");

  for (const call of testData.calls) {
    const org = testData.organizations[call.org_index];
    const caller = testData.callers[call.caller_index];

    const { error } = await supabase.from("calls").insert({
      id: call.id,
      org_id: org.id,
      caller_id: caller.id,
      raw_notes: call.raw_notes,
      status: call.status,
      source: "manual",
      customer_name: call.customer_name || null,
      customer_company: call.customer_company || null,
      customer_phone: call.customer_phone || null,
      customer_email: call.customer_email || null,
      duration: call.duration,
      call_timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error(`Failed to create call ${call.id}:`, error.message);
      throw error;
    }
  }

  console.log(`Created ${testData.calls.length} calls`);
}

async function seedAnalyses() {
  console.log("Seeding analyses...");

  for (const analysis of testData.analyses) {
    const call = testData.calls[analysis.call_index];

    const { error } = await supabase.from("analyses").insert({
      id: analysis.id,
      call_id: call.id,
      ai_model: analysis.ai_model,
      overall_score: analysis.overall_score,
      composite_score: analysis.composite_score,
      grading_results_json: analysis.grading_results_json,
      processing_time_ms: analysis.processing_time_ms,
      token_usage: analysis.token_usage,
    });

    if (error) {
      console.error(`Failed to create analysis ${analysis.id}:`, error.message);
      throw error;
    }
  }

  console.log(`Created ${testData.analyses.length} analyses`);
}

async function seedGradingTemplates() {
  console.log("Seeding grading templates...");

  for (const template of testData.gradingTemplates) {
    const org = testData.organizations[template.org_index];

    const { error } = await supabase.from("grading_templates").insert({
      id: template.id,
      org_id: org.id,
      name: template.name,
      description: template.description,
      criteria_json: template.criteria_json,
      is_default: template.is_default,
      is_active: true,
    });

    if (error) {
      console.error(`Failed to create template ${template.name}:`, error.message);
      throw error;
    }
  }

  console.log(`Created ${testData.gradingTemplates.length} grading templates`);
}

async function seedScorecards() {
  console.log("Seeding scorecards...");

  for (const scorecard of testData.scorecards) {
    const org = testData.organizations[scorecard.org_index];
    const admin = testData.users.find(
      (u) => u.org_index === scorecard.org_index && u.role === "admin"
    ) as { authId?: string };

    const { error } = await supabase.from("scorecards").insert({
      id: scorecard.id,
      org_id: org.id,
      name: scorecard.name,
      description: scorecard.description,
      status: scorecard.status,
      is_default: scorecard.is_default,
      total_weight: scorecard.total_weight,
      criteria: scorecard.criteria,
      created_by: admin?.authId,
    });

    if (error) {
      console.error(`Failed to create scorecard ${scorecard.name}:`, error.message);
      throw error;
    }
  }

  console.log(`Created ${testData.scorecards.length} scorecards`);
}

async function seedScripts() {
  console.log("Seeding scripts...");

  for (const script of testData.scripts) {
    const org = testData.organizations[script.org_index];
    const admin = testData.users.find(
      (u) => u.org_index === script.org_index && u.role === "admin"
    ) as { authId?: string };

    const { error } = await supabase.from("scripts").insert({
      id: script.id,
      org_id: org.id,
      name: script.name,
      description: script.description,
      status: script.status,
      is_default: script.is_default,
      sections: script.sections,
      created_by: admin?.authId,
    });

    if (error) {
      console.error(`Failed to create script ${script.name}:`, error.message);
      throw error;
    }
  }

  console.log(`Created ${testData.scripts.length} scripts`);
}

async function seedInsightTemplates() {
  console.log("Seeding insight templates...");

  for (const template of testData.insightTemplates) {
    const org = testData.organizations[template.org_index];
    const admin = testData.users.find(
      (u) => u.org_index === template.org_index && u.role === "admin"
    ) as { authId?: string };

    const { error } = await supabase.from("insight_templates").insert({
      id: template.id,
      org_id: org.id,
      name: template.name,
      description: template.description,
      category: template.category,
      prompt_template: template.prompt_template,
      output_format: template.output_format,
      max_insights: template.max_insights,
      is_active: template.is_active,
      is_default: template.is_default,
      display_order: template.display_order,
      created_by: admin?.authId,
    });

    if (error) {
      console.error(`Failed to create insight template ${template.name}:`, error.message);
      throw error;
    }
  }

  console.log(`Created ${testData.insightTemplates.length} insight templates`);
}

async function main() {
  console.log("=".repeat(60));
  console.log("KALYXI - DETERMINISTIC TEST DATA SEEDING");
  console.log("=".repeat(60));
  console.log(`Seed: ${config.seed}`);
  console.log(`Supabase URL: ${config.supabaseUrl}`);
  console.log("");

  try {
    await cleanupTestData();
    await seedOrganizations();
    await seedUsers();
    await seedCallers();
    await seedCalls();
    await seedAnalyses();
    await seedGradingTemplates();
    await seedScorecards();
    await seedScripts();
    await seedInsightTemplates();

    console.log("\n" + "=".repeat(60));
    console.log("SEEDING COMPLETE");
    console.log("=".repeat(60));
    console.log("\nTest credentials:");
    console.log(`  Admin 1: ${testData.users[0].email} / ${config.testPassword}`);
    console.log(`  Admin 2: ${testData.users[3].email} / ${config.testPassword}`);
    console.log(`  Caller 1: ${testData.users[1].email} / ${config.testPassword}`);
    console.log("\nTest organization slugs:");
    console.log(`  Org 1: ${config.org1Slug}`);
    console.log(`  Org 2: ${config.org2Slug}`);
    console.log(`  Org 3: ${config.org3Slug}`);

    process.exit(0);
  } catch (error) {
    console.error("\nSeeding failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
main();
