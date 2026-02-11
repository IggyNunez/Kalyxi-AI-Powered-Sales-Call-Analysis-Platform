/**
 * Kalyxi AI - Demo Data Generator
 *
 * Generates realistic demo data for the current organization to test/demo the UI.
 * All demo data is tagged with a demo_batch_id for easy cleanup.
 *
 * SECURITY:
 * - Only works when DEMO_DATA_ENABLED=true
 * - Requires admin role
 * - All data is org-scoped
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import {
  AnalysisResults,
  CallSource,
  CallStatus,
  GradingCriterion,
  ReportJson,
  ScriptSection,
  ScorecardCriterion,
} from "@/types/database";

// ============================================================================
// Configuration
// ============================================================================

export type DemoSize = "small" | "medium" | "stress";

export interface DemoConfig {
  orgId: string;
  userId: string;
  size: DemoSize;
  seed?: number;
}

export interface DemoResult {
  success: boolean;
  batchId: string;
  counts: {
    callers: number;
    calls: number;
    analyses: number;
    reports: number;
    gradingTemplates: number;
    scorecards: number;
    scripts: number;
    insightTemplates: number;
  };
  errors: string[];
}

export interface DeleteResult {
  success: boolean;
  deleted: {
    callers: number;
    calls: number;
    analyses: number;
    reports: number;
    gradingTemplates: number;
    scorecards: number;
    scripts: number;
    insightTemplates: number;
  };
}

const SIZE_CONFIG: Record<DemoSize, { callers: number; callsPerCaller: number }> = {
  small: { callers: 3, callsPerCaller: 4 },
  medium: { callers: 6, callsPerCaller: 10 },
  stress: { callers: 10, callsPerCaller: 30 },
};

// ============================================================================
// Seeded Random Generator
// ============================================================================

class SeededRandom {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  float(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  date(daysBack: number): Date {
    const now = new Date();
    const daysAgo = this.int(0, daysBack);
    const hoursAgo = this.int(0, 23);
    const minutesAgo = this.int(0, 59);
    return new Date(
      now.getTime() -
        daysAgo * 24 * 60 * 60 * 1000 -
        hoursAgo * 60 * 60 * 1000 -
        minutesAgo * 60 * 1000
    );
  }

  boolean(probability: number = 0.5): boolean {
    return this.next() < probability;
  }
}

// ============================================================================
// Demo Data Content
// ============================================================================

const FIRST_NAMES = [
  "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Quinn", "Avery",
  "Cameron", "Drew", "Blake", "Reese", "Parker", "Skyler", "Jamie", "Dakota",
  "Charlie", "Finley", "Hayden", "Kendall",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Martinez", "Wilson", "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin",
  "Lee", "Thompson", "White", "Harris",
];

const COMPANIES = [
  "Acme Corp", "TechStart Inc", "Global Solutions", "Innovate LLC", "Prime Services",
  "NextGen Co", "Vertex Partners", "Apex Industries", "Quantum Labs", "Horizon Tech",
  "Atlas Dynamics", "Pinnacle Group", "Synergy Systems", "Elevate Digital", "Fusion Works",
  "Catalyst Ventures", "Momentum Solutions", "Paradigm Shift", "Sterling Enterprise", "Vanguard Tech",
];

const TEAMS = ["Sales Team Alpha", "Enterprise Sales", "SMB Team", "Outbound", "Inbound", "Account Executives"];
const DEPARTMENTS = ["Sales", "Business Development", "Account Management", "Customer Success"];

const CALL_SOURCES: CallSource[] = ["manual", "webhook", "api"];
const CALL_STATUSES: CallStatus[] = ["pending", "processing", "analyzed", "failed"];

// Weighted status distribution for realistic data
const STATUS_WEIGHTS = {
  pending: 0.1,
  processing: 0.05,
  analyzed: 0.8,
  failed: 0.05,
};

const OBJECTIONS = [
  "Price too high",
  "Need to think about it",
  "Already using a competitor",
  "Not the right time",
  "Need to talk to my team",
  "Budget constraints",
  "Don't see the value",
  "Too complex",
  "Happy with current solution",
  "Decision maker is unavailable",
];

const RECOMMENDATIONS = [
  "Practice active listening",
  "Use more open-ended questions",
  "Improve objection handling",
  "Better value articulation",
  "Strengthen rapport building",
  "More effective closing techniques",
  "Increase discovery depth",
  "Enhance competitive positioning",
  "Work on pacing and timing",
  "Develop stronger call-to-action",
];

const STRENGTHS = [
  "Excellent rapport building",
  "Clear value proposition",
  "Strong product knowledge",
  "Effective discovery questions",
  "Professional communication",
  "Good objection handling",
  "Confident presentation",
  "Customer-focused approach",
  "Effective storytelling",
  "Strong closing skills",
];

const IMPROVEMENTS = [
  "Ask more discovery questions",
  "Better handle objections",
  "Reduce talking over customer",
  "Improve follow-up commitment",
  "Strengthen value articulation",
  "Work on call control",
  "Develop urgency creation",
  "Enhance competitive knowledge",
  "Practice active listening",
  "Improve qualification questions",
];

// ============================================================================
// Transcript Templates
// ============================================================================

function generateTranscript(rng: SeededRandom, callerName: string, customerName: string, companyName: string): string {
  const templates = [
    // Discovery call template
    `Sales Representative: Good ${rng.choice(["morning", "afternoon"])}, this is ${callerName} from Kalyxi. Am I speaking with ${customerName}?

Customer: Yes, this is ${customerName}. What can I do for you?

Sales Rep: Great! I appreciate you taking my call. I'm reaching out because we've been working with companies similar to ${companyName} to help them improve their sales team performance. I noticed that your team has been growing, and I wanted to see if you might be facing some of the challenges we typically help with.

Customer: What kind of challenges are you talking about?

Sales Rep: Great question! Most of our clients come to us because they're struggling with ${rng.choice(["inconsistent sales performance", "lack of visibility into call quality", "time-consuming manual coaching", "difficulty scaling their training"])}. Is that something you've experienced?

Customer: Actually, yes. We've been trying to ${rng.choice(["standardize our approach", "improve our close rates", "get better insights into our calls", "train new reps faster"])}.

Sales Rep: I completely understand. That's exactly what we help with. Our platform uses AI to analyze sales calls automatically, giving your managers instant insights and saving them hours of manual review. Would it be helpful if I shared how companies like yours typically see a ${rng.int(20, 40)}% improvement in rep performance within the first quarter?

Customer: That does sound interesting. What's the typical investment?

Sales Rep: Great question! Our pricing is based on your team size and needs. Most companies our size invest between $${rng.int(500, 2000)}-${rng.int(2500, 5000)} per month. The ROI typically shows within the first month through improved conversion rates.

Customer: I'd need to discuss this with my team.

Sales Rep: Absolutely, I completely understand. What if I send over some case studies and we schedule a brief follow-up next week to discuss? What day works best for you?

Customer: ${rng.choice(["Tuesday", "Wednesday", "Thursday"])} afternoon would work.

Sales Rep: Perfect! I'll send everything over today and follow up ${rng.choice(["Tuesday", "Wednesday", "Thursday"])} at ${rng.choice(["2 PM", "3 PM", "4 PM"])}. Thank you for your time, ${customerName}!`,

    // Objection handling template
    `Rep: Hi ${customerName}, this is ${callerName}. I'm calling about our conversation regarding sales performance analytics.

Customer: Oh right. I've been thinking about it, but I'm not sure it's the right time.

Rep: I appreciate you being upfront with me. Can I ask what's driving that concern?

Customer: Well, we just implemented a new CRM and my team is still adjusting.

Rep: That makes total sense. Actually, many of our best clients implemented us right after a CRM rollout. The reason is that Kalyxi helps ensure your team is actually using the CRM correctly and following best practices. Would it help if I showed you how one of our clients reduced their CRM adoption issues by 60% using our platform?

Customer: How would that work exactly?

Rep: Great question! We integrate directly with your CRM and analyze every customer interaction. Our AI identifies coaching opportunities and best practices automatically. Your managers get real-time alerts when reps need help, rather than finding out weeks later.

Customer: That could actually help us. What's the implementation like?

Rep: Most teams are up and running in less than a week. We handle all the integration, and our success team provides dedicated onboarding. Would you like to see a quick demo of how it works with your specific CRM?

Customer: Yes, that would be helpful.

Rep: Excellent! I have availability ${rng.choice(["tomorrow", "Thursday", "Friday"])} at ${rng.int(9, 4)} PM. Does that work for you and anyone else who should see this?

Customer: Let me check and get back to you.

Rep: Perfect! I'll send a calendar invite and you can confirm once you check with your team. Looking forward to showing you the platform!`,

    // Gatekeeper navigation template
    `Rep: Good ${rng.choice(["morning", "afternoon"])}, this is ${callerName} calling from Kalyxi. I'm trying to reach the person responsible for sales enablement.

Gatekeeper: That would be our VP of Sales. May I ask what this is regarding?

Rep: Of course! We specialize in helping companies like ${companyName} improve their sales team performance through AI-powered call analytics. I wanted to share some insights that might be valuable for your team.

Gatekeeper: He's in meetings most of the day. Can you send an email?

Rep: I'd be happy to! However, I find that a brief conversation is usually more valuable since I can tailor the information to your specific needs. When might be a better time to reach him directly?

Gatekeeper: Try calling back ${rng.choice(["tomorrow", "Thursday", "Friday"])} ${rng.choice(["morning", "afternoon"])}.

Rep: ${rng.choice(["Tomorrow", "Thursday", "Friday"])} ${rng.choice(["morning", "afternoon"])} works. Would ${rng.int(9, 11)} AM or ${rng.int(2, 4)} PM be better?

Gatekeeper: ${rng.int(9, 11)} AM should be fine.

Rep: Perfect. Could I get your name so I can mention you referred me?

Gatekeeper: It's ${rng.choice(FIRST_NAMES)}.

Rep: Thank you! I'll call back then. Have a great day!`,
  ];

  return rng.choice(templates);
}

// Edge case transcripts
function generateEdgeCaseTranscript(type: string): string {
  switch (type) {
    case "long":
      return `${"This is a very detailed conversation that covers multiple topics. ".repeat(200)}

      The customer expressed significant interest in our product and asked many detailed questions about implementation, pricing, security, integrations, and support.

      ${"We discussed various features and capabilities in depth. ".repeat(150)}

      The call concluded with a commitment to schedule a follow-up demonstration with the technical team.

      ${"Additional notes and details from the comprehensive discussion. ".repeat(100)}`;

    case "score_zero":
      return `Rep: Hello?

Customer: I told you people to stop calling me!

Rep: But I just wanted to...

Customer: NO! Take me off your list!

*Customer hangs up immediately*

Notes: Customer was extremely hostile from the start. Call lasted only 5 seconds. No opportunity for any engagement.`;

    case "score_perfect":
      return `Sales Rep: Good morning! This is James from Kalyxi. Am I speaking with the decision maker for sales tools?

Customer: Yes, I'm Sarah, the VP of Sales. Perfect timing actually - we were just discussing this in our leadership meeting.

Rep: That's great to hear, Sarah! I'd love to understand what prompted that discussion. What challenges is your team currently facing?

Customer: We're struggling with call quality consistency across our 50-person sales team. Our top performers are crushing it, but we can't figure out how to replicate their success.

Rep: That's actually our specialty. Our AI platform analyzes every call and identifies exactly what your top performers do differently. Would it help if I shared how a similar company went from 30% quota attainment to 85% in just one quarter?

Customer: Absolutely! That's exactly what we need.

Rep: Perfect. Their key insight was that their best reps asked 40% more discovery questions. Our platform automatically coaches other reps to do the same. Can I show you a quick demo?

Customer: Yes, let's do it right now. I have 30 minutes.

*Flawless demo with perfect engagement*

Customer: This is exactly what we need. What's the timeline to get started?

Rep: We can have you live within a week. Shall I send over the agreement today?

Customer: Yes, please do. This is a priority for us.

Rep: Excellent! I'll send that right over. Looking forward to helping your team succeed!`;

    case "special_chars":
      return `Customer: "I don't think it's worth $1,000" & said the rep replied: 'Let me explain the value...'

Special characters test: <script>alert('xss')</script> & more text

Unicode: The customer from Japan said: Thank you! The price is 10,000 yen.

Email mentioned: contact@test.co.uk
Phone: +1 (555) 123-4567

Notes with "quotes" and 'apostrophes' and emoji test...`;

    case "failed":
      return `Error: Call recording corrupted

Original file: call_recording_20240215_143022.mp3
Error code: AUDIO_DECODE_FAILURE
Attempted recovery: Failed after 3 retries

Partial transcript recovered:
"Hello, this is... [CORRUPTED] ...about our product... [STATIC] ...thank you for..."

Technical notes: Audio file appears to have been truncated during upload.`;

    default:
      return "Short call. Customer was not interested.";
  }
}

// ============================================================================
// Analysis Generation
// ============================================================================

function generateAnalysis(rng: SeededRandom, score: number): AnalysisResults {
  const sentiment = score >= 70 ? "positive" : score >= 50 ? "neutral" : "negative";

  const numStrengths = rng.int(2, 4);
  const numImprovements = rng.int(2, 4);
  const numObjections = rng.int(1, 3);
  const numRecommendations = rng.int(3, 5);

  return {
    overallScore: score,
    compositeScore: score + rng.int(-5, 5),
    strengths: rng.shuffle(STRENGTHS).slice(0, numStrengths),
    improvements: rng.shuffle(IMPROVEMENTS).slice(0, numImprovements),
    executiveSummary: `This call demonstrated ${sentiment} engagement with the prospect. The representative ${score >= 70 ? "effectively" : score >= 50 ? "adequately" : "struggled to"} communicate value proposition and ${score >= 70 ? "successfully" : score >= 50 ? "partially" : "did not"} address customer concerns.`,
    actionItems: [
      "Send follow-up email with materials discussed",
      "Schedule next meeting",
      score < 70 ? "Review call with manager for coaching" : "Share as best practice example",
    ],
    objections: rng.shuffle(OBJECTIONS).slice(0, numObjections).map((objection) => ({
      objection,
      response: `Addressed with ${rng.choice(["value-based response", "ROI discussion", "case study reference", "competitive comparison"])}`,
      effectiveness: rng.int(score >= 60 ? 6 : 3, 10),
    })),
    gatekeeperDetected: rng.boolean(0.3),
    gatekeeperHandling: rng.boolean(0.3) ? "Successfully navigated to decision maker" : undefined,
    competitorMentions: rng.boolean(0.4)
      ? [rng.choice(["Gong", "Chorus", "Outreach", "SalesLoft", "Clari"])]
      : [],
    sentiment: {
      overall: sentiment,
      score: (score - 50) / 50,
      progression: Array.from({ length: rng.int(5, 10) }, (_, i) => ({
        timestamp: i * rng.int(30, 90),
        sentiment: rng.float(-0.5, 1),
      })),
    },
    callMetrics: {
      talkRatio: rng.float(0.3, 0.7),
      questionCount: rng.int(3, 15),
      interruptionCount: rng.int(0, 5),
      silenceDuration: rng.int(5, 60),
    },
    recommendations: rng.shuffle(RECOMMENDATIONS).slice(0, numRecommendations),
    gradingResults: [
      {
        criterionId: "rapport_building",
        criterionName: "Rapport Building",
        type: "score",
        value: rng.int(5, 10),
        score: rng.int(Math.max(40, score - 20), Math.min(100, score + 20)),
        feedback: "Demonstrated " + rng.choice(["excellent", "good", "adequate", "needs improvement in"]) + " rapport building skills",
      },
      {
        criterionId: "discovery",
        criterionName: "Discovery & Qualification",
        type: "score",
        value: rng.int(5, 10),
        score: rng.int(Math.max(40, score - 15), Math.min(100, score + 15)),
        feedback: rng.choice(["Asked effective discovery questions", "Could improve question depth", "Strong qualification process"]),
      },
      {
        criterionId: "value_proposition",
        criterionName: "Value Proposition",
        type: "score",
        value: rng.int(5, 10),
        score: rng.int(Math.max(40, score - 15), Math.min(100, score + 15)),
        feedback: "Value articulation was " + rng.choice(["clear and compelling", "adequate", "could be stronger"]),
      },
      {
        criterionId: "objection_handling",
        criterionName: "Objection Handling",
        type: "score",
        value: rng.int(5, 10),
        score: rng.int(Math.max(40, score - 20), Math.min(100, score + 20)),
        feedback: rng.choice(["Handled objections professionally", "Needs work on objection responses", "Excellent objection navigation"]),
      },
      {
        criterionId: "closing",
        criterionName: "Closing & Next Steps",
        type: "score",
        value: rng.int(5, 10),
        score: rng.int(Math.max(40, score - 15), Math.min(100, score + 15)),
        feedback: rng.choice(["Clear next steps established", "Could strengthen call-to-action", "Effective closing technique"]),
      },
    ],
  };
}

// ============================================================================
// Report Generation
// ============================================================================

function generateReport(
  rng: SeededRandom,
  callId: string,
  analysisId: string,
  callerName: string,
  customerName: string,
  analysis: AnalysisResults
): ReportJson {
  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    callSummary: {
      title: `Call Analysis Report`,
      date: new Date().toISOString(),
      duration: rng.int(180, 1800),
      callerName,
      customerInfo: {
        name: customerName,
        company: rng.choice(COMPANIES),
      },
    },
    analysis,
    scorecard: {
      criteria: analysis.gradingResults.map((gr) => ({
        name: gr.criterionName,
        score: gr.score || 0,
        weight: 20,
        passed: (gr.score || 0) >= 70,
      })),
      finalScore: analysis.overallScore,
      passed: analysis.overallScore >= 70,
    },
    coaching: {
      topStrengths: analysis.strengths.slice(0, 3),
      priorityImprovements: analysis.improvements.slice(0, 3),
      actionPlan: analysis.actionItems,
      resources: [
        "Objection Handling Best Practices Guide",
        "Discovery Questions Playbook",
      ],
    },
    trends: {
      scoreChange: rng.int(-10, 15),
      rankChange: rng.int(-3, 5),
      comparisonPeriod: "last 30 days",
    },
  };
}

// ============================================================================
// Grading Template Generation
// ============================================================================

function generateGradingTemplate(rng: SeededRandom): GradingCriterion[] {
  return [
    {
      id: uuidv4(),
      name: "Opening & Rapport",
      description: "How well the rep established rapport and set the call agenda",
      type: "score",
      weight: 15,
      isRequired: true,
      order: 0,
      minValue: 0,
      maxValue: 10,
      passingThreshold: 7,
    },
    {
      id: uuidv4(),
      name: "Discovery Questions",
      description: "Quality and depth of discovery questions asked",
      type: "score",
      weight: 25,
      isRequired: true,
      order: 1,
      minValue: 0,
      maxValue: 10,
      passingThreshold: 7,
    },
    {
      id: uuidv4(),
      name: "Value Proposition",
      description: "How effectively the rep communicated value",
      type: "score",
      weight: 20,
      isRequired: true,
      order: 2,
      minValue: 0,
      maxValue: 10,
      passingThreshold: 7,
    },
    {
      id: uuidv4(),
      name: "Objection Handling",
      description: "How well objections were addressed",
      type: "score",
      weight: 20,
      isRequired: true,
      order: 3,
      minValue: 0,
      maxValue: 10,
      passingThreshold: 6,
    },
    {
      id: uuidv4(),
      name: "Next Steps & Closing",
      description: "Quality of call close and next steps commitment",
      type: "score",
      weight: 20,
      isRequired: true,
      order: 4,
      minValue: 0,
      maxValue: 10,
      passingThreshold: 7,
    },
  ];
}

// ============================================================================
// Scorecard Generation
// ============================================================================

function generateScorecardCriteria(rng: SeededRandom): ScorecardCriterion[] {
  return [
    {
      id: uuidv4(),
      name: "Call Opening",
      description: "Evaluates the quality of the call introduction and rapport building",
      weight: 15,
      max_score: 10,
      scoring_guide: "10: Excellent intro with clear agenda. 7-9: Good intro. 4-6: Basic intro. 1-3: Poor or no intro.",
      keywords: ["hello", "agenda", "time", "appreciate"],
      order: 0,
    },
    {
      id: uuidv4(),
      name: "Needs Discovery",
      description: "Quality of questions to understand customer needs",
      weight: 25,
      max_score: 10,
      scoring_guide: "10: Deep, insightful questions. 7-9: Good discovery. 4-6: Basic questions. 1-3: Little to no discovery.",
      keywords: ["what", "why", "how", "challenge", "goal", "currently"],
      order: 1,
    },
    {
      id: uuidv4(),
      name: "Solution Presentation",
      description: "How well the solution was presented and connected to needs",
      weight: 20,
      max_score: 10,
      scoring_guide: "10: Perfect need-solution match. 7-9: Good presentation. 4-6: Generic pitch. 1-3: Poor or no presentation.",
      keywords: ["solution", "feature", "benefit", "help", "result"],
      order: 2,
    },
    {
      id: uuidv4(),
      name: "Objection Handling",
      description: "Effectiveness in addressing customer concerns",
      weight: 20,
      max_score: 10,
      scoring_guide: "10: Masterful handling. 7-9: Effective responses. 4-6: Basic responses. 1-3: Poor or ignored objections.",
      keywords: ["understand", "concern", "however", "actually", "let me explain"],
      order: 3,
    },
    {
      id: uuidv4(),
      name: "Call Close",
      description: "Quality of next steps and commitment",
      weight: 20,
      max_score: 10,
      scoring_guide: "10: Clear next steps with commitment. 7-9: Good close. 4-6: Weak close. 1-3: No clear next steps.",
      keywords: ["next", "schedule", "follow up", "send", "demo", "meeting"],
      order: 4,
    },
  ];
}

// ============================================================================
// Script Generation
// ============================================================================

function generateScriptSections(rng: SeededRandom): ScriptSection[] {
  return [
    {
      id: uuidv4(),
      name: "Opening",
      content: `"Hi [Customer Name], this is [Your Name] from Kalyxi. How are you today?"

Wait for response, then:

"Great! I'm reaching out because [personalized reason]. Do you have a few minutes to chat?"`,
      tips: [
        "Smile while speaking - it comes through in your voice",
        "Use their name to build rapport",
        "Keep it brief - respect their time",
      ],
      order: 0,
    },
    {
      id: uuidv4(),
      name: "Discovery",
      content: `Key Discovery Questions:

1. "Tell me about your current sales coaching process?"
2. "What challenges are you facing with rep performance?"
3. "How do you currently measure call quality?"
4. "What would success look like for your team?"
5. "Who else is involved in decisions like this?"`,
      tips: [
        "Listen more than you talk (aim for 30/70 ratio)",
        "Take notes on their specific pain points",
        "Ask follow-up questions to dig deeper",
      ],
      order: 1,
    },
    {
      id: uuidv4(),
      name: "Value Proposition",
      content: `Based on their answers, present relevant value:

"Based on what you've shared about [pain point], here's how Kalyxi can help:

- [Specific benefit 1 tied to their pain]
- [Specific benefit 2 tied to their pain]
- [ROI example from similar customer]"`,
      tips: [
        "Connect every benefit to their stated needs",
        "Use specific numbers and case studies",
        "Keep it conversational, not scripted",
      ],
      order: 2,
    },
    {
      id: uuidv4(),
      name: "Objection Handling",
      content: `Common Objections:

PRICE: "I understand budget is a consideration. Many of our customers initially felt the same way. What they found is that the ROI typically shows within [timeframe]. Would it help to see how [similar company] calculated their payback period?"

TIMING: "I hear you - timing is important. What would need to change for this to become a priority? In the meantime, would it be helpful to have some resources to share with your team?"

COMPETITOR: "That's a great product! What specifically drew you to them? [Listen] I'd love to show you how we approach [their concern] differently."`,
      tips: [
        "Acknowledge their concern first",
        "Never be defensive",
        "Ask permission before providing counter-points",
      ],
      order: 3,
    },
    {
      id: uuidv4(),
      name: "Close & Next Steps",
      content: `"Based on our conversation, it sounds like [summarize key points].

The logical next step would be [specific action]. Does [specific day/time] work for you?"

If yes: "Perfect! I'll send over a calendar invite right now. Is there anyone else who should join us?"

If no: "No problem. What would be a better time? And what can I send over in the meantime to help you prepare?"`,
      tips: [
        "Always propose a specific next step",
        "Get commitment on date/time before ending",
        "Confirm contact information",
      ],
      order: 4,
    },
  ];
}

// ============================================================================
// Main Generator Function
// ============================================================================

export async function generateDemoData(
  supabase: SupabaseClient,
  config: DemoConfig
): Promise<DemoResult> {
  const rng = new SeededRandom(config.seed || Date.now());
  const batchId = uuidv4();
  const sizeConfig = SIZE_CONFIG[config.size];
  const errors: string[] = [];

  const counts = {
    callers: 0,
    calls: 0,
    analyses: 0,
    reports: 0,
    gradingTemplates: 0,
    scorecards: 0,
    scripts: 0,
    insightTemplates: 0,
  };

  try {
    // 1. Create Grading Template
    const gradingCriteria = generateGradingTemplate(rng);
    const { data: gradingTemplate, error: gtError } = await supabase
      .from("grading_templates")
      .insert({
        org_id: config.orgId,
        name: "[Demo] Standard Sales Call Template",
        description: "Demo grading template for evaluating sales calls",
        criteria_json: gradingCriteria,
        is_default: false,
        is_active: true,
        demo_batch_id: batchId,
      })
      .select()
      .single();

    if (gtError) {
      errors.push(`Grading template: ${gtError.message}`);
    } else {
      counts.gradingTemplates = 1;
    }

    // 2. Create Script
    const scriptSections = generateScriptSections(rng);
    const { data: script, error: scriptError } = await supabase
      .from("scripts")
      .insert({
        org_id: config.orgId,
        name: "[Demo] Sales Call Script",
        description: "Demo script for sales calls",
        sections: scriptSections,
        status: "active",
        is_default: false,
        created_by: config.userId,
        demo_batch_id: batchId,
      })
      .select()
      .single();

    if (scriptError) {
      errors.push(`Script: ${scriptError.message}`);
    } else {
      counts.scripts = 1;
    }

    // 3. Create Scorecard
    const scorecardCriteria = generateScorecardCriteria(rng);
    const { data: scorecard, error: scError } = await supabase
      .from("scorecards")
      .insert({
        org_id: config.orgId,
        name: "[Demo] Sales Performance Scorecard",
        description: "Demo scorecard for evaluating sales performance",
        criteria: scorecardCriteria,
        total_weight: 100,
        status: "active",
        is_default: false,
        script_id: script?.id || null,
        created_by: config.userId,
        demo_batch_id: batchId,
      })
      .select()
      .single();

    if (scError) {
      errors.push(`Scorecard: ${scError.message}`);
    } else {
      counts.scorecards = 1;
    }

    // 4. Create Insight Template
    const { error: itError } = await supabase.from("insight_templates").insert({
      org_id: config.orgId,
      name: "[Demo] Key Call Insights",
      description: "Demo template for extracting key insights from calls",
      category: "general",
      prompt_template:
        "Analyze this sales call and extract the key insights including: main customer pain points, objections raised, competitive mentions, and recommended follow-up actions.",
      output_format: "bullets",
      max_insights: 5,
      is_active: true,
      is_default: false,
      display_order: 0,
      created_by: config.userId,
      demo_batch_id: batchId,
    });

    if (itError) {
      errors.push(`Insight template: ${itError.message}`);
    } else {
      counts.insightTemplates = 1;
    }

    // 5. Create Callers
    const callerIds: string[] = [];

    for (let i = 0; i < sizeConfig.callers; i++) {
      const firstName = rng.choice(FIRST_NAMES);
      const lastName = rng.choice(LAST_NAMES);
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@demo.kalyxi.com`;

      const { data: caller, error: callerError } = await supabase
        .from("callers")
        .insert({
          org_id: config.orgId,
          name: `[Demo] ${name}`,
          email,
          team: rng.choice(TEAMS),
          department: rng.choice(DEPARTMENTS),
          is_active: true,
          metadata: {
            demo: true,
            hire_date: rng.date(365 * 2).toISOString(),
            performance_tier: rng.choice(["top", "mid", "developing"]),
          },
          demo_batch_id: batchId,
        })
        .select()
        .single();

      if (callerError) {
        errors.push(`Caller ${i + 1}: ${callerError.message}`);
      } else if (caller) {
        callerIds.push(caller.id);
        counts.callers++;
      }
    }

    // 6. Create Calls with Analyses and Reports
    const edgeCases = ["long", "score_zero", "score_perfect", "special_chars", "failed"];
    let edgeCaseIndex = 0;

    for (const callerId of callerIds) {
      const callsToCreate = sizeConfig.callsPerCaller + rng.int(-2, 2);

      for (let i = 0; i < callsToCreate; i++) {
        // Determine if this should be an edge case
        const isEdgeCase = edgeCaseIndex < edgeCases.length && rng.boolean(0.1);
        const edgeCaseType = isEdgeCase ? edgeCases[edgeCaseIndex++] : null;

        // Determine status with weighted distribution
        let status: CallStatus;
        if (edgeCaseType === "failed") {
          status = "failed";
        } else {
          const rand = rng.next();
          if (rand < STATUS_WEIGHTS.analyzed) {
            status = "analyzed";
          } else if (rand < STATUS_WEIGHTS.analyzed + STATUS_WEIGHTS.pending) {
            status = "pending";
          } else if (rand < STATUS_WEIGHTS.analyzed + STATUS_WEIGHTS.pending + STATUS_WEIGHTS.processing) {
            status = "processing";
          } else {
            status = "failed";
          }
        }

        const customerFirstName = rng.choice(FIRST_NAMES);
        const customerLastName = rng.choice(LAST_NAMES);
        const customerName = `${customerFirstName} ${customerLastName}`;
        const customerCompany = rng.choice(COMPANIES);
        const callerName = `Demo Caller`;

        // Generate transcript
        let transcript: string;
        if (edgeCaseType) {
          transcript = generateEdgeCaseTranscript(edgeCaseType);
        } else {
          transcript = generateTranscript(rng, callerName, customerName, customerCompany);
        }

        // Determine score based on edge case
        let score: number;
        if (edgeCaseType === "score_zero") {
          score = 0;
        } else if (edgeCaseType === "score_perfect") {
          score = 100;
        } else {
          score = rng.int(35, 98);
        }

        // Create call
        const callTimestamp = rng.date(90);
        const { data: call, error: callError } = await supabase
          .from("calls")
          .insert({
            org_id: config.orgId,
            caller_id: callerId,
            raw_notes: transcript,
            source: rng.choice(CALL_SOURCES),
            status,
            customer_name: edgeCaseType === "special_chars" ? `${customerName} Test <>&"'` : customerName,
            customer_company: customerCompany,
            customer_phone: `+1-555-${rng.int(100, 999)}-${rng.int(1000, 9999)}`,
            duration: rng.int(120, 1800),
            call_timestamp: callTimestamp.toISOString(),
            metadata: {
              demo: true,
              campaign: `Demo Campaign ${rng.int(1, 5)}`,
              edge_case: edgeCaseType || undefined,
            },
            demo_batch_id: batchId,
          })
          .select()
          .single();

        if (callError) {
          errors.push(`Call: ${callError.message}`);
          continue;
        }

        counts.calls++;

        // Create analysis for analyzed calls
        if (status === "analyzed" && call) {
          const analysis = generateAnalysis(rng, score);

          const { data: analysisData, error: analysisError } = await supabase
            .from("analyses")
            .insert({
              call_id: call.id,
              ai_model: "gpt-4o",
              grading_results_json: analysis,
              overall_score: score,
              composite_score: analysis.compositeScore,
              processing_time_ms: rng.int(2000, 8000),
              token_usage: {
                prompt: rng.int(500, 2000),
                completion: rng.int(300, 1000),
                total: rng.int(800, 3000),
              },
              demo_batch_id: batchId,
            })
            .select()
            .single();

          if (analysisError) {
            errors.push(`Analysis: ${analysisError.message}`);
          } else if (analysisData) {
            counts.analyses++;

            // Create report for some analyzed calls (80%)
            if (rng.boolean(0.8)) {
              const reportJson = generateReport(
                rng,
                call.id,
                analysisData.id,
                callerName,
                customerName,
                analysis
              );

              const { error: reportError } = await supabase.from("reports").insert({
                call_id: call.id,
                analysis_id: analysisData.id,
                report_json: reportJson,
                status: "ready",
                demo_batch_id: batchId,
              });

              if (reportError) {
                errors.push(`Report: ${reportError.message}`);
              } else {
                counts.reports++;
              }
            }
          }
        }

        // Add error message for failed calls
        if (status === "failed" && call) {
          await supabase
            .from("calls")
            .update({
              metadata: {
                ...((call.metadata as Record<string, unknown>) || {}),
                error_reason: rng.choice([
                  "Audio file corrupted",
                  "Transcription failed",
                  "Analysis timeout",
                  "Rate limit exceeded",
                  "Invalid audio format",
                ]),
              },
            })
            .eq("id", call.id);
        }
      }
    }

    return {
      success: errors.length === 0,
      batchId,
      counts,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      batchId,
      counts,
      errors: [...errors, error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

// ============================================================================
// Delete Function
// ============================================================================

export async function deleteDemoData(
  supabase: SupabaseClient,
  orgId: string,
  batchId?: string
): Promise<DeleteResult> {
  const deleted = {
    callers: 0,
    calls: 0,
    analyses: 0,
    reports: 0,
    gradingTemplates: 0,
    scorecards: 0,
    scripts: 0,
    insightTemplates: 0,
  };

  try {
    // Build the filter condition
    const filterCondition = batchId
      ? { demo_batch_id: batchId }
      : { org_id: orgId };

    // Delete in order to respect foreign keys
    // 1. Reports
    const { data: reportsDeleted } = await supabase
      .from("reports")
      .delete()
      .not("demo_batch_id", "is", null)
      .match(filterCondition)
      .select("id");
    deleted.reports = reportsDeleted?.length || 0;

    // 2. Analyses
    const { data: analysesDeleted } = await supabase
      .from("analyses")
      .delete()
      .not("demo_batch_id", "is", null)
      .match(batchId ? { demo_batch_id: batchId } : {})
      .select("id");
    deleted.analyses = analysesDeleted?.length || 0;

    // 3. Calls
    const { data: callsDeleted } = await supabase
      .from("calls")
      .delete()
      .not("demo_batch_id", "is", null)
      .match(filterCondition)
      .select("id");
    deleted.calls = callsDeleted?.length || 0;

    // 4. Callers
    const { data: callersDeleted } = await supabase
      .from("callers")
      .delete()
      .not("demo_batch_id", "is", null)
      .match(filterCondition)
      .select("id");
    deleted.callers = callersDeleted?.length || 0;

    // 5. Grading Templates
    const { data: gtDeleted } = await supabase
      .from("grading_templates")
      .delete()
      .not("demo_batch_id", "is", null)
      .match(filterCondition)
      .select("id");
    deleted.gradingTemplates = gtDeleted?.length || 0;

    // 6. Scorecards
    const { data: scDeleted } = await supabase
      .from("scorecards")
      .delete()
      .not("demo_batch_id", "is", null)
      .match(filterCondition)
      .select("id");
    deleted.scorecards = scDeleted?.length || 0;

    // 7. Scripts
    const { data: scriptsDeleted } = await supabase
      .from("scripts")
      .delete()
      .not("demo_batch_id", "is", null)
      .match(filterCondition)
      .select("id");
    deleted.scripts = scriptsDeleted?.length || 0;

    // 8. Insight Templates
    const { data: itDeleted } = await supabase
      .from("insight_templates")
      .delete()
      .not("demo_batch_id", "is", null)
      .match(filterCondition)
      .select("id");
    deleted.insightTemplates = itDeleted?.length || 0;

    return { success: true, deleted };
  } catch (error) {
    console.error("Error deleting demo data:", error);
    return { success: false, deleted };
  }
}

// ============================================================================
// Status Check Function
// ============================================================================

export async function getDemoDataStatus(
  supabase: SupabaseClient,
  orgId: string
): Promise<{
  hasDemoData: boolean;
  counts: Record<string, number>;
  batches: Array<{ batchId: string; createdAt: string }>;
}> {
  try {
    // Count demo data in each table
    const [callers, calls, analyses, reports, gradingTemplates, scorecards, scripts, insightTemplates] =
      await Promise.all([
        supabase
          .from("callers")
          .select("id", { count: "exact" })
          .eq("org_id", orgId)
          .not("demo_batch_id", "is", null),
        supabase
          .from("calls")
          .select("id", { count: "exact" })
          .eq("org_id", orgId)
          .not("demo_batch_id", "is", null),
        supabase
          .from("analyses")
          .select("id, call_id", { count: "exact" })
          .not("demo_batch_id", "is", null),
        supabase
          .from("reports")
          .select("id", { count: "exact" })
          .not("demo_batch_id", "is", null),
        supabase
          .from("grading_templates")
          .select("id", { count: "exact" })
          .eq("org_id", orgId)
          .not("demo_batch_id", "is", null),
        supabase
          .from("scorecards")
          .select("id", { count: "exact" })
          .eq("org_id", orgId)
          .not("demo_batch_id", "is", null),
        supabase
          .from("scripts")
          .select("id", { count: "exact" })
          .eq("org_id", orgId)
          .not("demo_batch_id", "is", null),
        supabase
          .from("insight_templates")
          .select("id", { count: "exact" })
          .eq("org_id", orgId)
          .not("demo_batch_id", "is", null),
      ]);

    const counts = {
      callers: callers.count || 0,
      calls: calls.count || 0,
      analyses: analyses.count || 0,
      reports: reports.count || 0,
      gradingTemplates: gradingTemplates.count || 0,
      scorecards: scorecards.count || 0,
      scripts: scripts.count || 0,
      insightTemplates: insightTemplates.count || 0,
    };

    const hasDemoData = Object.values(counts).some((c) => c > 0);

    // Get unique batch IDs with creation times
    const { data: batchData } = await supabase
      .from("calls")
      .select("demo_batch_id, created_at")
      .eq("org_id", orgId)
      .not("demo_batch_id", "is", null)
      .order("created_at", { ascending: false });

    const batchMap = new Map<string, string>();
    batchData?.forEach((row) => {
      if (row.demo_batch_id && !batchMap.has(row.demo_batch_id)) {
        batchMap.set(row.demo_batch_id, row.created_at);
      }
    });

    const batches = Array.from(batchMap.entries()).map(([batchId, createdAt]) => ({
      batchId,
      createdAt,
    }));

    return { hasDemoData, counts, batches };
  } catch (error) {
    console.error("Error getting demo data status:", error);
    return { hasDemoData: false, counts: {}, batches: [] };
  }
}

// ============================================================================
// Environment Check
// ============================================================================

export function isDemoDataEnabled(): boolean {
  // Check if explicitly enabled via environment variable
  if (process.env.DEMO_DATA_ENABLED === "true") {
    return true;
  }

  // In development mode, allow by default for convenience
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  // In production, require explicit opt-in
  return false;
}
