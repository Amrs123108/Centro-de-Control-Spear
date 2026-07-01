/* ── Comparación entre dos períodos (MTD) ───────────────────────────────────
   Productividad mes contra mes. Como los meses tienen distinto número de días,
   TODO se compara con métricas por día y tasas (no totales), para que la lectura
   "íbamos igual / mejor / peor" sea justa sin importar cuántos días lleve cada mes.

   Convención: A = período actual, B = período de comparación (normalmente el mes
   anterior). rel > 0 ⇒ A va mejor que B. */

import type { MTDData } from "@/types/mtd";

export type Cambio = { a: number; b: number; abs: number; rel: number };

export function cambio(a: number, b: number): Cambio {
  const rel = b !== 0 ? (a - b) / b : a > 0 ? 1 : 0;
  return { a, b, abs: a - b, rel };
}

function rel(a: number, b: number): number {
  return b !== 0 ? (a - b) / b : a > 0 ? 1 : 0;
}

/** Índice de productividad ponderado a partir de cambios relativos. */
function indiceProd(p: {
  promesasDia: number;
  conversion: number;
  contacto: number;
  gestionesDia: number;
  recaudoDia?: number;
}): number {
  const base =
    0.38 * p.promesasDia + 0.27 * p.conversion + 0.2 * p.contacto + 0.15 * p.gestionesDia;
  // El recaudo, cuando aplica, pesa aparte y reescala el resto.
  if (p.recaudoDia !== undefined) {
    return 0.35 * p.promesasDia + 0.25 * p.conversion + 0.2 * p.contacto + 0.1 * p.gestionesDia + 0.1 * p.recaudoDia;
  }
  return base;
}

export type Estado = "mejor" | "igual" | "peor";

function estadoDe(indice: number, umbral = 0.02): Estado {
  if (indice > umbral) return "mejor";
  if (indice < -umbral) return "peor";
  return "igual";
}

/* ── Comparación "al mismo punto del mes" ────────────────────────────────────
   Si el mes actual tiene datos hasta el día 25, el mes anterior se compara solo
   hasta el día 25 (no el mes completo). Todo se reconstruye desde la serie
   diaria (tendencia_diaria), que incluye gestiones/efectivas/promesas/recaudo. */

export type IndicadorDia = "gestiones" | "efectivas" | "promesas" | "recaudo";

function diaDeMes(iso: string): number {
  return Number(iso.slice(8, 10));
}

/** Último día del mes (número) con datos en el período (su "corte"). */
export function corteDia(mtd: MTDData): number {
  const dias = mtd.tendencia_diaria.map((d) => diaDeMes(d.fecha));
  return dias.length ? Math.max(...dias) : 31;
}

export type Totales = {
  gestiones: number;
  efectivas: number;
  promesas: number;
  recaudo: number;
  dias: number;
  gestiones_dia: number;
  efectivas_dia: number;
  promesas_dia: number;
  recaudo_dia: number;
  tasa_contacto: number;
  conversion: number;
  ptp_rate: number;
  ticket: number;
  ultima_fecha?: string;
};

/** Agrega la serie diaria de un período hasta el día de mes `corte` (incluido). */
export function totalesHasta(mtd: MTDData, corte: number): Totales {
  const f = mtd.tendencia_diaria.filter((d) => diaDeMes(d.fecha) <= corte);
  const g = f.reduce((s, d) => s + (d.gestiones ?? 0), 0);
  const e = f.reduce((s, d) => s + (d.efectivas ?? 0), 0);
  const p = f.reduce((s, d) => s + d.promesas, 0);
  const r = f.reduce((s, d) => s + (d.recaudo ?? 0), 0);
  const dias = f.length;
  const dd = Math.max(dias, 1);
  return {
    gestiones: g, efectivas: e, promesas: p, recaudo: r, dias,
    gestiones_dia: g / dd, efectivas_dia: e / dd, promesas_dia: p / dd, recaudo_dia: r / dd,
    tasa_contacto: e / Math.max(g, 1),
    conversion: p / Math.max(g, 1),
    ptp_rate: p / Math.max(e, 1),
    ticket: r / Math.max(p, 1),
    ultima_fecha: f.length ? f[f.length - 1].fecha : undefined,
  };
}

/** Totales de A (hasta su corte) y B (hasta el mismo corte de A). */
export function totalesComparables(A: MTDData, B: MTDData): { corte: number; ta: Totales; tb: Totales } {
  const corte = corteDia(A);
  return { corte, ta: totalesHasta(A, corte), tb: totalesHasta(B, corte) };
}

/** Serie diaria alineada por día de mes para el gráfico de líneas. */
export type PuntoComparativo = { dia: number; actual: number | null; anterior: number | null };

/** Versión sobre arrays de serie diaria (para componentes que solo reciben la
   serie, no el MTDData completo). `serieB` puede ser null si no hay mes anterior. */
export function serieComparativaDe(
  serieA: MTDData["tendencia_diaria"],
  serieB: MTDData["tendencia_diaria"] | null | undefined,
  ind: IndicadorDia
): PuntoComparativo[] {
  const valor = (d: MTDData["tendencia_diaria"][number]) =>
    ind === "recaudo" ? d.recaudo ?? 0 : (d[ind] ?? 0);
  const corte = serieA.length ? Math.max(...serieA.map((d) => diaDeMes(d.fecha))) : 31;
  const mapA = new Map(serieA.map((d) => [diaDeMes(d.fecha), valor(d)]));
  const mapB = new Map(
    (serieB ?? []).filter((d) => diaDeMes(d.fecha) <= corte).map((d) => [diaDeMes(d.fecha), valor(d)])
  );
  const puntos: PuntoComparativo[] = [];
  for (let dia = 1; dia <= corte; dia++) {
    const a = mapA.get(dia);
    const b = mapB.get(dia);
    if (a === undefined && b === undefined) continue; // sin datos ese día (fin de semana)
    puntos.push({ dia, actual: a ?? null, anterior: b ?? null });
  }
  return puntos;
}

export function serieComparativa(A: MTDData, B: MTDData, ind: IndicadorDia): PuntoComparativo[] {
  return serieComparativaDe(A.tendencia_diaria, B.tendencia_diaria, ind);
}

/* ── Serie multi-mes alineada por día de mes ─────────────────────────────────
   Todos los meses superpuestos en un mismo eje día-1 … día-31. Los meses ya
   cerrados se dibujan COMPLETOS (tienen gestiones todos sus días); el mes actual
   solo llega hasta su corte porque su serie aún no tiene los días siguientes.
   Una clave (columna) por mes; null en los días sin datos (fines de semana o
   futuro), que el gráfico puentea con connectNulls. */
export type SerieMes = { clave: string; serie: MTDData["tendencia_diaria"] };

export function serieMultiMes(
  meses: SerieMes[],
  ind: IndicadorDia
): Record<string, number | null>[] {
  const valor = (d: MTDData["tendencia_diaria"][number]) =>
    ind === "recaudo" ? d.recaudo ?? 0 : (d[ind] ?? 0);
  const maps = meses.map((m) => ({
    clave: m.clave,
    map: new Map(m.serie.map((d) => [diaDeMes(d.fecha), valor(d)])),
  }));
  let maxDia = 0;
  for (const m of maps) for (const k of m.map.keys()) if (k > maxDia) maxDia = k;
  const puntos: Record<string, number | null>[] = [];
  for (let dia = 1; dia <= maxDia; dia++) {
    const punto: Record<string, number | null> = { dia };
    let any = false;
    for (const m of maps) {
      const v = m.map.get(dia);
      if (v !== undefined) {
        punto[m.clave] = v;
        any = true;
      } else {
        punto[m.clave] = null;
      }
    }
    if (any) puntos.push(punto);
  }
  return puntos;
}

/* ── Métricas globales (por día / tasas) ─────────────────────────────────── */
export type MetricaGlobal = {
  clave: string;
  label: string;
  /** Nombre corto del indicador para etiquetas como "Gestiones al 30 may". */
  corto: string;
  formato: "num" | "pct" | "moneda";
  decimales: number;
  cambio: Cambio;
  ayuda?: string;
};

export function metricasGlobales(A: MTDData, B: MTDData): MetricaGlobal[] {
  const { ta, tb } = totalesComparables(A, B);
  return [
    { clave: "gestiones_dia", label: "Gestiones / día", corto: "Gestiones", formato: "num", decimales: 0, cambio: cambio(ta.gestiones_dia, tb.gestiones_dia), ayuda: "Volumen diario de marcación del equipo." },
    { clave: "efectivas_dia", label: "Efectivas / día", corto: "Efectivas", formato: "num", decimales: 0, cambio: cambio(ta.efectivas_dia, tb.efectivas_dia), ayuda: "Contactos efectivos logrados por día." },
    { clave: "contacto", label: "Contacto", corto: "Contacto", formato: "pct", decimales: 1, cambio: cambio(ta.tasa_contacto, tb.tasa_contacto), ayuda: "De cada 100 gestiones, en cuántas se logró hablar." },
    { clave: "ptp", label: "PTP", corto: "PTP", formato: "pct", decimales: 1, cambio: cambio(ta.ptp_rate, tb.ptp_rate), ayuda: "De cada contacto efectivo, cuántos prometieron pagar." },
    { clave: "conversion", label: "Promesa/gest.", corto: "Prom/gest.", formato: "pct", decimales: 1, cambio: cambio(ta.conversion, tb.conversion), ayuda: "De cada 100 gestiones, cuántas terminaron en promesa de pago." },
    { clave: "promesas_dia", label: "Promesas / día", corto: "Promesas", formato: "num", decimales: 0, cambio: cambio(ta.promesas_dia, tb.promesas_dia), ayuda: "Resultado: promesas de pago obtenidas por día." },
    { clave: "recaudo_dia", label: "Recaudo / día", corto: "Recaudo", formato: "moneda", decimales: 0, cambio: cambio(ta.recaudo_dia, tb.recaudo_dia), ayuda: "Monto comprometido + pagado por día." },
    { clave: "ticket", label: "Monto promedio", corto: "Monto prom.", formato: "moneda", decimales: 0, cambio: cambio(ta.ticket, tb.ticket), ayuda: "Monto promedio por promesa." },
  ];
}

/* ── Veredicto de productividad ──────────────────────────────────────────── */
export type Veredicto = {
  estado: Estado;
  indice: number; // cambio relativo compuesto (p. ej. 0.07 = +7%)
  motores: { label: string; rel: number }[]; // qué movió la aguja, ordenado por impacto
};

export function veredictoProductividad(A: MTDData, B: MTDData): Veredicto {
  const { ta, tb } = totalesComparables(A, B);
  const motores = [
    { label: "Promesas / día", rel: rel(ta.promesas_dia, tb.promesas_dia) },
    { label: "Promesa/gest.", rel: rel(ta.conversion, tb.conversion) },
    { label: "Contacto", rel: rel(ta.tasa_contacto, tb.tasa_contacto) },
    { label: "Gestiones / día", rel: rel(ta.gestiones_dia, tb.gestiones_dia) },
    { label: "Recaudo / día", rel: rel(ta.recaudo_dia, tb.recaudo_dia) },
  ];
  const indice = indiceProd({
    promesasDia: motores[0].rel,
    conversion: motores[1].rel,
    contacto: motores[2].rel,
    gestionesDia: motores[3].rel,
    recaudoDia: motores[4].rel,
  });
  motores.sort((x, y) => Math.abs(y.rel) - Math.abs(x.rel));
  return { estado: estadoDe(indice), indice, motores };
}

/* ── Comparación por cartera ─────────────────────────────────────────────── */
export type CompCartera = {
  cartera: string;
  presencia: "ambos" | "solo_a" | "solo_b";
  promesasDia: Cambio;
  conversion: Cambio;
  contacto: Cambio;
  indice: number;
  estado: Estado;
};

export function compararCarteras(A: MTDData, B: MTDData): CompCartera[] {
  const da = Math.max(A.resumen.dias_procesados, 1), db = Math.max(B.resumen.dias_procesados, 1);
  const mapB = new Map(B.carteras.map((c) => [c.cartera, c]));
  const vistas = new Set<string>();
  const out: CompCartera[] = [];

  for (const a of A.carteras) {
    vistas.add(a.cartera);
    const b = mapB.get(a.cartera);
    const promesasDia = cambio(a.promesas / da, (b?.promesas ?? 0) / db);
    const conversion = cambio(a.conversion, b?.conversion ?? 0);
    const contacto = cambio(a.tasa_contacto, b?.tasa_contacto ?? 0);
    const indice = b
      ? indiceProd({ promesasDia: promesasDia.rel, conversion: conversion.rel, contacto: contacto.rel, gestionesDia: rel(a.gestiones / da, (b.gestiones) / db) })
      : 1;
    out.push({
      cartera: a.cartera,
      presencia: b ? "ambos" : "solo_a",
      promesasDia, conversion, contacto,
      indice, estado: b ? estadoDe(indice) : "mejor",
    });
  }
  for (const b of B.carteras) {
    if (vistas.has(b.cartera)) continue;
    out.push({
      cartera: b.cartera,
      presencia: "solo_b",
      promesasDia: cambio(0, b.promesas / db),
      conversion: cambio(0, b.conversion),
      contacto: cambio(0, b.tasa_contacto),
      indice: -1, estado: "peor",
    });
  }
  return out.sort((x, y) => y.indice - x.indice);
}

/* ── Comparación por asesor ──────────────────────────────────────────────── */
export type CompAsesor = {
  gestor: string;
  cartera: string;
  presencia: "ambos" | "nuevo" | "salio";
  promesasDia: Cambio;
  conversion: Cambio;
  contacto: Cambio;
  indice: number;
  estado: Estado;
};

export function compararAsesores(A: MTDData, B: MTDData): CompAsesor[] {
  const mapB = new Map(B.gestores.map((g) => [g.gestor, g]));
  const vistos = new Set<string>();
  const out: CompAsesor[] = [];

  for (const a of A.gestores) {
    vistos.add(a.gestor);
    const b = mapB.get(a.gestor);
    const promesasDia = cambio(a.promesas_dia, b?.promesas_dia ?? 0);
    const conversion = cambio(a.conversion, b?.conversion ?? 0);
    const contacto = cambio(a.tasa_contacto, b?.tasa_contacto ?? 0);
    const indice = b
      ? indiceProd({ promesasDia: promesasDia.rel, conversion: conversion.rel, contacto: contacto.rel, gestionesDia: rel(a.gestiones_dia, b.gestiones_dia) })
      : 1;
    out.push({
      gestor: a.gestor,
      cartera: a.cartera_principal,
      presencia: b ? "ambos" : "nuevo",
      promesasDia, conversion, contacto,
      indice, estado: b ? estadoDe(indice) : "mejor",
    });
  }
  for (const b of B.gestores) {
    if (vistos.has(b.gestor)) continue;
    out.push({
      gestor: b.gestor,
      cartera: b.cartera_principal,
      presencia: "salio",
      promesasDia: cambio(0, b.promesas_dia),
      conversion: cambio(0, b.conversion),
      contacto: cambio(0, b.tasa_contacto),
      indice: -1, estado: "peor",
    });
  }
  return out;
}

export const ESTADO_META: Record<Estado, { label: string; clase: string; punto: string }> = {
  mejor: { label: "Mejor", clase: "text-pos", punto: "bg-pos" },
  igual: { label: "Igual", clase: "text-ink-sec", punto: "bg-ink-ter" },
  peor: { label: "Peor", clase: "text-neg", punto: "bg-neg" },
};
