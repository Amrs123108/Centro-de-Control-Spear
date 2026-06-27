"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";
import { fmtMoneda, fmtNum } from "@/lib/formato";
import { useTema } from "@/components/tema";

/**
 * Controla el tooltip por hover real del contenedor. En recharts 3 el tooltip
 * solo se oculta cuando `active` es false; si el chart no detecta el mouse-leave
 * (pasa con paneles glass / fondos animados), el recuadro se queda "pegado".
 * Forzamos `active=false` al salir del área del gráfico. Devuelve también los
 * handlers para envolver el ResponsiveContainer.
 */
function useHoverActivo() {
  const [hover, setHover] = useState(false);
  return {
    activo: hover ? undefined : (false as const),
    bind: {
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
    },
  };
}

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
    // itemStyle controla el color del texto de cada serie en el tooltip:
    // sin esto recharts lo deja en negro y se vuelve ilegible sobre el fondo oscuro.
    itemStyle: { color: p.ink },
    // wrapperStyle evita el tooltip "pegado": sin pointer-events el recuadro no
    // captura el cursor (no se queda bajo él) y sin transición no deja rastro al
    // ocultarse cuando el mouse sale de la gráfica.
    wrapperStyle: { pointerEvents: "none" as const, transition: "none" },
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
  const { activo, bind } = useHoverActivo();
  return (
    <div {...bind}>
      <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 24, right: 8, left: -12, bottom: 0 }}>
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
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={ttip.contentStyle}
          labelStyle={ttip.labelStyle}
          itemStyle={ttip.itemStyle}
          wrapperStyle={ttip.wrapperStyle}
          active={activo}
          labelFormatter={(h) => `${h}:00 — ${Number(h) + 1}:00`}
        />
        <Legend wrapperStyle={ttip.legendStyle} />
        {/* Gestiones como barras; la mejor franja resaltada en dorado */}
        <Bar dataKey="gestiones" name="Gestiones" radius={[3, 3, 0, 0]} maxBarSize={26}>
          {data.map((d) => (
            <Cell
              key={d.hora}
              fill={d.hora === mejorHora ? p.gold : p.accent}
              fillOpacity={d.hora === mejorHora ? 1 : 0.62}
            />
          ))}
        </Bar>
        {/* Contactos efectivos como línea encima */}
        <Line
          type="monotone"
          dataKey="efectivas"
          name="Contactos efectivos"
          stroke={p.pos}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Mini gráfico de barras por día — informativo (resalta el día pico y muestra
 * el valor al pasar el cursor). Reemplaza las sparklines decorativas.
 */
export function MiniBarras({
  data,
  color,
  alto = 40,
}: {
  data: { etiqueta: string; valor: number }[];
  color?: string;
  alto?: number;
}) {
  const p = usePaleta();
  const c = color ?? p.accent;
  const max = Math.max(...data.map((d) => d.valor), 1);
  const { activo, bind } = useHoverActivo();
  return (
    <div {...bind} className="h-full w-full">
      <ResponsiveContainer width="100%" height={alto}>
      <BarChart data={data} margin={{ top: 1, right: 0, left: 0, bottom: 0 }} barCategoryGap={1}>
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.05)" }}
          contentStyle={{ ...estilosTooltip(p).contentStyle, padding: "4px 8px" }}
          labelStyle={{ color: p.inkSec, fontWeight: 600, fontSize: 11 }}
          itemStyle={{ color: p.ink, fontWeight: 700 }}
          wrapperStyle={{ pointerEvents: "none", transition: "none" }}
          active={activo}
          formatter={(v) => [fmtNum(Number(v)), ""] as [string, string]}
          labelFormatter={(e) => String(e)}
        />
        <Bar dataKey="valor" radius={[2, 2, 0, 0]} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={c} fillOpacity={d.valor >= max ? 1 : 0.4} />
          ))}
        </Bar>
      </BarChart>
      </ResponsiveContainer>
    </div>
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
  const { activo, bind } = useHoverActivo();
  return (
    <div {...bind}>
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
        <Tooltip contentStyle={ttip.contentStyle} labelStyle={ttip.labelStyle} itemStyle={ttip.itemStyle} wrapperStyle={ttip.wrapperStyle} active={activo} />
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
    </div>
  );
}

export function GraficoTendencia({
  data,
  resaltarBajas = false,
}: {
  data: { fecha: string; gestiones: number; efectivas: number; promesas: number }[];
  /** Marca con un pulso los días de baja producción (gestiones < ½ de la mediana). */
  resaltarBajas?: boolean;
}) {
  const p = usePaleta();
  const ttip = estilosTooltip(p);
  const { activo, bind } = useHoverActivo();
  const fmt = (f: string) =>
    new Date(`${f}T12:00:00`).toLocaleDateString("es-PA", { day: "numeric", month: "short" });

  // Detección de días flojos: gestiones por debajo de la mitad de la mediana.
  const gestPos = data.map((d) => d.gestiones).filter((v) => v > 0).sort((a, b) => a - b);
  const medianaGest = gestPos.length ? gestPos[Math.floor(gestPos.length / 2)] : 0;
  const anomalias = resaltarBajas && medianaGest > 0
    ? data.filter((d) => d.gestiones > 0 && d.gestiones < 0.5 * medianaGest)
    : [];

  return (
    <div {...bind}>
      <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 18, right: 10, left: 6, bottom: 0 }}>
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
        {/* Sin eje Y: las etiquetas de datos dan la magnitud y el gráfico gana ancho */}
        <YAxis hide domain={[0, "dataMax"]} />
        <Tooltip
          contentStyle={ttip.contentStyle}
          labelStyle={ttip.labelStyle}
          itemStyle={ttip.itemStyle}
          wrapperStyle={ttip.wrapperStyle}
          active={activo}
          labelFormatter={(f: unknown) => fmt(String(f))}
        />
        <Legend wrapperStyle={ttip.legendStyle} />
        {/* type "linear": segmentos rectos entre días (no la curva exagerada);
            dots: un punto por día; etiqueta de datos en las tres series. */}
        <Area type="linear" dataKey="gestiones" name="Gestiones" stroke={p.accent} strokeWidth={2} fill="url(#gradGestT)" dot={{ r: 2, fill: p.accent, strokeWidth: 0 }} activeDot={{ r: 4 }}>
          <LabelList dataKey="gestiones" position="top" offset={9} style={{ fill: p.accent, fontSize: 9, fontWeight: 700 }} formatter={(v: unknown) => fmtNum(Number(v))} />
        </Area>
        <Area type="linear" dataKey="efectivas" name="Efectivas" stroke={p.pos} strokeWidth={2} fill="url(#gradEfecT)" dot={{ r: 2, fill: p.pos, strokeWidth: 0 }} activeDot={{ r: 4 }}>
          <LabelList dataKey="efectivas" position="bottom" offset={7} style={{ fill: p.pos, fontSize: 9, fontWeight: 700 }} formatter={(v: unknown) => fmtNum(Number(v))} />
        </Area>
        <Area type="linear" dataKey="promesas" name="Promesas" stroke={p.gold} strokeWidth={2} fill="url(#gradPromT)" dot={{ r: 2.5, fill: p.gold, strokeWidth: 0 }} activeDot={{ r: 4 }}>
          <LabelList dataKey="promesas" position="bottom" offset={7} style={{ fill: p.gold, fontSize: 9, fontWeight: 700 }} formatter={(v: unknown) => fmtNum(Number(v))} />
        </Area>
        {/* Marca animada en días de baja producción */}
        {anomalias.map((d) => (
          <ReferenceDot
            key={d.fecha}
            x={d.fecha}
            y={d.gestiones}
            r={7}
            fill="none"
            stroke="#f0605e"
            strokeWidth={2}
            className="marcador-baja"
            ifOverflow="extendDomain"
            label={{ value: "▼ baja", position: "top", fill: "#f0605e", fontSize: 9, fontWeight: 700 }}
          />
        ))}
      </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Comparativo mes anterior vs actual en barras agrupadas. Una categoría por
 * indicador (ej. Gestiones, Efectivas, Promesas) con dos barras cada una.
 */
export function GraficoComparativo({
  categorias,
  labelActual,
  labelAnterior,
  formato = "num",
  colorActual,
}: {
  categorias: { nombre: string; actual: number; anterior: number }[];
  labelActual: string;
  labelAnterior: string;
  formato?: "num" | "moneda";
  colorActual?: string;
}) {
  const p = usePaleta();
  const ttip = estilosTooltip(p);
  const { activo, bind } = useHoverActivo();
  const cAct = colorActual ?? p.accent;
  const fmt = (v: number) => (formato === "moneda" ? fmtMoneda(v) : fmtNum(Math.round(v)));
  return (
    <div {...bind} className="h-full w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={categorias} margin={{ top: 24, right: 8, left: -8, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid strokeDasharray="3 3" stroke={p.line} vertical={false} />
          <XAxis
            dataKey="nombre"
            tick={{ fontSize: 12, fill: p.ink, fontWeight: 600 }}
            axisLine={{ stroke: p.line }}
            tickLine={false}
          />
          <YAxis hide domain={[0, "dataMax"]} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={ttip.contentStyle}
            labelStyle={ttip.labelStyle}
            itemStyle={ttip.itemStyle}
            wrapperStyle={ttip.wrapperStyle}
            active={activo}
            formatter={(v) => [fmt(Number(v)), ""] as [string, string]}
          />
          <Legend wrapperStyle={ttip.legendStyle} />
          <Bar dataKey="anterior" name={labelAnterior} fill={p.inkTer} fillOpacity={0.55} radius={[4, 4, 0, 0]} maxBarSize={64}>
            <LabelList dataKey="anterior" position="top" offset={8} style={{ fill: p.inkSec, fontSize: 10, fontWeight: 700 }} formatter={(v: unknown) => fmt(Number(v))} />
          </Bar>
          <Bar dataKey="actual" name={labelActual} fill={cAct} radius={[4, 4, 0, 0]} maxBarSize={64}>
            <LabelList dataKey="actual" position="top" offset={8} style={{ fill: cAct, fontSize: 10, fontWeight: 700 }} formatter={(v: unknown) => fmt(Number(v))} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Líneas diarias mes anterior vs actual (alineadas por día de mes). Permite ver
 * por día si subimos, bajamos o nos mantenemos respecto al mes pasado.
 */
export function GraficoLineasComparativo({
  data,
  labelActual,
  labelAnterior,
  formato = "num",
  colorActual,
}: {
  data: { dia: number; actual: number | null; anterior: number | null }[];
  labelActual: string;
  labelAnterior: string;
  formato?: "num" | "moneda";
  colorActual?: string;
}) {
  const p = usePaleta();
  const ttip = estilosTooltip(p);
  const { activo, bind } = useHoverActivo();
  const cAct = colorActual ?? p.accent;
  const fmt = (v: number) => (formato === "moneda" ? fmtMoneda(v) : fmtNum(Math.round(v)));
  return (
    <div {...bind} className="h-full w-full">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={p.line} vertical={false} />
          <XAxis
            dataKey="dia"
            tick={{ fontSize: 11, fill: p.inkTer }}
            axisLine={{ stroke: p.line }}
            tickLine={false}
            tickFormatter={(d) => `${d}`}
          />
          <YAxis tick={{ fontSize: 11, fill: p.inkTer }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => fmt(Number(v))} />
          <Tooltip
            contentStyle={ttip.contentStyle}
            labelStyle={ttip.labelStyle}
            itemStyle={ttip.itemStyle}
            wrapperStyle={ttip.wrapperStyle}
            active={activo}
            formatter={(v) => [v == null ? "—" : fmt(Number(v)), ""] as [string, string]}
            labelFormatter={(d) => `Día ${d}`}
          />
          <Legend wrapperStyle={ttip.legendStyle} />
          <Line
            type="monotone"
            dataKey="anterior"
            name={labelAnterior}
            stroke={p.inkTer}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="actual"
            name={labelActual}
            stroke={cAct}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoCarteras({
  data,
}: {
  data: { proyecto: string; gestiones: number; efectivas: number }[];
}) {
  const p = usePaleta();
  const ttip = estilosTooltip(p);
  const { activo, bind } = useHoverActivo();
  return (
    <div {...bind}>
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
        <Tooltip contentStyle={ttip.contentStyle} labelStyle={ttip.labelStyle} itemStyle={ttip.itemStyle} wrapperStyle={ttip.wrapperStyle} active={activo} />
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
    </div>
  );
}
