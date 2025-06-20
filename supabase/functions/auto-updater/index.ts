// /supabase/functions/auto-updater/index.ts (VERSÃO COM ATUALIZAÇÃO INTERCALADA)

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// As interfaces continuam as mesmas
interface Player {
  username: string;
  hotel: string;
}
interface HabboUserData { /* ... */ }
interface HabboFishingData { /* ... */ }

// A função de atualizar um jogador continua a mesma
async function updateSinglePlayer(supabase: SupabaseClient, player: Player) {
  try {
    console.log(`Iniciando atualização para: ${player.username}@${player.hotel}`);
    const userRes = await fetch(`https://origins.habbo.${player.hotel}/api/public/users?name=${player.username}`);
    if (!userRes.ok) {
      if (userRes.status === 404) {
        console.log(`Usuário ${player.username} não encontrado, marcando como inativo.`);
        await supabase.from('ranking').update({ status: 'not_found_api' }).match({ username: player.username, hotel: player.hotel });
      } else {
        console.error(`Erro na API de usuário para ${player.username}: ${userRes.status}`);
      }
      return;
    }
    const userData: HabboUserData = await userRes.json();
    if (!userData.uniqueId) return;
    const fishingRes = await fetch(`https://origins.habbo.${player.hotel}/api/public/skills/${userData.uniqueId}?skillType=FISHING`);
    if (!fishingRes.ok) {
      console.error(`Erro na API de skill para ${player.username}: ${fishingRes.status}`);
      return;
    }
    const fishingData: HabboFishingData = await fishingRes.json();
    const playerToSave = {
      username: player.username.toLowerCase(), hotel: player.hotel, level: fishingData.level,
      experience: fishingData.experience,
      avatarUrl: `https://www.habbo.${player.hotel}/habbo-imaging/avatarimage?figure=${userData.figureString}&size=l&direction=2&head_direction=2`,
      mission: userData.motto, badges: userData.selectedBadges || [], fishCaught: fishingData.fishCaught,
      goldFishCaught: fishingData.goldFishCaught, rod: fishingData.rod, updatedat: new Date().toISOString(), status: null, // Limpa o status caso o jogador volte
    };
    const { error: upsertError } = await supabase.from('ranking').upsert(playerToSave, { onConflict: 'username, hotel' });
    if (upsertError) throw upsertError;
    if (playerToSave.experience) {
      await supabase.from('xp_history').insert({
        username: playerToSave.username, hotel: playerToSave.hotel, level: playerToSave.level,
        experience: playerToSave.experience, logged_at: playerToSave.updatedat
      });
    }
    console.log(`✅ Sucesso ao atualizar ${player.username}`);
  } catch (error) {
    console.error(`❌ Falha ao processar ${player.username}:`, error.message);
  }
}

// --- AQUI ESTÁ A MUDANÇA PRINCIPAL ---
// A função principal que é executada pelo agendador
serve(async (_req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const hoteisParaAtualizar = ['com.br', 'com', 'es'];
    let jogadoresParaAtualizar: Player[] = [];

    // 1. Busca o jogador mais desatualizado de CADA hotel
    for (const hotel of hoteisParaAtualizar) {
      const { data: jogador, error } = await supabaseClient
        .from('ranking')
        .select('username, hotel')
        .eq('hotel', hotel)
        .order('updatedat', { ascending: true, nullsFirst: true })
        .limit(1)
        .single();

      if (jogador && !error) {
        jogadoresParaAtualizar.push(jogador);
      }
    }

    if (jogadoresParaAtualizar.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum jogador para atualizar." }), { headers: { 'Content-Type': 'application/json' } });
    }

    console.log(`Iniciando ciclo de atualização intercalada para ${jogadoresParaAtualizar.length} jogadores...`);

    // 2. Processa cada um dos jogadores encontrados (no máximo 3), um de cada vez
    for (const jogador of jogadoresParaAtualizar) {
      await updateSinglePlayer(supabaseClient, jogador);
      // Pausa de 1 segundo entre cada chamada para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log("Ciclo de atualização intercalada concluído com sucesso.");
    return new Response(JSON.stringify({ message: `Ciclo concluído para ${jogadoresParaAtualizar.length} jogadores.` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (err) {
    console.error("Erro fatal no ciclo da Edge Function:", err.message);
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});