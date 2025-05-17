import React, { useState, useEffect } from "react";
import { Sparkles, Fish } from "lucide-react";
import "@fontsource/press-start-2p";

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
    language: "Idioma",
    hotel: "Hotel"
  },
  en: {
    title: "Habbo Origins Stats",
    placeholder: "Username",
    loading: "Loading...",
    button: "Fetch Stats",
    notFound: "Skill not found",
    userNotFound: "User not found",
    skillsMissing: "No skills found. Check username.",
    level: "Level",
    xp: "XP",
    fishCaught: "Fish Caught",
    goldFishCaught: "Golden Fish Caught",
    fishingRod: "Fishing Rod",
    rodXp: "Rod XP",
    language: "Language",
    hotel: "Hotel"
  },
  es: {
    title: "Estadísticas de Habbo Origins",
    placeholder: "Nombre de usuario",
    loading: "Cargando...",
    button: "Buscar estadísticas",
    notFound: "Habilidad no encontrada",
    userNotFound: "Usuario no encontrado",
    skillsMissing: "No se encontraron habilidades. Verifica el nombre.",
    level: "Nivel",
    xp: "Experiencia",
    fishCaught: "Peces capturados",
    goldFishCaught: "Peces dorados capturados",
    fishingRod: "Caña de pescar",
    rodXp: "XP de la caña",
    language: "Idioma",
    hotel: "Hotel"
  }
};

const hotelLangMap = {
  "com.br": "pt",
  "com": "en",
  "es": "es",
};

const HabboStats = () => {
  const [username, setUsername] = useState("");
  const [hotel, setHotel] = useState("com.br");
  const [lang, setLang] = useState("pt");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userDetails, setUserDetails] = useState({});

  useEffect(() => {
    setLang(hotelLangMap[hotel] || "pt");
  }, [hotel]);

  const t = translations[lang] || translations["pt"];

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    setData(null);
    setUserDetails({});
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

      const avatarUrl = `https://www.habbo.${hotel}/habbo-imaging/avatarimage?figure=${userData.figureString}&size=l&direction=2&head_direction=2&gesture=sml&action=wav`;

      setUserDetails({
        username: userData.username,
        avatarUrl,
      });
      setData(fishingData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const progress = data && data.nextLevelExperience > 0
    ? Math.min((data.experience / data.nextLevelExperience) * 100, 100)
    : 0;
  const rodProgress = data && data.rod && data.rod.nextLevelExperience > 0
    ? Math.min((data.rod.experience / data.rod.nextLevelExperience) * 100, 100)
    : 0;

  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-6 px-4 bg-[#cadbe9] border border-[#768a9e] rounded-lg shadow-lg p-4 font-['Press Start 2P'] text-sm">
      <div className="bg-[#dae7f2] border border-[#768a9e] rounded-md p-4 shadow-inner">
        <h2 className="text-xl font-bold text-center text-[#4a5d75] mb-4">
          🐟 {t.title} 🐟
        </h2>
        <div className="space-y-2">
          <select
            className="border rounded p-2 text-xs w-full"
            value={hotel}
            onChange={(e) => setHotel(e.target.value)}
          >
            <option value="com.br">🇧🇷 origins.habbo.com.br</option>
            <option value="com">🇺🇸 origins.habbo.com</option>
            <option value="es">🇪🇸 origins.habbo.es</option>
          </select>
          <input
            type="text"
            placeholder={t.placeholder}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border rounded p-2 w-full border-[#768a9e] text-xs"
          />
          <button
            className="w-full bg-[#9ec7e2] hover:bg-[#7fb3d5] text-black font-bold text-xs py-2 rounded"
            onClick={fetchStats}
            disabled={loading || !username}
          >
            {loading ? t.loading : t.button}
          </button>
        </div>
      </div>

      {error && <div className="text-center text-red-500 font-medium">{error}</div>}

      {userDetails.username && (
        <div className="bg-[#f0f6fb] border border-[#9eb1c2] rounded-md p-4 text-center">
          <img src={userDetails.avatarUrl} alt="Avatar" className="w-64 h-64 mx-auto mb-2" />
          <h3 className="text-base font-bold text-[#4a5d75]">{userDetails.username}</h3>
        </div>
      )}

      {data && (
        <div className="bg-[#e8f1f8] border border-[#9eb1c2] rounded-md p-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-[#4a5d75]">🎣 {t.level}: {data.level}</h2>
            <Fish className="w-6 h-6 text-[#3e8ab9]" />
          </div>
          <p>{t.xp}: {data.experience} / {data.nextLevelExperience}</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
          <p>{t.fishCaught}: <strong>{data.fishCaught}</strong></p>
          <p>{t.goldFishCaught}: <strong>{data.goldFishCaught}</strong></p>

          {data.rod && (
            <div className="mt-4">
              <h3 className="font-semibold text-sm text-[#4a5d75]">{t.fishingRod}</h3>
              <p>{t.rodXp}: {data.rod.experience} / {data.rod.nextLevelExperience}</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${rodProgress}%` }}></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HabboStats;
