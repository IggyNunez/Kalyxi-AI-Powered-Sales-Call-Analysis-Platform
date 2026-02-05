import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { transcribeAudio, analyzeCall } from "@/lib/openai";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const customerName = formData.get("customerName") as string;
    const customerCompany = formData.get("customerCompany") as string;

    if (!file || !title) {
      return NextResponse.json(
        { error: "File and title are required" },
        { status: 400 }
      );
    }

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = join(process.cwd(), "uploads");
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${uuidv4()}-${file.name}`;
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // Create call record
    const call = await db.call.create({
      data: {
        title,
        description: description || null,
        audioFileName: fileName,
        audioUrl: `/uploads/${fileName}`,
        customerName: customerName || null,
        customerCompany: customerCompany || null,
        userId: session.user.id,
        status: "processing",
      },
    });

    // Process in background (simplified - in production use a job queue)
    processCall(call.id, buffer, file.name).catch(console.error);

    return NextResponse.json(call);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload call" },
      { status: 500 }
    );
  }
}

async function processCall(callId: string, audioBuffer: Buffer, filename: string) {
  try {
    // Transcribe audio
    const transcription = await transcribeAudio(audioBuffer, filename);

    // Update call with transcription
    await db.call.update({
      where: { id: callId },
      data: { transcription },
    });

    // Analyze transcription
    const analysis = await analyzeCall(transcription);

    // Save analysis
    await db.analysis.create({
      data: {
        callId,
        overallScore: analysis.overallScore,
        sentimentScore: analysis.sentimentScore,
        sentimentLabel: analysis.sentimentLabel,
        talkRatio: analysis.talkRatio,
        keyTopics: JSON.stringify(analysis.keyTopics),
        objections: JSON.stringify(analysis.objections),
        actionItems: JSON.stringify(analysis.actionItems),
        summary: analysis.summary,
        strengths: JSON.stringify(analysis.strengths),
        improvements: JSON.stringify(analysis.improvements),
        nextSteps: JSON.stringify(analysis.nextSteps),
        competitorMentions: JSON.stringify(analysis.competitorMentions),
        pricingDiscussed: analysis.pricingDiscussed,
        decisionMakerPresent: analysis.decisionMakerPresent,
        followUpRequired: analysis.followUpRequired,
        dealProbability: analysis.dealProbability,
      },
    });

    // Save insights
    if (analysis.insights && analysis.insights.length > 0) {
      await db.insight.createMany({
        data: analysis.insights.map((insight) => ({
          callId,
          type: insight.type,
          title: insight.title,
          description: insight.description,
          importance: insight.importance,
        })),
      });
    }

    // Update call status
    await db.call.update({
      where: { id: callId },
      data: { status: "completed" },
    });
  } catch (error) {
    console.error("Processing error:", error);
    await db.call.update({
      where: { id: callId },
      data: { status: "failed" },
    });
  }
}
