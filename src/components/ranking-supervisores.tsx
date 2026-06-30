import { ArrowDown, ArrowUp, Crown, Minus, Trophy } from "lucide-react";
import { fmtNum, fmtPct } from "@/lib/formato";
import { LogoCartera } from "@/components/logo-cartera";
import { Barra, Tip } from "@/components/ui";
import { CumplBadge } from "@/components/vs-meta";
import type { Cartera } from "@/types/mtd";

export const DEF_CONV =
  "Conversión a promesa de pago: de cada 100 gestiones realizadas, en cuántas el cliente se comprometió a pagar (promesas ÷ gestiones). Mide qué tan seguido una gestión termina convirtiéndose en un compromiso de pago.";
export const DEF_EFECT =
  "Efectividad: de cada 100 gestiones, en cuántas se logró contacto efectivo con el cliente (efectivas ÷ gestiones).";

/* Agregado por supervisor (líder), a partir de sus carteras. */
export type SupAgg = {
  supervisor: string;
  gerente: string;
  carteras: Cartera[];
  asesores: number;
  gestiones: number;
  efectivas: number;
  promesas: number;
  /** Score 0–100 ponderado por gestiones de cada cartera. */
  score: number;
  /** Efectividad = efectivas / gestiones. */
  efectividad: number;
  /** Conversión = promesas / gestiones. */
  conversion: number;
  /** Cambio relativo reciente de promesas (último tercio vs primer tercio). */
  trend: number;
  /** Cumplimiento vs meta a la fecha (promedio de gestiones/efectivas/promesas).
      null = ninguna de sus carteras tiene meta. */
  cumplimiento: number | null;
  /** Actual + esperado a la fecha por métrica (solo carteras con meta). */
  meta: {
    gestiones: MetaAgg;
    efectivas: MetaAgg;
    promesas: MetaAgg;
  };
};

/** Agregado de una métrica vs su meta a la fecha. null = sin metas. */
export type MetaAgg = { actual: number; esperado: number; pct: number } | null;

/* Suma actual y esperado-a-la-fecha de una métrica sobre las carteras que SÍ
   tienen meta. El esperado se deriva del % que ya trae cada cartera
   (esperado = actual ÷ (pct/100)), así no necesitamos recalcular la fracción. */
function aggMeta(
  carteras: Cartera[],
  campo: "gestiones" | "efectivas" | "promesas",
  campoPct: "pct_gestiones" | "pct_efectivas" | "pct_promesas"
): MetaAgg {
  let actual = 0;
  let esperado = 0;
  let hay = false;
  for (const c of carteras) {
    const pct = c[campoPct];
    if (pct && pct > 0) {
      actual += c[campo];
      esperado += c[campo] / (pct / 100);
      hay = true;
    }
  }
  return hay && esperado > 0 ? { actual, esperado, pct: (actual / esperado) * 100 } : null;
}

function cumplimientoDe(meta: SupAgg["meta"]): number | null {
  const pcts = [meta.gestiones, meta.efectivas, meta.promesas]
    .filter((m): m is { actual: number; esperado: number; pct: number } => m !== null)
    .map((m) => m.pct);
  return pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null;
}

/* Tendencia de promesas del supervisor: compara el último tercio de días contra
   el primero, sobre la serie diaria sumada de sus carteras. */
function tendenciaPromesas(carteras: Cartera[]): number {
  const lens = carteras.map((c) => c.tendencia?.length ?? 0).filter((n) => n > 0);
  if (!lens.length) return 0;
  const len = Math.min(...lens);
  if (len < 4) return 0;
  const serie: number[] = [];
  for (let i = 0; i < len; i++) {
    let s = 0;
    for (const c of carteras) {
      const t = c.tendencia;
      s += t[t.length - len + i]?.promesas ?? 0;
    }
    serie.push(s);
  }
  const tercio = Math.max(1, Math.floor(len / 3));
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const previo = avg(serie.slice(0, tercio));
  const reciente = avg(serie.slice(len - tercio));
  if (previo <= 0) return reciente > 0 ? 1 : 0;
  return (reciente - previo) / previo;
}

export function agregarSupervisores(
  carteras: Cartera[],
  supervisores: Record<string, string>,
  gerentes: Record<string, string>
): SupAgg[] {
  const mapa = new Map<string, SupAgg>();
  for (const c of carteras) {
    const sup = supervisores[c.cartera]?.trim() || "Sin asignar";
    let g = mapa.get(sup);
    if (!g) {
      g = {
        supervisor: sup,
        gerente: gerentes[sup]?.trim() || "Sin asignar",
        carteras: [],
        asesores: 0,
        gestiones: 0,
        efectivas: 0,
        promesas: 0,
        score: 0,
        efectividad: 0,
        conversion: 0,
        trend: 0,
        cumplimiento: null,
        meta: { gestiones: null, efectivas: null, promesas: null },
      };
      mapa.set(sup, g);
    }
    g.carteras.push(c);
    g.asesores += c.num_asesores;
    g.gestiones += c.gestiones;
    g.efectivas += c.efectivas;
    g.promesas += c.promesas;
  }
  for (const g of mapa.values()) {
    g.carteras.sort((a, b) => b.gestiones - a.gestiones);
    const tot = g.gestiones || 1;
    g.score = Math.round(g.carteras.reduce((s, c) => s + c.score * c.gestiones, 0) / tot);
    g.efectividad = g.gestiones > 0 ? g.efectivas / g.gestiones : 0;
    g.conversion = g.gestiones > 0 ? g.promesas / g.gestiones : 0;
    g.trend = tendenciaPromesas(g.carteras);
    g.meta = {
      gestiones: aggMeta(g.carteras, "gestiones", "pct_gestiones"),
      efectivas: aggMeta(g.carteras, "efectivas", "pct_efectivas"),
      promesas: aggMeta(g.carteras, "promesas", "pct_promesas"),
    };
    g.cumplimiento = cumplimientoDe(g.meta);
  }
  return [...mapa.values()];
}

export type Totales = {
  gestiones: number;
  promesas: number;
  efectivas: number;
  asesores: number;
  score: number;
  efectividad: number;
  conversion: number;
  /** Cumplimiento del equipo vs meta a la fecha. null = sin metas. */
  cumplimiento: number | null;
  meta: { gestiones: MetaAgg; efectivas: MetaAgg; promesas: MetaAgg };
};

/* Suma los agregados de meta de varios supervisores en uno solo. */
function sumarMeta(list: SupAgg[], campo: "gestiones" | "efectivas" | "promesas"): MetaAgg {
  let actual = 0;
  let esperado = 0;
  let hay = false;
  for (const s of list) {
    const m = s.meta[campo];
    if (m) {
      actual += m.actual;
      esperado += m.esperado;
      hay = true;
    }
  }
  return hay && esperado > 0 ? { actual, esperado, pct: (actual / esperado) * 100 } : null;
}

export function totalesEquipo(list: SupAgg[]): Totales {
  const gestiones = list.reduce((s, g) => s + g.gestiones, 0);
  const efectivas = list.reduce((s, g) => s + g.efectivas, 0);
  const promesas = list.reduce((s, g) => s + g.promesas, 0);
  const asesores = list.reduce((s, g) => s + g.asesores, 0);
  const score = gestiones > 0 ? Math.round(list.reduce((s, g) => s + g.score * g.gestiones, 0) / gestiones) : 0;
  const meta = {
    gestiones: sumarMeta(list, "gestiones"),
    efectivas: sumarMeta(list, "efectivas"),
    promesas: sumarMeta(list, "promesas"),
  };
  return {
    gestiones,
    efectivas,
    promesas,
    asesores,
    score,
    efectividad: gestiones > 0 ? efectivas / gestiones : 0,
    conversion: gestiones > 0 ? promesas / gestiones : 0,
    cumplimiento: cumplimientoDe(meta),
    meta,
  };
}

export function tonoScore(score: number) {
  return score >= 70 ? "pos" : score >= 45 ? "accent" : score >= 25 ? "warn" : "neg";
}

/* Flecha de tendencia: subiendo / bajando / estable. */
export function TendIcono({ v }: { v: number }) {
  const up = v > 0.05;
  const down = v < -0.05;
  const Icono = up ? ArrowUp : down ? ArrowDown : Minus;
  const color = up ? "text-pos" : down ? "text-neg" : "text-ink-ter";
  const label = up ? "Promesas subiendo" : down ? "Promesas bajando" : "Promesas estables";
  return (
    <span title={label} className={`inline-flex items-center ${color}`}>
      <Icono className="h-3.5 w-3.5" />
    </span>
  );
}

/* Color del puesto: oro / plata / bronce / neutro. */
const PUESTO = ["text-gold", "text-ink-sec", "text-warn", "text-ink-ter"];

function FilaSup({ s, puesto }: { s: SupAgg; puesto: number }) {
  return (
    <div className="rounded-lg border border-line/60 bg-canvas px-2.5 py-2">
      <div className="flex items-center gap-2">
        <span className="flex w-5 shrink-0 justify-center">
          {puesto === 1 ? (
            <Trophy className="h-4 w-4 text-gold" />
          ) : (
            <span className={`tnum text-sm font-extrabold ${PUESTO[Math.min(puesto - 1, 3)]}`}>{puesto}</span>
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{s.supervisor}</span>
        <TendIcono v={s.trend} />
        <span className="tnum text-sm font-extrabold text-ink">{s.score}</span>
      </div>
      {/* Logos de cartera en su propia fila — no compiten con las métricas */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {s.carteras.map((c) => (
          <LogoCartera key={c.cartera} cartera={c.cartera} alto={26} />
        ))}
      </div>
      <div className="mt-1.5">
        <Barra pct={s.score} tono={tonoScore(s.score)} />
      </div>
      {/* Métricas en fila completa, repartidas */}
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-ink-ter">
        <span>
          <b className="tnum text-ink-sec">{fmtNum(s.gestiones)}</b> gest.
        </span>
        <span>
          <b className="tnum text-ink-sec">{fmtNum(s.efectivas)}</b> efect.
        </span>
        <span>
          <Tip texto={DEF_EFECT}>Efect.</Tip>{" "}
          <b className="tnum text-ink-sec">{fmtPct(s.efectividad, 0)}</b>
        </span>
        <span>
          <Tip texto={DEF_CONV}>Conv. a promesa</Tip>{" "}
          <b className="tnum text-ink-sec">{fmtPct(s.conversion, 0)}</b>
        </span>
        <span>
          <b className="tnum text-accent-claro">{fmtNum(s.promesas)}</b> prom.
        </span>
        <span>
          Cumpl. <CumplBadge pct={s.cumplimiento} className="text-[10px]" />
        </span>
      </div>
    </div>
  );
}

function ColumnaGerente({
  gerente,
  cargo,
  sups,
  cols,
  ganador,
}: {
  gerente: string;
  cargo: string;
  sups: SupAgg[];
  /** 1 ó 2 columnas internas (para igualar alturas entre equipos). */
  cols: 1 | 2;
  ganador: boolean;
}) {
  const t = totalesEquipo(sups);
  return (
    <div
      className={`relative flex flex-col rounded-xl border bg-surface p-4 shadow-card ${
        ganador ? "border-gold/55 ring-1 ring-gold/30" : "border-line"
      }`}
    >
      {/* Distintivo de equipo líder (primero) */}
      {ganador && (
        <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">
          <Crown className="h-3 w-3" /> Nº 1 · Equipo líder
        </span>
      )}
      <div className="mb-3 flex items-start justify-between gap-2 border-b border-line pb-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold text-ink">{gerente}</h4>
          <p className="mt-0.5 text-[11px] text-ink-ter">{cargo}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[9px] uppercase tracking-wider text-ink-ter">Score equipo</div>
          <div className={`tnum text-2xl font-extrabold ${ganador ? "text-gold" : "text-ink"}`}>{t.score}</div>
          {t.cumplimiento !== null && (
            <div className="text-[9px] text-ink-ter">
              Cumpl. <CumplBadge pct={t.cumplimiento} className="text-[11px]" />
            </div>
          )}
        </div>
      </div>
      <div className="mb-3 grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="tnum text-sm font-bold text-ink">{fmtNum(t.gestiones)}</div>
          <div className="text-[9px] uppercase tracking-wider text-ink-ter">Gestiones</div>
        </div>
        <div>
          <div className="tnum text-sm font-bold text-pos">{fmtPct(t.efectividad, 0)}</div>
          <div className="text-[9px] uppercase tracking-wider text-ink-ter">Efect.</div>
        </div>
        <div>
          <div className="tnum text-sm font-bold text-accent-claro">{fmtNum(t.promesas)}</div>
          <div className="text-[9px] uppercase tracking-wider text-ink-ter">Promesas</div>
        </div>
        <div>
          <div className="tnum text-sm font-bold text-ink">{fmtNum(t.asesores)}</div>
          <div className="text-[9px] uppercase tracking-wider text-ink-ter">Asesores</div>
        </div>
      </div>
      <div className={cols === 2 ? "grid grid-cols-1 gap-2 sm:grid-cols-2" : "space-y-2"}>
        {sups.map((s, i) => (
          <FilaSup key={s.supervisor} s={s} puesto={i + 1} />
        ))}
      </div>
    </div>
  );
}

/**
 * Ranking de supervisores (líderes) del mejor al peor, dividido por la gerencia
 * a la que reportan (César Zambrano vs Liliana Caballero), para comparar qué
 * equipo va mejor. El score de cada supervisor pondera el score de sus carteras
 * por volumen de gestiones. Mapeos editables en src/data/supervisores.json.
 */
export function RankingSupervisores({
  carteras,
  supervisores,
  gerentes,
  cargos,
}: {
  carteras: Cartera[];
  supervisores: Record<string, string>;
  gerentes: Record<string, string>;
  cargos: Record<string, string>;
}) {
  const sups = agregarSupervisores(carteras, supervisores, gerentes);
  const porGerente = (nombre: string) =>
    sups
      .filter((s) => s.gerente === nombre)
      .sort((a, b) => b.score - a.score || b.promesas - a.promesas);

  const equipoCesar = porGerente("César Zambrano");
  const equipoLiliana = porGerente("Liliana Caballero");

  const scoreCesar = totalesEquipo(equipoCesar).score;
  const scoreLiliana = totalesEquipo(equipoLiliana).score;

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <ColumnaGerente
        gerente="César Zambrano"
        cargo={cargos["César Zambrano"] ?? "Gerencia"}
        sups={equipoCesar}
        cols={equipoCesar.length > 3 ? 2 : 1}
        ganador={scoreCesar >= scoreLiliana}
      />
      <ColumnaGerente
        gerente="Liliana Caballero"
        cargo={cargos["Liliana Caballero"] ?? "Gerencia"}
        sups={equipoLiliana}
        cols={equipoLiliana.length > 3 ? 2 : 1}
        ganador={scoreLiliana > scoreCesar}
      />
    </div>
  );
}
