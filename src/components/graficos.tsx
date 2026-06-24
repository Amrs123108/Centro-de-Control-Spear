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

const ACCENT = "#4f7df8";
const POS = "#22b683";
const GOLD = "#e8b931";
const LINE = "#22344f";
const INK = "#dbe4f0";
const INK_TER = "#7d8da3";

const PALETA = [
  "#4f7df8",
  "#8fb0ff",
  "#22b683",
  "#f2a23c",
  "#a78bfa",
  "#f0605e",
  "#22b8d4",
  "#8a9bb5",
];

const tooltipStyle = {
  borderRadius: 10,
  border: `1px solid ${LINE}`,
  backgroundColor: "#0e1c31",
  color: INK,
  boxShadow: "0 12px 32px rgb(0 0 0 / 0.5)",
  fontSize: 12,
};

const tooltipLabelStyle = { color: INK, fontWeight: 600 };
const legendStyle = { fontSize: 12, color: "#aebdd2" };

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
          labelStyle={tooltipLabelStyle}
          labelFormatter={(h) => `${h}:00 — ${Number(h) + 1}:00`}
        />
        <Legend wrapperStyle={legendStyle} />
        {mejorHora !== undefined && (
          <ReferenceLine
            x={mejorHora}
            stroke={GOLD}
            strokeWidth={2}
            strokeDasharray="4 4"
            label={{
              value: "Mejor franja",
              position: "top",
              fill: GOLD,
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

export function Sparkline({
  data,
  color = ACCENT,
}: {
  data: { promesas: number }[];
  color?: string;
}) {
  if (!data || data.length < 2) {
    return <div className="h-9 w-full" />;
  }
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="promesas"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${color.replace("#", "")})`}
          isAnimationActive={false}
          dot={false}
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
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, lineHeight: "20px", color: "#aebdd2" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function GraficoTendencia({
  data,
}: {
  data: { fecha: string; gestiones: number; efectivas: number; promesas: number }[];
}) {
  const fmt = (f: string) =>
    new Date(`${f}T12:00:00`).toLocaleDateString("es-PA", { day: "numeric", month: "short" });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="gradGestT" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.2} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradPromT" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.3} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradEfecT" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={POS} stopOpacity={0.2} />
            <stop offset="100%" stopColor={POS} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
        <XAxis
          dataKey="fecha"
          tickFormatter={fmt}
          tick={{ fontSize: 11, fill: INK_TER }}
          axisLine={{ stroke: LINE }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 11, fill: INK_TER }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          labelFormatter={(f: unknown) => fmt(String(f))}
        />
        <Legend wrapperStyle={legendStyle} />
        <Area type="monotone" dataKey="gestiones" name="Gestiones" stroke={ACCENT} strokeWidth={2} fill="url(#gradGestT)" />
        <Area type="monotone" dataKey="efectivas" name="Efectivas" stroke={POS} strokeWidth={2} fill="url(#gradEfecT)" />
        <Area type="monotone" dataKey="promesas" name="Promesas" stroke={GOLD} strokeWidth={2} fill="url(#gradPromT)" />
      </AreaChart>
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
          tick={{ fontSize: 11, fill: INK }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Legend wrapperStyle={legendStyle} />
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
