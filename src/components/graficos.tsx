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
import { useTema } from "@/components/tema";

/* Paletas por tema: las gráficas siguen el sistema visual activo. */
const PALETAS = {
  clasico: {
    accent: "#4f7df8",
    pos: "#22b683",
    gold: "#e8b931",
    line: "#22344f",
    ink: "#dbe4f0",
    inkSec: "#aebdd2",
    inkTer: "#7d8da3",
    tooltipBg: "#0e1c31",
    serie: ["#4f7df8", "#8fb0ff", "#22b683", "#f2a23c", "#a78bfa", "#f0605e", "#22b8d4", "#8a9bb5"],
  },
  vidrio: {
    accent: "#5b8cff",
    pos: "#4fd1c5",
    gold: "#cda35c",
    line: "rgba(120,152,255,0.18)",
    ink: "#eaf4f8",
    inkSec: "#abc4d1",
    inkTer: "#6f8f9f",
    tooltipBg: "rgba(9,18,36,0.92)",
    serie: ["#5b8cff", "#3f78e0", "#7aa8ff", "#4fd1c5", "#a9b6ff", "#f08a86", "#2f6fd6", "#cda35c"],
  },
} as const;

type Paleta = (typeof PALETAS)[keyof typeof PALETAS];

function usePaleta(): Paleta {
  const { tema } = useTema();
  return PALETAS[tema];
}

function estilosTooltip(p: Paleta) {
  return {
    contentStyle: {
      borderRadius: 10,
      border: `1px solid ${p.line}`,
      backgroundColor: p.tooltipBg,
      color: p.ink,
      boxShadow: "0 12px 32px rgb(0 0 0 / 0.5)",
      backdropFilter: "blur(8px)",
      fontSize: 12,
    },
    labelStyle: { color: p.ink, fontWeight: 600 },
    legendStyle: { fontSize: 12, color: p.inkSec },
  };
}

/** Medidor semicircular de avance de meta (para fondo oscuro). */
export function GaugeMeta({ avance }: { avance: number }) {
  const p = usePaleta();
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
            fill={p.gold}
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
  const p = usePaleta();
  const ttip = estilosTooltip(p);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="gradGestiones" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.accent} stopOpacity={0.25} />
            <stop offset="100%" stopColor={p.accent} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradEfectivas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.pos} stopOpacity={0.3} />
            <stop offset="100%" stopColor={p.pos} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={p.line} vertical={false} />
        <XAxis
          dataKey="hora"
          tickFormatter={(h) => `${h}:00`}
          tick={{ fontSize: 11, fill: p.inkTer }}
          axisLine={{ stroke: p.line }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: p.inkTer }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={ttip.contentStyle}
          labelStyle={ttip.labelStyle}
          labelFormatter={(h) => `${h}:00 — ${Number(h) + 1}:00`}
        />
        <Legend wrapperStyle={ttip.legendStyle} />
        {mejorHora !== undefined && (
          <ReferenceLine
            x={mejorHora}
            stroke={p.gold}
            strokeWidth={2}
            strokeDasharray="4 4"
            label={{
              value: "Mejor franja",
              position: "top",
              fill: p.gold,
              fontSize: 10,
            }}
          />
        )}
        <Area
          type="monotone"
          dataKey="gestiones"
          name="Gestiones"
          stroke={p.accent}
          strokeWidth={2}
          fill="url(#gradGestiones)"
        />
        <Area
          type="monotone"
          dataKey="efectivas"
          name="Contactos efectivos"
          stroke={p.pos}
          strokeWidth={2}
          fill="url(#gradEfectivas)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({
  data,
  color,
}: {
  data: { promesas: number }[];
  color?: string;
}) {
  const p = usePaleta();
  const c = color ?? p.accent;
  const gid = `spark-${c.replace(/[^a-z0-9]/gi, "")}`;
  if (!data || data.length < 2) {
    return <div className="h-9 w-full" />;
  }
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity={0.35} />
            <stop offset="100%" stopColor={c} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="promesas"
          stroke={c}
          strokeWidth={1.5}
          fill={`url(#${gid})`}
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
  const p = usePaleta();
  const ttip = estilosTooltip(p);
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
            <Cell key={i} fill={p.serie[i % p.serie.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={ttip.contentStyle} labelStyle={ttip.labelStyle} />
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
  const p = usePaleta();
  const ttip = estilosTooltip(p);
  const fmt = (f: string) =>
    new Date(`${f}T12:00:00`).toLocaleDateString("es-PA", { day: "numeric", month: "short" });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="gradGestT" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.accent} stopOpacity={0.2} />
            <stop offset="100%" stopColor={p.accent} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradPromT" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.gold} stopOpacity={0.3} />
            <stop offset="100%" stopColor={p.gold} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradEfecT" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.pos} stopOpacity={0.2} />
            <stop offset="100%" stopColor={p.pos} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={p.line} vertical={false} />
        <XAxis
          dataKey="fecha"
          tickFormatter={fmt}
          tick={{ fontSize: 11, fill: p.inkTer }}
          axisLine={{ stroke: p.line }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 11, fill: p.inkTer }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={ttip.contentStyle}
          labelStyle={ttip.labelStyle}
          labelFormatter={(f: unknown) => fmt(String(f))}
        />
        <Legend wrapperStyle={ttip.legendStyle} />
        <Area type="monotone" dataKey="gestiones" name="Gestiones" stroke={p.accent} strokeWidth={2} fill="url(#gradGestT)" />
        <Area type="monotone" dataKey="efectivas" name="Efectivas" stroke={p.pos} strokeWidth={2} fill="url(#gradEfecT)" />
        <Area type="monotone" dataKey="promesas" name="Promesas" stroke={p.gold} strokeWidth={2} fill="url(#gradPromT)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function GraficoCarteras({
  data,
}: {
  data: { proyecto: string; gestiones: number; efectivas: number }[];
}) {
  const p = usePaleta();
  const ttip = estilosTooltip(p);
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 40, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={p.line} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: p.inkTer }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="proyecto"
          width={120}
          tick={{ fontSize: 11, fill: p.ink }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={ttip.contentStyle} labelStyle={ttip.labelStyle} />
        <Legend wrapperStyle={ttip.legendStyle} />
        <Bar
          dataKey="gestiones"
          name="Gestiones"
          fill={p.accent}
          radius={[0, 4, 4, 0]}
          barSize={12}
        />
        <Bar
          dataKey="efectivas"
          name="Efectivas"
          fill={p.pos}
          radius={[0, 4, 4, 0]}
          barSize={12}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
