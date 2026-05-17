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

    const tm2Url = Deno.env.get("SUPABASE_URL")!;
    const tm2AnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const tm2ServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Cliente de AUTENTICAÇÃO
    // Usa o token da requisição apenas para checar quem é o usuário logado.
    const tm2AuthClient = createClient(tm2Url, tm2AnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    const {
      data: { user },
      error: userError,
    } = await tm2AuthClient.auth.getUser();
    if (userError || !user) throw new Error("Usuário não autenticado no TM2");

    // 2. Cliente ADMIN
    // Isolado: NÃO repassa o header do usuário. Isso garante o Bypass absoluto do RLS.
    const tm2AdminClient = createClient(tm2Url, tm2ServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 3. Cliente SolaraHub
    const solaraUrl = Deno.env.get("SOLARAHUB_URL")!;
    const solaraKey = Deno.env.get("SOLARAHUB_ANON_KEY")!;
    const solaraClient = createClient(solaraUrl, solaraKey);

    // 4. Busca os jogadores no SolaraHub
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

    // 5. Formata os jogadores para a tabela do TM2
    const playersToInsert = solaraPlayers.map((p: any) => ({
      user_id: user.id,
      team_id: teamId,
      master_player_id: p.id,
      name: p.name,
      nationality: p.nationality,
      position: p.position,
      age: p.age,
      shirt_number: p.shirt_number,
      skill: p.habilidade ?? 70,
      photo_url: p.photo_url,
      season_year: p.season_year,
    }));

    // 6. UPSERT com o ADMIN CLIENT
    // O Supabase irá ignorar o RLS e escrever diretamente no banco.
    const { data: insertedPlayers, error: insertError } = await tm2AdminClient
      .from("players")
      .upsert(playersToInsert, { onConflict: "master_player_id" })
      .select();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, players: insertedPlayers }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
