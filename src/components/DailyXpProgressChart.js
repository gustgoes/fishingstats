// DailyXpProgressChart.js
import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload; // Agora deve conter { timestamp, experience, level, tooltipLabel }
    return (
      <div className="p-2 rounded shadow-lg" style={{ background: "rgba(30,20,10,0.9)", border: "1px solid #775832", color: "#ffeac2", fontFamily: "'Press Start 2P', monospace", fontSize: '10px' }}>
        <p className="label">{`${dataPoint.tooltipLabel}`}</p>
        <p className="intro">{`XP Total: ${dataPoint.experience.toLocaleString('pt-BR')}`}</p>
        {typeof dataPoint.level === 'number' && ( // Mostra o nível se estiver presente e for um número
          <p className="level-info">{`Nível: ${dataPoint.level}`}</p> 
        )}
      </div>
    );
  }
  return null;
};

const DailyXpProgressChart = ({ data, t, isLoading, chartHeight = 300 }) => { // Adicionada prop chartHeight
  // ... (lógica de isLoading e if !data como antes) ...
  if (isLoading) { /* ... */ }
  if (!data || data.length === 0) { /* ... */ }

  return (
    <div className="rounded-lg p-4" style={{ background: "rgba(24,19,10,0.91)", border: "1.5px solid rgba(149,117,58,0.13)", height: chartHeight }}> {/* Usa chartHeight */}
      <h3 className="text-sm font-semibold mb-3 text-center" style={{ color: "#ffd27f", fontFamily: "'Press Start 2P', monospace", fontSize: '10px' }}>
        {t?.xpChart?.title || "Progressão de XP"}
      </h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data} margin={{ top: 5, right: 15, left: -20, bottom: 15 /* Aumentar bottom para labels de data/hora */ }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 100, 60, 0.3)" />
          <XAxis
            dataKey="timestamp" // USA O TIMESTAMP NUMÉRICO
            type="number"        // INDICA QUE O EIXO É NUMÉRICO (PARA DATAS)
            domain={['dataMin', 'dataMax']} // AJUSTA O DOMÍNIO AUTOMATICAMENTE
            tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', hour: '2-digit', minute: 'numeric' })} // FORMATA O TICK
            tick={{ fill: '#a08c6c', fontSize: 7, fontFamily: "'Press Start 2P', monospace" }}
            tickLine={{ stroke: '#a08c6c' }}
            axisLine={{ stroke: '#a08c6c' }}
            // angle={-45} textAnchor="end" // Pode ser necessário se muitos ticks
            // interval="preserveStartEnd" // Ou ajuste o número de ticks se ficarem muitos
          />
          <YAxis
            tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short' }).format(value)}
            tick={{ fill: '#a08c6c', fontSize: 8, fontFamily: "'Press Start 2P', monospace" }}
            tickLine={{ stroke: '#a08c6c' }}
            axisLine={{ stroke: '#a08c6c' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 200, 100, 0.1)' }}/>
          <Line
            type="monotone"
            dataKey="experience" // Continua usando 'experience' para o valor Y
            name="XP Total"
            stroke="#ffc76a"
            strokeWidth={1.5} // Pode diminuir um pouco se houver muitos pontos
            dot={{ r: 1.5, fill: "#ffc76a", strokeWidth: 0 }} // Pontos menores
            activeDot={{ r: 4, fill: "#ffe6a0", stroke: "#312d19" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DailyXpProgressChart;