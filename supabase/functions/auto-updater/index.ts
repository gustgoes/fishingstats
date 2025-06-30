// /supabase/functions/auto-updater/index.ts (VERSÃO COM ACUMULADOR DE EMBLEMAS)

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface Player {
  username: string;
  hotel: string;
}
interface HabboUserData {
  uniqueId: string;
  figureString: string;
  motto: string;
  selectedBadges: any[];
}
interface HabboFishingData {
  level: number;
  experience: number;
  fishCaught: number;
  goldFishCaught: number;
  rod: any;
}
interface Badge {
  code: string;
  name: string;
  description: string;
}

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
    if (!fishingRes.ok) return;
    const fishingData: HabboFishingData = await fishingRes.json();

    // --- 👇 NOVA LÓGICA DE ACUMULAÇÃO DE EMBLEMAS 👇 ---
    
    // 1. Pega os emblemas que já temos no nosso banco de dados
    const { data: existingPlayer } = await supabase
      .from('ranking')
      .select('badges')
      .eq('username', player.username)
      .eq('hotel', player.hotel)
      .single();

    const apiBadges: Badge[] = userData.selectedBadges || [];
    const dbBadges: Badge[] = existingPlayer?.badges || [];
    
    // 2. Usa um Map para juntar as duas listas e remover duplicatas automaticamente
    const combinedBadgesMap = new Map<string, Badge>();
    
    // Adiciona os emblemas antigos primeiro
    dbBadges.forEach(badge => {
      if (badge && badge.code) combinedBadgesMap.set(badge.code, badge);
    });
    
    // Adiciona/sobrescreve com os emblemas novos da API
    apiBadges.forEach(badge => {
      if (badge && badge.code) combinedBadgesMap.set(badge.code, badge);
    });

    // 3. Cria a lista final e completa
    const finalBadges = Array.from(combinedBadgesMap.values());

    // --- FIM DA NOVA LÓGICA ---

    const playerToSave = {
      username: player.username.toLowerCase(),
      hotel: player.hotel,
      level: fishingData.level,
      experience: fishingData.experience,
      avatarUrl: `https://www.habbo.${player.hotel}/habbo-imaging/avatarimage?figure=${userData.figureString}&size=l&direction=2&head_direction=2`,
      mission: userData.motto,
      badges: finalBadges, // <-- Usa a nova lista acumulada
      fishCaught: fishingData.fishCaught,
      goldFishCaught: fishingData.goldFishCaught,
      rod: fishingData.rod,
      updatedat: new Date().toISOString(),
      status: null,
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

// A função 'serve' continua a mesma
serve(async (_req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const hoteisParaAtualizar = ['com.br', 'com', 'es'];
    let jogadoresParaAtualizar: Player[] = [];
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
    for (const jogador of jogadoresParaAtualizar) {
      await updateSinglePlayer(supabaseClient, jogador);
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