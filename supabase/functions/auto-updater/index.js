"use strict";
// /supabase/functions/auto-updater/index.ts (VERSÃO COM ACUMULADOR DE EMBLEMAS)
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_2_1 = require("https://esm.sh/@supabase/supabase-js@2");
const server_ts_1 = require("https://deno.land/std@0.168.0/http/server.ts");
function updateSinglePlayer(supabase, player) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`Iniciando atualização para: ${player.username}@${player.hotel}`);
            const userRes = yield fetch(`https://origins.habbo.${player.hotel}/api/public/users?name=${player.username}`);
            if (!userRes.ok) {
                if (userRes.status === 404) {
                    console.log(`Usuário ${player.username} não encontrado, marcando como inativo.`);
                    yield supabase.from('ranking').update({ status: 'not_found_api' }).match({ username: player.username, hotel: player.hotel });
                }
                else {
                    console.error(`Erro na API de usuário para ${player.username}: ${userRes.status}`);
                }
                return;
            }
            const userData = yield userRes.json();
            if (!userData.uniqueId)
                return;
            const fishingRes = yield fetch(`https://origins.habbo.${player.hotel}/api/public/skills/${userData.uniqueId}?skillType=FISHING`);
            if (!fishingRes.ok)
                return;
            const fishingData = yield fishingRes.json();
            // --- 👇 NOVA LÓGICA DE ACUMULAÇÃO DE EMBLEMAS 👇 ---
            // 1. Pega os emblemas que já temos no nosso banco de dados
            const { data: existingPlayer } = yield supabase
                .from('ranking')
                .select('badges')
                .eq('username', player.username)
                .eq('hotel', player.hotel)
                .single();
            const apiBadges = userData.selectedBadges || [];
            const dbBadges = (existingPlayer === null || existingPlayer === void 0 ? void 0 : existingPlayer.badges) || [];
            // 2. Usa um Map para juntar as duas listas e remover duplicatas automaticamente
            const combinedBadgesMap = new Map();
            // Adiciona os emblemas antigos primeiro
            dbBadges.forEach(badge => {
                if (badge && badge.code)
                    combinedBadgesMap.set(badge.code, badge);
            });
            // Adiciona/sobrescreve com os emblemas novos da API
            apiBadges.forEach(badge => {
                if (badge && badge.code)
                    combinedBadgesMap.set(badge.code, badge);
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
            const { error: upsertError } = yield supabase.from('ranking').upsert(playerToSave, { onConflict: 'username, hotel' });
            if (upsertError)
                throw upsertError;
            if (playerToSave.experience) {
                yield supabase.from('xp_history').insert({
                    username: playerToSave.username, hotel: playerToSave.hotel, level: playerToSave.level,
                    experience: playerToSave.experience, logged_at: playerToSave.updatedat
                });
            }
            console.log(`✅ Sucesso ao atualizar ${player.username}`);
        }
        catch (error) {
            console.error(`❌ Falha ao processar ${player.username}:`, error.message);
        }
    });
}
// A função 'serve' continua a mesma
(0, server_ts_1.serve)((_req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const supabaseClient = (0, supabase_js_2_1.createClient)((_a = Deno.env.get('SUPABASE_URL')) !== null && _a !== void 0 ? _a : '', (_b = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) !== null && _b !== void 0 ? _b : '');
        const hoteisParaAtualizar = ['com.br', 'com', 'es'];
        let jogadoresParaAtualizar = [];
        for (const hotel of hoteisParaAtualizar) {
            const { data: jogador, error } = yield supabaseClient
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
            yield updateSinglePlayer(supabaseClient, jogador);
            yield new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log("Ciclo de atualização intercalada concluído com sucesso.");
        return new Response(JSON.stringify({ message: `Ciclo concluído para ${jogadoresParaAtualizar.length} jogadores.` }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });
    }
    catch (err) {
        console.error("Erro fatal no ciclo da Edge Function:", err.message);
        return new Response(String((_c = err === null || err === void 0 ? void 0 : err.message) !== null && _c !== void 0 ? _c : err), { status: 500 });
    }
}));
