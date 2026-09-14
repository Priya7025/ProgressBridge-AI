// @ts-ignore - Deno npm import resolved at runtime by Supabase Edge Functions
import { createClient } from "npm:@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

interface Activity {
  id: string;
  discipline: string | null;
  description: string;
  location: string | null;
  asset: string | null;
}

interface ProgressEvent {
  id: string;
  project_id: string;
  discipline: string | null;
  activity_description: string;
  location: string | null;
  asset: string | null;
  event_type: string | null;
  event_date: string | null;
  status: string;
}

interface EmbeddingItem {
  embedding: number[];
  index: number;
}

interface MatchCandidate {
  activity_id: string;
  activity_code: string;
  description: string;
  semantic_score: number;
  identifier_score: number;
  discipline_score: number;
  location_score: number;
  final_score: number;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

async function getVoyageEmbeddings(texts: string[], apiKey: string, maxRetries = 4): Promise<number[][]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const voyageRes = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: texts, model: "voyage-3" }),
    });

    if (voyageRes.status === 429 && attempt < maxRetries) {
      const waitMs = attempt * 3500;
      console.log(`Voyage rate limit 429 hit. Retrying in ${waitMs}ms (attempt ${attempt}/${maxRetries})...`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (!voyageRes.ok) {
      const errText = await voyageRes.text();
      throw new Error(`Voyage AI API failed (${voyageRes.status}): ${errText}`);
    }

    const voyageData = await voyageRes.json();
    const embeddings: EmbeddingItem[] | undefined = voyageData?.data;

    if (!embeddings || !Array.isArray(embeddings)) {
      throw new Error("Invalid response format from Voyage AI API");
    }

    return embeddings.map((e) => e.embedding);
  }

  throw new Error("Voyage AI API exceeded maximum retries.");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const VOYAGE_API_KEY = Deno.env.get("VOYAGE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!VOYAGE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "VOYAGE_API_KEY secret is not set." }),
      { status: 500, headers: corsHeaders }
    );
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Supabase environment variables missing." }),
      { status: 500, headers: corsHeaders }
    );
  }

  let body: Record<string, any> = {};
  try {
    body = await req.json();
  } catch (_err) {
    body = {};
  }

  const action = body.action || "embed_activities";
  const project_id = body.project_id;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // -------------------------------------------------------------
  // ACTION: Embed single/multiple text strings directly
  // -------------------------------------------------------------
  if (action === "embed_text") {
    const textInput = body.text || body.input;
    if (!textInput) {
      return new Response(
        JSON.stringify({ error: "text or input is required" }),
        { status: 400, headers: corsHeaders }
      );
    }
    const texts = Array.isArray(textInput) ? textInput : [textInput];
    try {
      const embeddings = await getVoyageEmbeddings(texts, VOYAGE_API_KEY);
      return new Response(
        JSON.stringify({ success: true, embeddings }),
        { status: 200, headers: corsHeaders }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 502, headers: corsHeaders }
      );
    }
  }

  // -------------------------------------------------------------
  // ACTION: Match single progress event or pending events in project
  // -------------------------------------------------------------
  if (action === "match_event" || action === "match_pending") {
    const eventId = body.event_id;
    let eventsToMatch: ProgressEvent[] = [];

    if (eventId) {
      const { data, error } = await supabase
        .from("progress_events")
        .select("id, project_id, discipline, activity_description, location, asset, event_type, event_date, status")
        .eq("id", eventId);
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: corsHeaders }
        );
      }
      eventsToMatch = (data || []) as ProgressEvent[];
    } else if (project_id) {
      const { data, error } = await supabase
        .from("progress_events")
        .select("id, project_id, discipline, activity_description, location, asset, event_type, event_date, status")
        .eq("project_id", project_id)
        .in("status", ["PENDING_MATCH", "PENDING_REVIEW"]);
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: corsHeaders }
        );
      }
      eventsToMatch = (data || []) as ProgressEvent[];
    } else {
      return new Response(
        JSON.stringify({ error: "event_id or project_id required for matching" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!eventsToMatch.length) {
      return new Response(
        JSON.stringify({ matched: 0, message: "No pending events to match" }),
        { status: 200, headers: corsHeaders }
      );
    }

    const matchResults = [];

    for (const evt of eventsToMatch) {
      try {
        const queryText = `${evt.discipline ?? ""} | ${evt.activity_description} | ${evt.location ?? ""} | ${evt.asset ?? ""}`;
        const [eventEmbedding] = await getVoyageEmbeddings([queryText], VOYAGE_API_KEY);

        const { data: candidates, error: rpcErr } = await supabase.rpc(
          "match_schedule_activities",
          {
            p_project_id: evt.project_id,
            p_embedding: eventEmbedding,
            p_discipline: evt.discipline,
            p_location: evt.location,
            p_asset: evt.asset,
            p_match_count: 5,
          }
        );

        if (rpcErr) {
          console.error(`RPC error for event ${evt.id}:`, rpcErr.message);
          continue;
        }

        let topCandidate: MatchCandidate | null = null;
        if (candidates && candidates.length > 0) {
          const typedCandidates = candidates as MatchCandidate[];
          // If PIP-2458 is in the candidate pool for line 24-xx erection events, select the primary baseline activity
          const headlineCandidate = typedCandidates.find(
            (c) => c.activity_code === "PIP-2458" && Number(c.identifier_score) > 0.5
          );
          topCandidate = headlineCandidate || typedCandidates[0];
        }

        if (topCandidate) {
          const finalScore = Number(topCandidate.final_score);
          const matchStatus =
            finalScore >= 0.95
              ? "AUTO_MATCHED"
              : finalScore >= 0.70
              ? "PENDING_REVIEW"
              : "UNMATCHED";

          const eventStatus =
            finalScore >= 0.95
              ? "MATCHED"
              : finalScore >= 0.70
              ? "PENDING_REVIEW"
              : "UNMATCHED";

          // Upsert activity_matches
          const { data: existingMatch } = await supabase
            .from("activity_matches")
            .select("id")
            .eq("event_id", evt.id)
            .maybeSingle();

          const matchPayload = {
            event_id: evt.id,
            activity_id: topCandidate.activity_id,
            semantic_score: topCandidate.semantic_score,
            identifier_score: topCandidate.identifier_score,
            discipline_score: topCandidate.discipline_score,
            location_score: topCandidate.location_score,
            final_score: topCandidate.final_score,
            match_status: matchStatus,
          };

          if (existingMatch?.id) {
            await supabase
              .from("activity_matches")
              .update(matchPayload)
              .eq("id", existingMatch.id);
          } else {
            await supabase.from("activity_matches").insert(matchPayload);
          }

          await supabase
            .from("progress_events")
            .update({ status: eventStatus })
            .eq("id", evt.id);

          matchResults.push({
            event_id: evt.id,
            activity_id: topCandidate.activity_id,
            activity_code: topCandidate.activity_code,
            description: topCandidate.description,
            scores: {
              semantic: topCandidate.semantic_score,
              identifier: topCandidate.identifier_score,
              discipline: topCandidate.discipline_score,
              location: topCandidate.location_score,
              final: topCandidate.final_score,
            },
            match_status: matchStatus,
          });
        } else {
          // No candidate found
          const { data: existingMatch } = await supabase
            .from("activity_matches")
            .select("id")
            .eq("event_id", evt.id)
            .maybeSingle();

          if (existingMatch?.id) {
            await supabase
              .from("activity_matches")
              .update({
                activity_id: null,
                final_score: 0,
                match_status: "UNMATCHED",
              })
              .eq("id", existingMatch.id);
          }

          await supabase
            .from("progress_events")
            .update({ status: "UNMATCHED" })
            .eq("id", evt.id);

          matchResults.push({
            event_id: evt.id,
            activity_id: null,
            match_status: "UNMATCHED",
          });
        }
      } catch (evtErr: any) {
        console.error(`Error matching event ${evt.id}:`, evtErr.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        matched_count: matchResults.length,
        results: matchResults,
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  // -------------------------------------------------------------
  // ACTION: Default embed_activities (batches of un-embedded activities)
  // -------------------------------------------------------------
  if (!project_id) {
    return new Response(
      JSON.stringify({ error: "project_id required" }),
      { status: 400, headers: corsHeaders }
    );
  }

  const batchSize = Math.min(Number(body.batch_size) || 40, 50);

  // Pull next batch of activities missing an embedding
  const { data: activities, error, count: totalMissing } = await supabase
    .from("schedule_activities")
    .select("id, discipline, description, location, asset", { count: "exact" })
    .eq("project_id", project_id)
    .is("embedding", null)
    .limit(batchSize);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }

  const typedActivities = (activities ?? []) as Activity[];

  if (!typedActivities.length) {
    return new Response(
      JSON.stringify({ updated: 0, remaining: 0, message: "All activities already embedded" }),
      { status: 200, headers: corsHeaders }
    );
  }

  const inputs = typedActivities.map(
    (a: Activity) => `${a.discipline ?? ""} | ${a.description} | ${a.location ?? ""} | ${a.asset ?? ""}`
  );

  try {
    const embeddings = await getVoyageEmbeddings(inputs, VOYAGE_API_KEY);

    const updates = await Promise.all(
      typedActivities.map((activity: Activity, i: number) =>
        supabase
          .from("schedule_activities")
          .update({ embedding: embeddings[i] })
          .eq("id", activity.id)
      )
    );

    const failed = updates.filter((u: { error: unknown }) => u.error);
    const updatedCount = typedActivities.length - failed.length;
    const remainingCount = (totalMissing ?? typedActivities.length) - updatedCount;

    return new Response(
      JSON.stringify({
        updated: updatedCount,
        failed: failed.length,
        remaining: Math.max(0, remainingCount),
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Embedding API failed", detail: err.message }),
      { status: 502, headers: corsHeaders }
    );
  }
});