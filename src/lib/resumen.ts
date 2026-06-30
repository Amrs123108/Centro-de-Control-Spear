/* ── Payload del bloque "Resumen interactivo" del dashboard ─────────────────
   Se construye en el server (lee MTDData PII-free) y alimenta un único componente
   cliente que, con los botones de cartera, filtra a la vez:
     · Indicadores por mes (totales acumulados al corte + % vs meta)
     · Las 3 cards operativas (gestiones / contacto / promesas con su meta)
     · Fuerza laboral vs meta (asesores de la cartera elegida)
   Todo por cartera y en global, precalculado para que el cliente solo conmute. */

import type { Cartera, MTDData } from "@/types/mtd";

/** Valores de un mes para la tabla: totales (acumulado al corte) + tasas. */
export type ValoresMes = {
  promesas: number;
  recaudo: number;
  conversion: number;
  tasa_contacto: number;
  gestiones: number;
  efectivas: number;
};

/** % de cumplimiento a la fecha por indicador (null = sin meta ese mes). */
export type MetaPct = {
  gestiones: number | null;
  efectivas: number | null;
  promesas: number | null;
  recaudo: number | null;
};

export type ColScope = { v: ValoresMes; meta: MetaPct };

export type ColMes = {
  periodo: string;
  mes: string;
  actual: boolean;
  global: ColScope;
  porCartera: Record<string, ColScope>;
};

/** Meta a la fecha de una card: lo esperado y el % de avance. */
export type MetaVs = { esperado: number; pct: number } | null;

export type SerieDia = { fecha: string; gestiones: number; efectivas: number; promesas: number };

/** Datos de las 3 cards para un ámbito (global o una cartera) en el mes actual. */
export type CardScope = {
  gestiones: number;
  gestionesDia: number;
  efectivas: number;
  tasaContacto: number;
  promesas: number;
  ptpRate: number;
  metaGestiones: MetaVs;
  metaEfectivas: MetaVs;
  metaPromesas: MetaVs;
  serie: SerieDia[];
};

export type Cards = { global: CardScope; porCartera: Record<string, CardScope> };

export type AsesorFuerza = {
  gestor: string;
  cartera: string;
  cumplimiento: number | null;
  estado: string;
  pct_g: number | null;
  pct_e: number | null;
  pct_p: number | null;
};

export type PayloadResumen = {
  cols: ColMes[];
  cards: Cards;
  fuerza: AsesorFuerza[];
  /** Carteras del mes actual (roster de los botones). */
  carteras: string[];
};

function fracDe(m: MTDData): number {
  return Math.max(m.resumen.pct_mes_transcurrido / 100, 1e-4);
}

/** Solo el % (total ÷ esperado a la fecha), o null si no hay meta. */
function pctOnly(total: number, metaMensual: number, frac: number): number | null {
  if (!metaMensual || metaMensual <= 0) return null;
  const esperado = metaMensual * frac;
  return esperado > 0 ? (total / esperado) * 100 : 0;
}

function metaVs(total: number, metaMensual: number, frac: number): MetaVs {
  if (!metaMensual || metaMensual <= 0) return null;
  const esperado = metaMensual * frac;
  return { esperado, pct: esperado > 0 ? (total / esperado) * 100 : 0 };
}

function serieDe(t: { fecha: string; gestiones?: number; efectivas?: number; promesas: number }[]): SerieDia[] {
  return t.map((d) => ({
    fecha: d.fecha,
    gestiones: d.gestiones ?? 0,
    efectivas: d.efectivas ?? 0,
    promesas: d.promesas,
  }));
}

function cardCartera(c: Cartera, diasProcesados: number, frac: number): CardScope {
  const d = Math.max(diasProcesados, 1);
  return {
    gestiones: c.gestiones,
    gestionesDia: c.gestiones / d,
    efectivas: c.efectivas,
    tasaContacto: c.tasa_contacto,
    promesas: c.promesas,
    ptpRate: c.ptp_rate,
    metaGestiones: metaVs(c.gestiones, c.meta_gestiones ?? 0, frac),
    metaEfectivas: metaVs(c.efectivas, c.meta_efectivas ?? 0, frac),
    metaPromesas: metaVs(c.promesas, c.meta_promesas ?? 0, frac),
    serie: serieDe(c.tendencia ?? []),
  };
}

export function construirPayloadResumen(A: MTDData, todos: MTDData[]): PayloadResumen {
  const meses = [...todos].sort((a, b) => a.periodo.localeCompare(b.periodo));

  // ── Columnas (totales acumulados al corte de cada mes) ──
  const cols: ColMes[] = meses.map((m) => {
    const frac = fracDe(m);
    const r = m.resumen;
    const sumMeta = (k: "meta_gestiones" | "meta_efectivas" | "meta_promesas" | "meta_recaudo") =>
      m.carteras.reduce((s, c) => s + (c[k] ?? 0), 0);
    const globalScope: ColScope = {
      v: {
        promesas: r.total_promesas,
        recaudo: r.total_recaudo,
        conversion: r.conversion,
        tasa_contacto: r.tasa_contacto,
        gestiones: r.total_gestiones,
        efectivas: r.total_efectivas,
      },
      meta: {
        gestiones: pctOnly(r.total_gestiones, sumMeta("meta_gestiones"), frac),
        efectivas: pctOnly(r.total_efectivas, sumMeta("meta_efectivas"), frac),
        promesas: pctOnly(r.total_promesas, sumMeta("meta_promesas"), frac),
        recaudo: pctOnly(r.total_recaudo, sumMeta("meta_recaudo"), frac),
      },
    };
    const porCartera: Record<string, ColScope> = {};
    for (const c of m.carteras) {
      porCartera[c.cartera] = {
        v: {
          promesas: c.promesas,
          recaudo: c.monto,
          conversion: c.conversion,
          tasa_contacto: c.tasa_contacto,
          gestiones: c.gestiones,
          efectivas: c.efectivas,
        },
        meta: {
          gestiones: c.pct_gestiones ?? null,
          efectivas: c.pct_efectivas ?? null,
          promesas: c.pct_promesas ?? null,
          recaudo: c.pct_recaudo ?? null,
        },
      };
    }
    return { periodo: m.periodo, mes: m.mes_nombre, actual: m.periodo === A.periodo, global: globalScope, porCartera };
  });

  // ── Cards (mes actual) ──
  const fracA = fracDe(A);
  const diasA = A.resumen.dias_procesados;
  const sumMetaA = (k: "meta_gestiones" | "meta_efectivas" | "meta_promesas") =>
    A.carteras.reduce((s, c) => s + (c[k] ?? 0), 0);
  const cardGlobal: CardScope = {
    gestiones: A.resumen.total_gestiones,
    gestionesDia: A.resumen.gestiones_por_dia,
    efectivas: A.resumen.total_efectivas,
    tasaContacto: A.resumen.tasa_contacto,
    promesas: A.resumen.total_promesas,
    ptpRate: A.resumen.ptp_rate,
    metaGestiones: metaVs(A.resumen.total_gestiones, sumMetaA("meta_gestiones"), fracA),
    metaEfectivas: metaVs(A.resumen.total_efectivas, sumMetaA("meta_efectivas"), fracA),
    metaPromesas: metaVs(A.resumen.total_promesas, sumMetaA("meta_promesas"), fracA),
    serie: serieDe(A.tendencia_diaria),
  };
  const cardsPorCartera: Record<string, CardScope> = {};
  for (const c of A.carteras) cardsPorCartera[c.cartera] = cardCartera(c, diasA, fracA);

  // ── Fuerza laboral (mes actual, solo asesores con meta) ──
  const fuerza: AsesorFuerza[] = A.gestores
    .filter((g) => g.score_base === "meta")
    .map((g) => ({
      gestor: g.gestor,
      cartera: g.cartera_principal,
      cumplimiento: g.cumplimiento,
      estado: g.estado,
      pct_g: g.pct_gestiones,
      pct_e: g.pct_efectivas,
      pct_p: g.pct_promesas,
    }));

  const carteras = A.carteras.map((c) => c.cartera).sort();

  return { cols, cards: { global: cardGlobal, porCartera: cardsPorCartera }, fuerza, carteras };
}
