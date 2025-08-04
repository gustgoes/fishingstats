import React, { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import "@fontsource/press-start-2p";
import DailyXpProgressChart from "./components/DailyXpProgressChart";
import { Tooltip } from 'react-tooltip';

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
    growth: "Crescimento", today: "Hoje", thisWeek: "Esta semana", thisMonth: "Este mês",
    rankingTabs: { geral: "Top Geral", diario: "Top Diario", semanal: "Top Semanal", mensal: "Top Mensal", badges: "Top Emblemas", ultimosPesquisados: "Últimos Pesquisados" },
    selectFlagSearch: "Selecione uma bandeira de país para habilitar a busca por usuário",
    xpChart: {
      title: "Progressão XP",
      noData: "Sem histórico de XP para exibir.",
      loading: "Carregando dados do gráfico...",
      saveError: "Falha ao salvar dados do jogador.",
      loadingError: "Falha ao carregar dados."
    },
    footer: {
      copyright: "Copyrights © 2025 | FishStats. Todos os direitos reservados a este site da web. Este site não é de propriedade ou operado pela Sulake Corporation e não é parte do Habbo Hotel®.",
      creatorCredit: "Criado por",
      subscribeButton: "Inscreva-se"
    },
    medals: {
        gold: "1º a chegar no nível 99",
        silver: "2º a chegar no nível 99",
        bronze: "3º a chegar no nível 99"
    }
  },
  en: {
    title: "Habbo Origins Statistics", placeholder: "Username", loading: "Loading...",
    button: "Search", notFound: "Skill not found", userNotFound: "User not found",
    skillsMissing: "No skills found. Check if the username is correct.",
    level: "Level", xp: "Experience", fishCaught: "Fish caught",
    goldFishCaught: "Golden Fish caught", fishingRod: "Fishing Rod", rodXp: "Rod XP",
    mission: "Motto", badges: "Badges", language: "Language", hotel: "Hotel", rank: "Rank",
    online: "Online", offline: "Offline", lastAccess: "Last visit",
    memberSince: "Member since", lastUpdate: "Data from",
    autoUpdateStatus: "Background update",
    nextPage: "Next", prevPage: "Previous", page: "Page",
    growth: "Growth", today: "Today", thisWeek: "This week", thisMonth: "This month",
    rankingTabs: { geral: "Overall Top", diario: "Daily Top", semanal: "Weekly Top", mensal: "Monthly Top", badges: "Top Badges", ultimosPesquisados: "Last Searched" },
    selectFlagSearch: "Select a country flag to enable user search",
    xpChart: {
      title: "XP Progression",
      noData: "No XP history to display.",
      loading: "Loading chart data...",
      saveError: "Failed to save player data.",
      loadingError: "Failed to load data."
    },
    footer: {
      copyright: "Copyrights © 2025 | FishStats. All rights reserved to this website. This site is not owned or operated by Sulake Corporation and is not part of Habbo Hotel®.",
      creatorCredit: "Created by",
      subscribeButton: "Subscribe"
    },
    medals: {
        gold: "1st to reach level 99",
        silver: "2nd to reach level 99",
        bronze: "3rd to reach level 99"
    }
  },
  es: {
    title: "Estadísticas de Habbo Origins", placeholder: "Nombre de usuario", loading: "Cargando...",
    button: "Buscar", notFound: "Habilidad no encontrada", userNotFound: "Usuario no encontrado",
    skillsMissing: "No se encontraron habilidades. Comprueba si el nombre de usuario es correcto.",
    level: "Nivel", xp: "Experiencia", fishCaught: "Peces atrapados",
    goldFishCaught: "Peces Dorados atrapados", fishingRod: "Caña de Pescar", rodXp: "XP de la Caña",
    mission: "Misión", badges: "Placas", language: "Idioma", hotel: "Hotel", rank: "Ranking",
    online: "En línea", offline: "Desconectado", lastAccess: "Última visita",
    memberSince: "Miembro desde", lastUpdate: "Datos de",
    autoUpdateStatus: "Actualización en segundo plano",
    nextPage: "Siguiente", prevPage: "Anterior", page: "Página",
    growth: "Crecimiento", today: "Hoy", thisWeek: "Esta semana", thisMonth: "Este mes",
    rankingTabs: { geral: "Top General", diario: "Top Diario", semanal: "Top Semanal", mensal: "Top Mensual", badges: "Top Placas", ultimosPesquisados: "Últimos Buscados" },
    selectFlagSearch: "Seleccione la bandera de un país para habilitar la búsqueda de usuarios",
    xpChart: {
      title: "Progresión de XP",
      noData: "No hay historial de XP para mostrar.",
      loading: "Cargando datos del gráfico...",
      saveError: "Error al guardar los datos del jugador.",
      loadingError: "Error al cargar los datos."
    },
    footer: {
      copyright: "Copyrights © 2025 | FishStats. Todos los derechos reservados a este sitio web. Este sitio no es propiedad ni está operado por Sulake Corporation y no forma parte de Habbo Hotel®.",
      creatorCredit: "Creado por",
      subscribeButton: "Suscribirse"
    },
    medals: {
        gold: "1º en alcanzar el nivel 99",
        silver: "2º en alcanzar el nivel 99",
        bronze: "3º en alcanzar el nivel 99"
    }
  }
};
const hotelLangMap = { "global": "en", "com.br": "pt", "com": "en", "es": "es" };
const FLAGS = [
    { code: "global", img: "/img/flags/global.png", label: "GLOBAL" },
    { code: "com.br", img: "/img/flags/brpt.png", label: "BR/PT" },
    { code: "com", img: "/img/flags/eng.png", label: "EN" },
    { code: "es", img: "/img/flags/es.png", label: "ES" },
];
const getFlagImgForHotel = (hotelCode) => FLAGS.find(f => f.code === hotelCode)?.img || '';

const getBadgeImagePath = (code) => {
    if (code.endsWith('.gif') || code.endsWith('.png') || code.endsWith('.jpg') || code.endsWith('.jpeg') || code.endsWith('.webp') || code.endsWith('.svg')) {
        return `/img/badges/${code}`;
    }
    return `/img/badges/${code}.png`;
};

// --- Constantes ---
const LABEL_TEXT_COLOR = "#ffd27f";
const ITEMS_PER_PAGE = 20;

// --- Componentes Reutilizáveis ---
const Badge = React.memo(({ code, name }) => {
    let srcPath = code;
    if (code && !/\.(png|gif|jpg|jpeg|webp|svg)$/i.test(code)) {
        srcPath = `/img/badges/${code}.png`;
    } else if (code) {
        srcPath = `/img/badges/${code}`;
    } else {
        srcPath = '/img/badges/default_badge.png';
    }
    return (
        <img src={srcPath} alt={name || 'Emblema'} title={name} className="inline-block mx-1 align-middle"
            style={{ imageRendering: "pixelated", height: "auto", width: "auto" }}
            onError={(e) => {
                if (srcPath.endsWith('.png')) {
                    const gifPath = srcPath.replace('.png', '.gif');
                    if (e.target.src !== gifPath) { e.target.src = gifPath; }
                } else { e.target.src = '/img/badges/default_badge.png'; }
            }}
        />
    );
});

const StatusDot = React.memo(({ online }) => ( <span title={online ? "Online" : "Offline"} className="inline-block align-middle mr-1" style={{ width: 10, height: 10, borderRadius: "50%", background: online ? "#b6f0ae" : "#e67e47", border: "1.5px solid #80682b" }} ></span> ));

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

const Footer = ({ t }) => {
    if (!t || !t.footer) return null;
    const youtubeUrl = "https://www.youtube.com/@posthabbo?sub_confirmation=1"; // Link correto
    return (
        <footer className="w-full text-center p-6 mt-auto z-10" style={{ background: "rgba(0, 0, 0, 0.2)" }}>
            <div className="max-w-4xl mx-auto text-xs font-mono" style={{ color: "#a08c6c" }}>
                <p className="mb-4 text-gray-500">{t.footer.copyright}</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-4">
                    <p>{t.footer.creatorCredit}: <a href="https://x.com/post_habbo" target="_blank" rel="noopener noreferrer" className="font-bold hover:text-white transition-colors" style={{ color: "#ffd27f" }}>Post</a></p>
                    <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 rounded-md font-bold text-xs transition-transform transform hover:scale-105" style={{ background: "#ff0000", color: "#ffffff", fontFamily: "'Press Start 2P', monospace", gap: '4px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" height="12" width="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"></path></svg>
                        {t.footer.subscribeButton}
                    </a>
                </div>
            </div>
        </footer>
    );
};

const GrowthStats = React.memo(({ gains, t }) => {
    if (!gains || (gains.today <= 0 && gains.week <= 0 && gains.month <= 0)) {
        return null;
    }
    return (
        <div className="mt-2 text-sm" style={{ color: "#ffeac2" }}>
            <strong style={{ color: LABEL_TEXT_COLOR }}>{t.growth}:</strong>
            {gains.today > 0 && <p className="text-xs ml-2" style={{ color: "#b6f0ae" }}>{t.today}: +{gains.today.toLocaleString('pt-BR')} XP</p>}
            {gains.week > 0 && <p className="text-xs ml-2" style={{ color: "#b6f0ae" }}>{t.thisWeek}: +{gains.week.toLocaleString('pt-BR')} XP</p>}
            {gains.month > 0 && <p className="text-xs ml-2" style={{ color: "#b6f0ae" }}>{t.thisMonth}: +{gains.month.toLocaleString('pt-BR')} XP</p>}
        </div>
    );
});

const PlayerCard = React.memo(({ player, t, dataIndexInRanking, handlePlayerClick, playerGains }) => (
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
                 <GrowthStats gains={playerGains} t={t} />
            </div>
        </div>
        <div className="mt-3"> <strong style={{ color: LABEL_TEXT_COLOR }}>{t.mission}:</strong> <span style={{ color: "#ffeac2" }}>{' '}{player.mission || "-"}</span> </div>
        <div className="mt-2">
            <strong style={{ color: LABEL_TEXT_COLOR }}>{t.badges}:</strong>
            {player.badges && player.badges.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1 items-center"> {player.badges.map((badge, idx) => {
                        const tooltipContent = `<div style="text-align: center; padding: 5px; font-family: monospace;">
                            <img src="${getBadgeImagePath(badge.code)}" alt="${badge.code}" style="width: 48px; height: 48px; margin: 0 auto 8px; image-rendering: pixelated; background: #332216; border-radius: 5px;" onError="this.onerror=null;this.src='/img/badges/${badge.code}.gif';" />
                            <strong style="display: block; color: #ffd27f;">${badge.code}</strong>
                            <p style="font-size: 11px; margin-top: 4px; color: #ccb991;">${badge.description || badge.name || 'Descrição não disponível'}</p>
                        </div>`;
                        return (
                            <button type="button" key={badge.code || `badge-${idx}`} data-tooltip-id="badge-tooltip" data-tooltip-html={tooltipContent} className="focus:outline-none">
                                <Badge code={badge.code} name={badge.name} />
                            </button>
                        );
                    })}
                </div>
            ) : ( <span style={{ color: "#ffeac2" }}>{' '}Nenhum emblema</span> )}
        </div>
    </div>
));

const RankingItem = React.memo(({ player, index, t, handlePlayerClick, expandedPlayer, expandedProfile, expandedPlayerXpHistory, loadingExpandedChart, currentHotel, level99Achievers }) => {
    const isExpanded = expandedPlayer && expandedPlayer.username === player.username && expandedPlayer.hotel === player.hotel;
    
    return (
    <div className="rounded-md shadow-lg flex flex-col relative" style={{ background: "rgba(37,28,18,0.93)", border: "1.5px solid rgba(128,84,44,0.2)", padding: '10px' }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center flex-grow min-w-0">
          <span className="text-lg font-bold mr-2 font-mono flex-shrink-0" style={{ color: "#ffde99", minWidth: '2.5ch' }}>{index + 1}.</span>
          <img src={player.avatarUrl} alt="Avatar" style={{ width: 62, height: 110, imageRendering: "pixelated", background: "#31241d", borderRadius: 5 }} className="cursor-pointer border border-[#7b6a56] object-cover flex-shrink-0 shadow-sm" onClick={() => handlePlayerClick(player)} />
          <div className="ml-2 flex-grow min-w-0">
            <p className="text-sm font-semibold flex items-center font-mono truncate" style={{ color: "#ffd27f" }} title={capitalize(player.username)}>
              <StatusDot online={player.online} />
                {currentHotel === 'global' && (
                    <img src={getFlagImgForHotel(player.hotel)} alt={player.hotel} className="w-4 h-auto mr-1.5" style={{imageRendering: 'pixelated'}} />
                )}
              {capitalize(player.username)}
              {currentHotel === 'global' && level99Achievers.find(a => a.username === player.username && a.hotel === player.hotel)?.global_rank === 1 && <span role="img" aria-label="Gold Medal" className="ml-1.5" data-tooltip-id="medal-tooltip" data-tooltip-content={`${t.medals.gold} (Global)`}>🥇</span>}
              {currentHotel === 'global' && level99Achievers.find(a => a.username === player.username && a.hotel === player.hotel)?.global_rank === 2 && <span role="img" aria-label="Silver Medal" className="ml-1.5" data-tooltip-id="medal-tooltip" data-tooltip-content={`${t.medals.silver} (Global)`}>🥈</span>}
              {currentHotel === 'global' && level99Achievers.find(a => a.username === player.username && a.hotel === player.hotel)?.global_rank === 3 && <span role="img" aria-label="Bronze Medal" className="ml-1.5" data-tooltip-id="medal-tooltip" data-tooltip-content={`${t.medals.bronze} (Global)`}>🥉</span>}
              {currentHotel !== 'global' && level99Achievers.find(a => a.username === player.username && a.hotel === player.hotel)?.hotel_rank === 1 && <span role="img" aria-label="Gold Medal" className="ml-1.5" data-tooltip-id="medal-tooltip" data-tooltip-content={`${t.medals.gold} (${player.hotel})`}>🥇</span>}
              {currentHotel !== 'global' && level99Achievers.find(a => a.username === player.username && a.hotel === player.hotel)?.hotel_rank === 2 && <span role="img" aria-label="Silver Medal" className="ml-1.5" data-tooltip-id="medal-tooltip" data-tooltip-content={`${t.medals.silver} (${player.hotel})`}>🥈</span>}
              {currentHotel !== 'global' && level99Achievers.find(a => a.username === player.username && a.hotel === player.hotel)?.hotel_rank === 3 && <span role="img" aria-label="Bronze Medal" className="ml-1.5" data-tooltip-id="medal-tooltip" data-tooltip-content={`${t.medals.bronze} (${player.hotel})`}>🥉</span>}
            </p>
            {player.mission && ( <p className="text-xs font-mono truncate mt-0.5" style={{ color: "#b0a080" }} title={player.mission}> "{player.mission}" </p> )}
          </div>
        </div>
        <span className="text-xs font-mono font-bold flex-shrink-0 ml-2 p-1 px-1.5 rounded" style={{ color: "#2a2215", backgroundColor: "#ffc76a" }}>Lvl {player.level}</span>
      </div>
      <XpBar value={player.experience} max={getNextLevelXp(player.level)} />
      
       <GrowthStats gains={player.gains} t={t} />

      <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1 font-mono text-xs items-center justify-between">
        {player.badges && player.badges.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 items-center">
              {player.badges.slice(0, 5).map((badge, idx) => {
                        const tooltipContent = `<div style="text-align: center; padding: 5px; font-family: monospace;">
                            <img src="${getBadgeImagePath(badge.code)}" alt="${badge.code}" style="width: 48px; height: 48px; margin: 0 auto 8px; image-rendering: pixelated; background: #332216; border-radius: 5px;" onError="this.onerror=null;this.src='/img/badges/${badge.code}.gif';" />
                            <strong style="display: block; color: #ffd27f;">${badge.code}</strong>
                            <p style="font-size: 11px; margin-top: 4px; color: #ccb991;">${badge.description || badge.name || 'Descrição não disponível'}</p>
                        </div>`;
                        return (
                                    <button type="button" key={badge.code || `sbadge-${idx}`} data-tooltip-id="badge-tooltip" data-tooltip-html={tooltipContent} className="focus:outline-none">
                                        <Badge code={badge.code} name={badge.name} />
                                    </button>
                                );
                            })}
                   {player.badges.length > 5 && <span className="text-xs opacity-70 self-center" style={{color: "#ccc0a5"}}>(+{player.badges.length - 5})</span>}
               </div>
            )}
            {player.updatedat && ( <span className="text-xs opacity-60 whitespace-nowrap" style={{ color: "#b3a079" }}> {formatDate(player.updatedat)} </span> )}
        </div>

        {isExpanded && (
        <div className="absolute top-0 left-0 w-full p-3 rounded-md z-20 flex flex-col shadow-2xl overflow-y-auto"
            style={{ background: "rgb(28, 22, 14)", border: "2px solid #c09b57", maxHeight: "calc(100vh - 100px)", minHeight:"450px" }}
            onClick={(e) => e.stopPropagation()}
        >
          {/* O restante do conteúdo expandido permanece o mesmo */}
           <div className="flex items-start mb-2">
             <img src={player.avatarUrl} alt="Avatar" style={{ width: 70, height: 123, imageRendering: "pixelated", background: "#332216", borderRadius: 8 }} className="mr-3 border-2 border-[#a07852] object-cover flex-shrink-0" />
             <div className="flex-1">
               <p className="font-bold text-md flex items-center font-mono" style={{ color: "#ffeac2" }}> <StatusDot online={expandedProfile?.online ?? player.online} /> {capitalize(player.username)} </p>
               <p className="text-xs ml-1" style={{ color: (expandedProfile?.online ?? player.online) ? "#b6f0ae" : "#f3bfa1" }}> {(expandedProfile?.online ?? player.online) ? t.online : t.offline} </p>
             </div>
             <button onClick={() => handlePlayerClick(player)} className="text-2xl font-mono text-amber-400 hover:text-amber-200 transition-colors flex-shrink-0">×</button>
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
            <GrowthStats gains={player.gains} t={t} />
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
                    {player.badges.map((badge, idx) => {
                                const tooltipContent = `<div style="text-align: center; padding: 5px; font-family: monospace;">
                                    <img src="${getBadgeImagePath(badge.code)}" alt="${badge.code}" style="width: 48px; height: 48px; margin: 0 auto 8px; image-rendering: pixelated; background: #332216; border-radius: 5px;" onError="this.onerror=null;this.src='/img/badges/${badge.code}.gif';" />
                                    <strong style="display: block; color: #ffd27f;">${badge.code}</strong>
                                    <p style="font-size: 11px; margin-top: 4px; color: #ccb991;">${badge.description || badge.name || 'Descrição não disponível'}</p>
                                </div>`;
                                return (
                                    <button type="button" key={badge.code || `expbadge-${idx}`} data-tooltip-id="badge-tooltip" data-tooltip-html={tooltipContent} className="focus:outline-none">
                                        <Badge code={badge.code} name={badge.name} />
                                    </button>
                                );
                            })}
                        </div>
                   ) : ( <span style={{ color: "#ffeac2" }}>{' '}Nenhum emblema</span> )}
                </div>
           <hr className="border-yellow-700/20 my-2.5"/>
           <div className="mt-2" style={{minHeight: "160px"}}>
             <DailyXpProgressChart data={expandedPlayerXpHistory} t={t} isLoading={loadingExpandedChart} chartHeight={150} />
           </div>
        </div>
      )}
    </div>
  );
});


// --- Componente Principal App ---
const App = () => {
    const [username, setUsername] = useState("");
    const [hotel, setHotel] = useState("global");
    const [lang, setLang] = useState("pt");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [ranking, setRanking] = useState([]);
    const [expandedPlayer, setExpandedPlayer] = useState(null);
    const [expandedProfile, setExpandedProfile] = useState(null);
    const [data, setData] = useState(null);
    const [playerGains, setPlayerGains] = useState(null);
    const [rankingPeriod, setRankingPeriod] = useState('geral');
    const [currentPage, setCurrentPage] = useState(1);
    const [dailyXpHistory, setDailyXpHistory] = useState([]);
    const [loadingChart, setLoadingChart] = useState(false);
    const [expandedPlayerXpHistory, setExpandedPlayerXpHistory] = useState([]);
    const [loadingExpandedChart, setLoadingExpandedChart] = useState(false);
    const [lastSearchedUsers, setLastSearchedUsers] = useState([]);
    const [searchHotel, setSearchHotel] = useState(''); // New state for search-specific hotel
    const [level99Achievers, setLevel99Achievers] = useState([]);
    const [globalLastSearchedUsers, setGlobalLastSearchedUsers] = useState([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const profileCache = useRef({});
    const t = translations[lang] || translations["pt"];
    
    // --- Funções de Cálculo e Busca de Dados OTIMIZADAS ---

    const fetchPlayerGains = useCallback(async (playerName, playerHotel, currentXp) => {
        const getXpAt = async (timestamp) => {
            const { data, error } = await supabase
                .from('xp_history')
                .select('experience')
                .eq('username', playerName.toLowerCase())
                .eq('hotel', playerHotel)
                .lte('logged_at', timestamp)
                .order('logged_at', { ascending: false })
                .limit(1)
.maybeSingle();
;
            
            if (error && error.code === 'PGRST116') { // 'PGRST116' = no rows found
                return 0;
            }
            return data?.experience || 0;
        };

        try {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const weekDate = new Date(now);
            const dayOfWeek = weekDate.getDay();
            const diff = weekDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const startOfWeek = new Date(new Date(now).setDate(diff)).toISOString();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            const [xpStartToday, xpStartWeek, xpStartMonth] = await Promise.all([
                getXpAt(startOfToday),
                getXpAt(startOfWeek),
                getXpAt(startOfMonth),
            ]);
            
            return {
                today: Math.max(0, currentXp - xpStartToday),
                week: Math.max(0, currentXp - xpStartWeek),
                month: Math.max(0, currentXp - xpStartMonth),
            };
        } catch (error) {
            console.error("Error fetching player gains:", error);
            return { today: 0, week: 0, month: 0 };
        }
    }, []);

    const fetchRankingGlobal = useCallback(async (options) => {
        const shouldSetLoading = options?.setLoadingState ?? false;
        if (shouldSetLoading) setLoading(true);

        try {
// LINHA CORRIGIDA
const { data: rankingData, error: rpcError } = await supabase.rpc('get_ranking_final_test', { hotel_param: hotel });
            
            if (rpcError) throw rpcError;

            let finalRanking = (rankingData || []).map(player => ({
                ...player,
                gains: {
                    today: player.gain_today,
                    week: player.gain_week,
                    month: player.gain_month,
                }
            }));

            if (hotel !== 'global') {
                finalRanking = finalRanking.filter(p => p.hotel === hotel);
            }
            
            setRanking(finalRanking);
            if (options?.setLoadingState) setCurrentPage(1);

        } catch (err) {
            console.error("[DEBUG] Error in fetchRankingGlobal:", err.message);
            setError(t.xpChart.loadingError || "Falha ao carregar ranking.");
        } finally {
            if (shouldSetLoading) setLoading(false);
        }
    }, [hotel, t]);
    
    const getDailyXpLogsFromSupabase = useCallback(async (playerName, playerHotel) => {
       if (!playerName || !playerHotel) return { data: [], error: new Error("Nome do jogador ou hotel não fornecido.") };
       try {
           const ninetyDaysAgo = new Date();
           ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

           const { data: xpLogs, error: fetchError } = await supabase
               .from('xp_history')
               .select('logged_at, experience, level')
               .eq('username', playerName.toLowerCase())
               .eq('hotel', playerHotel)
               .gte('logged_at', ninetyDaysAgo.toISOString())
               .order('logged_at', { ascending: true });

           if (fetchError) throw fetchError;
           if (!xpLogs) return { data: [], error: null };
           const formattedData = xpLogs.map(log => {
               const dateObj = new Date(log.logged_at);
               return {
                   timestamp: dateObj.getTime(),
                   experience: log.experience,
                   level: log.level,
                   tooltipLabel: dateObj.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
               };
           });
           return { data: formattedData, error: null };
       } catch (err) {
           return { data: [], error: err };
       }
    }, []);

    const savePlayerGlobal = useCallback(async (player) => {
       try {
           const playerToSave = { ...player, updatedat: new Date().toISOString() };
           const { error: saveError } = await supabase.from('ranking').upsert([playerToSave], { onConflict: ['username', 'hotel'] });
           if (saveError) throw saveError;

           if (player.username && player.hotel && typeof player.experience === 'number') {
               await supabase.from('xp_history').insert({
                   username: player.username.toLowerCase(), hotel: player.hotel,
                   level: player.level, experience: player.experience,
                   logged_at: new Date().toISOString()
               });
           }

           if (player.level === 99) {
                const { data: existingAchiever } = await supabase
                    .from('level_99_achievers')
                    .select('username')
                    .eq('username', player.username.toLowerCase())
                    .eq('hotel', player.hotel)
                    .single();

                if (!existingAchiever) {
                    const { count, error } = await supabase
                        .from('level_99_achievers')
                        .select('count', { count: 'exact' })
                        .eq('hotel', player.hotel);

                    if (error) throw error;

                    await supabase.from('level_99_achievers').insert({
                        username: player.username.toLowerCase(),
                        hotel: player.hotel,
                        rank: (count || 0) + 1,
                    });
                }
           }

           return true;
       } catch (err) {
           return false;
       }
    }, []);

    const fetchStats = useCallback(async () => {
        if (!username.trim()) { setError(t.placeholder); return; }
        setLoading(true); setError(""); setData(null); setPlayerGains(null);
        setDailyXpHistory([]);

        try {
            const usernameKey = username.trim().toLowerCase();
            const hotelToSearch = hotel === 'global' ? (searchHotel || 'com.br') : hotel;

            const userRes = await fetch(`https://origins.habbo.${hotelToSearch}/api/public/users?name=${usernameKey}`);
            if (!userRes.ok) { if (userRes.status === 404) throw new Error(t.userNotFound); throw new Error(`API User Error: ${userRes.status}`); }
            const userData = await userRes.json();
            const uniqueId = userData.uniqueId;
            if (!uniqueId) throw new Error("ID de usuário inválido.");
            
            const fishingRes = await fetch(`https://origins.habbo.${hotelToSearch}/api/public/skills/${uniqueId}?skillType=FISHING`);
            if (!fishingRes.ok) { if (fishingRes.status === 404) throw new Error(t.skillsMissing); throw new Error(`API Fishing Error: ${fishingRes.status}`); }
            const fishingData = await fishingRes.json();
            if (typeof fishingData.level === "undefined") throw new Error(t.skillsMissing);
            
            let profile = null;
            try {
                const profileRes = await fetch(`https://origins.habbo.${hotelToSearch}/api/public/users/${uniqueId}/profile`);
                if (profileRes.ok) profile = await profileRes.json();
            } catch (profileError) { console.warn("Erro ao buscar perfil:", profileError.message); }

            const newApiBadges = Array.isArray(userData.selectedBadges) ? userData.selectedBadges.map(b => ({ code: b.code, name: b.name, description: b.description })) : [];
            let combinedBadges = [...newApiBadges];
            
            const { data: existingPlayerData } = await supabase.from('ranking').select('badges').eq('username', usernameKey).eq('hotel', hotelToSearch).single();
            if (existingPlayerData && Array.isArray(existingPlayerData.badges)) {
                const currentApiBadgeCodes = new Set(newApiBadges.map(b => b.code));
                existingPlayerData.badges.forEach(dbBadge => {
                    if (dbBadge && dbBadge.code && !currentApiBadgeCodes.has(dbBadge.code)) combinedBadges.push(dbBadge);
                });
            }
            const uniqueBadgeCodes = new Set();
            const finalUniqueBadges = combinedBadges.filter(badge => {
               if (badge && badge.code && !uniqueBadgeCodes.has(badge.code)) {
                   uniqueBadgeCodes.add(badge.code);
                   return true;
               }
               return false;
            });
            
            const newPlayer = {
                username: usernameKey, level: fishingData.level, experience: fishingData.experience,
                avatarUrl: `https://www.habbo.${hotelToSearch}/habbo-imaging/avatarimage?figure=${userData.figureString}&size=l&direction=2&head_direction=2&gesture=sml&action=wav`,
                mission: userData.motto, badges: finalUniqueBadges, fishCaught: fishingData.fishCaught,
                goldFishCaught: fishingData.goldFishCaught, rod: fishingData.rod, hotel: hotelToSearch,
                online: profile?.online ?? userData.online, lastaccesstime: profile?.lastaccesstime ?? null,
                membersince: profile?.membersince ?? null, updatedat: new Date().toISOString(),
            };

            const saved = await savePlayerGlobal(newPlayer);
            if (saved) {
                setData(newPlayer);
                const gains = await fetchPlayerGains(newPlayer.username, newPlayer.hotel, newPlayer.experience);
                setPlayerGains(gains);

                profileCache.current[usernameKey] = profile;
                fetchRankingGlobal({});
                
                setLoadingChart(true);
                getDailyXpLogsFromSupabase(newPlayer.username, newPlayer.hotel)
                    .then(result => {
                        if(result.data) setDailyXpHistory(result.data);
                    }).finally(() => setLoadingChart(false));
                
                setLastSearchedUsers(prev => {
                    const updated = [newPlayer, ...prev.filter(p => p.username !== newPlayer.username || p.hotel !== newPlayer.hotel)];
                    return updated.slice(0, 5); // Keep only the last 5 searched users
                });

                // Record the search in the new table
                await supabase.from('last_searched_players').upsert({
                    username: newPlayer.username.toLowerCase(),
                    hotel: newPlayer.hotel,
                    searched_at: new Date().toISOString()
                }, { onConflict: ['username', 'hotel'] });

            } else { setError(t.xpChart.saveError || "Falha ao salvar dados."); }
        } catch (err) {
            setError(err.message); setData(null);
        } finally { setLoading(false); }
    }, [username, hotel, t, savePlayerGlobal, getDailyXpLogsFromSupabase, fetchPlayerGains, fetchRankingGlobal, searchHotel]);
    
    // --- useEffects ---
    useEffect(() => {
        setError(""); setData(null); setPlayerGains(null);
        setExpandedPlayer(null); setExpandedProfile(null);
        setCurrentPage(1);
        fetchRankingGlobal({ setLoadingState: true });
    }, [hotel, fetchRankingGlobal]);

    useEffect(() => {
        const channel = supabase.channel('ranking-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'ranking' },
            (payload) => {
                if (payload.eventType === 'INSERT') {
                    setRanking(prevRanking => [...prevRanking, payload.new]);
                } else if (payload.eventType === 'UPDATE') {
                    setRanking(prevRanking => prevRanking.map(player => player.id === payload.new.id ? payload.new : player));
                }
            }
          ).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    useEffect(() => {
        const fetchLevel99Achievers = async () => {
            const { data, error } = await supabase
                .from('level_99_achievers')
                .select('username, hotel, hotel_rank, global_rank')
                .order('global_rank', { ascending: true });

            if (error) {
                console.error("Error fetching level 99 achievers:", error);
            } else {
                setLevel99Achievers(data);
            }
        };

        const fetchLastSearchedPlayers = async () => {
            const { data, error } = await supabase
                .from('last_searched_players')
                .select('username, hotel')
                .order('searched_at', { ascending: false })
                .limit(5);

            if (error) {
                console.error("Error fetching last searched players:", error);
                setGlobalLastSearchedUsers([]);
                return;
            }

            if (!data || data.length === 0) {
                setGlobalLastSearchedUsers([]);
                return;
            }

            const fetchedPlayers = await Promise.all(data.map(async (user) => {
                try {
                    const hotelToSearch = user.hotel;
                    const usernameKey = user.username.toLowerCase();

                    const userRes = await fetch(`https://origins.habbo.${hotelToSearch}/api/public/users?name=${usernameKey}`);
                    if (!userRes.ok) {
                        console.warn(`Could not fetch user data for ${usernameKey} (${hotelToSearch}):`, userRes.status);
                        return null;
                    }
                    const userData = await userRes.json();
                    const uniqueId = userData.uniqueId;
                    if (!uniqueId) {
                        console.warn(`Invalid user ID for ${usernameKey} (${hotelToSearch})`);
                        return null;
                    }

                    const fishingRes = await fetch(`https://origins.habbo.${hotelToSearch}/api/public/skills/${uniqueId}?skillType=FISHING`);
                    if (!fishingRes.ok) {
                        console.warn(`Could not fetch fishing data for ${usernameKey} (${hotelToSearch}):`, fishingRes.status);
                        return null;
                    }
                    const fishingData = await fishingRes.json();
                    if (typeof fishingData.level === "undefined") {
                        console.warn(`No fishing skills found for ${usernameKey} (${hotelToSearch})`);
                        return null;
                    }

                    let profile = null;
                    try {
                        const profileRes = await fetch(`https://origins.habbo.${hotelToSearch}/api/public/users/${uniqueId}/profile`);
                        if (profileRes.ok) profile = await profileRes.json();
                    } catch (profileError) {
                        console.warn("Error fetching profile:", profileError.message);
                    }

                    const newApiBadges = Array.isArray(userData.selectedBadges) ? userData.selectedBadges.map(b => ({ code: b.code, name: b.name, description: b.description })) : [];
                    let combinedBadges = [...newApiBadges];

                    const { data: existingPlayerData } = await supabase.from('ranking').select('badges').eq('username', usernameKey).eq('hotel', hotelToSearch).single();
                    if (existingPlayerData && Array.isArray(existingPlayerData.badges)) {
                        const currentApiBadgeCodes = new Set(newApiBadges.map(b => b.code));
                        existingPlayerData.badges.forEach(dbBadge => {
                            if (dbBadge && dbBadge.code && !currentApiBadgeCodes.has(dbBadge.code)) combinedBadges.push(dbBadge);
                        });
                    }
                    const uniqueBadgeCodes = new Set();
                    const finalUniqueBadges = combinedBadges.filter(badge => {
                       if (badge && badge.code && !uniqueBadgeCodes.has(badge.code)) {
                           uniqueBadgeCodes.add(badge.code);
                           return true;
                       }
                       return false;
                    });

                    return {
                        username: usernameKey,
                        level: fishingData.level,
                        experience: fishingData.experience,
                        avatarUrl: `https://www.habbo.${hotelToSearch}/habbo-imaging/avatarimage?figure=${userData.figureString}&size=l&direction=2&head_direction=2&gesture=sml&action=wav`,
                        mission: userData.motto,
                        badges: finalUniqueBadges,
                        fishCaught: fishingData.fishCaught,
                        goldFishCaught: fishingData.goldFishCaught,
                        rod: fishingData.rod,
                        hotel: hotelToSearch,
                        online: profile?.online ?? userData.online,
                        lastaccesstime: profile?.lastaccesstime ?? null,
                        membersince: profile?.membersince ?? null,
                        updatedat: new Date().toISOString(),
                    };
                } catch (err) {
                    console.error("Error fetching details for last searched player:", user.username, err);
                    return null;
                }
            }));
            setGlobalLastSearchedUsers(fetchedPlayers.filter(Boolean)); // Filter out nulls
        };

        fetchLevel99Achievers();
        fetchLastSearchedPlayers();

        const channel = supabase.channel('last-searched-players-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'last_searched_players' },
                (payload) => {
                    fetchLastSearchedPlayers(); // Re-fetch to get the latest 5
                }
            ).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- Manipuladores de Eventos ---
    const handlePlayerClick = useCallback(async (player) => {
        if (expandedPlayer?.username === player.username && expandedPlayer?.hotel === player.hotel) {
            setExpandedPlayer(null); setExpandedProfile(null); setExpandedPlayerXpHistory([]);
        } else {
            setExpandedPlayer(player);
            setExpandedProfile(profileCache.current[player.username] || null);
            setExpandedPlayerXpHistory([]); setLoadingExpandedChart(true);
            
            getDailyXpLogsFromSupabase(player.username, player.hotel)
                .then(result => {
                    if (result.data) setExpandedPlayerXpHistory(result.data);
                }).finally(() => setLoadingExpandedChart(false));
        }
    }, [expandedPlayer, getDailyXpLogsFromSupabase]);

    const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
const handlePageClick = (pageNumber) => {
    setCurrentPage(pageNumber);
};
    
    // --- Cálculos para Renderização ---
    const sortedRanking = React.useMemo(() => {
        const sorted = [...ranking];
        sorted.sort((a, b) => {
            if (a.level !== b.level) {
                return b.level - a.level;
            }
            return b.experience - a.experience;
        });

        if (rankingPeriod === 'geral') return sorted;
        if (rankingPeriod === 'diario') return sorted.sort((a, b) => (b.gains?.today || 0) - (a.gains?.today || 0));
        if (rankingPeriod === 'semanal') return sorted.sort((a, b) => (b.gains?.week || 0) - (a.gains?.week || 0));
        if (rankingPeriod === 'mensal') return sorted.sort((a, b) => (b.gains?.month || 0) - (a.gains?.month || 0));
        if (rankingPeriod === 'badges') return sorted.sort((a, b) => (b.badges?.length || 0) - (a.badges?.length || 0));
        if (rankingPeriod === 'ultimosPesquisados') return globalLastSearchedUsers;
        return sorted;
    }, [ranking, rankingPeriod, globalLastSearchedUsers]);

    const dataIndexInRanking = data ? sortedRanking.findIndex((p) => p.username === data.username && p.hotel === data.hotel) : -1;
    const totalPages = Math.ceil(sortedRanking.length / ITEMS_PER_PAGE);
    const paginatedRanking = sortedRanking.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    
    const tabStyle = {
        padding: '8px 16px',
        cursor: 'pointer',
        background: 'rgba(42,34,21,0.8)',
        color: '#ccc0a5',
        border: '1.5px solid #a9865a',
        borderRadius: '8px',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '10px'
    };
    const activeTabStyle = {
        ...tabStyle,
        background: '#e8a235',
        color: '#fff8f0',
        borderColor: '#ffc76a'
    };

    // --- Renderização ---
    return (
        <>
            <div className={`min-h-screen w-full flex flex-col items-center font-mono ${isMobile ? 'p-4' : ''}`} style={{ background: "#101217", position: "relative", overflowX: "hidden" }} >
                <div style={{ background: "url('/img/fundo.png') no-repeat center center", backgroundSize: "798px 671px", width: "100vw", height: "100vh", position: "fixed", zIndex: 0, top: 0, left: 0 }} />
                <img src="/img/banner.png" alt="Fishing Banner" width={isMobile ? 300 : 460} height={isMobile ? 60 : 90} className="mx-auto select-none" style={{ marginTop: "max(5vh, 20px)", marginBottom: 20, imageRendering: "pixelated", display: "block", position: "relative", zIndex: 2, filter: "drop-shadow(0 6px 20px #0009)", pointerEvents: "none" }} />
                
                <div className={`relative z-10 w-full ${isMobile ? 'max-w-sm' : 'max-w-4xl'} rounded-lg px-4 sm:px-6 py-8 mb-10`} >
                    <div className={`flex items-center justify-center ${isMobile ? 'gap-2' : 'gap-4 sm:gap-7'} mb-6`}>
                        {FLAGS.map((flag) => (
                            <div key={flag.code} onClick={() => {setHotel(flag.code); setLang(hotelLangMap[flag.code] || "pt"); setRankingPeriod('geral'); setUsername(''); setData(null);}} className="flex flex-col items-center" style={{ cursor: "pointer", opacity: hotel === flag.code ? 1 : 0.5, transition: "opacity 0.2s, transform 0.2s", transform: hotel === flag.code ? "scale(1.05)" : "scale(1)", borderRadius: 8, border: hotel === flag.code ? "2.5px solid #ffc76a" : "2.5px solid transparent", boxShadow: hotel === flag.code ? "0 3px 12px #e7b76755" : "none", background: "#1c1712", padding: "5px" }}>
                                <img src={flag.img} alt={flag.label} style={{ width: isMobile ? 32 : 48, height: isMobile ? 21 : 32, objectFit: "cover", borderRadius: 5, display: "block", border: "1px solid #443322" }} />
                                <span className="block text-xs text-center mt-1.5" style={{ color: hotel === flag.code ? "#ffc76a" : "#ccc0a5", fontWeight: "bold", letterSpacing: 0.5, fontFamily: "'Press Start 2P', monospace", fontSize: isMobile ? "8px" : "10px" }}> {flag.label} </span>
                            </div>
                        ))}
                    </div>

                   
                    <div className="rounded-lg p-5 mb-6" style={{ background: "rgba(24,19,10,0.88)", border: "1.5px solid rgba(149,117,58,0.2)", boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}>
                        {hotel === 'global' && (
                            <p className="text-center text-yellow-300 font-mono text-sm mb-4">
                                {t.selectFlagSearch}
                            </p>
                        )}
                        <input type="text" placeholder={t.placeholder} value={username} onChange={(e) => setUsername(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && !loading && username.trim() && fetchStats()} className="border rounded p-3 w-full text-base font-mono" style={{ background: "rgba(15,10,5,0.5)", color: "#ffedbe", border: "1.5px solid #a9865a", boxShadow: "inset 0 1px 4px rgba(0,0,0,0.3)", fontSize: isMobile ? '14px' : '16px' }} disabled={hotel === 'global' && !searchHotel} />
                        {hotel === 'global' && (
                            <div className="flex items-center justify-center gap-2 mt-4">
                                {FLAGS.filter(flag => flag.code !== 'global').map((flag) => (
                                    <div key={flag.code} onClick={() => {setSearchHotel(flag.code); setLang(hotelLangMap[flag.code] || "pt");}} className="flex flex-col items-center" style={{ cursor: "pointer", opacity: searchHotel === flag.code ? 1 : 0.5, transition: "opacity 0.2s, transform 0.2s", transform: searchHotel === flag.code ? "scale(1.05)" : "scale(1)", borderRadius: 4, border: searchHotel === flag.code ? "1.5px solid #ffc76a" : "1.5px solid transparent", boxShadow: searchHotel === flag.code ? "0 2px 8px #e7b76755" : "none", background: "#1c1712", padding: "3px" }}>
                                        <img src={flag.img} alt={flag.label} style={{ width: 32, height: 21, objectFit: "cover", borderRadius: 3, display: "block", border: "1px solid #443322" }} />
                                        <span className="block text-xs text-center mt-1" style={{ color: searchHotel === flag.code ? "#ffc76a" : "#ccc0a5", fontWeight: "bold", letterSpacing: 0.5, fontFamily: "'Press Start 2P', monospace", fontSize: "8px" }}> {flag.label} </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button className="w-full mt-4 font-bold text-sm py-3 rounded-md" style={{ background: "linear-gradient(to bottom, #e8a235, #c07c1e)", color: "#fff8f0", border: "1px solid #a9865a", textShadow: "1px 1px 2px #00000070", letterSpacing: 1.5, fontFamily: "'Press Start 2P', monospace", boxShadow: "0 3px 8px rgba(0,0,0,0.3), inset 0 1px 1px #fff5c77c", opacity: loading || !username.trim() ? 0.6 : 1, cursor: loading || !username.trim() ? "not-allowed" : "pointer", transition: "background 0.2s, transform 0.1s", fontSize: isMobile ? '12px' : '14px' }} onClick={fetchStats} disabled={loading || !username.trim() || (hotel === 'global' && !searchHotel)} onMouseDown={(e) => !e.currentTarget.disabled && (e.currentTarget.style.transform = "scale(0.98)")} onMouseUp={(e) => !e.currentTarget.disabled && (e.currentTarget.style.transform = "scale(1)")} onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.transform = "scale(1)")} >
                            {loading && data === null ? t.loading : t.button}
                        </button>
                    </div>
                    {lastSearchedUsers.length > 0 && hotel !== 'global' && (
                        <div className="rounded-lg p-5 mb-6" style={{ background: "rgba(24,19,10,0.88)", border: "1.5px solid rgba(149,117,58,0.2)", boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}>
                            <h3 className="text-md font-bold mb-3" style={{ color: "#ffeac2" }}>Últimos Usuários Pesquisados:</h3>
                            <div className="flex flex-wrap gap-2">
                                {lastSearchedUsers.map((user, index) => (
                                    <button
                                        key={index}
                                        onClick={() => { setUsername(user.username); setHotel(user.hotel); }}
                                        className="px-3 py-1.5 rounded-md text-xs font-mono"
                                        style={{ background: "#e8a235", color: "#fff8f0", border: "1px solid #a9865a" }}
                                    >
                                        {capitalize(user.username)} ({user.hotel})
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}


                    {error && ( <div className="text-center text-red-300 font-mono font-semibold my-4 p-3 bg-red-900 bg-opacity-50 rounded-md border border-red-700"> {error} </div> )}
                    
                    {data && (
                        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'} gap-x-6 gap-y-4 mb-6`}>
                            <div className={`${isMobile ? '' : 'lg:col-span-2'}`}>
                                <PlayerCard player={data} t={t} dataIndexInRanking={dataIndexInRanking} handlePlayerClick={handlePlayerClick} playerGains={playerGains} />
                            </div>
                            <div className={`${isMobile ? '' : 'lg:col-span-1'}`}>
                                <DailyXpProgressChart data={dailyXpHistory} t={t} isLoading={loadingChart} chartHeight={300} />
                            </div>
                        </div>
                    )}

                    {loading && !data && !error && ( <div className="text-center text-yellow-200 font-mono my-4 text-sm">{t.loading}</div> )}
                    
                    <div className="flex justify-center mb-4 mt-8"> <img src="/img/ranking.png" alt="Ranking" style={{ height: 64, objectFit: "contain", filter: "drop-shadow(0 3px 8px #00000080)" }} /> </div>

                    <div className={`flex justify-center ${isMobile ? 'gap-1' : 'gap-2'} mb-4 flex-wrap`}>
                        {Object.keys(t.rankingTabs).map(period => (
                            <button key={period} onClick={() => setRankingPeriod(period)} style={rankingPeriod === period ? {...activeTabStyle, fontSize: isMobile ? '8px' : '10px', padding: isMobile ? '6px 10px' : '8px 16px'} : {...tabStyle, fontSize: isMobile ? '8px' : '10px', padding: isMobile ? '6px 10px' : '8px 16px'}}>
                                {t.rankingTabs[period]}
                            </button>
                        ))}
                    </div>

                    {paginatedRanking.length > 0 ? (
                        <>
                            <ul className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-x-4 gap-y-4`}>
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
                                        currentHotel={hotel}
                                        level99Achievers={level99Achievers}
                                    />
                                ))}
                            </ul>
                            {totalPages > 1 && (
    <div className={`flex justify-center items-center mt-6 font-mono ${isMobile ? 'gap-1' : 'gap-2'} text-sm`}>
        {/* Botão Anterior */}
        <button 
            onClick={handlePrevPage} 
            disabled={currentPage === 1}
            className={`px-3 py-1.5 rounded disabled:opacity-50 hover:bg-yellow-700/30 transition-colors ${isMobile ? 'text-xs' : ''}`}
            style={{ background: currentPage === 1 ? "rgba(42,34,21,0.8)" : "rgba(74,57,30,0.8)", color: "#ffeac2", border: "1.5px solid #c79b5b" }}
        >
            {t.prevPage}
        </button>

        {/* Números das Páginas */}
        {(() => {
            const pageNumbers = [];
            const pageRange = isMobile ? 2 : 5; // Quantos números mostrar ao redor da página atual
            
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= currentPage - pageRange && i <= currentPage + pageRange)) {
                    pageNumbers.push(i);
                }
            }

            const paginacaoComElipses = [];
            let ultimoNumero = 0;
            for (const numero of pageNumbers) {
                if (ultimoNumero) {
                    if (numero - ultimoNumero > 1) {
                        paginacaoComElipses.push('...');
                    }
                }
                paginacaoComElipses.push(numero);
                ultimoNumero = numero;
            }

            return paginacaoComElipses.map((page, index) => 
                typeof page === 'number' ? (
                    <button 
                        key={index} 
                        onClick={() => handlePageClick(page)}
                        className={`w-8 h-8 rounded transition-colors ${isMobile ? 'text-xs' : ''}`}
                        style={{
                            color: page === currentPage ? '#1a150e' : '#ffeac2',
                            background: page === currentPage ? '#ffc76a' : 'rgba(74,57,30,0.8)',
                            border: '1.5px solid #c79b5b',
                            fontWeight: page === currentPage ? 'bold' : 'normal'
                        }}
                    >
                        {page}
                    </button>
                ) : (
                    <span key={index} className="px-1 text-yellow-200/50">...</span>
                )
            );
        })()}

        {/* Botão Próximo */}
        <button 
            onClick={handleNextPage} 
            disabled={currentPage === totalPages || totalPages === 0}
            className={`px-3 py-1.5 rounded disabled:opacity-50 hover:bg-yellow-700/30 transition-colors ${isMobile ? 'text-xs' : ''}`}
            style={{ background: (currentPage === totalPages || totalPages === 0) ? "rgba(42,34,21,0.8)" : "rgba(74,57,30,0.8)", color: "#ffeac2", border: "1.5px solid #c79b5b" }}
        >
            {t.nextPage}
        </button>
    </div>
)}
                        </>
                    ) : (
                        !loading && !error && ( <div className="text-center text-gray-400 font-mono py-5"> {t.xpChart.loadingError || "Nenhum jogador no ranking para este hotel ainda."} </div> )
                    )}
                </div>
                <Footer t={t} />
            </div>
              <Tooltip 
        id="badge-tooltip"
        offset={20}
className="custom-tooltip"
style={{ zIndex: 999 }} 
      />
      <Tooltip 
        id="medal-tooltip"
        offset={10}
        className="custom-medal-tooltip"
        style={{ zIndex: 1000 }} 
      />
    </>
  );
};



export default App;