import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Fish } from "lucide-react";
import "@fontsource/press-start-2p";  // Fonte pixelada

// --- Supabase config ---
const supabaseUrl = "https://qytcpbxhfuapugpswaaa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5dGNwYnhoZnVhcHVncHN3YWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1NzgyNzksImV4cCI6MjA2MzE1NDI3OX0.yCIQkPMQzhW1FVk1hCBoeLkRoYQX7MKydLPO5DegpMU";
const supabase = createClient(supabaseUrl, supabaseKey);

// --- XP tabela para os níveis ---
const fishingLevelXp = [
  55,135,255,417,623,875,1174,1521,1918,2366,2865,3417,4022,4681,5396,6165,6992,7875,8816,9815,10872,11989,13166,14403,15702,17061,18482,19965,21512,25385,29800,34810,40474,46855,54018,62034,70976,80925,91962,104175,117656,132501,148813,166696,186264,148921,163002,178562,195795,313638,345952,259854,286232,315649,348475,385123,426055,471781,522873,579974,643808,715185,795011,884300,984197,1095997,1221172,1361378,1518482,1694567,1891954,2113226,2361237,2639153,2950471,3299040,3689099,4125312,4612793,5157136,5764455,6441416,7195262,8033890,8965895,10000648,11148361,12420151,13828124,15385449,17106438,19006644,21103949,23417679,25968694,28779509,31874457,35279924
];
function getNextLevelXp(currentLevel) {
  return fishingLevelXp[currentLevel - 1] || 0;
}
function capitalize(str) {
  if (!str) return "";
  return str[0].toUpperCase() + str.slice(1);
}

const translations = {
  pt: {
    title: "Estatísticas do Habbo Origins",
    placeholder: "Nome do usuário",
    loading: "Carregando...",
    button: "Buscar Estatísticas",
    notFound: "Habilidade não encontrada",
    userNotFound: "Usuário não encontrado",
    skillsMissing: "Nenhuma habilidade encontrada. Verifique se o nome de usuário está correto.",
    level: "Nível",
    xp: "Experiência",
    fishCaught: "Peixes capturados",
    goldFishCaught: "Peixes Dourados capturados",
    fishingRod: "Vara de Pescar",
    rodXp: "XP da Vara",
    mission: "Missão",
    badges: "Emblemas",
    language: "Idioma",
    hotel: "Hotel",
    rank: "Ranking"
  }
};

const hotelLangMap = {
  "com.br": "pt",
  "com": "en",
  "es": "es"
};

function Badge({ code, name }) {
  return (
    <img
      src={`/badges/${code}.gif`}
      alt={name}
      title={name}
      className="inline-block w-7 h-7 mx-1 align-middle"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

const HabboStats = () => {
  const [username, setUsername] = useState("");
  const [hotel, setHotel] = useState("com.br");
  const [lang, setLang] = useState("pt");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ranking, setRanking] = useState([]);
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [data, setData] = useState(null); // Resultado da última busca

  // Carregar ranking global ao entrar
  useEffect(() => {
    setLang(hotelLangMap[hotel] || "pt");
    fetchRankingGlobal();
    setData(null);
    setExpandedPlayer(null);
    // eslint-disable-next-line
  }, [hotel]);

  const t = translations[lang] || translations["pt"];

  // --- FUNÇÕES SUPABASE ---
  async function savePlayerGlobal(player) {
    await supabase
      .from('ranking')
      .upsert([player], { onConflict: ['username'] });
  }

  async function fetchRankingGlobal() {
    const { data } = await supabase
      .from('ranking')
      .select('*')
      .order('level', { ascending: false })
      .order('experience', { ascending: false });
    setRanking((data || []).filter(p => p && p.username));
  }

  // --- Buscar e atualizar ranking global ---
  const fetchStats = async () => {
    setLoading(true);
    setError("");
    setData(null);
    setExpandedPlayer(null);
    try {
      const userRes = await fetch(`https://origins.habbo.${hotel}/api/public/users?name=${username}`);
      if (!userRes.ok) throw new Error(t.userNotFound);
      const userData = await userRes.json();
      const uniqueId = userData.uniqueId;
      if (!uniqueId) throw new Error("ID inválido");

      const res = await fetch(`https://origins.habbo.${hotel}/api/public/skills/${uniqueId}?skillType=FISHING`);
      if (!res.ok) throw new Error(t.skillsMissing);
      const fishingData = await res.json();
      if (!fishingData || typeof fishingData.level === "undefined") throw new Error(t.skillsMissing);

      const badges = Array.isArray(userData.selectedBadges) && userData.selectedBadges.length > 0
        ? userData.selectedBadges
        : [];

      const avatarUrl = `https://www.habbo.${hotel}/habbo-imaging/avatarimage?figure=${userData.figureString}&size=l&direction=2&head_direction=2&gesture=sml&action=wav`;

      const newPlayer = {
        username: capitalize(username),
        level: fishingData.level,
        experience: fishingData.experience,
        avatarUrl,
        mission: userData.motto,
        badges,
        fishCaught: fishingData.fishCaught,
        goldFishCaught: fishingData.goldFishCaught,
        rod: fishingData.rod,
      };

      // Salva no ranking global (Supabase)
      await savePlayerGlobal(newPlayer);

      // Busca ranking global atualizado
      await fetchRankingGlobal();

      setData(newPlayer);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Barra de progresso XP
  const progress = data && getNextLevelXp(data.level) > 0
    ? Math.min((data.experience / getNextLevelXp(data.level)) * 100, 100)
    : 0;

  const rodProgress = data && data.rod && data.rod.nextLevelExperience > 0
    ? Math.min((data.rod.experience / data.rod.nextLevelExperience) * 100, 100)
    : 0;

  const handlePlayerClick = (player) => {
    if (expandedPlayer && expandedPlayer.username === player.username) {
      setExpandedPlayer(null);
    } else {
      setExpandedPlayer(player);
    }
  };

  // Index do player da pesquisa no ranking (pode ser -1)
  const dataIndexInRanking = data
    ? ranking.findIndex(p => p.username.toLowerCase() === data.username.toLowerCase())
    : -1;

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-[#e2f1f8] border border-[#3b4a57] rounded-lg shadow-xl font-[\'Press Start 2P\'] text-sm">
      <div className="bg-[#d4e1ea] border border-[#3b4a57] rounded-md p-6 shadow-inner">
        <h2 className="text-3xl font-bold text-center text-[#2a3c47] mb-4">
          🐟 {t.title} 🐟
        </h2>
        <div className="space-y-4">
          <div className="flex justify-center space-x-4">
            <select
              className="border rounded p-2 text-sm bg-white"
              value={hotel}
              onChange={(e) => setHotel(e.target.value)}
            >
              <option value="com.br">🇧🇷</option>
              <option value="com">🇺🇸</option>
              <option value="es">🇪🇸</option>
            </select>
          </div>
          <input
            type="text"
            placeholder={t.placeholder}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border rounded p-2 w-full border-[#3b4a57] text-sm"
          />
          <button
            className="w-full bg-[#9ec7e2] hover:bg-[#7fb3d5] text-black font-bold text-sm py-2 rounded"
            onClick={fetchStats}
            disabled={loading || !username}
          >
            {loading ? t.loading : t.button}
          </button>
        </div>
      </div>

      {error && <div className="text-center text-red-500 font-medium">{error}</div>}

      {/* Resultado pesquisado destacado acima do ranking, mostrando a colocação */}
      {data && (
        <div className="bg-[#f4f9fd] border border-[#6c7f92] rounded-md p-6 space-y-4 my-6">
          <div className="flex items-center mb-3">
            <h2 className="text-lg font-semibold text-[#4a5d75] flex-1">
              🎣 {t.level}: {data.level}
            </h2>
            <Fish className="w-8 h-8 text-[#3e8ab9]" />
          </div>
          <div className="flex items-center">
            <img
              src={data.avatarUrl}
              alt="Avatar"
              className="w-14 h-14 rounded-full mr-3 border-2 border-[#3b4a57] cursor-pointer"
              onClick={() => handlePlayerClick(data)}
              style={{ imageRendering: "pixelated" }}
            />
            <div>
              <p className="text-lg font-semibold text-[#4a5d75]">
                {data.username}
                {dataIndexInRanking !== -1 &&
                  <span className="ml-2 text-xs text-[#6c757d]">({t.rank}: {dataIndexInRanking + 1})</span>
                }
              </p>
              <p className="text-sm text-[#6c757d]">{t.level}: {data.level} | {t.xp}: {data.experience}</p>
            </div>
          </div>
          <p>{t.xp}: {data.experience} / {getNextLevelXp(data.level)}</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
          <p>{t.fishCaught}: <strong>{data.fishCaught}</strong></p>
          <p>{t.goldFishCaught}: <strong>{data.goldFishCaught}</strong></p>
          {data.rod && (
            <div className="mt-2">
              <h3 className="font-semibold text-sm text-[#4a5d75]">{t.fishingRod}</h3>
              <p>{t.rodXp}: {data.rod.experience} / {data.rod.nextLevelExperience}</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${rodProgress}%` }}></div>
              </div>
            </div>
          )}
          <div>
            <strong>{t.mission}:</strong> {data.mission}
          </div>
          <div>
            <strong>{t.badges}:</strong>
            {data.badges && data.badges.length > 0
              ? data.badges.map((badge, idx) => (
                <Badge key={badge.code || idx} code={badge.code} name={badge.name} />
              ))
              : <span> Nenhum emblema</span>
            }
          </div>
        </div>
      )}

      <h3 className="text-lg font-semibold text-center text-[#4a5d75]">{t.rank}</h3>
      <ul className="space-y-3">
        {ranking.map((player, index) => (
          <li key={player.username} className="bg-[#f0f6fb] p-4 rounded-md shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-xl font-bold text-[#5675c2] mr-4">{index + 1}</span>
                <img
                  src={player.avatarUrl}
                  alt="Avatar"
                  className="w-14 h-14 rounded-full cursor-pointer"
                  onClick={() => handlePlayerClick(player)}
                  style={{ imageRendering: "pixelated" }}
                />
                <span className="text-lg font-semibold text-[#4a5d75] ml-4">{player.username}</span>
              </div>
            </div>
            {expandedPlayer && expandedPlayer.username === player.username && (
              <div className="mt-4 bg-[#f4f9fd] p-4 rounded-md shadow-md">
                <p><strong>{t.level}:</strong> {player.level}</p>
                <p><strong>{t.xp}:</strong> {player.experience} / {getNextLevelXp(player.level)}</p>
                <p><strong>{t.fishCaught}:</strong> {player.fishCaught ?? "-"}</p>
                <p><strong>{t.goldFishCaught}:</strong> {player.goldFishCaught ?? "-"}</p>
                {player.rod && (
                  <div>
                    <strong>{t.fishingRod}:</strong> {t.level} {player.rod.level}<br />
                    <span>{t.rodXp}: {player.rod.experience} / {player.rod.nextLevelExperience}</span>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${player.rod.experience && player.rod.nextLevelExperience ? Math.min((player.rod.experience / player.rod.nextLevelExperience) * 100, 100) : 0}%` }}></div>
                    </div>
                  </div>
                )}
                <p><strong>{t.mission}:</strong> {player.mission}</p>
                <p><strong>{t.badges}:</strong>
                  {player.badges && player.badges.length > 0
                    ? player.badges.map((badge, idx) => (
                      <Badge key={badge.code || idx} code={badge.code} name={badge.name} />
                    ))
                    : <span> Nenhum emblema</span>
                  }
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HabboStats;
