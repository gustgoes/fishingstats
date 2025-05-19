import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import "@fontsource/press-start-2p";

// ------ Supabase config ------
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ------ XP por level ------
const fishingLevelXp = [55,135,255,417,623,875,1174,1521,1918,2366,2865,3417,4022,4681,5396,6165,6992,7875,8816,9815,10872,11989,13166,14403,15702,17061,18482,19965,21512,25385,29800,34810,40474,46855,54018,62034,70976,80925,91962,104175,117656,132501,148813,166696,186264,148921,163002,178562,195795,313638,345952,259854,286232,315649,348475,385123,426055,471781,522873,579974,643808,715185,795011,884300,984197,1095997,1221172,1361378,1518482,1694567,1891954,2113226,2361237,2639153,2950471,3299040,3689099,4125312,4612793,5157136,5764455,6441416,7195262,8033890,8965895,10000648,11148361,12420151,13828124,15385449,17106438,19006644,21103949,23417679,25968694,28779509,31874457,35279924];

function getNextLevelXp(currentLevel) {
  return fishingLevelXp[currentLevel - 1] || 0;
}
function capitalize(str) {
  if (!str) return "";
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
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
    rank: "Ranking",
    online: "Online",
    offline: "Offline",
    lastAccess: "Última visita ao hotel",
    memberSince: "Conta criada em",
    lastUpdate: "Atualizado",
    updateAll: "Atualizar todos agora"
  }
};

const hotelLangMap = {
  "com.br": "pt",
  "com": "en",
  "es": "es"
};

const FLAGS = [
  { code: "com.br", img: "/img/flags/brpt.png", label: "BR/PT" },
  { code: "com", img: "/img/flags/eng.png", label: "EN" },
  { code: "es", img: "/img/flags/es.png", label: "ES" }
];

function Badge({ code, name }) {
  return (
    <img
      src={`/img/badges/${code}.png`}
      alt={name}
      title={name}
      className="inline-block mx-1 align-middle"
      style={{ imageRendering: "pixelated", height: "auto", width: "auto", maxHeight: 48 }}
    />
  );
}

function StatusDot({ online }) {
  return (
    <span
      title={online ? "Online" : "Offline"}
      className="inline-block align-middle mr-1"
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: online ? "#b6f0ae" : "#e67e47",
        border: "1.5px solid #80682b"
      }}
    ></span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", { timeZone: "UTC" });
}

const App = () => {
  const [username, setUsername] = useState("");
  const [hotel, setHotel] = useState("com.br");
  const [lang, setLang] = useState("pt");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ranking, setRanking] = useState([]);
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [expandedProfile, setExpandedProfile] = useState(null);
  const [data, setData] = useState(null);

  const t = translations[lang] || translations["pt"];

  // Fetch ranking
  const fetchRankingGlobal = useCallback(async () => {
    const { data } = await supabase
      .from('ranking')
      .select('*')
      .eq('hotel', hotel)
      .order('level', { ascending: false })
      .order('experience', { ascending: false });
    setRanking((data || []).filter(p => p && p.username));
  }, [hotel]);

  useEffect(() => {
    setLang(hotelLangMap[hotel] || "pt");
    fetchRankingGlobal();
    setData(null);
    setExpandedPlayer(null);
  }, [hotel, fetchRankingGlobal]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('public:ranking')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ranking', filter: `hotel=eq.${hotel}` },
        () => fetchRankingGlobal()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hotel, fetchRankingGlobal]);

  // Salvar player
  async function savePlayerGlobal(player) {
    await supabase
      .from('ranking')
      .upsert([player], { onConflict: ['username', 'hotel'] });
  }

  // Buscar stats
  const fetchStats = async () => {
    setLoading(true);
    setError("");
    setData(null);
    setExpandedPlayer(null);
    try {
      const usernameKey = username.trim().toLowerCase();
      const userRes = await fetch(`https://origins.habbo.${hotel}/api/public/users?name=${usernameKey}`);
      if (!userRes.ok) throw new Error(t.userNotFound);
      const userData = await userRes.json();
      const uniqueId = userData.uniqueId;
      if (!uniqueId) throw new Error("ID inválido");

      const res = await fetch(`https://origins.habbo.${hotel}/api/public/skills/${uniqueId}?skillType=FISHING`);
      if (!res.ok) throw new Error(t.skillsMissing);
      const fishingData = await res.json();
      if (!fishingData || typeof fishingData.level === "undefined") throw new Error(t.skillsMissing);

      const profileRes = await fetch(`https://origins.habbo.${hotel}/api/public/users/${uniqueId}/profile`);
      const profile = profileRes.ok ? await profileRes.json() : null;

      const badges = Array.isArray(userData.selectedBadges) && userData.selectedBadges.length > 0
        ? userData.selectedBadges
        : [];

      const avatarUrl = `https://www.habbo.${hotel}/habbo-imaging/avatarimage?figure=${userData.figureString}&size=l&direction=2&head_direction=2&gesture=sml&action=wav`;

      const now = new Date().toISOString();

      const newPlayer = {
        username: usernameKey,
        level: fishingData.level,
        experience: fishingData.experience,
        avatarUrl,
        mission: userData.motto,
        badges,
        fishCaught: fishingData.fishCaught,
        goldFishCaught: fishingData.goldFishCaught,
        rod: fishingData.rod,
        hotel,
        online: profile?.online ?? userData.online,
        lastAccessTime: profile?.lastAccessTime ?? null,
        memberSince: profile?.memberSince ?? null,
        updatedAt: now
      };

      await savePlayerGlobal(newPlayer);
      setData(newPlayer);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const progress = data && getNextLevelXp(data.level) > 0
    ? Math.min((data.experience / getNextLevelXp(data.level)) * 100, 100)
    : 0;

  const rodProgress = data && data.rod && data.rod.nextLevelExperience > 0
    ? Math.min((data.rod.experience / data.rod.nextLevelExperience) * 100, 100)
    : 0;

  // Expandir perfil
  const handlePlayerClick = async (player) => {
    if (expandedPlayer && expandedPlayer.username === player.username) {
      setExpandedPlayer(null);
      setExpandedProfile(null);
    } else {
      setExpandedPlayer(player);
      try {
        const userRes = await fetch(`https://origins.habbo.${hotel}/api/public/users?name=${player.username}`);
        if (!userRes.ok) return setExpandedProfile(null);
        const userData = await userRes.json();
        const uniqueId = userData.uniqueId;
        const profileRes = await fetch(`https://origins.habbo.${hotel}/api/public/users/${uniqueId}/profile`);
        if (profileRes.ok) {
          const profile = await profileRes.json();
          setExpandedProfile(profile);
        } else {
          setExpandedProfile(null);
        }
      } catch {
        setExpandedProfile(null);
      }
    }
  };

  const dataIndexInRanking = data
    ? ranking.findIndex(p => p.username === data.username)
    : -1;

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center"
      style={{
        background: "#101217",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Fundo centralizado sem overlay */}
      <div
        style={{
          background: "url('/img/fundo.png') no-repeat center center",
          backgroundSize: "798px 671px",
          width: "100vw",
          height: "100vh",
          position: "fixed",
          zIndex: 0,
          top: 0,
          left: 0,
          minHeight: "100vh",
          minWidth: "100vw"
        }}
      />

      {/* Banner */}
      <img
        src="/img/banner.png"
        alt="Fishing Banner"
        width={420}
        height={72}
        className="mx-auto select-none"
        style={{
          marginTop: "calc(26vh - 80px)",
          marginBottom: 16,
          imageRendering: "pixelated",
          display: "block",
          position: "relative",
          zIndex: 2,
          filter: "drop-shadow(0 6px 20px #0009)",
          pointerEvents: "none"
        }}
      />

      {/* Painel principal SEM overlay */}
      <div
        className="relative z-10 w-full max-w-3xl rounded-lg shadow-2xl px-6 py-8"
        style={{
          background: "none",
          border: "none",
          boxShadow: "none",
          backdropFilter: "none",
        }}
      >
        {/* Flags centralizadas */}
        <div className="flex items-center justify-center gap-7 mb-4">
          {FLAGS.map(flag => (
            <div
              key={flag.code}
              onClick={() => setHotel(flag.code)}
              style={{
                cursor: "pointer",
                opacity: hotel === flag.code ? 1 : 0.4,
                transition: "opacity 0.2s",
                borderRadius: 7,
                border: hotel === flag.code ? "2.5px solid #ffc76a" : "2px solid #222",
                boxShadow: hotel === flag.code ? "0 2px 8px #e7b76748" : undefined,
                background: "#181511"
              }}
            >
              <img
                src={flag.img}
                alt={flag.label}
                style={{
                  width: 50,
                  height: 33,
                  objectFit: "cover",
                  borderRadius: 6,
                  display: "block"
                }}
              />
              <span
                className="block text-xs text-center mt-1"
                style={{
                  color: hotel === flag.code ? "#ffc76a" : "#fff7",
                  fontWeight: "bold",
                  letterSpacing: 1
                }}
              >
                {flag.label}
              </span>
            </div>
          ))}
        </div>

        {/* Input de pesquisa */}
        <div
          className="rounded-md p-5 mb-6"
          style={{
            background: "none",
            border: "none",
            boxShadow: "none"
          }}
        >
          <input
            type="text"
            placeholder={t.placeholder}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border rounded p-2 w-full text-sm font-mono"
            style={{
              background: "rgba(71,47,21,0.09)",
              color: "#ffedbe",
              border: "1.5px solid #a9865a"
            }}
          />
          <button
            className="w-full mt-3 font-bold text-sm py-2 rounded"
            style={{
              background: "rgba(178,122,53,0.12)",
              color: "#ffeac2",
              border: "1.5px solid #c79b5b",
              letterSpacing: 1.5,
              fontFamily: "'Press Start 2P', monospace",
              boxShadow: "0 2px 10px #321a0b44",
              opacity: 0.81
            }}
            onClick={fetchStats}
            disabled={loading || !username}
          >
            {loading ? t.loading : t.button}
          </button>
        </div>

        {error && (
          <div className="text-center text-[#faadad] font-mono font-semibold my-2">{error}</div>
        )}

        {/* Resultado do search */}
        {data && (
          <div
            className="rounded-lg p-5 mb-6"
            style={{
              background: "rgba(24,19,10,0.91)", // Um pouco escuro
              border: "1.5px solid rgba(149,117,58,0.13)",
              boxShadow: "0 2px 18px 0 rgba(91,61,34,0.09)"
            }}
          >
            <div className="flex items-center mb-3">
              <h2 className="text-lg font-semibold flex-1 font-mono" style={{ color: "#ffeac2" }}>
                🎣 {t.level}: {data.level}
              </h2>
            </div>
            <div className="flex items-center">
              <img
                src={data.avatarUrl}
                alt="Avatar"
                style={{ width: 112, height: 196, imageRendering: "pixelated", background: "#332216", borderRadius: 10 }}
                className="mr-3 border-2 border-[#a07852] cursor-pointer object-cover"
                onClick={() => handlePlayerClick(data)}
              />
              <div>
                <p className="text-lg font-semibold flex items-center font-mono" style={{ color: "#ffebc7" }}>
                  <StatusDot online={data.online} />
                  {capitalize(data.username)}
                  {dataIndexInRanking !== -1 &&
                    <span className="ml-2 text-xs" style={{ color: "#f7e7d2" }}>({t.rank}: {dataIndexInRanking + 1})</span>
                  }
                </p>
                <p className="text-sm" style={{ color: "#ffeac2" }}>{t.level}: {data.level} | {t.xp}: {data.experience}</p>
                <p className="text-sm flex items-center" style={{ color: data.online ? "#b6f0ae" : "#f3bfa1" }}>
                  {data.online ? t.online : t.offline}
                </p>
                {data.memberSince && (
                  <p className="text-xs" style={{ color: "#ccb991" }}>{t.memberSince}: {formatDate(data.memberSince)}</p>
                )}
                {data.lastAccessTime && (
                  <p className="text-xs" style={{ color: "#ccb991" }}>{t.lastAccess}: {formatDate(data.lastAccessTime)}</p>
                )}
                {data.updatedAt && (
                  <p className="text-xs" style={{ color: "#e3d099" }}>{t.lastUpdate}: {formatDate(data.updatedAt)}</p>
                )}
              </div>
            </div>
            <p className="mt-2" style={{ color: "#ffeac2" }}>{t.xp}: {data.experience} / {getNextLevelXp(data.level)}</p>
            <div className="w-full bg-[#e7f7fe]/[0.09] rounded-full h-2">
              <div className="bg-yellow-800/40 h-2 rounded-full"
                style={{ width: `${progress}%` }}></div>
            </div>
            <p className="mt-2" style={{ color: "#ccac7a" }}>{t.fishCaught}: <strong>{data.fishCaught}</strong></p>
            <p className="mt-2" style={{ color: "#ffeac2" }}>{t.goldFishCaught}: <strong>{data.goldFishCaught}</strong></p>
            {data.rod && (
              <div className="mt-2">
                <h3 className="font-semibold text-sm" style={{ color: "#ffeac2" }}>{t.fishingRod}</h3>
                <p className="text-xs" style={{ color: "#f7e7d2" }}>{t.rodXp}: {data.rod.experience} / {data.rod.nextLevelExperience}</p>
                <div className="w-full bg-yellow-900/30 rounded-full h-2">
                  <div className="bg-green-900/40 h-2 rounded-full" style={{ width: `${rodProgress}%` }}></div>
                </div>
              </div>
            )}
            <div className="mt-1" style={{ color: "#ffeac2" }}>
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

        {/* IMAGEM DE RANKING */}
        <div className="flex justify-center mb-3">
          <img src="/img/ranking.png" alt="Ranking" style={{ height: 40, objectFit: "contain" }} />
        </div>

        <ul className="space-y-3">
          {ranking.map((player, index) => {
            const playerProgress = getNextLevelXp(player.level)
              ? Math.min((player.experience / getNextLevelXp(player.level)) * 100, 100)
              : 0;
            const playerRodProgress = player.rod && player.rod.nextLevelExperience
              ? Math.min((player.rod.experience / player.rod.nextLevelExperience) * 100, 100)
              : 0;

            return (
              <li
                key={player.username + player.hotel}
                className="rounded-md shadow-md"
                style={{
                  background: "rgba(24,19,10,0.82)", // Escuro para leitura
                  border: "1.5px solid rgba(128,84,44,0.21)",
                  boxShadow: "0 1.5px 8px 0 rgba(75,47,20,0.13)",
                  marginBottom: 8,
                  padding: 12
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xl font-bold mr-4 font-mono" style={{ color: "#ffde99" }}>{index + 1}</span>
                    <img
                      src={player.avatarUrl}
                      alt="Avatar"
                      style={{ width: 64, height: 110, imageRendering: "pixelated", background: "#31241d", borderRadius: 8 }}
                      className="cursor-pointer border border-[#b2b2b2] object-cover"
                      onClick={() => handlePlayerClick(player)}
                    />
                    <span className="text-lg font-semibold ml-4 flex items-center font-mono" style={{ color: "#ffd27f" }}>
                      <StatusDot online={player.online} />
                      {capitalize(player.username)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-1 font-mono text-xs">
                  {player.updatedAt && (
                    <span style={{ color: "#e3d099" }}>{t.lastUpdate}: {formatDate(player.updatedAt)}</span>
                  )}
                  {player.memberSince && (
                    <span style={{ color: "#ccb991" }}>{t.memberSince}: {formatDate(player.memberSince)}</span>
                  )}
                  {player.lastAccessTime && (
                    <span style={{ color: "#ccb991" }}>{t.lastAccess}: {formatDate(player.lastAccessTime)}</span>
                  )}
                </div>
                {expandedPlayer && expandedPlayer.username === player.username && (
                  <div
                    className="mt-4 p-4 rounded-md"
                    style={{
                      background: "rgba(18,12,8,0.98)", // Fundo forte na expansão
                      border: "1.5px solid rgba(150,120,70,0.16)",
                      boxShadow: "0 1.5px 7px 0 rgba(105,75,43,0.11)"
                    }}
                  >
                    <div className="flex items-center mb-2">
                      <img
                        src={player.avatarUrl}
                        alt="Avatar"
                        style={{ width: 112, height: 196, imageRendering: "pixelated", background: "#332216", borderRadius: 10 }}
                        className="border-2 border-[#a07852] mr-4 object-cover"
                      />
                      <span className="font-bold text-lg flex items-center font-mono" style={{ color: "#ffeac2" }}>
                        <StatusDot online={expandedProfile?.online ?? player.online} />
                        {capitalize(player.username)}
                        {expandedProfile?.online ? (
                          <span className="text-green-700 font-bold ml-2">{t.online}</span>
                        ) : (
                          <span className="text-orange-500 font-bold ml-2">{t.offline}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs mb-2 font-mono">
                      {expandedProfile?.memberSince && (
                        <span style={{ color: "#ccb991" }}>{t.memberSince}: {formatDate(expandedProfile.memberSince)}</span>
                      )}
                      {expandedProfile?.lastAccessTime && (
                        <span style={{ color: "#ccb991" }}>{t.lastAccess}: {formatDate(expandedProfile.lastAccessTime)}</span>
                      )}
                    </div>
                    <p style={{ color: "#ffeac2" }}><strong>{t.level}:</strong> {player.level}</p>
                    <p style={{ color: "#ffeac2" }}><strong>{t.xp}:</strong> {player.experience} / {getNextLevelXp(player.level)}</p>
                    <div className="w-full bg-[#a29c8b]/[0.09] rounded-full h-2 mb-2">
                      <div className="bg-yellow-900/40 h-2 rounded-full"
                        style={{ width: `${playerProgress}%` }}></div>
                    </div>
                    <p style={{ color: "#ffeac2" }}><strong>{t.fishCaught}:</strong> {player.fishCaught ?? "-"}</p>
                    <p style={{ color: "#ffeac2" }}><strong>{t.goldFishCaught}:</strong> {player.goldFishCaught ?? "-"}</p>
                    {player.rod && (
                      <div>
                        <strong style={{ color: "#ffd27f" }}>{t.fishingRod}:</strong> {t.level} {player.rod.level}<br />
                        <span className="font-mono" style={{ color: "#ffeac2" }}>{t.rodXp}: {player.rod.experience} / {player.rod.nextLevelExperience}</span>
                        <div className="w-full bg-yellow-900/30 rounded-full h-2 mt-1 mb-2">
                          <div className="bg-green-900/40 h-2 rounded-full"
                            style={{ width: `${playerRodProgress}%` }}></div>
                        </div>
                      </div>
                    )}
                    <p style={{ color: "#ffeac2" }}><strong>{t.mission}:</strong> {player.mission}</p>
                    <p style={{ color: "#ffeac2" }}><strong>{t.badges}:</strong>
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
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default App;
