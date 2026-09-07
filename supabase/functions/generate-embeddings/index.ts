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

interface EmbeddingItem {
  embedding: number[];
  index: number;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Uses Voyage AI's embeddings API (Anthropic's recommended pairing).
// If you decided on OpenAI instead, swap the fetch call below —
// same shape, different URL/auth header, and change vector(1536)
// in your schema if the output size differs.

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

  let project_id: string | undefined;
  try {
    const body = await req.json();
    project_id = body?.project_id;
  } catch (_err) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: corsHeaders }
    );
  }

  if (!project_id) {
    return new Response(
      JSON.stringify({ error: "project_id required" }),
      { status: 400, headers: corsHeaders }
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Pull every activity in this project still missing an embedding
  const { data: activities, error } = await supabase
    .from("schedule_activities")
    .select("id, discipline, description, location, asset")
    .eq("project_id", project_id)
    .is("embedding", null);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }

  const typedActivities = (activities ?? []) as Activity[];

  if (!typedActivities.length) {
    return new Response(
      JSON.stringify({ updated: 0, message: "Nothing to embed" }),
      { status: 200, headers: corsHeaders }
    );
  }

  // Same input format your matching function's query text should use later
  const inputs = typedActivities.map(
    (a: Activity) => `${a.discipline ?? ""} | ${a.description} | ${a.location ?? ""} | ${a.asset ?? ""}`
  );

  const voyageRes = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: inputs, model: "voyage-3" }),
  });

  if (!voyageRes.ok) {
    const errText = await voyageRes.text();
    return new Response(
      JSON.stringify({ error: "Embedding API failed", detail: errText }),
      { status: 502, headers: corsHeaders }
    );
  }

  const voyageData = await voyageRes.json();
  const embeddings: EmbeddingItem[] | undefined = voyageData?.data;

  if (!embeddings || !Array.isArray(embeddings)) {
    return new Response(
      JSON.stringify({ error: "Invalid response format from Voyage AI API" }),
      { status: 502, headers: corsHeaders }
    );
  }

  // Write each embedding back to its activity
  const updates = await Promise.all(
    typedActivities.map((activity: Activity, i: number) =>
      supabase
        .from("schedule_activities")
        .update({ embedding: embeddings[i]?.embedding })
        .eq("id", activity.id)
    )
  );

  const failed = updates.filter((u: { error: unknown }) => u.error);
  return new Response(
    JSON.stringify({ updated: typedActivities.length - failed.length, failed: failed.length }),
    { status: 200, headers: corsHeaders }
  );
});