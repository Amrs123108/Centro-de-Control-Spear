"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const NAVY = "#0d1b2e";
const ACCENT = "#1b4fd8";
const POS = "#1d9e75";
const GOLD = "#e8b931";
const LINE = "#e2e7ef";
const INK_TER = "#8a97a8";

const PALETA = [
  "#1b4fd8",
  "#0d1b2e",
  "#1d9e75",
  "#d97706",
  "#7c3aed",
  "#e24b4a",
  "#0891b2",
  "#64748b",
];

const tooltipStyle = {
  borderRadius: 10,
  border: `1px solid ${LINE}`,
  boxShadow: "0 8px 24px rgb(13 27 46 / 0.12)",
  fontSize: 12,
};

/** Medidor semicircular de avance de meta (para fondo oscuro). */
export function GaugeMeta({ avance }: { avance: number }) {
  const pct = Math.min(avance, 1) * 100;
  const data = [{ value: pct }];
  return (
    <div className="relative h-[120px] w-[200px]">
      <ResponsiveContainer width="100%" height={200}>
        <RadialBarChart
          cx="50%"
          cy="60%"
          innerRadius={72}
          outerRadius={92}
          startAngle={180}
          endAngle={0}
          data={data}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            dataKey="value"
            fill={GOLD}
            background={{ fill: "rgba(255,255,255,0.10)" }}
            cornerRadius={10}
            isAnimationActive
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-x-0 top-[58px] text-center">
        <div className="tnum text-3xl font-bold text-white">
          {Math.round(avance * 100)}%
        </div>
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-white/50">
          de la meta
        </div>
      </div>
    </div>
  );
}

export function GraficoHoras({
  data,
  mejorHora,
}: {
  data: { hora: number; gestiones: number; efectivas: number }[];
  mejorHora?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="gradGestiones" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.25} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradEfectivas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={POS} stopOpacity={0.3} />
            <stop offset="100%" stopColor={POS} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
        <XAxis
          dataKey="hora"
          tickFormatter={(h) => `${h}:00`}
          tick={{ fontSize: 11, fill: INK_TER }}
          axisLine={{ stroke: LINE }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: INK_TER }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(h) => `${h}:00 — ${Number(h) + 1}:00`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {mejorHora !== undefined && (
          <ReferenceLine
            x={mejorHora}
            stroke={GOLD}
            strokeWidth={2}
            strokeDasharray="4 4"
            label={{
              value: "Mejor franja",
              position: "top",
              fill: "#b08a14",
              fontSize: 10,
            }}
          />
        )}
        <Area
          type="monotone"
          dataKey="gestiones"
          name="Gestiones"
          stroke={ACCENT}
          strokeWidth={2}
          fill="url(#gradGestiones)"
        />
        <Area
          type="monotone"
          dataKey="efectivas"
          name="Contactos efectivos"
          stroke={POS}
          strokeWidth={2}
          fill="url(#gradEfectivas)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function GraficoCategorias({
  data,
}: {
  data: { etiqueta: string; total: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="etiqueta"
          innerRadius={62}
          outerRadius={95}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETA[i % PALETA.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, lineHeight: "20px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function GraficoCarteras({
  data,
}: {
  data: { proyecto: string; gestiones: number; efectivas: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 40, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={LINE} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: INK_TER }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="proyecto"
          width={120}
          tick={{ fontSize: 11, fill: NAVY }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="gestiones"
          name="Gestiones"
          fill={ACCENT}
          radius={[0, 4, 4, 0]}
          barSize={12}
        />
        <Bar
          dataKey="efectivas"
          name="Efectivas"
          fill={POS}
          radius={[0, 4, 4, 0]}
          barSize={12}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
