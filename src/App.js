import React, { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import "@fontsource/press-start-2p";
import DailyXpProgressChart from "./components/DailyXpProgressChart";

// --- Configurações Supabase ---
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Dados de XP por Nível ---
const fishingLevelXp = [
  55, 135, 255, 417, 623, 875, 1174, 1521, 1918, 2366, 2865, 3417, 4022,
  4681, 5396, 6165, 6992, 7875, 8816, 9815, 10872, 11989, 13166, 14403,
  15702, 17061, 18482, 19965, 21512, 25385, 29800, 34810, 40474, 46855,
  54018, 62034, 70976, 80925, 91962, 104175, 117656, 132501, 148813, 166696,
  186264, 207633, 230924, 256266, 283791, 313638, 345952, 380883, 418587,
  459228, 502975, 550002, 600491, 654632, 712620, 774657, 840952, 911722,
  987190, 1067589, 1153155, 1244137, 1340788, 1443369, 1552151, 1682257,
  1822728, 1974347, 2137953, 2314446, 2504787, 2710007, 2931209, 3169573,
  3426362, 3702927, 4000713, 4321262, 4666226, 5037369, 5436574, 5865853,
  6327356, 6823377, 7356365, 7928932, 8543867, 9204142, 9912930, 10673611,
  11489788, 12365302, 13304246, 14310977
];
// --- Funções Auxiliares ---
const getNextLevelXp = (currentLevel) => fishingLevelXp[(currentLevel || 1) - 1] || 0;
const capitalize = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "");
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? "-" : date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// --- Dados de Tradução e Flags ---
const translations = {
  pt: {
    title: "Estatísticas do Habbo Origins", placeholder: "Nome de usuário", loading: "Carregando...",
    button: "Buscar", notFound: "Habilidade não encontrada", userNotFound: "Usuário não encontrado",
    skillsMissing: "Nenhuma habilidade encontrada. Verifique se o nome de usuário está correto.",
    level: "Nível", xp: "Experiência", fishCaught: "Peixes capturados",
    goldFishCaught: "Peixes Dourados capturados", fishingRod: "Vara de Pescar", rodXp: "XP da Vara",
    mission: "Missão", badges: "Emblemas", language: "Idioma", hotel: "Hotel", rank: "Ranking",
    online: "Online", offline: "Offline", lastAccess: "Última visita",
    memberSince: "Membro desde", lastUpdate: "Dados de",
    autoUpdateStatus: "Atualização em segundo plano",
    nextPage: "Próxima", prevPage: "Anterior", page: "Página",
    xpChart: {
      title: "Progressão XP",
      noData: "Sem histórico de XP para exibir.",
      loading: "Carregando dados do gráfico...",
      saveError: "Falha ao salvar dados do jogador.", // Nova tradução
      loadingError: "Falha ao carregar dados." // Nova tradução
    },
  },
};
const hotelLangMap = { "com.br": "pt", "com": "en", "es": "es" };
const FLAGS = [
  { code: "com.br", img: "/img/flags/brpt.png", label: "BR/PT" },
  { code: "com", img: "/img/flags/eng.png", label: "EN" },
  { code: "es", img: "/img/flags/es.png", label: "ES" },
];

// --- Constantes ---
const AUTO_UPDATE_USER_DELAY_MS = 5000;
const AUTO_UPDATE_CYCLE_INTERVAL_MS = 30 * 60 * 1000;
const LABEL_TEXT_COLOR = "#ffd27f";
const ITEMS_PER_PAGE = 20;
const RANKING_UPDATE_INTERVAL = 30 * 1000;

// --- Componentes Reutilizáveis (Definidos diretamente no App.js) ---
const Badge = React.memo(({ code, name }) => {
  let srcPath = code;
  // ... (sua lógica para srcPath como antes)
  if (code && !/\.(png|gif|jpg|jpeg|webp|svg)$/i.test(code)) {
    srcPath = `/img/badges/${code}.png`;
  } else if (code) {
    srcPath = `/img/badges/${code}`;
  } else {
    srcPath = '/img/badges/default_badge.png'; 
  }

  return (
    <img
      src={srcPath}
      alt={name || 'Emblema'}
      title={name}
      className="inline-block mx-1 align-middle"
      style={{
        imageRendering: "pixelated",
        height: "auto", // Tenta manter a altura original
        width: "auto",  // Tenta manter a largura original
        // Tente adicionar um destes para ver o comportamento, mas o ideal é achar a causa da altura de 50px
        // objectFit: "contain", // Garante que toda a imagem caiba, mantendo a proporção, dentro das dimensões do elemento
        // objectPosition: "center", 
      }}
      onError={(e) => {
        console.error(`Erro ao carregar emblema: ${srcPath}. Tentando fallback para .gif se era .png...`);
        // Tentativa de fallback simples: se falhou com .png (e não era um gif explícito), tenta .gif
        // Esta é uma heurística e pode não ser ideal, pode causar um request extra.
        if (srcPath.endsWith('.png')) {
          const gifPath = srcPath.replace('.png', '.gif');
          // Para evitar loop de erro se o .gif também não existir
          if (e.target.src !== gifPath) { 
            e.target.src = gifPath;
            e.target.onerror = () => { // Se o .gif também falhar
                console.error(`Erro ao carregar emblema (fallback .gif): ${gifPath}`);
                e.target.src = '/img/badges/default_badge.png'; // Imagem de erro final
            };
          }
        } else if (!srcPath.includes('.')) { // Se não tinha extensão e tentou .png implicitamente
             const gifPath = `/img/badges/${code}.gif`;
             if (e.target.src !== gifPath) {
                e.target.src = gifPath;
                e.target.onerror = () => {
                    console.error(`Erro ao carregar emblema (fallback .gif para código sem extensão): ${gifPath}`);
                    e.target.src = '/img/badges/default_badge.png';
                };
             }
        } else {
            // Se já era .gif ou outra extensão e falhou, ou se o fallback de .gif falhou
             e.target.src = '/img/badges/default_badge.png';
        }
      }}
    />
  );
});const StatusDot = React.memo(({ online }) => ( <span title={online ? "Online" : "Offline"} className="inline-block align-middle mr-1" style={{ width: 10, height: 10, borderRadius: "50%", background: online ? "#b6f0ae" : "#e67e47", border: "1.5px solid #80682b" }} ></span> ));

const XpBar = React.memo(({ value, max, color = "#ffc76a", bg = "#312d19" }) => {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const showText = typeof value === 'number' && typeof max === 'number' && max > 0;
  return (
    <div style={{ background: bg, borderRadius: 12, height: 14, width: "100%", margin: "4px 0", boxShadow: "0 1px 4px #0004 inset,0 1px 0 #fff2", position: 'relative' }}>
      <div style={{ width: `${percent}%`, height: "100%", background: `linear-gradient(90deg, ${color} 70%, #ffe6a0 100%)`, borderRadius: 11, boxShadow: percent ? "0 1px 5px #f7c76655 inset,0 0px 1.5px #fff5" : undefined, transition: "width 0.35s cubic-bezier(.9,.1,.2,1)" }} />
      {showText && (
        <div style={{ position: 'absolute', top: '0px', left: '0px', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#20180f', fontWeight: 'bold', lineHeight: '14px', fontFamily: "'Press Start 2P', monospace", textShadow: '0px 0px 2px rgba(255,255,255,0.5)' }}>
          {(value || 0).toLocaleString('pt-BR')}/{(max || 0).toLocaleString('pt-BR')}
        </div>
      )}
    </div>
  );
});

const PlayerCard = React.memo(({ player, t, dataIndexInRanking, handlePlayerClick }) => (
  <div className="rounded-lg p-5 mb-6" style={{ background: "rgba(24,19,10,0.91)", border: "1.5px solid rgba(149,117,58,0.13)", boxShadow: "0 2px 18px 0 rgba(91,61,34,0.09)" }}>
    <div className="flex items-center mb-3">
      <h2 className="text-lg font-semibold flex-1 font-mono" style={{ color: "#ffeac2" }}> 🎣 {t.level}: {player.level} </h2>
    </div>
    <div className="flex flex-col sm:flex-row items-start sm:items-center">
      <img src={player.avatarUrl} alt="Avatar" style={{ width: 112, height: 196, imageRendering: "pixelated", background: "#332216", borderRadius: 10 }} className="mb-3 sm:mb-0 sm:mr-4 border-2 border-[#a07852] cursor-pointer object-cover flex-shrink-0" onClick={() => handlePlayerClick(player)} />
      <div className="flex-1">
        <p className="text-lg font-semibold flex items-center font-mono" style={{ color: "#ffebc7" }}>
          <StatusDot online={player.online} /> {capitalize(player.username)}
          {dataIndexInRanking !== -1 && ( <span className="ml-2 text-xs" style={{ color: "#f7e7d2" }}> ({t.rank}: {dataIndexInRanking + 1}) </span> )}
        </p>
        <p className="text-sm mt-1" style={{ color: "#ffeac2" }}> <strong style={{color: LABEL_TEXT_COLOR}}>{t.level}:</strong> {player.level} | <strong style={{color: LABEL_TEXT_COLOR}}>{t.xp}:</strong> {(player.experience || 0).toLocaleString('pt-BR')} </p>
        <XpBar value={player.experience} max={getNextLevelXp(player.level)} />
        <p className="text-sm flex items-center mt-1" style={{ color: player.online ? "#b6f0ae" : "#f3bfa1" }}> {player.online ? t.online : t.offline} </p>
        {player.membersince && ( <p className="text-xs mt-1"> <strong style={{ color: LABEL_TEXT_COLOR }}>{t.memberSince}:</strong> <span style={{ color: "#ccb991" }}>{formatDate(player.membersince)}</span> </p> )}
        {player.lastaccesstime && ( <p className="text-xs"> <strong style={{ color: LABEL_TEXT_COLOR }}>{t.lastAccess}:</strong> <span style={{ color: "#ccb991" }}>{formatDate(player.lastaccesstime)}</span> </p> )}
        {player.updatedat && ( <p className="text-xs"> <strong style={{ color: LABEL_TEXT_COLOR }}>{t.lastUpdate.replace("em", "")}:</strong> <span style={{ color: "#e3d099" }}>{formatDate(player.updatedat)}</span> </p> )}
      </div>
    </div>
    <div className="mt-3"> <strong style={{ color: LABEL_TEXT_COLOR }}>{t.mission}:</strong> <span style={{ color: "#ffeac2" }}>{' '}{player.mission || "-"}</span> </div>
    <div className="mt-2">
      <strong style={{ color: LABEL_TEXT_COLOR }}>{t.badges}:</strong>
      {player.badges && player.badges.length > 0 ? (
   <div className="flex flex-wrap gap-1 mt-1 items-center">  {player.badges.map((badge, idx) => <Badge key={badge.code || `badge-${idx}`} code={badge.code} name={badge.name} />)} </div>
      ) : ( <span style={{ color: "#ffeac2" }}>{' '}Nenhum emblema</span> )}
    </div>
  </div>
));

const RankingItem = React.memo(({ player, index, t, handlePlayerClick, expandedPlayer, expandedProfile, expandedPlayerXpHistory, loadingExpandedChart }) => {
  const isExpanded = expandedPlayer && expandedPlayer.username === player.username && expandedPlayer.hotel === player.hotel;
  return (
    <div className="rounded-md shadow-lg flex flex-col relative" style={{ background: "rgba(37,28,18,0.93)", border: "1.5px solid rgba(128,84,44,0.2)", padding: '10px' }}>
      {/* Conteúdo normal do RankingItem */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center flex-grow min-w-0">
          <span className="text-lg font-bold mr-2 font-mono flex-shrink-0" style={{ color: "#ffde99", minWidth: '2.5ch' }}>{index + 1}.</span>
          <img src={player.avatarUrl} alt="Avatar" style={{ width: 62, height: 110, imageRendering: "pixelated", background: "#31241d", borderRadius: 5 }} className="cursor-pointer border border-[#7b6a56] object-cover flex-shrink-0 shadow-sm" onClick={() => handlePlayerClick(player)} />
          <div className="ml-2 flex-grow min-w-0">
            <p className="text-sm font-semibold flex items-center font-mono truncate" style={{ color: "#ffd27f" }} title={capitalize(player.username)}>
              <StatusDot online={player.online} /> {capitalize(player.username)}
            </p>
            {player.mission && ( <p className="text-xs font-mono truncate mt-0.5" style={{ color: "#b0a080" }} title={player.mission}> "{player.mission}" </p> )}
          </div>
        </div>
        <span className="text-xs font-mono font-bold flex-shrink-0 ml-2 p-1 px-1.5 rounded" style={{ color: "#2a2215", backgroundColor: "#ffc76a" }}>Lvl {player.level}</span>
      </div>
      <XpBar value={player.experience} max={getNextLevelXp(player.level)} />
      <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1 font-mono text-xs items-center justify-between">
        {player.badges && player.badges.length > 0 && (

          <div className="flex gap-0.5">
            {player.badges.slice(0, 2).map((badge, idx) => ( <Badge key={badge.code || `sbadge-${idx}`} code={badge.code} name={badge.name} /> ))}
            {player.badges.length > 2 && <span className="text-xs opacity-70 self-center" style={{color: "#ccc0a5"}}>(+{player.badges.length - 2})</span>}
          </div>
        )}
        {player.updatedat && ( <span className="text-xs opacity-60 whitespace-nowrap" style={{ color: "#b3a079" }}> {formatDate(player.updatedat)} </span> )}
      </div>

      {/* Conteúdo Expandido do RankingItem */}
      {isExpanded && (
        <div 
            className="absolute top-0 left-0 w-full p-3 rounded-md z-20 flex flex-col shadow-2xl overflow-y-auto" 
            style={{ background: "rgba(28,22,14,0.98)", border: "2px solid #c09b57", maxHeight: "calc(100vh - 100px)", minHeight:"450px" /* Aumentado para caber o gráfico */ }} 
            onClick={(e) => e.stopPropagation()} 
        >
          <div className="flex items-start mb-2">
            <img src={player.avatarUrl} alt="Avatar" style={{ width: 70, height: 123, imageRendering: "pixelated", background: "#332216", borderRadius: 8 }} className="mr-3 border-2 border-[#a07852] object-cover flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-md flex items-center font-mono" style={{ color: "#ffeac2" }}> <StatusDot online={expandedProfile?.online ?? player.online} /> {capitalize(player.username)} </p>
              <p className="text-xs ml-1" style={{ color: (expandedProfile?.online ?? player.online) ? "#b6f0ae" : "#f3bfa1" }}> {(expandedProfile?.online ?? player.online) ? t.online : t.offline} </p>
            </div>
            <button onClick={() => handlePlayerClick(player)} className="text-2xl font-mono text-amber-400 hover:text-amber-200 transition-colors flex-shrink-0">&times;</button>
          </div>
          <div className="text-xs space-y-1 font-mono mb-2">
            {expandedProfile?.membersince && ( <p><strong style={{ color: LABEL_TEXT_COLOR }}>{t.memberSince}:</strong> <span style={{ color: "#ccb991" }}>{formatDate(expandedProfile.membersince)}</span></p> )}
            {expandedProfile?.lastaccesstime && ( <p><strong style={{ color: LABEL_TEXT_COLOR }}>{t.lastAccess}:</strong> <span style={{ color: "#ccb991" }}>{formatDate(expandedProfile.lastaccesstime)}</span></p> )}
            <p><strong style={{ color: LABEL_TEXT_COLOR }}>{t.lastUpdate.replace("em","")}:</strong> <span style={{ color: "#e3d099" }}>{formatDate(player.updatedat)}</span></p>
          </div>
          <hr className="border-yellow-700/20 my-1.5"/>
          <p className="text-sm"><strong style={{ color: LABEL_TEXT_COLOR }}>{t.level}:</strong> <span style={{ color: "#ffeac2" }}>{player.level}</span></p>
          <p className="text-sm"><strong style={{ color: LABEL_TEXT_COLOR }}>{t.xp}:</strong> <span style={{ color: "#ffeac2" }}>{(player.experience || 0).toLocaleString('pt-BR')} / {(getNextLevelXp(player.level) || 0).toLocaleString('pt-BR')}</span></p>
          <XpBar value={player.experience} max={getNextLevelXp(player.level)} />
          <p className="text-sm"><strong style={{ color: LABEL_TEXT_COLOR }}>{t.fishCaught}:</strong> <span style={{ color: "#ffeac2" }}>{player.fishCaught ?? "-"}</span></p>
          <p className="text-sm"><strong style={{ color: LABEL_TEXT_COLOR }}>{t.goldFishCaught}:</strong> <span style={{ color: "#ffeac2" }}>{player.goldFishCaught ?? "-"}</span></p>
          {player.rod && (
            <div className="mt-1.5">
              <strong style={{ color: LABEL_TEXT_COLOR }}>{t.fishingRod}:</strong>
              <span style={{ color: "#ffeac2" }}> {t.level} {player.rod.level} </span><br />
              <span className="font-mono text-xs" style={{ color: "#ffeac2" }}> {t.rodXp}: {(player.rod.experience || 0).toLocaleString('pt-BR')} / {(player.rod.nextLevelExperience || 0).toLocaleString('pt-BR')} </span>
              <XpBar value={player.rod.experience} max={player.rod.nextLevelExperience} color="#a1e896" bg="#214218" />
            </div>
          )}
          <div className="mt-1.5"> <strong style={{ color: LABEL_TEXT_COLOR }}>{t.mission}:</strong> <span style={{ color: "#ffeac2" }}>{' '}{player.mission || "-"}</span> </div>
          <div className="mt-1.5">
            <strong style={{ color: LABEL_TEXT_COLOR }}>{t.badges}:</strong>
            {player.badges && player.badges.length > 0 ? (
               <div className="flex flex-wrap gap-1 mt-1 items-center"> 
 {player.badges.map((badge, idx) => <Badge key={badge.code || `expbadge-${idx}`} code={badge.code} name={badge.name} />)} </div>
            ) : ( <span style={{ color: "#ffeac2" }}>{' '}Nenhum emblema</span> )}
          </div>
          <hr className="border-yellow-700/20 my-2.5"/>
          <div className="mt-2" style={{minHeight: "160px"}}>
            <DailyXpProgressChart
              data={expandedPlayerXpHistory}
              t={t}
              isLoading={loadingExpandedChart}
              chartHeight={150} 
            />
          </div>
        </div>
      )}
    </div>
  );
});
// --- Componente Principal App ---
const App = () => {
  // --- Estados ---
  const [username, setUsername] = useState("");
  const [hotel, setHotel] = useState("com.br");
  const [lang, setLang] = useState("pt");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ranking, setRanking] = useState([]);
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [expandedProfile, setExpandedProfile] = useState(null);
  const [data, setData] = useState(null);
  const [isAutoUpdatingList, setIsAutoUpdatingList] = useState(false);
  const [autoUpdateProgress, setAutoUpdateProgress] = useState({ current: 0, total: 0, status: 'inativo', lastRun: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [dailyXpHistory, setDailyXpHistory] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [expandedPlayerXpHistory, setExpandedPlayerXpHistory] = useState([]);
  const [loadingExpandedChart, setLoadingExpandedChart] = useState(false);

  // --- Refs ---
  const profileCache = useRef({});
  const lastRankingFetch = useRef(0);
  const autoUpdateInProgress = useRef(false);
  const autoUpdateIntervalIdRef = useRef(null);

  // --- Traduções (instância) ---
  const t = translations[lang] || translations["pt"];

  // --- Funções de Busca e Manipulação de Dados ---
  const fetchRankingGlobal = useCallback(async (force = false, options) => {
    const now = Date.now();
    const shouldSetLoading = options?.setLoadingState ?? false;
    if (!force && (now - lastRankingFetch.current < RANKING_UPDATE_INTERVAL) && !options?.bypassThrottle) {
      return;
    }
    if (shouldSetLoading) setLoading(true);
    try {
      const { data: rankingData, error: rankingError } = await supabase.from('ranking').select('*').eq('hotel', hotel).order('level', { ascending: false }).order('experience', { ascending: false });
      if (rankingError) throw rankingError;
      setRanking((rankingData || []).filter(p => p && p.username));
      if (force || shouldSetLoading) setCurrentPage(1);
    } catch (err) {
      console.error("[DEBUG] Error in fetchRankingGlobal:", err.message);
      if (shouldSetLoading) setError(t.xpChart.loadingError || "Falha ao carregar ranking.");
    } finally {
      lastRankingFetch.current = now;
      if (shouldSetLoading) setLoading(false);
    }
  }, [hotel, t]);

  const getDailyXpLogsFromSupabase = useCallback(async (playerName, playerHotel) => {
    if (!playerName || !playerHotel) {
      console.warn("getDailyXpLogsFromSupabase chamado sem playerName ou playerHotel");
      return { data: [], error: new Error("Nome do jogador ou hotel não fornecido.") };
    }
    console.log(`[XP_LOGS] Buscando histórico para ${playerName}@${playerHotel}`);
    try {
      const { data: xpLogs, error: fetchError } = await supabase
        .from('xp_history') // ❗ CONFIRME O NOME DA TABELA ❗
        .select('logged_at, experience, level')
        .eq('username', playerName.toLowerCase())
        .eq('hotel', playerHotel)
        .order('logged_at', { ascending: true })
        .limit(200);

      if (fetchError) {
        console.error("[XP_LOGS] Erro do Supabase ao buscar histórico:", fetchError);
        throw fetchError;
      }
      
      console.log(`[XP_LOGS] Logs crus para ${playerName}:`, xpLogs);
      if (!xpLogs) return { data: [], error: null };

      const formattedData = xpLogs.map(log => {
        const dateObj = new Date(log.logged_at);
        return {
          timestamp: dateObj.getTime(),
          experience: log.experience,
          level: log.level,
          tooltipLabel: dateObj.toLocaleString('pt-BR', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
          })
        };
      });
      console.log(`[XP_LOGS] Dados formatados para ${playerName}:`, formattedData);
      return { data: formattedData, error: null };
    } catch (err) {
      console.error("[XP_LOGS] Exceção em getDailyXpLogsFromSupabase:", err.message);
      return { data: [], error: err };
    }
  }, []); // supabase é estável

  const savePlayerGlobal = useCallback(async (player) => {
    console.log("[SAVE_PLAYER] Tentando salvar jogador:", player.username);
    try {
      const playerToSave = { ...player, updatedat: new Date().toISOString() }; // Garante updatedat fresco
      const { error: saveError } = await supabase.from('ranking').upsert([playerToSave], { onConflict: ['username', 'hotel'] });
      
      if (saveError) {
        console.error("[SAVE_PLAYER] Erro ao salvar na tabela ranking:", saveError);
        throw saveError;
      }
      console.log("[SAVE_PLAYER] Salvo no ranking com sucesso:", player.username);

      if (player.username && player.hotel && typeof player.experience === 'number') {
        console.log(`[XP_HISTORY_SAVE] Preparando para salvar histórico para ${player.username}, XP: ${player.experience}`);
        const { error: logInsertError } = await supabase
          .from('xp_history') // ❗ CONFIRME O NOME DA TABELA ❗
          .insert({
            username: player.username.toLowerCase(),
            hotel: player.hotel,
            level: player.level, 
            experience: player.experience,
            logged_at: new Date().toISOString()
          });

        if (logInsertError) {
          console.error("!!! ERRO AO INSERIR NO HISTÓRICO DE XP (xp_history) !!!:", logInsertError);
          // alert(`ERRO ao salvar no histórico de XP: ${logInsertError.message}. Detalhes no console.`);
        } else {
          console.log(`[XP_HISTORY_SAVE] Histórico de XP salvo para ${player.username} - XP: ${player.experience}`);
        }
      } else {
        console.warn("[XP_HISTORY_SAVE] Condição para salvar histórico não atendida:", player);
      }
      return true;
    } catch (err) {
      console.error("[SAVE_PLAYER] Exceção em savePlayerGlobal:", err.message, err);
      return false;
    }
  }, []); // supabase é estável

  const fetchStats = useCallback(async () => {
    if (!username.trim()) {
      setError(t.placeholder);
      return;
    }
    setLoading(true); setError(""); setData(null);
    setDailyXpHistory([]); // Limpa gráfico principal

    try {
      const usernameKey = username.trim().toLowerCase();
      console.log(`[FETCH_STATS] Iniciando para: ${usernameKey}@${hotel}`);

      const userRes = await fetch(`https://origins.habbo.${hotel}/api/public/users?name=${usernameKey}`);
      if (!userRes.ok) { if (userRes.status === 404) throw new Error(t.userNotFound); throw new Error(`API User Error: ${userRes.status}`); }
      const userData = await userRes.json();
      console.log("[FETCH_STATS] userData da API:", userData);
      const uniqueId = userData.uniqueId;
      if (!uniqueId) throw new Error("ID de usuário inválido.");
      
      const fishingRes = await fetch(`https://origins.habbo.${hotel}/api/public/skills/${uniqueId}?skillType=FISHING`);
      if (!fishingRes.ok) { if (fishingRes.status === 404) throw new Error(t.skillsMissing); throw new Error(`API Fishing Error: ${fishingRes.status}`); }
      const fishingData = await fishingRes.json();
      console.log("[FETCH_STATS] fishingData da API:", fishingData);
      if (!fishingData || typeof fishingData.level === "undefined") throw new Error(t.skillsMissing);
      
      let profile = null;
      try {
        const profileRes = await fetch(`https://origins.habbo.${hotel}/api/public/users/${uniqueId}/profile`);
        if (profileRes.ok) profile = await profileRes.json();
        console.log("[FETCH_STATS] profileData da API:", profile);
      } catch (profileError) { console.warn("[FETCH_STATS] Erro ao buscar perfil:", profileError.message); }

      // Lógica de Acumulação de Emblemas
      const newApiBadges = Array.isArray(userData.selectedBadges) 
        ? userData.selectedBadges.map(b => ({ code: b.code, name: b.name, description: b.description })) 
        : [];
      console.log("[BADGES] Emblemas da API (fetchStats):", JSON.parse(JSON.stringify(newApiBadges)));

      let combinedBadges = [...newApiBadges];
      try {
        const { data: existingPlayerData, error: fetchExistingDbError } = await supabase
          .from('ranking')
          .select('badges')
          .eq('username', usernameKey)
          .eq('hotel', hotel)
          .single();

        if (fetchExistingDbError && fetchExistingDbError.code !== 'PGRST116') {
          console.warn(`[BADGES] Erro ao buscar emblemas existentes do DB para ${usernameKey} (fetchStats):`, fetchExistingDbError);
        } else if (existingPlayerData && Array.isArray(existingPlayerData.badges)) {
          const existingDbBadges = existingPlayerData.badges;
          console.log("[BADGES] Emblemas existentes no DB (fetchStats):", JSON.parse(JSON.stringify(existingDbBadges)));
          const currentApiBadgeCodes = new Set(newApiBadges.map(b => b.code));
          existingDbBadges.forEach(dbBadge => {
            if (dbBadge && dbBadge.code && !currentApiBadgeCodes.has(dbBadge.code)) {
              combinedBadges.push(dbBadge);
            }
          });
        }
      } catch (dbError) {
        if (dbError.code !== 'PGRST116') console.warn("[BADGES] Exceção ao buscar emblemas do DB (fetchStats):", dbError);
      }
      const uniqueBadgeCodes = new Set();
      const finalUniqueBadges = [];
      for (const badge of combinedBadges) {
        if (badge && badge.code && !uniqueBadgeCodes.has(badge.code)) {
          finalUniqueBadges.push(badge);
          uniqueBadgeCodes.add(badge.code);
        }
      }
      combinedBadges = finalUniqueBadges;
      console.log("[BADGES] Emblemas combinados (fetchStats):", JSON.parse(JSON.stringify(combinedBadges)));
      
      const newPlayer = {
        username: usernameKey, level: fishingData.level, experience: fishingData.experience,
        avatarUrl: `https://www.habbo.${hotel}/habbo-imaging/avatarimage?figure=${userData.figureString}&size=l&direction=2&head_direction=2&gesture=sml&action=wav`,
        mission: userData.motto, badges: combinedBadges, fishCaught: fishingData.fishCaught,
        goldFishCaught: fishingData.goldFishCaught, rod: fishingData.rod, hotel: hotel,
        online: profile?.online ?? userData.online, lastaccesstime: profile?.lastaccesstime ?? null,
        membersince: profile?.membersince ?? null, updatedat: new Date().toISOString(), // updatedat é definido aqui
      };

      const saved = await savePlayerGlobal(newPlayer);
      if (saved) {
        setData(newPlayer); 
        profileCache.current[usernameKey] = profile;
        fetchRankingGlobal(true, { bypassThrottle: true });
        
        console.log("[FETCH_STATS] Buscando histórico de XP para gráfico principal...");
        setLoadingChart(true);
        getDailyXpLogsFromSupabase(newPlayer.username, newPlayer.hotel)
            .then(result => {
                if(result.data) setDailyXpHistory(result.data);
                if(result.error) console.error("[FETCH_STATS] Erro ao carregar histórico para gráfico principal:", result.error);
            })
            .finally(() => setLoadingChart(false));
      } else { setError(t.xpChart.saveError || "Falha ao salvar dados."); }
    } catch (err) {
      console.error("[FETCH_STATS] Erro geral:", err.message, err.stack);
      setError(err.message); setData(null);
    } finally { setLoading(false); }
  }, [username, hotel, t, savePlayerGlobal, fetchRankingGlobal, getDailyXpLogsFromSupabase]);

  const fetchAndSaveSingleUserForAutoUpdate = useCallback(async (usernameToProcess, hotelToProcess) => {
    console.log(`[AUTO_UPDATE] Processando: ${usernameToProcess}@${hotelToProcess}`);
    try {
      const usernameKey = usernameToProcess.trim().toLowerCase();
      const userRes = await fetch(`https://origins.habbo.${hotelToProcess}/api/public/users?name=${usernameKey}`);
      if (!userRes.ok) { if (userRes.status === 404) return { success: false, skipped: true }; throw new Error(`API User Error (auto): ${userRes.status}`);}
      const userData = await userRes.json();
      if (!userData.uniqueId) { console.warn(`[AUTO_UPDATE] ID de usuário inválido para ${usernameKey}`); return { success: false, skipped: true }; }
      
      const fishingRes = await fetch(`https://origins.habbo.${hotelToProcess}/api/public/skills/${userData.uniqueId}?skillType=FISHING`);
      if (!fishingRes.ok) { if (fishingRes.status === 404) return { success: false, skipped: true }; throw new Error(`API Fishing Error (auto): ${fishingRes.status}`);}
      const fishingData = await fishingRes.json();
      if (typeof fishingData.level === "undefined") { console.warn(`[AUTO_UPDATE] Dados de pesca inválidos para ${usernameKey}`); return { success: false, skipped: true };}
      
      let profile = null;
      try { const profileRes = await fetch(`https://origins.habbo.${hotelToProcess}/api/public/users/${userData.uniqueId}/profile`); if (profileRes.ok) profile = await profileRes.json(); } catch { /* Ignora */ }
      
      const newApiBadges = Array.isArray(userData.selectedBadges) ? userData.selectedBadges.map(b => ({code: b.code, name: b.name, description: b.description})) : [];
      console.log(`[BADGES_AUTO] Emblemas da API para ${usernameKey}:`, JSON.parse(JSON.stringify(newApiBadges)));
      let combinedBadges = [...newApiBadges];
      try {
        const { data: existingPlayerData, error: fetchExistingDbErrorAuto } = await supabase.from('ranking').select('badges').eq('username', usernameKey).eq('hotel', hotelToProcess).single();
        if (fetchExistingDbErrorAuto && fetchExistingDbErrorAuto.code !== 'PGRST116') {
          console.warn(`[BADGES_AUTO] Erro ao buscar emblemas do DB para ${usernameKey}:`, fetchExistingDbErrorAuto);
        } else if (existingPlayerData && Array.isArray(existingPlayerData.badges)) {
          const existingDbBadges = existingPlayerData.badges;
          console.log(`[BADGES_AUTO] Emblemas do DB para ${usernameKey}:`, JSON.parse(JSON.stringify(existingDbBadges)));
          const currentApiBadgeCodes = new Set(newApiBadges.map(b => b.code));
          existingDbBadges.forEach(dbBadge => {
            if (dbBadge && dbBadge.code && !currentApiBadgeCodes.has(dbBadge.code)) {
              combinedBadges.push(dbBadge);
            }
          });
        }
      } catch (dbErrorAuto) {
        if (dbErrorAuto.code !== 'PGRST116') console.warn(`[BADGES_AUTO] Exceção ao buscar emblemas do DB para ${usernameKey}:`, dbErrorAuto);
      }
      const uniqueBadgeCodesAuto = new Set();
      const finalUniqueBadgesAuto = [];
      for (const badge of combinedBadges) {
        if (badge && badge.code && !uniqueBadgeCodesAuto.has(badge.code)) {
          finalUniqueBadgesAuto.push(badge);
          uniqueBadgeCodesAuto.add(badge.code);
        }
      }
      combinedBadges = finalUniqueBadgesAuto;
      console.log(`[BADGES_AUTO] Emblemas combinados para ${usernameKey}:`, JSON.parse(JSON.stringify(combinedBadges)));

      const newPlayer = {
        username: usernameKey, level: fishingData.level, experience: fishingData.experience,
        avatarUrl: `https://www.habbo.${hotelToProcess}/habbo-imaging/avatarimage?figure=${userData.figureString}&size=l&direction=2&head_direction=2&gesture=sml&action=wav`,
        mission: userData.motto, badges: combinedBadges, fishCaught: fishingData.fishCaught,
        goldFishCaught: fishingData.goldFishCaught, rod: fishingData.rod, hotel: hotelToProcess,
        online: profile?.online ?? userData.online, lastaccesstime: profile?.lastaccesstime ?? null,
        membersince: profile?.membersince ?? null, updatedat: new Date().toISOString(),
      };
      return { success: await savePlayerGlobal(newPlayer) };
    } catch (error) {
      console.error(`[AUTO_UPDATE_USER] Erro ${usernameToProcess}@${hotelToProcess}: ${error.message}`);
      return { success: false };
    }
  }, [savePlayerGlobal]); // savePlayerGlobal é a única dependência real aqui que pode mudar

  const runFullBackgroundUpdate = useCallback(async (currentHotelForUpdate) => {
    if (autoUpdateInProgress.current) { console.log("[AUTO_UPDATE_CYCLE] Ciclo já em andamento."); return; }
    autoUpdateInProgress.current = true; setIsAutoUpdatingList(true);
    setAutoUpdateProgress(prev => ({ ...prev, current: 0, total: 0, status: `buscando lista em ${currentHotelForUpdate}...`})); // Removido .lastRun da atualização inicial aqui
    console.log(`[AUTO_UPDATE_CYCLE] Iniciando para ${currentHotelForUpdate}`);
    try {
      const { data: usersInDb, error: fetchDbError } = await supabase.from('ranking').select('username').eq('hotel', currentHotelForUpdate).order('updatedat', { ascending: true, nullsFirst: true });
      if (fetchDbError || !usersInDb) { throw fetchDbError || new Error("Nenhum usuário no DB"); }
      if (usersInDb.length === 0) { console.log("[AUTO_UPDATE_CYCLE] Sem usuários para atualizar."); setAutoUpdateProgress(prev => ({ ...prev, status: 'sem usuários', total:0, lastRun: new Date().toISOString() })); setIsAutoUpdatingList(false); autoUpdateInProgress.current = false; return; }
      
      console.log(`[AUTO_UPDATE_CYCLE] ${usersInDb.length} usuários para processar.`);
      setAutoUpdateProgress(prev => ({ ...prev, total: usersInDb.length, status: 'processando...' }));
      let updatedCount = 0;
      for (let i = 0; i < usersInDb.length; i++) {
        if (hotel !== currentHotelForUpdate) { console.warn("[AUTO_UPDATE_CYCLE] Hotel mudou, interrompendo ciclo."); setAutoUpdateProgress(prev => ({ ...prev, status: `interrompido (hotel mudou para ${hotel})`})); break; }
        const result = await fetchAndSaveSingleUserForAutoUpdate(usersInDb[i].username, currentHotelForUpdate);
        if(result.success) updatedCount++;
        setAutoUpdateProgress(prev => ({ ...prev, current: i + 1 }));
        if (i < usersInDb.length - 1) await new Promise(resolve => setTimeout(resolve, AUTO_UPDATE_USER_DELAY_MS));
      }
      console.log(`[AUTO_UPDATE_CYCLE] Ciclo concluído para ${currentHotelForUpdate}. ${updatedCount} atualizados.`);
      if (hotel === currentHotelForUpdate) fetchRankingGlobal(true, { bypassThrottle: true });
      setAutoUpdateProgress(prev => ({ ...prev, status: `concluído (${updatedCount} atualizados)`, lastRun: new Date().toISOString() }));
    } catch (error) {
      console.error("[AUTO_UPDATE_CYCLE] Erro:", error.message);
      setAutoUpdateProgress(prev => ({ ...prev, status: `erro (${error.message})`, lastRun: new Date().toISOString()}));
    } finally {
      setIsAutoUpdatingList(false); autoUpdateInProgress.current = false;
    }
  }, [fetchAndSaveSingleUserForAutoUpdate, fetchRankingGlobal, hotel]); // Removido autoUpdateProgress.lastRun como dependência explícita da recriação
// --- useEffects ---
  useEffect(() => {
    console.log(`[EFFECT_HOTEL_CHANGE] Hotel mudou para: ${hotel}`);
    setLang(hotelLangMap[hotel] || "pt");
    setError(""); 
    setData(null); 
    setDailyXpHistory([]);
    setExpandedPlayer(null); 
    setExpandedProfile(null);
    setExpandedPlayerXpHistory([]);
    profileCache.current = {}; 
    setCurrentPage(1);
    fetchRankingGlobal(true, { setLoadingState: true });
  }, [hotel, fetchRankingGlobal]);

  useEffect(() => {
    console.log(`[EFFECT_REALTIME] Configurando Realtime para: ${hotel}`);
    const channelName = `public:ranking:${hotel}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ranking', filter: `hotel=eq.${hotel}` },
        (payload) => {
          console.log(`[REALTIME_EVENT] ${channelName}:`, payload.eventType);
          fetchRankingGlobal(false, { bypassThrottle: true });
        }
      ).subscribe((status, err) => {
        if (err) console.error(`[REALTIME_SUB_ERROR] ${channelName}:`, err);
        else console.log(`[REALTIME_STATUS] ${channelName}: ${status}`);
      });
    return () => { 
      console.log(`[EFFECT_REALTIME] Removendo Realtime: ${channelName}`);
      supabase.removeChannel(channel).catch(err => console.error("Error removing channel", err)); 
    };
  }, [hotel, fetchRankingGlobal]);

  useEffect(() => {
    // O gráfico principal é carregado/atualizado dentro de fetchStats.
    // Este useEffect apenas limpa o gráfico se 'data' (jogador principal) for nulo.
    if (!data) {
      setDailyXpHistory([]); 
    }
  }, [data]);

  useEffect(() => {
    const hotelAtIntervalSetup = hotel;
    const performUpdate = () => {
      if (document.hidden) { console.log("[AUTO_UPDATE_INTERVAL] Aba em background, adiando ciclo."); return; }
      runFullBackgroundUpdate(hotelAtIntervalSetup);
    };
    if (autoUpdateIntervalIdRef.current) clearInterval(autoUpdateIntervalIdRef.current);
    const initialRunTimeoutId = setTimeout(performUpdate, 15000); // Aumentado um pouco o delay inicial
    autoUpdateIntervalIdRef.current = setInterval(performUpdate, AUTO_UPDATE_CYCLE_INTERVAL_MS);
    console.log(`[AUTO_UPDATE_INTERVAL] Configurado para ${hotelAtIntervalSetup}. Próximo em ${AUTO_UPDATE_CYCLE_INTERVAL_MS / 60000} min.`);
    return () => { 
      clearTimeout(initialRunTimeoutId); 
      clearInterval(autoUpdateIntervalIdRef.current); 
      console.log(`[AUTO_UPDATE_INTERVAL] Limpo para ${hotelAtIntervalSetup}.`);
    };
  }, [hotel, runFullBackgroundUpdate]);

  // --- Manipuladores de Eventos ---
  const handlePlayerClick = useCallback(async (player) => {
    if (expandedPlayer?.username === player.username && expandedPlayer?.hotel === player.hotel) {
      setExpandedPlayer(null); 
      setExpandedProfile(null);
      setExpandedPlayerXpHistory([]);
    } else {
      console.log(`[HANDLE_CLICK] Expandindo ${player.username}`);
      setExpandedPlayer(player);
      setExpandedProfile(profileCache.current[player.username] || null);
      setExpandedPlayerXpHistory([]); 
      setLoadingExpandedChart(true);

      if (!profileCache.current[player.username]) {
        try {
          console.log(`[HANDLE_CLICK] Buscando perfil para ${player.username}`);
          const userRes = await fetch(`https://origins.habbo.${player.hotel}/api/public/users?name=${player.username}`);
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.uniqueId) {
              const profileRes = await fetch(`https://origins.habbo.${player.hotel}/api/public/users/${userData.uniqueId}/profile`);
              if (profileRes.ok) {
                const profileData = await profileRes.json();
                setExpandedProfile(profileData); 
                profileCache.current[player.username] = profileData;
              }
            }
          } else {
             console.warn(`[HANDLE_CLICK] Falha ao buscar perfil (API user) para ${player.username}: ${userRes.status}`);
          }
        } catch (err) { 
          console.error("[HANDLE_CLICK] Erro ao buscar perfil expandido:", err.message); 
        }
      }
      
      console.log(`[HANDLE_CLICK] Buscando histórico de XP para ${player.username}`);
      getDailyXpLogsFromSupabase(player.username, player.hotel)
        .then(result => {
          if (result.data) setExpandedPlayerXpHistory(result.data);
          if (result.error) console.error(`[HANDLE_CLICK] Erro ao carregar histórico para ${player.username} (expandido):`, result.error.message);
        })
        .finally(() => setLoadingExpandedChart(false));
    }
  }, [expandedPlayer, getDailyXpLogsFromSupabase]); // Adicionado getDailyXpLogsFromSupabase

  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  // --- Cálculos para Renderização ---
  const dataIndexInRanking = data ? ranking.findIndex((p) => p.username === data.username && p.hotel === data.hotel) : -1;
  const totalPages = Math.ceil(ranking.length / ITEMS_PER_PAGE);
  const paginatedRanking = ranking.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // --- Renderização ---
  return (
    <>
      <div className="min-h-screen w-full flex flex-col items-center font-mono" style={{ background: "#101217", position: "relative", overflowX: "hidden" }} >
        <div style={{ background: "url('/img/fundo.png') no-repeat center center", backgroundSize: "798px 671px", width: "100vw", height: "100vh", position: "fixed", zIndex: 0, top: 0, left: 0 }} />
        <img src="/img/banner.png" alt="Fishing Banner" width={460} height={90} className="mx-auto select-none" style={{ marginTop: "max(5vh, 20px)", marginBottom: 20, imageRendering: "pixelated", display: "block", position: "relative", zIndex: 2, filter: "drop-shadow(0 6px 20px #0009)", pointerEvents: "none" }} />
        
        <div className="relative z-10 w-full max-w-4xl rounded-lg px-4 sm:px-6 py-8 mb-10" >
          <div className="flex items-center justify-center gap-4 sm:gap-7 mb-6">
            {FLAGS.map((flag) => (
              <div key={flag.code} onClick={() => setHotel(flag.code)} className="flex flex-col items-center" style={{ cursor: "pointer", opacity: hotel === flag.code ? 1 : 0.5, transition: "opacity 0.2s, transform 0.2s", transform: hotel === flag.code ? "scale(1.05)" : "scale(1)", borderRadius: 8, border: hotel === flag.code ? "2.5px solid #ffc76a" : "2.5px solid transparent", boxShadow: hotel === flag.code ? "0 3px 12px #e7b76755" : "none", background: "#1c1712", padding: "5px" }}>
                <img src={flag.img} alt={flag.label} style={{ width: 48, height: 32, objectFit: "cover", borderRadius: 5, display: "block", border: "1px solid #443322" }} />
                <span className="block text-xs text-center mt-1.5" style={{ color: hotel === flag.code ? "#ffc76a" : "#ccc0a5", fontWeight: "bold", letterSpacing: 0.5, fontFamily: "'Press Start 2P', monospace" }}> {flag.label} </span>
              </div>
            ))}
          </div>

          <div className="rounded-lg p-5 mb-6" style={{ background: "rgba(24,19,10,0.88)", border: "1.5px solid rgba(149,117,58,0.2)", boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}>
            <input type="text" placeholder={t.placeholder} value={username} onChange={(e) => setUsername(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && !loading && username.trim() && fetchStats()} className="border rounded p-3 w-full text-base font-mono" style={{ background: "rgba(15,10,5,0.5)", color: "#ffedbe", border: "1.5px solid #a9865a", boxShadow: "inset 0 1px 4px rgba(0,0,0,0.3)" }} />
            <button className="w-full mt-4 font-bold text-sm py-3 rounded-md" style={{ background: "linear-gradient(to bottom, #e8a235, #c07c1e)", color: "#fff8f0", border: "1px solid #a9865a", textShadow: "1px 1px 2px #00000070", letterSpacing: 1.5, fontFamily: "'Press Start 2P', monospace", boxShadow: "0 3px 8px rgba(0,0,0,0.3), inset 0 1px 1px #fff5c77c", opacity: loading || !username.trim() ? 0.6 : 1, cursor: loading || !username.trim() ? "not-allowed" : "pointer", transition: "background 0.2s, transform 0.1s" }} onClick={fetchStats} disabled={loading || !username.trim()} onMouseDown={(e) => !e.currentTarget.disabled && (e.currentTarget.style.transform = "scale(0.98)")} onMouseUp={(e) => !e.currentTarget.disabled && (e.currentTarget.style.transform = "scale(1)")} onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.transform = "scale(1)")} >
              {loading && data === null ? t.loading : t.button}
            </button>
          </div>
          
          {isAutoUpdatingList && (
            <div className="text-center text-xs font-mono p-2 rounded-md my-3" style={{color: "#e6c786", background: "rgba(40,30,15,0.6)", border: "1px solid rgba(128,84,44,0.3)"}}>
              <p>{t.autoUpdateStatus} ({autoUpdateProgress.current}/{autoUpdateProgress.total})</p>
              <p className="opacity-80">{autoUpdateProgress.status}</p>
              {autoUpdateProgress.lastRun && <p className="text-xs opacity-60 mt-1">Última conclusão: {formatDate(autoUpdateProgress.lastRun)}</p>}
            </div>
          )}

          {error && ( <div className="text-center text-red-300 font-mono font-semibold my-4 p-3 bg-red-900 bg-opacity-50 rounded-md border border-red-700"> {error} </div> )}
          
          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-4 mb-6">
              <div className="lg:col-span-2">
                <PlayerCard player={data} t={t} dataIndexInRanking={dataIndexInRanking} handlePlayerClick={handlePlayerClick} />
              </div>
              <div className="lg:col-span-1">
                <DailyXpProgressChart data={dailyXpHistory} t={t} isLoading={loadingChart} chartHeight={300} />
              </div>
            </div>
          )}

          {loading && !data && !error && ( <div className="text-center text-yellow-200 font-mono my-4 text-sm">{t.loading}</div> )}
          
          <div className="flex justify-center mb-4 mt-8"> <img src="/img/ranking.png" alt="Ranking" style={{ height: 64, objectFit: "contain", filter: "drop-shadow(0 3px 8px #00000080)" }} /> </div>
          
          {ranking.length > 0 ? (
            <>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                {paginatedRanking.map((player, index) => (
                  <RankingItem 
                    key={`${player.username}-${player.hotel}-${index}`} 
                    player={player} 
                    index={(currentPage - 1) * ITEMS_PER_PAGE + index} 
                    t={t} 
                    handlePlayerClick={handlePlayerClick} 
                    expandedPlayer={expandedPlayer} 
                    expandedProfile={expandedProfile}
                    expandedPlayerXpHistory={expandedPlayer?.username === player.username && expandedPlayer?.hotel === player.hotel ? expandedPlayerXpHistory : []}
                    loadingExpandedChart={expandedPlayer?.username === player.username && expandedPlayer?.hotel === player.hotel ? loadingExpandedChart : false}
                  />
                ))}
              </ul>
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 font-mono">
                  <button onClick={handlePrevPage} disabled={currentPage === 1} className="px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-yellow-700/30 transition-colors" style={{ background: currentPage === 1 ? "rgba(42,34,21,0.8)" : "rgba(74,57,30,0.8)", color: "#ffeac2", border: "1.5px solid #c79b5b" }}> {t.prevPage} </button>
                  <span style={{color: "#f7e7d2"}}>{t.page} {currentPage} / {totalPages}</span>
                  <button onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0} className="px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-yellow-700/30 transition-colors" style={{ background: (currentPage === totalPages || totalPages === 0) ? "rgba(42,34,21,0.8)" : "rgba(74,57,30,0.8)", color: "#ffeac2", border: "1.5px solid #c79b5b" }}> {t.nextPage} </button>
                </div>
              )}
            </>
          ) : (
            !loading && !error && ( <div className="text-center text-gray-400 font-mono py-5"> {t.xpChart.loadingError || "Nenhum jogador no ranking para este hotel ainda."} </div> )
          )}
        </div>
      </div>
    </>
  );
};

export default App;