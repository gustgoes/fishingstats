// /supabase/functions/auto-update-ranking/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Interface para o formato do jogador (bom para organização)
interface Player {
  username: string;
  hotel: string;
  // ... adicione outros campos se precisar deles aqui
}

// Lógica principal da função
serve(async (_req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Busca um lote de 20 jogadores (para o ciclo de 1 minuto)
    const { data: players, error } = await supabaseClient
      .from('ranking')
      .select('username, hotel')
      .order('updatedat', { ascending: true, nullsFirst: true })
      .limit(20);

    if (error) throw error;
    if (!players || players.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum jogador para atualizar."}));
    }

    console.log(`Iniciando ciclo de atualização para ${players.length} jogadores...`);

    // 2. Processa cada jogador UM DE CADA VEZ (em série)
    for (const player of players) {
      await updateSinglePlayer(supabaseClient, player);
      // 3. Pausa por 3 segundos para ser gentil com a API do Habbo
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log("Ciclo de atualização concluído com sucesso.");

    return new Response(JSON.stringify({ message: `Ciclo de atualização concluído para ${players.length} jogadores.` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (err) {
    console.error("Erro fatal no ciclo da Edge Function:", err.message);
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});

    // Array para guardar todas as promessas de atualização
    const updatePromises = playersToUpdate.map(async (player: Player) => {
      try {
        console.log(`Atualizando ${player.username}@${player.hotel}...`);
        
        // 2. Chamar a API do Habbo para cada jogador
        const userRes = await fetch(`https://origins.habbo.${player.hotel}/api/public/users?name=${player.username}`);
        if (!userRes.ok) {
          console.error(`API do Habbo falhou para ${player.username} (user): ${userRes.status}`);
          // Se o usuário não existe mais (404), podemos deletá-lo do ranking
          if (userRes.status === 404) {
             await supabaseClient.from('ranking').delete().match({ username: player.username, hotel: player.hotel });
             console.log(`Jogador ${player.username} deletado do ranking.`);
          }
          return;
        }
        const userData = await userRes.json();
        if (!userData.uniqueId) return;

        const fishingRes = await fetch(`https://origins.habbo.${player.hotel}/api/public/skills/${userData.uniqueId}?skillType=FISHING`);
        if (!fishingRes.ok) {
          console.error(`API do Habbo falhou para ${player.username} (skill): ${fishingRes.status}`);
          return;
        }
        const fishingData = await fishingRes.json();
        
        // 3. Montar o objeto com os dados atualizados
        const updatedPlayer = {
          username: player.username,
          hotel: player.hotel,
          level: fishingData.level,
          experience: fishingData.experience,
          avatarUrl: `https://www.habbo.${player.hotel}/habbo-imaging/avatarimage?figure=${userData.figureString}&size=l&direction=2&head_direction=2&gesture=sml&action=wav`,
          mission: userData.motto,
          // A lógica de emblemas e outras coisas pode ser adicionada aqui se necessário
          fishCaught: fishingData.fishCaught,
          goldFishCaught: fishingData.goldFishCaught,
          rod: fishingData.rod,
          updatedat: new Date().toISOString(), // A data da atualização!
        };

        // 4. Salvar (Upsert) o jogador atualizado no banco
        const { error: upsertError } = await supabaseClient
          .from('ranking')
          .upsert(updatedPlayer, { onConflict: 'username, hotel' });

        if (upsertError) {
          console.error(`Falha ao salvar ${player.username}:`, upsertError);
        } else {
          console.log(`${player.username} atualizado com sucesso!`);
        }

        // 5. Opcional: Adicionar ao histórico de XP também
         if (updatedPlayer.experience) {
           await supabaseClient.from('xp_history').insert({
             username: updatedPlayer.username.toLowerCase(),
             hotel: updatedPlayer.hotel,
             level: updatedPlayer.level,
             experience: updatedPlayer.experience,
             logged_at: new Date().toISOString()
           });
         }

      } catch (e) {
        console.error(`Erro no loop para o jogador ${player.username}:`, e.message);
      }
    });
    
    // Espera todas as atualizações do lote terminarem
    await Promise.all(updatePromises);

    return new Response(JSON.stringify({ message: `${playersToUpdate.length} jogadores processados.` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});