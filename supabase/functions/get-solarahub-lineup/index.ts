import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Lida com requisições CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { solarahub_club_id } = await req.json();

    if (!solarahub_club_id) {
      return new Response(JSON.stringify({ error: "solarahub_club_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SOLARAHUB_URL");
    const key = Deno.env.get("SOLARAHUB_ANON_KEY");

    if (!url || !key) {
      return new Response(JSON.stringify({ error: "SolaraHub credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cria o cliente Supabase apontando para o banco do Solara Hub
    const solara = createClient(url, key);

    const { data, error } = await solara
      .schema("public")
      .from("clubs")
      .select("lineup")
      .eq("id", solarahub_club_id)
      .maybeSingle();

    if (error) {
      console.error("Erro na consulta ao SolaraHub:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retorna o lineup ou um objeto vazio caso o lineup seja null
    return new Response(JSON.stringify({ lineup: data?.lineup ?? null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro inesperado na Edge Function:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
