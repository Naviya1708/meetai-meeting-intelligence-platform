import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
    }

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openAiKey = Deno.env.get("OPENAI_API_KEY");

    if (!authHeader || !supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Authentication is required." }), { status: 401, headers: jsonHeaders });
    }
    if (!openAiKey) {
      return new Response(JSON.stringify({ error: "Speech-to-text is not configured. Add OPENAI_API_KEY to the deployed function secrets." }), { status: 503, headers: jsonHeaders });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Your session is invalid or expired." }), { status: 401, headers: jsonHeaders });
    }

    const body = await req.json() as { meetingId?: string; storagePath?: string; fileName?: string; mimeType?: string };
    if (!body.meetingId || !body.storagePath || !body.fileName) {
      return new Response(JSON.stringify({ error: "meetingId, storagePath, and fileName are required." }), { status: 400, headers: jsonHeaders });
    }
    if (!body.storagePath.startsWith(`${user.id}/`)) {
      return new Response(JSON.stringify({ error: "You can only process your own recording." }), { status: 403, headers: jsonHeaders });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: meeting, error: meetingError } = await adminClient
      .from("meetings")
      .select("id, user_id")
      .eq("id", body.meetingId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (meetingError || !meeting) {
      return new Response(JSON.stringify({ error: "Meeting not found." }), { status: 404, headers: jsonHeaders });
    }

    const { data: file, error: downloadError } = await adminClient.storage
      .from("meeting-recordings")
      .download(body.storagePath);
    if (downloadError || !file) {
      return new Response(JSON.stringify({ error: "The uploaded recording could not be read." }), { status: 422, headers: jsonHeaders });
    }

    const formData = new FormData();
    const fileType = body.mimeType || file.type || "application/octet-stream";
    formData.append("file", new File([file], body.fileName, { type: fileType }));
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "segment");

    const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}` },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const detail = await transcriptionResponse.text();
      console.error("Speech-to-text provider error", detail);
      return new Response(JSON.stringify({ error: "Speech-to-text could not process this recording." }), { status: 502, headers: jsonHeaders });
    }

    const transcription = await transcriptionResponse.json() as {
      text?: string;
      language?: string;
      segments?: { id?: number; start?: number; end?: number; text?: string }[];
    };
    if (!transcription.text?.trim()) {
      return new Response(JSON.stringify({ error: "No speech was detected in this recording." }), { status: 422, headers: jsonHeaders });
    }

    const segments = (transcription.segments || []).map((segment, index) => ({
      speaker: "Speaker",
      text: segment.text?.trim() || "",
      start: Number(segment.start || index * 10),
      end: Number(segment.end || (index + 1) * 10),
    })).filter((segment) => segment.text.length > 0);

    const { error: saveError } = await adminClient.from("transcripts").upsert({
      meeting_id: meeting.id,
      full_text: transcription.text.trim(),
      segments,
      language: transcription.language || "en",
    }, { onConflict: "meeting_id" });
    if (saveError) {
      console.error("Transcript save error", saveError);
      return new Response(JSON.stringify({ error: "The transcript was generated but could not be saved." }), { status: 500, headers: jsonHeaders });
    }

    const { error: meetingUpdateError } = await adminClient.from("meetings").update({
      recording_url: body.storagePath,
      status: "completed",
      updated_at: new Date().toISOString(),
    }).eq("id", meeting.id).eq("user_id", user.id);
    if (meetingUpdateError) {
      console.error("Meeting update error", meetingUpdateError);
      return new Response(JSON.stringify({ error: "The transcript was saved, but the meeting could not be updated." }), { status: 500, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({
      meetingId: meeting.id,
      transcript: { full_text: transcription.text.trim(), segments, language: transcription.language || "en" },
    }), { status: 200, headers: jsonHeaders });
  } catch (error) {
    console.error("Transcription function error", error);
    return new Response(JSON.stringify({ error: "Unexpected transcription error. Please try again." }), { status: 500, headers: jsonHeaders });
  }
});
