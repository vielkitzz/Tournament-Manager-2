import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { teamId, solarahub_club_id } = await req.json();

    if (!teamId || !solarahub_club_id) {
      return new Response(JSON.stringify({ error: "teamId e solarahub_club_id são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Validar quem é o usuário (Segurança primeiro!)
    const tm2AuthHeader = req.headers.get("Authorization");
    const tm2Url = Deno.env.get("SUPABASE_URL");
    const tm2AnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const tm2ServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // <-- A chave mestre
    
    if (!tm2Url || !tm2AnonKey || !tm2ServiceKey) throw new Error("Credenciais do TM2 ausentes");
    
    const tm2AuthClient = createClient(tm2Url, tm2AnonKey, {
      global: { headers: { Authorization: tm2AuthHeader! } }
    });

    const { data: { user }, error: userError } = await tm2AuthClient.auth.getUser();
    if (userError || !user) throw new Error("Usuário não autenticado no TM2");

    // 1.5 CRIAR O CLIENTE ADMIN PARA SALVAR NO BANCO (Ignora o RLS)
    const tm2AdminClient = createClient(tm2Url, tm2ServiceKey);

    // 2. Cliente SolaraHub (Origem)
    const solaraUrl = Deno.env.get("SOLARAHUB_URL");
    const solaraKey = Deno.env.get("SOLARAHUB_ANON_KEY");
    
    if (!solaraUrl || !solaraKey) throw new Error("Credenciais do SolaraHub ausentes");
    
    const solaraClient = createClient(solaraUrl, solaraKey);

    // 3. Busca os jogadores no SolaraHub (já corrigido com 'club_id')
    const { data: solaraPlayers, error: fetchError } = await solaraClient
      .from("players") 
      .select("*")
      .eq("club_id", solarahub_club_id);

    if (fetchError) throw fetchError;
    
    if (!solaraPlayers || solaraPlayers.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "Nenhum jogador encontrado", players: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Formata para o TM2
    const playersToInsert = solaraPlayers.map(p => ({
      user_id: user.id,            // ID do usuário validado
      team_id: teamId,             // ID do time TM2
      master_player_id: p.id,      // ID original do SolaraHub
      name: p.name,
      nationality: p.nationality,
      position: p.position,
      age: p.age,
      shirt_number: p.shirt_number,
      skill: p.skill ?? 70,
      photo_url: p.photo_url,
      season_year: p.season_year
    }));

    // 5. Upsert no TM2 usando o ADMIN CLIENT (tm2AdminClient)
    const { data: insertedPlayers, error: insertError } = await tm2AdminClient
      .from("players")
      .upsert(playersToInsert, { onConflict: "master_player_id" })
      .select();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, players: insertedPlayers }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) { {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
