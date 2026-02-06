import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, errorResponse, createAuditLog, isValidUUID } from "@/lib/api-utils";

/**
 * POST /api/calls/upload
 * Upload an audio file for transcription and analysis.
 *
 * NOTE: This endpoint requires Supabase Storage to be configured with a
 * 'call-recordings' bucket. Audio processing is queued and handled
 * asynchronously by a separate worker.
 */
export async function POST(request: Request) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const callerId = formData.get("caller_id") as string;
    const customerName = formData.get("customer_name") as string | null;
    const customerCompany = formData.get("customer_company") as string | null;
    const durationStr = formData.get("duration") as string | null;

    // Validate required fields
    if (!file) {
      return errorResponse("Audio file is required", 400);
    }

    if (!callerId || !isValidUUID(callerId)) {
      return errorResponse("Valid caller_id is required", 400);
    }

    // Validate file type
    const validAudioTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/webm",
      "audio/ogg",
      "audio/m4a",
      "audio/x-m4a",
    ];

    if (!validAudioTypes.includes(file.type)) {
      return errorResponse(
        "Invalid file type. Supported formats: MP3, WAV, WebM, OGG, M4A",
        400
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return errorResponse("File size exceeds 50MB limit", 400);
    }

    const supabase = await createClient();

    // Verify caller exists in org
    const { data: caller } = await supabase
      .from("callers")
      .select("id, name")
      .eq("id", callerId)
      .eq("org_id", orgId!)
      .single();

    if (!caller) {
      return errorResponse("Caller not found in your organization", 404);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "mp3";
    const fileName = `${orgId}/${callerId}/${timestamp}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("call-recordings")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      // Check if bucket doesn't exist
      if (uploadError.message.includes("Bucket not found")) {
        return errorResponse(
          "Audio upload storage not configured. Contact administrator.",
          503
        );
      }
      return errorResponse("Failed to upload audio file", 500);
    }

    // Get public URL for the recording
    const { data: urlData } = supabase.storage
      .from("call-recordings")
      .getPublicUrl(fileName);

    const recordingUrl = urlData?.publicUrl;

    // Create call record with pending status for transcription
    const { data: call, error: callError } = await supabase
      .from("calls")
      .insert({
        org_id: orgId!,
        caller_id: callerId,
        raw_notes: `[Audio upload - pending transcription] ${file.name}`,
        source: "manual",
        status: "pending",
        customer_name: customerName,
        customer_company: customerCompany,
        duration: durationStr ? parseInt(durationStr, 10) : null,
        recording_url: recordingUrl,
        call_timestamp: new Date().toISOString(),
        metadata: {
          upload_filename: file.name,
          upload_size: file.size,
          upload_type: file.type,
          storage_path: fileName,
          requires_transcription: true,
        },
      })
      .select()
      .single();

    if (callError) {
      // Rollback: delete uploaded file
      await supabase.storage.from("call-recordings").remove([fileName]);
      console.error("Call creation error:", callError);
      return errorResponse("Failed to create call record", 500);
    }

    // Queue for processing (transcription + analysis)
    const { error: queueError } = await supabase.from("processing_queue").insert({
      org_id: orgId!,
      call_id: call.id,
      status: "queued",
      priority: 1, // Higher priority for audio uploads
    });

    if (queueError) {
      console.error("Queue error:", queueError);
      // Non-fatal - call was created, just not queued
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "call.uploaded",
      "call",
      call.id,
      undefined,
      {
        caller_id: callerId,
        filename: file.name,
        size: file.size,
      },
      request
    );

    return NextResponse.json(
      {
        data: {
          id: call.id,
          caller_id: call.caller_id,
          caller_name: caller.name,
          status: call.status,
          recording_url: recordingUrl,
          message: "Audio uploaded successfully. Transcription and analysis queued.",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return errorResponse("Failed to upload call", 500);
  }
}
