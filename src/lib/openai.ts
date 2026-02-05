import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
  const uint8Array = new Uint8Array(audioBuffer);
  const blob = new Blob([uint8Array], { type: "audio/mp3" });
  const file = new File([blob], filename, { type: "audio/mp3" });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "text",
  });

  return transcription;
}

export async function analyzeCall(transcription: string): Promise<CallAnalysis> {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `You are an expert sales call analyst. Analyze the following sales call transcription and provide detailed insights. Return your analysis as a JSON object with the following structure:
{
  "overallScore": number (0-100),
  "sentimentScore": number (-1 to 1),
  "sentimentLabel": "positive" | "neutral" | "negative",
  "talkRatio": number (0-1, representing sales rep talk time),
  "keyTopics": string[] (main topics discussed),
  "objections": string[] (customer objections raised),
  "actionItems": string[] (follow-up actions needed),
  "summary": string (2-3 sentence summary),
  "strengths": string[] (what the sales rep did well),
  "improvements": string[] (areas for improvement),
  "nextSteps": string[] (recommended next steps),
  "competitorMentions": string[] (competitors mentioned),
  "pricingDiscussed": boolean,
  "decisionMakerPresent": boolean,
  "followUpRequired": boolean,
  "dealProbability": number (0-100),
  "insights": [
    {
      "type": "strength" | "improvement" | "objection" | "opportunity" | "risk",
      "title": string,
      "description": string,
      "importance": "high" | "medium" | "low"
    }
  ]
}`
      },
      {
        role: "user",
        content: transcription
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  return JSON.parse(content) as CallAnalysis;
}

export interface CallAnalysis {
  overallScore: number;
  sentimentScore: number;
  sentimentLabel: "positive" | "neutral" | "negative";
  talkRatio: number;
  keyTopics: string[];
  objections: string[];
  actionItems: string[];
  summary: string;
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  competitorMentions: string[];
  pricingDiscussed: boolean;
  decisionMakerPresent: boolean;
  followUpRequired: boolean;
  dealProbability: number;
  insights: {
    type: "strength" | "improvement" | "objection" | "opportunity" | "risk";
    title: string;
    description: string;
    importance: "high" | "medium" | "low";
  }[];
}
