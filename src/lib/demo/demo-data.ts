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
    // Coaching platform
    templates: number;
    criteriaGroups: number;
    criteria: number;
    sessions: number;
    scores: number;
    templateVersions: number;
    // Extended data
    callScoreResults: number;
    meetTranscripts: number;
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
    // Coaching platform
    templates: number;
    criteriaGroups: number;
    criteria: number;
    sessions: number;
    scores: number;
    templateVersions: number;
    // Extended data
    callScoreResults: number;
    meetTranscripts: number;
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
// Coaching Platform Data Generation
// ============================================================================

// Template configurations for different use cases
interface CriteriaConfig {
  name: string;
  type: CriteriaType;
  weight: number;
  is_required: boolean;
  is_auto_fail?: boolean;
  auto_fail_threshold?: number;
  max_score?: number;
}

interface GroupConfig {
  name: string;
  description: string;
  criteria: CriteriaConfig[];
}

interface TemplateConfig {
  name: string;
  description: string;
  scoring_method: "weighted" | "simple_average" | "pass_fail" | "points" | "custom_formula";
  use_case: "sales_call" | "onboarding" | "qa_review" | "training" | "custom";
  pass_threshold: number;
  groups: GroupConfig[];
}

const TEMPLATE_CONFIGS: TemplateConfig[] = [
  {
    name: "[Demo] Sales Call Scorecard",
    description: "Comprehensive scorecard for evaluating outbound sales calls",
    scoring_method: "weighted" as const,
    use_case: "sales_call" as const,
    pass_threshold: 70,
    groups: [
      {
        name: "Call Opening",
        description: "First impressions and rapport building",
        criteria: [
          { name: "Professional Greeting", type: "pass_fail" as const, weight: 5, is_required: true },
          { name: "Rapport Building", type: "scale" as const, weight: 10, is_required: true, is_auto_fail: false },
          { name: "Agenda Setting", type: "scale" as const, weight: 5, is_required: false },
        ],
      },
      {
        name: "Discovery",
        description: "Understanding customer needs and pain points",
        criteria: [
          { name: "Discovery Questions Quality", type: "scale" as const, weight: 15, is_required: true, is_auto_fail: true, auto_fail_threshold: 40 },
          { name: "Active Listening", type: "scale" as const, weight: 10, is_required: true },
          { name: "Pain Points Identified", type: "checklist" as const, weight: 10, is_required: true },
        ],
      },
      {
        name: "Presentation",
        description: "Value proposition and solution presentation",
        criteria: [
          { name: "Value Proposition Clarity", type: "scale" as const, weight: 15, is_required: true, is_auto_fail: true, auto_fail_threshold: 50 },
          { name: "Feature-Benefit Alignment", type: "scale" as const, weight: 10, is_required: true },
          { name: "Social Proof Usage", type: "pass_fail" as const, weight: 5, is_required: false },
        ],
      },
      {
        name: "Closing",
        description: "Objection handling and next steps",
        criteria: [
          { name: "Objection Handling", type: "scale" as const, weight: 10, is_required: true },
          { name: "Clear Next Steps", type: "pass_fail" as const, weight: 5, is_required: true, is_auto_fail: true },
        ],
      },
    ],
  },
  {
    name: "[Demo] Quick QA Checklist",
    description: "Simple pass/fail quality assurance checklist",
    scoring_method: "pass_fail" as const,
    use_case: "qa_review" as const,
    pass_threshold: 100,
    groups: [
      {
        name: "Compliance",
        description: "Regulatory and compliance requirements",
        criteria: [
          { name: "Proper Disclosure Given", type: "pass_fail" as const, weight: 25, is_required: true, is_auto_fail: true },
          { name: "Customer Consent Obtained", type: "pass_fail" as const, weight: 25, is_required: true, is_auto_fail: true },
          { name: "No Misleading Statements", type: "pass_fail" as const, weight: 25, is_required: true, is_auto_fail: true },
          { name: "Call Recording Disclosure", type: "pass_fail" as const, weight: 25, is_required: true, is_auto_fail: true },
        ],
      },
    ],
  },
  {
    name: "[Demo] Onboarding Call Review",
    description: "New employee onboarding call assessment",
    scoring_method: "simple_average" as const,
    use_case: "onboarding" as const,
    pass_threshold: 60,
    groups: [
      {
        name: "Product Knowledge",
        description: "Understanding of product features and benefits",
        criteria: [
          { name: "Feature Knowledge", type: "rating_stars" as const, weight: 20, is_required: true },
          { name: "Competitive Positioning", type: "rating_stars" as const, weight: 20, is_required: false },
        ],
      },
      {
        name: "Process Adherence",
        description: "Following the sales process",
        criteria: [
          { name: "Script Adherence", type: "percentage" as const, weight: 30, is_required: true },
          { name: "CRM Updates Completed", type: "pass_fail" as const, weight: 15, is_required: true },
          { name: "Follow-up Scheduled", type: "pass_fail" as const, weight: 15, is_required: true },
        ],
      },
    ],
  },
  {
    name: "[Demo] Training Assessment",
    description: "Points-based training evaluation",
    scoring_method: "points" as const,
    use_case: "training" as const,
    pass_threshold: 75,
    groups: [
      {
        name: "Knowledge Check",
        description: "Understanding of key concepts",
        criteria: [
          { name: "Product Features", type: "scale" as const, weight: 25, is_required: true, max_score: 25 },
          { name: "Pricing Knowledge", type: "scale" as const, weight: 25, is_required: true, max_score: 25 },
          { name: "Competition Analysis", type: "scale" as const, weight: 25, is_required: false, max_score: 25 },
          { name: "Process Understanding", type: "scale" as const, weight: 25, is_required: true, max_score: 25 },
        ],
      },
    ],
  },
];

// Session statuses with weights for realistic distribution
const SESSION_STATUS_WEIGHTS = {
  pending: 0.15,
  in_progress: 0.10,
  completed: 0.45,
  reviewed: 0.20,
  disputed: 0.05,
  cancelled: 0.05,
};

type CriteriaType = "scale" | "pass_fail" | "checklist" | "text" | "dropdown" | "multi_select" | "rating_stars" | "percentage";

// Generate criteria config based on type
function generateCriteriaConfig(type: CriteriaType, rng: SeededRandom): Record<string, unknown> {
  switch (type) {
    case "scale":
      return {
        min: 1,
        max: rng.choice([5, 10]),
        step: 1,
        labels: { "1": "Poor", "5": "Excellent", "10": "Outstanding" },
      };
    case "pass_fail":
      return {
        pass_label: "Pass",
        fail_label: "Fail",
        pass_value: 100,
        fail_value: 0,
      };
    case "checklist":
      return {
        items: [
          { id: uuidv4(), label: "Budget discussed", points: 25 },
          { id: uuidv4(), label: "Timeline established", points: 25 },
          { id: uuidv4(), label: "Decision maker identified", points: 25 },
          { id: uuidv4(), label: "Next steps agreed", points: 25 },
        ],
        scoring: "sum",
      };
    case "rating_stars":
      return {
        max_stars: 5,
        allow_half: true,
      };
    case "percentage":
      return {
        thresholds: [
          { value: 80, label: "Excellent", color: "green" },
          { value: 60, label: "Good", color: "blue" },
          { value: 40, label: "Needs Improvement", color: "yellow" },
          { value: 0, label: "Poor", color: "red" },
        ],
      };
    case "dropdown":
      return {
        options: [
          { value: "excellent", label: "Excellent", score: 100 },
          { value: "good", label: "Good", score: 75 },
          { value: "fair", label: "Fair", score: 50 },
          { value: "poor", label: "Poor", score: 25 },
        ],
      };
    case "multi_select":
      return {
        options: [
          { value: "empathy", label: "Showed Empathy", score: 20 },
          { value: "patience", label: "Demonstrated Patience", score: 20 },
          { value: "clarity", label: "Clear Communication", score: 20 },
          { value: "knowledge", label: "Product Knowledge", score: 20 },
          { value: "solution", label: "Offered Solution", score: 20 },
        ],
      };
    case "text":
      return {
        min_length: 10,
        max_length: 500,
        placeholder: "Enter your feedback...",
      };
    default:
      return {};
  }
}

// Generate score value based on criteria type
function generateScoreValue(
  type: CriteriaType,
  config: Record<string, unknown>,
  rng: SeededRandom,
  targetPercentage: number
): { value: Record<string, unknown>; rawScore: number; normalizedScore: number } {
  const isGoodScore = rng.float(0, 100) < targetPercentage;

  switch (type) {
    case "scale": {
      const max = (config.max as number) || 10;
      const min = (config.min as number) || 1;
      const value = isGoodScore
        ? rng.int(Math.ceil((max - min) * 0.7) + min, max)
        : rng.int(min, Math.floor((max - min) * 0.5) + min);
      const normalizedScore = ((value - min) / (max - min)) * 100;
      return { value: { value }, rawScore: value, normalizedScore };
    }
    case "pass_fail": {
      const passed = isGoodScore ? rng.boolean(0.85) : rng.boolean(0.4);
      return {
        value: { passed },
        rawScore: passed ? 100 : 0,
        normalizedScore: passed ? 100 : 0,
      };
    }
    case "checklist": {
      const items = (config.items as Array<{ id: string; points: number }>) || [];
      const numChecked = isGoodScore
        ? rng.int(Math.ceil(items.length * 0.7), items.length)
        : rng.int(0, Math.floor(items.length * 0.5));
      const shuffledItems = rng.shuffle([...items]);
      const checked = shuffledItems.slice(0, numChecked).map((item) => item.id);
      const unchecked = shuffledItems.slice(numChecked).map((item) => item.id);
      const totalPoints = items.reduce((sum, item) => sum + item.points, 0);
      const earnedPoints = checked.reduce((sum, id) => {
        const item = items.find((i) => i.id === id);
        return sum + (item?.points || 0);
      }, 0);
      return {
        value: { checked, unchecked },
        rawScore: earnedPoints,
        normalizedScore: totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0,
      };
    }
    case "rating_stars": {
      const maxStars = (config.max_stars as number) || 5;
      const allowHalf = config.allow_half as boolean;
      let stars = isGoodScore
        ? rng.float(maxStars * 0.7, maxStars)
        : rng.float(1, maxStars * 0.5);
      if (!allowHalf) stars = Math.round(stars);
      else stars = Math.round(stars * 2) / 2;
      return {
        value: { stars },
        rawScore: stars,
        normalizedScore: (stars / maxStars) * 100,
      };
    }
    case "percentage": {
      const value = isGoodScore
        ? rng.int(65, 100)
        : rng.int(20, 60);
      return {
        value: { value },
        rawScore: value,
        normalizedScore: value,
      };
    }
    case "dropdown": {
      const options = (config.options as Array<{ value: string; score: number }>) || [];
      const sortedOptions = [...options].sort((a, b) => b.score - a.score);
      const selectedIdx = isGoodScore
        ? rng.int(0, Math.floor(sortedOptions.length / 2))
        : rng.int(Math.floor(sortedOptions.length / 2), sortedOptions.length - 1);
      const selected = sortedOptions[selectedIdx];
      return {
        value: { selected: selected.value },
        rawScore: selected.score,
        normalizedScore: selected.score,
      };
    }
    case "multi_select": {
      const options = (config.options as Array<{ value: string; score: number }>) || [];
      const numSelected = isGoodScore
        ? rng.int(Math.ceil(options.length * 0.6), options.length)
        : rng.int(0, Math.floor(options.length * 0.4));
      const shuffledOptions = rng.shuffle([...options]);
      const selected = shuffledOptions.slice(0, numSelected).map((opt) => opt.value);
      const totalPossible = options.reduce((sum, opt) => sum + opt.score, 0);
      const earnedScore = selected.reduce((sum, val) => {
        const opt = options.find((o) => o.value === val);
        return sum + (opt?.score || 0);
      }, 0);
      return {
        value: { selected },
        rawScore: earnedScore,
        normalizedScore: totalPossible > 0 ? (earnedScore / totalPossible) * 100 : 0,
      };
    }
    case "text": {
      const responses = isGoodScore
        ? [
            "Excellent communication skills demonstrated throughout the call. The rep showed great empathy and product knowledge.",
            "Very professional approach. Customer concerns were addressed thoroughly and next steps were clearly defined.",
            "Strong performance overall. Good rapport building and effective discovery questions asked.",
          ]
        : [
            "Needs improvement in objection handling. Customer concerns were not fully addressed.",
            "Communication could be clearer. Some key points were missed during the presentation.",
            "Additional coaching needed on discovery questions and active listening.",
          ];
      return {
        value: { response: rng.choice(responses) },
        rawScore: isGoodScore ? 80 : 40,
        normalizedScore: isGoodScore ? 80 : 40,
      };
    }
    default:
      return { value: {}, rawScore: 0, normalizedScore: 0 };
  }
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
    // Coaching platform
    templates: 0,
    criteriaGroups: 0,
    criteria: 0,
    sessions: 0,
    scores: 0,
    templateVersions: 0,
    // Extended data
    callScoreResults: 0,
    meetTranscripts: 0,
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

    // ========================================================================
    // GOOGLE MEET TRANSCRIPTS (Mock)
    // ========================================================================
    // Create a demo google connection and some meet transcripts

    // Create demo google connection (with placeholder tokens - for demo only)
    const { data: googleConnection, error: gcError } = await supabase
      .from("google_connections")
      .insert({
        user_id: config.userId,
        google_email: "demo@kalyxi-demo.com",
        google_user_id: `demo-${batchId.slice(0, 8)}`,
        access_token: "demo-access-token-placeholder",
        refresh_token_encrypted: "demo-encrypted-token",
        refresh_token_iv: "demo-iv",
        refresh_token_tag: "demo-tag",
        token_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        scopes: ["https://www.googleapis.com/auth/meetings.space.readonly"],
        last_sync_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (gcError) {
      errors.push(`Google connection: ${gcError.message}`);
    }

    // Store connection for meet_transcripts if created
    let demoConnectionId: string | null = googleConnection?.id || null;

    // ========================================================================
    // COACHING PLATFORM DATA
    // ========================================================================

    // Store created template IDs and their criteria for session creation
    const createdTemplates: Array<{
      id: string;
      criteria: Array<{
        id: string;
        group_id: string | null;
        type: CriteriaType;
        config: Record<string, unknown>;
        weight: number;
        max_score: number;
        is_auto_fail: boolean;
        auto_fail_threshold: number | null;
      }>;
    }> = [];

    // 5. Create Coaching Templates with Criteria
    for (const templateConfig of TEMPLATE_CONFIGS) {
      // Insert template
      const { data: template, error: templateError } = await supabase
        .from("templates")
        .insert({
          org_id: config.orgId,
          name: templateConfig.name,
          description: templateConfig.description,
          scoring_method: templateConfig.scoring_method,
          use_case: templateConfig.use_case,
          pass_threshold: templateConfig.pass_threshold,
          max_total_score: 100,
          status: "active",
          version: 1,
          is_default: templateConfig.name.includes("Sales Call"),
          created_by: config.userId,
          activated_at: new Date().toISOString(),
          settings: {
            allow_na: true,
            require_comments_below_threshold: templateConfig.scoring_method === "weighted",
            comments_threshold: 50,
            auto_calculate: true,
            show_weights_to_agents: true,
            allow_partial_submission: false,
          },
        })
        .select()
        .single();

      if (templateError) {
        errors.push(`Template ${templateConfig.name}: ${templateError.message}`);
        continue;
      }

      counts.templates++;
      const templateCriteria: typeof createdTemplates[0]["criteria"] = [];

      // Create criteria groups and criteria
      let groupSortOrder = 0;
      for (const groupConfig of templateConfig.groups) {
        const { data: group, error: groupError } = await supabase
          .from("criteria_groups")
          .insert({
            template_id: template.id,
            name: groupConfig.name,
            description: groupConfig.description,
            sort_order: groupSortOrder++,
            weight: 0,
            is_required: true,
            is_collapsed_by_default: false,
          })
          .select()
          .single();

        if (groupError) {
          errors.push(`Criteria group ${groupConfig.name}: ${groupError.message}`);
          continue;
        }

        counts.criteriaGroups++;

        // Create criteria in this group
        let criteriaSortOrder = 0;
        for (const criteriaConfig of groupConfig.criteria) {
          const criteriaType = criteriaConfig.type;
          const config_data = generateCriteriaConfig(criteriaType, rng);
          const maxScore = criteriaConfig.max_score || 100;

          const { data: criteria, error: criteriaError } = await supabase
            .from("criteria")
            .insert({
              template_id: template.id,
              group_id: group.id,
              name: criteriaConfig.name,
              description: `Evaluate ${criteriaConfig.name.toLowerCase()}`,
              criteria_type: criteriaType,
              config: config_data,
              weight: criteriaConfig.weight,
              max_score: maxScore,
              sort_order: criteriaSortOrder++,
              is_required: criteriaConfig.is_required,
              is_auto_fail: criteriaConfig.is_auto_fail || false,
              auto_fail_threshold: criteriaConfig.auto_fail_threshold || null,
              scoring_guide: `Score this criteria based on ${criteriaConfig.name.toLowerCase()} performance.`,
              keywords: [],
            })
            .select()
            .single();

          if (criteriaError) {
            errors.push(`Criteria ${criteriaConfig.name}: ${criteriaError.message}`);
            continue;
          }

          counts.criteria++;
          templateCriteria.push({
            id: criteria.id,
            group_id: group.id,
            type: criteriaType,
            config: config_data,
            weight: criteriaConfig.weight,
            max_score: maxScore,
            is_auto_fail: criteriaConfig.is_auto_fail || false,
            auto_fail_threshold: criteriaConfig.auto_fail_threshold || null,
          });
        }
      }

      createdTemplates.push({
        id: template.id,
        criteria: templateCriteria,
      });

      // Create template versions (1-3 versions per template for realism)
      const numVersions = rng.int(1, 3);
      for (let v = 1; v <= numVersions; v++) {
        const versionDate = new Date();
        versionDate.setDate(versionDate.getDate() - (numVersions - v) * rng.int(7, 30));

        const { error: versionError } = await supabase.from("template_versions").insert({
          template_id: template.id,
          version_number: v,
          snapshot: {
            template: {
              name: templateConfig.name,
              description: templateConfig.description,
              scoring_method: templateConfig.scoring_method,
              pass_threshold: templateConfig.pass_threshold,
            },
            groups: templateConfig.groups.map((g, idx) => ({
              id: `group-${idx}`,
              name: g.name,
              description: g.description,
            })),
            criteria: templateCriteria.map((c, idx) => ({
              id: c.id,
              name: templateConfig.groups.flatMap((g) => g.criteria)[idx]?.name || `Criterion ${idx + 1}`,
              type: c.type,
              weight: c.weight,
            })),
          },
          change_summary: v === 1
            ? "Initial published version"
            : rng.choice([
                "Updated criteria weights",
                "Added new criteria",
                "Adjusted pass threshold",
                "Refined scoring guide",
                "Minor updates",
              ]),
          changed_by: config.userId,
          created_at: versionDate.toISOString(),
        });

        if (versionError) {
          errors.push(`Template version: ${versionError.message}`);
        } else {
          counts.templateVersions++;
        }
      }
    }

    // 6. Create Callers
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

            // Create call_score_results for detailed scoring (links call to scorecard)
            if (scorecard) {
              const criteriaScores: Record<string, unknown> = {};
              const detailedCriteria = scorecardCriteria as Array<{
                id: string;
                name: string;
                weight: number;
                max_score: number;
              }>;

              let totalWeightedScore = 0;
              detailedCriteria.forEach((criterion) => {
                const criterionScore = Math.round((score / 100) * criterion.max_score * rng.float(0.7, 1.3));
                const cappedScore = Math.min(criterionScore, criterion.max_score);
                const weightedScore = (cappedScore / criterion.max_score) * criterion.weight;
                totalWeightedScore += weightedScore;

                criteriaScores[criterion.id] = {
                  name: criterion.name,
                  score: cappedScore,
                  max_score: criterion.max_score,
                  weight: criterion.weight,
                  weighted_score: Math.round(weightedScore * 10) / 10,
                  feedback: rng.choice([
                    "Strong performance in this area.",
                    "Room for improvement.",
                    "Met expectations.",
                    "Exceeded expectations.",
                    "Needs coaching attention.",
                  ]),
                  highlights: rng.boolean(0.7) ? [rng.choice(STRENGTHS)] : [],
                  improvements: rng.boolean(0.5) ? [rng.choice(IMPROVEMENTS)] : [],
                };
              });

              const { error: scoreResultError } = await supabase.from("call_score_results").insert({
                call_id: call.id,
                scorecard_id: scorecard.id,
                org_id: config.orgId,
                total_score: Math.round(totalWeightedScore * 10) / 10,
                max_possible_score: 100,
                percentage_score: Math.round(totalWeightedScore),
                criteria_scores: criteriaScores,
                summary: analysis.executiveSummary,
                strengths: analysis.strengths,
                improvements: analysis.improvements,
                scored_at: callTimestamp.toISOString(),
                scored_by: rng.choice(["ai", "hybrid"]),
                scorecard_version: 1,
                scorecard_snapshot: {
                  name: scorecard.name,
                  criteria: detailedCriteria,
                },
              });

              if (scoreResultError) {
                errors.push(`Call score result: ${scoreResultError.message}`);
              } else {
                counts.callScoreResults++;
              }
            }

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

        // Create meet_transcript for some analyzed calls (40% chance if we have a connection)
        if (demoConnectionId && status === "analyzed" && call && rng.boolean(0.4)) {
          const meetingCode = `${rng.choice(["abc", "xyz", "demo", "meet"])}-${rng.choice(["def", "ghi", "jkl"])}-${rng.choice(["mno", "pqr", "stu"])}`;
          const conferenceRecordName = `conferenceRecords/${batchId.slice(0, 12)}-${call.id.slice(0, 8)}`;
          const transcriptName = `${conferenceRecordName}/transcripts/${uuidv4().slice(0, 8)}`;

          const meetingStartTime = new Date(callTimestamp);
          const meetingEndTime = new Date(meetingStartTime.getTime() + rng.int(15, 45) * 60 * 1000);

          const { error: transcriptError } = await supabase.from("meet_transcripts").insert({
            user_id: config.userId,
            connection_id: demoConnectionId,
            meeting_code: meetingCode,
            conference_record_name: conferenceRecordName,
            transcript_name: transcriptName,
            transcript_state: "FILE_GENERATED",
            text_content: transcript,
            text_source: "entries",
            entries_count: rng.int(20, 100),
            meeting_start_time: meetingStartTime.toISOString(),
            meeting_end_time: meetingEndTime.toISOString(),
            meeting_space_name: `spaces/${meetingCode}`,
            participants: JSON.stringify([
              { displayName: callerName, email: "demo-caller@kalyxi.com" },
              { displayName: customerName, email: `${customerName.toLowerCase().replace(" ", ".")}@${customerCompany.toLowerCase().replace(/\s+/g, "")}.com` },
            ]),
            metadata: {
              demo: true,
              linked_call_id: call.id,
              organizer: callerName,
            },
          });

          if (transcriptError) {
            errors.push(`Meet transcript: ${transcriptError.message}`);
          } else {
            counts.meetTranscripts++;
          }
        }
      }
    }

    // ========================================================================
    // CREATE COACHING SESSIONS
    // ========================================================================
    // Create sessions linked to some of the calls we just created

    // Fetch calls that are analyzed (good candidates for sessions)
    const { data: analyzedCalls } = await supabase
      .from("calls")
      .select("id, caller_id")
      .eq("org_id", config.orgId)
      .not("demo_batch_id", "is", null)
      .eq("status", "analyzed")
      .limit(Math.ceil(counts.calls * 0.6)); // 60% of calls get sessions

    // Also fetch users for the org to use as coach/agent
    const { data: orgUsers } = await supabase
      .from("users")
      .select("id, role")
      .eq("org_id", config.orgId)
      .limit(20);

    const coaches = orgUsers?.filter((u) => ["admin", "manager", "coach"].includes(u.role)) || [];
    const agents = orgUsers?.filter((u) => ["caller", "coach"].includes(u.role)) || [];

    // Create sessions
    if (analyzedCalls && analyzedCalls.length > 0 && createdTemplates.length > 0) {
      // Also create some sessions without calls
      const numStandaloneSessions = Math.ceil(sizeConfig.callers * 2);
      const allSessionTargets = [
        ...analyzedCalls.map((call) => ({ call_id: call.id, caller_id: call.caller_id })),
        ...Array.from({ length: numStandaloneSessions }, () => ({ call_id: null, caller_id: null })),
      ];

      for (const target of allSessionTargets) {
        // Determine session status
        const statusRand = rng.next();
        let sessionStatus: string;
        let cumWeight = 0;
        for (const [status, weight] of Object.entries(SESSION_STATUS_WEIGHTS)) {
          cumWeight += weight;
          if (statusRand < cumWeight) {
            sessionStatus = status;
            break;
          }
        }
        sessionStatus = sessionStatus! || "pending";

        // Pick a random template
        const templateData = rng.choice(createdTemplates);
        const coach = coaches.length > 0 ? rng.choice(coaches) : null;
        const agent = agents.length > 0 ? rng.choice(agents) : null;

        // Determine dates based on status
        const createdAt = rng.date(60);
        const startedAt = ["in_progress", "completed", "reviewed", "disputed"].includes(sessionStatus)
          ? new Date(createdAt.getTime() + rng.int(1, 24) * 60 * 60 * 1000)
          : null;
        const completedAt = ["completed", "reviewed", "disputed"].includes(sessionStatus)
          ? new Date((startedAt || createdAt).getTime() + rng.int(10, 60) * 60 * 1000)
          : null;
        const reviewedAt = sessionStatus === "reviewed"
          ? new Date((completedAt || createdAt).getTime() + rng.int(1, 48) * 60 * 60 * 1000)
          : null;
        const disputedAt = sessionStatus === "disputed"
          ? new Date((completedAt || createdAt).getTime() + rng.int(1, 24) * 60 * 60 * 1000)
          : null;
        const cancelledAt = sessionStatus === "cancelled"
          ? new Date(createdAt.getTime() + rng.int(1, 12) * 60 * 60 * 1000)
          : null;

        // Build template snapshot for completed sessions
        const templateSnapshot = ["completed", "reviewed", "disputed"].includes(sessionStatus)
          ? {
              criteria: templateData.criteria.map((c) => ({
                id: c.id,
                group_id: c.group_id,
                type: c.type,
                config: c.config,
                weight: c.weight,
                max_score: c.max_score,
                is_auto_fail: c.is_auto_fail,
                auto_fail_threshold: c.auto_fail_threshold,
              })),
              groups: [],
            }
          : null;

        // Insert session
        const { data: session, error: sessionError } = await supabase
          .from("sessions")
          .insert({
            org_id: config.orgId,
            template_id: templateData.id,
            call_id: target.call_id,
            coach_id: coach?.id || config.userId,
            agent_id: agent?.id || null,
            status: sessionStatus,
            coach_notes: ["completed", "reviewed"].includes(sessionStatus)
              ? rng.choice([
                  "Good overall performance. Focus on discovery questions next time.",
                  "Strong closing skills. Work on objection handling.",
                  "Excellent rapport building. Continue the good work!",
                  "Needs improvement in value articulation. Schedule follow-up coaching.",
                  "Great progress since last session. Keep practicing discovery.",
                ])
              : null,
            agent_notes: sessionStatus === "disputed"
              ? "I disagree with the scoring on discovery questions. The customer cut me off before I could ask more questions."
              : null,
            reviewed_by: sessionStatus === "reviewed" ? config.userId : null,
            reviewed_at: reviewedAt?.toISOString() || null,
            reviewer_notes: sessionStatus === "reviewed"
              ? "Reviewed and approved. Agent shows steady improvement."
              : null,
            disputed_at: disputedAt?.toISOString() || null,
            dispute_reason: sessionStatus === "disputed"
              ? "Customer interrupted frequently, preventing proper discovery. Score should reflect this context."
              : null,
            template_version: 1,
            template_snapshot: templateSnapshot,
            created_at: createdAt.toISOString(),
            started_at: startedAt?.toISOString() || null,
            completed_at: completedAt?.toISOString() || null,
            cancelled_at: cancelledAt?.toISOString() || null,
          })
          .select()
          .single();

        if (sessionError) {
          errors.push(`Session: ${sessionError.message}`);
          continue;
        }

        counts.sessions++;

        // Create scores for completed/reviewed/disputed sessions
        if (["completed", "reviewed", "disputed", "in_progress"].includes(sessionStatus)) {
          // Determine overall performance level for this session
          const targetPercentage = sessionStatus === "disputed"
            ? 55 // Disputed sessions tend to be lower scores
            : rng.int(40, 95); // Random target score for variety

          // Score all criteria (or partial for in_progress)
          const criteriaToScore = sessionStatus === "in_progress"
            ? rng.shuffle([...templateData.criteria]).slice(0, Math.ceil(templateData.criteria.length * rng.float(0.3, 0.7)))
            : templateData.criteria;

          for (const criteriaItem of criteriaToScore) {
            const { value, rawScore, normalizedScore } = generateScoreValue(
              criteriaItem.type,
              criteriaItem.config,
              rng,
              targetPercentage
            );

            // Calculate weighted score
            const weightedScore = (normalizedScore * criteriaItem.weight) / 100;

            // Check auto-fail
            const isAutoFailTriggered = criteriaItem.is_auto_fail &&
              criteriaItem.auto_fail_threshold !== null &&
              normalizedScore < criteriaItem.auto_fail_threshold;

            // Decide if this score should be N/A
            const isNa = !criteriaItem.is_auto_fail && rng.boolean(0.05); // 5% chance of N/A

            const { error: scoreError } = await supabase.from("scores").insert({
              session_id: session.id,
              criteria_id: criteriaItem.id,
              criteria_group_id: criteriaItem.group_id,
              value: value,
              raw_score: isNa ? null : rawScore,
              normalized_score: isNa ? null : normalizedScore,
              weighted_score: isNa ? null : weightedScore,
              is_na: isNa,
              is_auto_fail_triggered: isAutoFailTriggered,
              comment: rng.boolean(0.3)
                ? rng.choice([
                    "Good performance here.",
                    "Room for improvement.",
                    "Excellent work!",
                    "Needs coaching attention.",
                    "Met expectations.",
                  ])
                : null,
              criteria_snapshot: {
                type: criteriaItem.type,
                config: criteriaItem.config,
                weight: criteriaItem.weight,
                max_score: criteriaItem.max_score,
              },
              scored_by: coach?.id || config.userId,
              scored_at: (startedAt || createdAt).toISOString(),
            });

            if (scoreError) {
              errors.push(`Score: ${scoreError.message}`);
            } else {
              counts.scores++;
            }
          }
        }

        // Insert session audit log entry
        await supabase.from("session_audit_log").insert({
          session_id: session.id,
          user_id: config.userId,
          action: "created",
          details: { demo: true, status: sessionStatus },
        });
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
    // Coaching platform
    templates: 0,
    criteriaGroups: 0,
    criteria: 0,
    sessions: 0,
    scores: 0,
    templateVersions: 0,
    // Extended data
    callScoreResults: 0,
    meetTranscripts: 0,
  };

  try {
    // Build the filter condition
    const filterCondition = batchId
      ? { demo_batch_id: batchId }
      : { org_id: orgId };

    // ========================================================================
    // Delete extended data first (new tables)
    // ========================================================================

    // Delete meet_transcripts (delete by demo metadata in connection)
    const { data: transcriptsDeleted } = await supabase
      .from("meet_transcripts")
      .delete()
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id || "")
      .filter("metadata->demo", "eq", true)
      .select("id");
    deleted.meetTranscripts = transcriptsDeleted?.length || 0;

    // Delete demo google_connections (only ones with demo email pattern)
    await supabase
      .from("google_connections")
      .delete()
      .eq("google_email", "demo@kalyxi-demo.com");

    // Delete call_score_results (linked to calls)
    const { data: demoCallIds } = await supabase
      .from("calls")
      .select("id")
      .eq("org_id", orgId)
      .not("demo_batch_id", "is", null);

    if (demoCallIds && demoCallIds.length > 0) {
      const { data: scoreResultsDeleted } = await supabase
        .from("call_score_results")
        .delete()
        .in("call_id", demoCallIds.map((c) => c.id))
        .select("id");
      deleted.callScoreResults = scoreResultsDeleted?.length || 0;
    }

    // Delete template_versions (count first, deleted via CASCADE from templates)
    const demoTemplateIds = (
      await supabase
        .from("templates")
        .select("id")
        .eq("org_id", orgId)
        .like("name", "[Demo]%")
    ).data?.map((t) => t.id) || [];

    if (demoTemplateIds.length > 0) {
      const { count: versionsCount } = await supabase
        .from("template_versions")
        .select("id", { count: "exact" })
        .in("template_id", demoTemplateIds);
      deleted.templateVersions = versionsCount || 0;
    }

    // ========================================================================
    // Delete coaching platform data (respecting FKs)
    // Scores are deleted via CASCADE from sessions
    // Sessions
    const { data: sessionsDeleted } = await supabase
      .from("sessions")
      .delete()
      .eq("org_id", orgId)
      .in(
        "template_id",
        (
          await supabase
            .from("templates")
            .select("id")
            .eq("org_id", orgId)
            .like("name", "[Demo]%")
        ).data?.map((t) => t.id) || []
      )
      .select("id");
    deleted.sessions = sessionsDeleted?.length || 0;

    // Criteria (deleted via CASCADE from templates, but count them first)
    const { count: criteriaCount } = await supabase
      .from("criteria")
      .select("id", { count: "exact" })
      .in(
        "template_id",
        (
          await supabase
            .from("templates")
            .select("id")
            .eq("org_id", orgId)
            .like("name", "[Demo]%")
        ).data?.map((t) => t.id) || []
      );
    deleted.criteria = criteriaCount || 0;

    // Criteria Groups (deleted via CASCADE from templates)
    const { count: groupsCount } = await supabase
      .from("criteria_groups")
      .select("id", { count: "exact" })
      .in(
        "template_id",
        (
          await supabase
            .from("templates")
            .select("id")
            .eq("org_id", orgId)
            .like("name", "[Demo]%")
        ).data?.map((t) => t.id) || []
      );
    deleted.criteriaGroups = groupsCount || 0;

    // Templates
    const { data: templatesDeleted } = await supabase
      .from("templates")
      .delete()
      .eq("org_id", orgId)
      .like("name", "[Demo]%")
      .select("id");
    deleted.templates = templatesDeleted?.length || 0;

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
    const [callers, calls, analyses, reports, gradingTemplates, scorecards, scripts, insightTemplates, templates, sessions] =
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
        // Coaching platform - templates with [Demo] prefix
        supabase
          .from("templates")
          .select("id", { count: "exact" })
          .eq("org_id", orgId)
          .like("name", "[Demo]%"),
        // Sessions linked to demo templates
        supabase
          .from("sessions")
          .select("id", { count: "exact" })
          .eq("org_id", orgId)
          .in(
            "template_id",
            (
              await supabase
                .from("templates")
                .select("id")
                .eq("org_id", orgId)
                .like("name", "[Demo]%")
            ).data?.map((t) => t.id) || []
          ),
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
      // Coaching platform
      templates: templates.count || 0,
      sessions: sessions.count || 0,
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
