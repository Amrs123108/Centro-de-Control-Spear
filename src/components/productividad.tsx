"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Filter, TrendingUp, Users } from "lucide-react";
import { fmtMoneda, fmtNum } from "@/lib/formato";
import type { MTDData, Gestor } from "@/types/mtd";

// ── Colores de estado ────────────────────────────────────────────────────────
const ESTADO_CONFIG = {
  cumpliendo: { label: "Cumpliendo", clase: "bg-pos-soft text-pos border-pos/30" },
  cerca:      { label: "Cerca",      clase: "bg-warn-soft text-warn border-warn/30" },
  lejos:      { label: "Lejos",      clase: "bg-neg-soft text-neg border-neg/30" },
  sin_meta:   { label: "Sin meta",   clase: "bg-surface text-ink-ter border-line" },
} as const;

// ── Barra de progreso ────────────────────────────────────────────────────────
function BarraMeta({
  valor,
  meta,
  pct,
  estado,
}: {
  valor: number;
  meta: number | null;
  pct: number | null;
  estado: Gestor["estado"];
}) {
  if (meta === null || meta === 0) {
    return <span className="text-ink-ter">{fmtNum(valor)}</span>;
  }
  const ancho = Math.min(pct ?? 0, 100);
  const barraColor =
    estado === "cumpliendo"
      ? "bg-pos"
      : estado === "cerca"
        ? "bg-warn"
        : "bg-neg";

  return (
    <div className="min-w-[80px]">
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-semibold text-ink">{fmtNum(valor)}</span>
        <span className="text-[10px] text-ink-ter">/ {fmtNum(meta)}</span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full transition-all ${barraColor}`}
          style={{ width: `${ancho}%` }}
        />
      </div>
      <div className="mt-0.5 text-[10px] text-ink-ter">{pct?.toFixed(0)}%</div>
    </div>
  );
}

// ── Fila de gestor ───────────────────────────────────────────────────────────
function FilaGestor({ g, idx }: { g: Gestor; idx: number }) {
  const cfg = ESTADO_CONFIG[g.estado];
  const nombre = g.gestor
    .split(" ")
    .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
    .join(" ");

  return (
    <tr className="group border-b border-line/40 transition hover:bg-white/[0.03]">
      <td className="px-3 py-3 text-center text-xs text-ink-ter">{idx + 1}</td>
      <td className="px-3 py-3">
        <div className="text-sm font-medium text-ink">{nombre}</div>
        <div className="mt-0.5 text-[10px] text-ink-ter">{g.dias_activos}d activo</div>
      </td>
      <td className="px-3 py-3">
        <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-ink-sec">
          {g.cartera_principal}
        </span>
      </td>
      <td className="px-3 py-3">
        <BarraMeta valor={g.gestiones} meta={g.meta_gestiones} pct={g.pct_gestiones} estado={g.estado} />
      </td>
      <td className="px-3 py-3">
        <BarraMeta valor={g.efectivas} meta={g.meta_efectivas} pct={g.pct_efectivas} estado={g.estado} />
      </td>
      <td className="px-3 py-3">
        <BarraMeta valor={g.promesas} meta={g.meta_promesas} pct={g.pct_promesas} estado={g.estado} />
      </td>
      <td className="px-3 py-3">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.clase}`}>
          {cfg.label}
        </span>
      </td>
    </tr>
  );
}

// ── Tarjeta de resumen ───────────────────────────────────────────────────────
function TarjetaKPI({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-5 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-ter">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-ink">{valor}</div>
      {sub && <div className="mt-0.5 text-[11px] text-ink-ter">{sub}</div>}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
type Orden = "promesas" | "gestiones" | "efectivas" | "pct";

function rangoFechas(dias: string[]): string {
  if (!dias.length) return "—";
  const fmt = (s: string) =>
    new Date(`${s}T12:00:00`).toLocaleDateString("es-PA", { day: "numeric", month: "short" });
  if (dias.length === 1) return fmt(dias[0]);
  return `${fmt(dias[0])} – ${fmt(dias[dias.length - 1])}`;
}

export default function ScoreboardProductividad({ data }: { data: MTDData }) {
  const { resumen, gestores } = data;
  const [filtroCartera, setFiltroCartera] = useState("TODAS");
  const [orden, setOrden] = useState<Orden>("promesas");
  const [asc, setAsc] = useState(false);

  const carteras = useMemo(() => {
    const s = new Set(gestores.map((g) => g.cartera_principal));
    return ["TODAS", ...Array.from(s).sort()];
  }, [gestores]);

  const lista = useMemo(() => {
    let arr = filtroCartera === "TODAS"
      ? gestores
      : gestores.filter((g) => g.cartera_principal === filtroCartera);

    arr = [...arr].sort((a, b) => {
      let va = 0, vb = 0;
      if (orden === "promesas")   { va = a.promesas;   vb = b.promesas; }
      if (orden === "gestiones")  { va = a.gestiones;  vb = b.gestiones; }
      if (orden === "efectivas")  { va = a.efectivas;  vb = b.efectivas; }
      if (orden === "pct") {
        va = a.pct_promesas ?? -1;
        vb = b.pct_promesas ?? -1;
      }
      return asc ? va - vb : vb - va;
    });
    return arr;
  }, [gestores, filtroCartera, orden, asc]);

  function toggleOrden(nuevo: Orden) {
    if (orden === nuevo) setAsc(!asc);
    else { setOrden(nuevo); setAsc(false); }
  }

  const Th = ({ col, label }: { col: Orden; label: string }) => (
    <th
      className="cursor-pointer select-none px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-ink-ter hover:text-ink-sec"
      onClick={() => toggleOrden(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {orden === col ? (
          asc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  );

  const estadoTotal = [
    { label: "Cumpliendo", n: resumen.gestores_cumpliendo, clase: "text-pos" },
    { label: "Cerca",      n: resumen.gestores_cerca,      clase: "text-warn" },
    { label: "Lejos",      n: resumen.gestores_lejos,      clase: "text-neg" },
    { label: "Sin meta",   n: resumen.gestores_sin_meta,   clase: "text-ink-ter" },
  ];

  return (
    <div className="space-y-6">
      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <TarjetaKPI
          label="Gestores activos"
          valor={fmtNum(resumen.total_gestores)}
          sub={`${resumen.dias_procesados} días procesados`}
        />
        <TarjetaKPI
          label="Gestiones MTD"
          valor={fmtNum(resumen.total_gestiones)}
          sub={`${resumen.pct_mes_transcurrido}% del mes`}
        />
        <TarjetaKPI
          label="Efectivas MTD"
          valor={fmtNum(resumen.total_efectivas)}
          sub={`${((resumen.total_efectivas / Math.max(resumen.total_gestiones, 1)) * 100).toFixed(1)}% tasa`}
        />
        <TarjetaKPI
          label="Promesas MTD"
          valor={fmtNum(resumen.total_promesas)}
          sub={`${((resumen.total_promesas / Math.max(resumen.total_efectivas, 1)) * 100).toFixed(1)}% conv.`}
        />
      </div>

      {/* Semáforo de cumplimiento */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-5 py-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-ink-ter">
          Cumplimiento del equipo
        </span>
        {estadoTotal.map(({ label, n, clase }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`text-lg font-extrabold ${clase}`}>{n}</span>
            <span className="text-xs text-ink-ter">{label}</span>
          </span>
        ))}
        <span className="ml-auto text-right text-[10px] text-ink-ter">
          <span className="font-medium text-ink-sec">{rangoFechas(data.dias_procesados)}</span>
          {" · "}Progreso esperado: {resumen.pct_mes_transcurrido}% · {resumen.dias_procesados}/{resumen.dias_habiles_mes} días hábiles
        </span>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-ink-ter" />
        {carteras.map((c) => (
          <button
            key={c}
            onClick={() => setFiltroCartera(c)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              filtroCartera === c
                ? "border-accent bg-accent text-white"
                : "border-line text-ink-ter hover:border-accent-claro hover:text-ink-sec"
            }`}
          >
            {c}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-ink-ter">{lista.length} gestores</span>
      </div>

      {/* Tabla scoreboard */}
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-line">
            <tr>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-ink-ter">#</th>
              <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-ink-ter">Gestor</th>
              <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-ink-ter">Cartera</th>
              <Th col="gestiones" label="Gestiones" />
              <Th col="efectivas" label="Efectivas" />
              <Th col="promesas" label="Promesas" />
              <Th col="pct" label="Estado" />
            </tr>
          </thead>
          <tbody>
            {lista.map((g, i) => (
              <FilaGestor key={g.gestor} g={g} idx={i} />
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-ink-ter">
                  Sin gestores para esta cartera
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-right text-[10px] text-ink-ter">
        Generado: {new Date(data.generado).toLocaleString("es-PA")} · Datos al {data.periodo}
      </p>
    </div>
  );
}
