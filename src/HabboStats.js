import React, { useState, useEffect } from "react";
import { Fish, Trophy, Award, User, Search, Globe, ChevronDown, ChevronUp } from "lucide-react";

// ========================= XP TABLE ==========================
const fishingLevelXp = [
  55,135,255,417,623,875,1174,1521,1918,2366,2865,3417,4022,4681,5396,6165,6992,7875,8816,9815,10872,11989,13166,14403,15702,17061,18482,19965,21512,25385,29800,34810,40474,46855,54018,62034,70976,80925,91962,104175,117656,132501,148813,166696,186264,148921,163002,178562,195795,313638,345952,259854,286232,315649,348475,385123,426055,471781,522873,579974,643808,715185,795011,884300,984197,1095997,1221172,1361378,1518482,1694567,1891954,2113226,2361237,2639153,2950471,3299040,3689099,4125312,4612793,5157136,5764455,6441416,7195262,8033890,8965895,10000648,11148361,12420151,13828124,15385449,17106438,19006644,21103949,23417679,25968694,28779509,31874457,35279924
];
function getNextLevelXp(currentLevel) {
  return fishingLevelXp[currentLevel - 1] || 0;
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
    topFishers: "Melhores Pescadores",
    stats: "Estatísticas",
    viewDetails: "Ver detalhes",
    hideDetails: "Esconder detalhes",
    position: "Posição",
    noRanking: "Nenhum jogador no ranking ainda",
    searchForPlayers: "Busque jogadores para adicionar ao ranking",
    leaderboardTable: "Tabela de Ranking (API)",
    avatar: "Avatar",
    name: "Nome"
  }
};

const hotelLangMap = {
  "com.br": "pt",
  "com": "en",
  "es": "es"
};
const hotelFlags = {
  "com.br": "🇧🇷",
  "com": "🇺🇸",
  "es": "🇪🇸"
};

function PixelProgressBar({ progress, color }) {
  return (
    <div className="w-full h-4 bg-gray-200 relative overflow-hidden border border-gray-300 rounded">
      <div className={`h-full ${color}`} style={{ width: `${progress}%` }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-1 bg-black bg-opacity-10"
            style={{
              left: `${i * 10}%`,
              top: 0,
              width: '1px',
              height: '100%'
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Badge({ name, code }) {
  return (
    <div className="inline-flex items-center px-2 py-1 m-1 rounded bg-yellow-600 text-white text-xs shadow-md">
      {code ? (
        <img
          src={`https://www.habbo.com.br/habbo-imaging/badge/${code}.gif`}
          alt={name}
          className="w-5 h-5 mr-1 rounded"
        />
      ) : (
        <Award className="w-3 h-3 mr-1" />
      )}
      {name}
    </div>
  );
}

function HabboStats() {
  const [username, setUsername] = useState("");
  const [hotel, setHotel] = useState("com.br");
  const [lang, setLang] = useState("pt");
  const [userData, setUserData] = useState(null);
  const [userSkill, setUserSkill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [localRanking, setLocalRanking] = useState([]);
  const [apiLeaderboard, setApiLeaderboard] = useState([]);
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [activeTab, setActiveTab] = useState("ranking");

  useEffect(() => {
    setLang(hotelLangMap[hotel] || "pt");
  }, [hotel]);

  useEffect(() => {
    const storedRanking = JSON.parse(localStorage.getItem(`ranking-${hotel}`)) || [];
    setLocalRanking(storedRanking);
    fetchApiLeaderboard();
    // eslint-disable-next-line
  }, [hotel]);

  const t = translations[lang] || translations.pt;

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    setUserData(null);
    setUserSkill(null);
    try {
      const userRes = await fetch(
        `https://origins.habbo.${hotel}/api/public/users?name=${encodeURIComponent(username)}`
      );
      if (!userRes.ok) throw new Error(t.userNotFound);
      const user = await userRes.json();
      setUserData(user);

      const skillRes = await fetch(
        `https://origins.habbo.${hotel}/api/public/skills/${user.uniqueId}?skillType=FISHING`
      );
      if (!skillRes.ok) throw new Error(t.skillsMissing);
      const skill = await skillRes.json();
      setUserSkill(skill);

      setLocalRanking(prevRanking => {
        const existsIdx = prevRanking.findIndex(u => u.uniqueId === user.uniqueId);
        const newEntry = {
          ...user,
          skill,
        };
        let newRanking;
        if (existsIdx !== -1) {
          newRanking = prevRanking.map((u, idx) =>
            idx === existsIdx ? newEntry : u
          );
        } else {
          newRanking = [...prevRanking, newEntry];
        }
        localStorage.setItem(`ranking-${hotel}`, JSON.stringify(newRanking));
        return newRanking;
      });

      setActiveTab("stats");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchApiLeaderboard = async () => {
    setApiLeaderboard([]);
    try {
      const res = await fetch(
        `https://origins.habbo.${hotel}/api/public/skills/leaderboard?skillType=FISHING&page=1`
      );
      if (!res.ok) return setApiLeaderboard([]);
      const lb = await res.json();
      const details = await Promise.all(
        lb.entries.map(async (entry) => {
          try {
            const userRes = await fetch(
              `https://origins.habbo.${hotel}/api/public/users/by-playerId/${entry.uniqueId}`
            );
            const habboIds = await userRes.json();
            const habboId = Array.isArray(habboIds) ? habboIds[0] : habboIds;
            return {
              ...entry,
              avatarUrl: `https://www.habbo.com.br/habbo-imaging/avatarimage?figure=${habboId}&size=l`,
            };
          } catch {
            return {
              ...entry,
              avatarUrl: "",
            };
          }
        })
      );
      setApiLeaderboard(details);
    } catch {
      setApiLeaderboard([]);
    }
  };

  const handlePlayerClick = (player) => {
    if (expandedPlayer && expandedPlayer.uniqueId === player.uniqueId) {
      setExpandedPlayer(null);
    } else {
      setExpandedPlayer(player);
    }
  };

  const nextLevelXp = userSkill ? getNextLevelXp(userSkill.level) : 0;
  const progress =
    userSkill && nextLevelXp > 0
      ? Math.min((userSkill.experience / nextLevelXp) * 100, 100)
      : 0;

  const rodProgress =
    userSkill && userSkill.rod && userSkill.rod.nextLevelExperience > 0
      ? Math.min(
          (userSkill.rod.experience / userSkill.rod.nextLevelExperience) * 100,
          100
        )
      : 0;

  return (
    <div className="font-mono max-w-3xl mx-auto mt-6 p-6 bg-gradient-to-b from-blue-100 to-blue-200 border-4 border-blue-400 rounded-lg shadow-xl" style={{ imageRendering: "pixelated" }}>
      <div className="bg-blue-500 border-4 border-blue-700 rounded-t-lg p-4 -mt-6 -mx-6 mb-4 shadow-lg">
        <h1 className="text-2xl font-bold text-center text-white tracking-wide flex justify-center items-center space-x-2">
          <Fish className="w-6 h-6 inline-block mr-1" />
          <span>{t.title}</span>
          <Fish className="w-6 h-6 inline-block ml-1" />
        </h1>
      </div>
      <div className="flex justify-center mb-4">
        <div className="bg-white border-4 border-blue-300 rounded-lg p-3 flex items-center space-x-2">
          <Globe className="w-5 h-5 text-blue-500" />
          <select
            className="px-3 py-2 bg-blue-100 border-2 border-blue-300 rounded text-sm font-bold"
            value={hotel}
            onChange={(e) => setHotel(e.target.value)}
          >
            <option value="com.br">{hotelFlags["com.br"]} Habbo BR</option>
            <option value="com">{hotelFlags["com"]} Habbo COM</option>
            <option value="es">{hotelFlags["es"]} Habbo ES</option>
          </select>
        </div>
      </div>
      <div className="bg-white border-4 border-blue-300 rounded-lg p-4 mb-4">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder={t.placeholder}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="flex-grow px-3 py-2 bg-blue-50 border-2 border-blue-300 rounded text-sm"
          />
          <button
            className={`px-4 py-2 ${loading ? 'bg-gray-400' : 'bg-yellow-400 hover:bg-yellow-500'} border-2 border-yellow-600 rounded font-bold text-sm flex items-center`}
            onClick={fetchStats}
            disabled={loading || !username}
          >
            {loading ? (
              <span className="animate-pulse">{t.loading}</span>
            ) : (
              <>
                <Search className="w-4 h-4 mr-1" />
                {t.button}
              </>
            )}
          </button>
        </div>
      </div>
      {error && (
        <div className="bg-red-100 border-2 border-red-400 text-red-700 p-3 rounded-lg mb-4 text-center font-medium">
          {error}
        </div>
      )}
      <div className="flex border-b-4 border-blue-300 mb-4">
        <button
          className={`flex-1 py-2 font-bold ${activeTab === 'ranking' ? 'bg-blue-400 text-white' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'} rounded-t-lg flex items-center justify-center`}
          onClick={() => setActiveTab('ranking')}
        >
          <Trophy className="w-4 h-4 mr-1" />
          {t.rank}
        </button>
        <button
          className={`flex-1 py-2 font-bold ${activeTab === 'stats' ? 'bg-blue-400 text-white' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'} rounded-t-lg flex items-center justify-center ${!userSkill ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => userSkill && setActiveTab('stats')}
          disabled={!userSkill}
        >
          <User className="w-4 h-4 mr-1" />
          {t.stats}
        </button>
      </div>
      {/* Leaderboard API Table */}
      {activeTab === 'ranking' && (
        <div>
          <div className="bg-white border-4 border-blue-300 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-bold text-center text-blue-600 mb-4 flex items-center justify-center">
              <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
              {t.leaderboardTable}
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-center">
                <thead>
                  <tr>
                    <th className="px-2">{t.position}</th>
                    <th className="px-2">{t.avatar}</th>
                    <th className="px-2">ID</th>
                    <th className="px-2">{t.level}</th>
                    <th className="px-2">{t.xp}</th>
                  </tr>
                </thead>
                <tbody>
                  {apiLeaderboard.map((player, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-1">{index + 1}</td>
                      <td>
                        <img src={player.avatarUrl} alt="Avatar" className="w-8 h-8 rounded mx-auto" />
                      </td>
                      <td className="py-1 text-[10px] break-all">{player.uniqueId}</td>
                      <td>{player.level}</td>
                      <td>{player.experience}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Local Ranking */}
          <div className="bg-white border-4 border-blue-300 rounded-lg p-4">
            <h3 className="text-lg font-bold text-center text-blue-600 mb-4 flex items-center justify-center">
              <User className="w-5 h-5 mr-2 text-blue-500" />
              Ranking Local
            </h3>
            {localRanking.length === 0 ? (
              <div className="text-center p-6 bg-blue-50 rounded-lg">
                <p className="text-blue-500 mb-2">{t.noRanking}</p>
                <p className="text-sm text-blue-400">{t.searchForPlayers}</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {localRanking.map((player, index) => (
                  <li key={player.uniqueId} className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg overflow-hidden">
                    <div className="flex items-center p-3 cursor-pointer" onClick={() => handlePlayerClick(player)}>
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-400 text-white font-bold rounded-full">
                        {index + 1}
                      </div>
                      <div className="relative ml-2 border-2 border-blue-300 rounded-lg overflow-hidden bg-white">
                        <img
                          src={`https://www.habbo.com.br/habbo-imaging/avatarimage?figure=${player.figureString}&size=l`}
                          alt="Avatar"
                          className="w-10 h-10 object-cover"
                        />
                      </div>
                      <div className="ml-3 flex-grow">
                        <p className="font-bold text-blue-700">{player.name || player.username}</p>
                        <div className="flex items-center text-xs text-blue-600">
                          <span className="bg-yellow-100 border border-yellow-400 rounded px-1 mr-2">
                            {t.level} {player.skill.level}
                          </span>
                          <Fish className="w-3 h-3 mr-1" /> {player.skill.experience}
                        </div>
                      </div>
                      <div className="text-blue-400">
                        {expandedPlayer && expandedPlayer.uniqueId === player.uniqueId ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                    {expandedPlayer && expandedPlayer.uniqueId === player.uniqueId && (
                      <div className="p-3 border-t-2 border-blue-200 bg-blue-50">
                        <div className="space-y-2">
                          <p className="text-sm">
                            <span className="font-bold">{t.xp}:</span> {player.skill.experience}
                          </p>
                          <p className="text-sm">
                            <span className="font-bold">{t.level}:</span> {player.skill.level}
                          </p>
                          <div>
                            <p className="text-sm font-bold mb-1">{t.badges}:</p>
                            <div className="flex flex-wrap">
                              {player.selectedBadges && player.selectedBadges.length > 0
                                ? player.selectedBadges.map((badge, idx) => (
                                    <Badge key={idx} name={badge.name} code={badge.code} />
                                  ))
                                : <span>Nenhum emblema</span>
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      {/* Stats */}
      {activeTab === 'stats' && userData && userSkill && (
        <div className="bg-white border-4 border-blue-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <img
                src={`https://www.habbo.com.br/habbo-imaging/avatarimage?figure=${userData.figureString}&size=l`}
                alt="Avatar"
                className="w-14 h-14 rounded-full mr-3 border-2 border-blue-400"
              />
              <div>
                <h2 className="text-xl font-bold text-blue-600">{userData.name || userData.username}</h2>
                <p className="text-sm text-blue-700">{t.mission}: <span className="font-semibold">{userData.motto}</span></p>
                <div className="flex flex-wrap items-center">
                  <span className="text-xs text-gray-600 mr-3">{userData.online ? "Online" : "Offline"}</span>
                  <span className="text-xs text-gray-600">{t.level}: {userSkill.level}</span>
                </div>
              </div>
            </div>
            <div className="bg-yellow-400 border-2 border-yellow-600 rounded-lg px-3 py-1 font-bold">
              {t.level} {userSkill.level}
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold flex items-center">
                  <Fish className="w-4 h-4 mr-1 text-blue-500" />
                  {t.xp}
                </h3>
                <span className="text-sm">
                  {userSkill.experience} / {nextLevelXp}
                </span>
              </div>
              <PixelProgressBar progress={progress} color="bg-blue-500" />
            </div>
            {userSkill.rod && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold">{t.fishingRod}</h3>
                  <span className="text-sm">
                    {t.level} {userSkill.rod.level}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm">{t.rodXp}</h3>
                  <span className="text-sm">
                    {userSkill.rod.experience} / {userSkill.rod.nextLevelExperience}
                  </span>
                </div>
                <PixelProgressBar progress={rodProgress} color="bg-green-500" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 text-center">
                <div className="font-bold mb-1 text-sm">{t.fishCaught}</div>
                <div className="text-2xl font-bold text-blue-600">{userSkill.fishCaught}</div>
              </div>
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 text-center">
                <div className="font-bold mb-1 text-sm">{t.goldFishCaught}</div>
                <div className="text-2xl font-bold text-yellow-600">{userSkill.goldFishCaught}</div>
              </div>
            </div>
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3">
              <h3 className="font-bold mb-2">{t.badges}</h3>
              <div className="flex flex-wrap">
                {userData.selectedBadges && userData.selectedBadges.length > 0 ? (
                  userData.selectedBadges.map((badge, idx) => (
                    <Badge key={idx} name={badge.name} code={badge.code} />
                  ))
                ) : (
                  <span>Nenhum emblema</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mt-6 text-center">
        <div className="inline-block bg-blue-900 text-white px-4 py-1 rounded text-xs">
          Habbo Origins Stats © 2025
        </div>
      </div>
    </div>
  );
}

export default HabboStats;
