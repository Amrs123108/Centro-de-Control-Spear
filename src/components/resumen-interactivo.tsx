"use client";

/* ── Resumen interactivo del dashboard ──────────────────────────────────────
   Un solo control (botones de cartera) filtra a la vez TRES bloques:
     1) Indicadores por mes  — totales acumulados al corte + % vs meta a la fecha
     2) Las 3 cards          — gestiones / contacto / promesas con su meta
     3) Fuerza laboral       — asesores de la cartera elegida
   "Todas" = global del equipo. Color de cumplimiento único (≥100 verde,
   90–99 amarillo, <90 rojo). */

import { useState } from "react";
import { Crown, PhoneCall, Target, Users } from "lucide-react";
import { fmtMoneda, fmtNum, fmtPct } from "@/lib/formato";
import { Contador } from "@/components/animados";
import { MiniBarras } from "@/components/graficos";
import { Tip } from "@/components/ui";
import { LogoCartera } from "@/components/logo-cartera";
import { FONDO_TONO, TEXTO_TONO, tonoCumpl } from "@/lib/cumplimiento";
import type { CardScope, ColMes, MetaVs, PayloadResumen, ValoresMes } from "@/lib/resumen";

const GLOBAL = "__global__";

const DEF_PTP =
  "PTP (Promise To Pay / promesa de pago): de cada cliente con quien SÍ se logró hablar, qué porcentaje se comprometió a pagar.";
const DEF_FUERZA =
  "Promedio del cumplimiento de cada asesor: el promedio de sus % de gestiones, efectivas y promesas contra el ritmo esperado a la fecha. El recaudo no entra todavía (Etapa 4). 100% = va al ritmo justo para cumplir la meta del mes.";

type Formato = "num" | "pct" | "moneda";
type MetaKey = "gestiones" | "efectivas" | "promesas" | "recaudo" | null;

const INDICADORES: { clave: keyof ValoresMes; label: string; formato: Formato; metaKey: MetaKey }[] = [
  { clave: "promesas", label: "Promesas", formato: "num", metaKey: "promesas" },
  { clave: "recaudo", label: "Recaudo", formato: "moneda", metaKey: "recaudo" },
  { clave: "conversion", label: "Conversión", formato: "pct", metaKey: null },
  { clave: "tasa_contacto", label: "Contacto", formato: "pct", metaKey: null },
  { clave: "gestiones", label: "Gestiones", formato: "num", metaKey: "gestiones" },
  { clave: "efectivas", label: "Efectivas", formato: "num", metaKey: "efectivas" },
];

function fmt(v: number, f: Formato): string {
  if (f === "moneda") return fmtMoneda(v);
  if (f === "pct") return fmtPct(v, 1);
  return fmtNum(Math.round(v));
}

function diaCorto(f: string): string {
  return new Date(`${f}T12:00:00`).toLocaleDateString("es-PA", { day: "numeric", month: "short" });
}

const capNombre = (n: string) =>
  n.split(" ").map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(" ");

/** Barra "vs meta a la fecha" de una card: esperado + % con color por avance. */
function BarraMeta({ meta }: { meta: MetaVs }) {
  if (!meta) return null;
  const t = tonoCumpl(meta.pct);
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-ink-ter">
          Meta a la fecha:{" "}
          <span className="tnum font-semibold text-ink-sec">{fmtNum(Math.round(meta.esperado))}</span>
        </span>
        <span className={`tnum font-bold ${TEXTO_TONO[t]}`}>{Math.round(meta.pct)}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-canvas">
        <div className={`h-full ${FONDO_TONO[t]}`} style={{ width: `${Math.min(meta.pct, 100)}%` }} />
      </div>
    </div>
  );
}

/** Micro-dato del desglose de cumplimiento (con su propio color). */
function MicroPct({ label, p }: { label: string; p: number | null }) {
  if (p === null || p === undefined) return <span className="text-ink-ter">{label} —</span>;
  return (
    <span className="text-ink-ter">
      {label} <span className={`font-semibold ${TEXTO_TONO[tonoCumpl(p)]}`}>{Math.round(p)}%</span>
    </span>
  );
}

export function ResumenInteractivo({ payload }: { payload: PayloadResumen }) {
  const [cartera, setCartera] = useState<string>(GLOBAL);
  const esGlobal = cartera === GLOBAL;
  const card: CardScope = esGlobal ? payload.cards.global : payload.cards.porCartera[cartera];
  const scopeIndicador = (c: ColMes) => (esGlobal ? c.global : c.porCartera[cartera] ?? null);

  // Fuerza laboral filtrada por cartera
  const fuerza = esGlobal ? payload.fuerza : payload.fuerza.filter((a) => a.cartera === cartera);
  const promEquipo =
    fuerza.length > 0 ? fuerza.reduce((s, a) => s + (a.cumplimiento ?? 0), 0) / fuerza.length : null;
  const porCumpl = (a: (typeof fuerza)[number], b: (typeof fuerza)[number]) =>
    (b.cumplimiento ?? 0) - (a.cumplimiento ?? 0);
  const grupos = [
    { k: "cumpliendo", label: "Cumpliendo", clase: "text-pos", dot: "bg-pos", items: fuerza.filter((g) => g.estado === "cumpliendo").sort(porCumpl) },
    { k: "cerca", label: "Cerca", clase: "text-warn", dot: "bg-warn", items: fuerza.filter((g) => g.estado === "cerca").sort(porCumpl) },
    { k: "lejos", label: "Lejos", clase: "text-neg", dot: "bg-neg", items: fuerza.filter((g) => g.estado === "lejos").sort(porCumpl) },
  ];
  // Numeración corrida (1..N) en el orden en que se muestran, para contar de un
  // vistazo cuántos asesores hay en la cartera elegida (el último número = total).
  const numero = new Map<string, number>();
  let nAsesor = 0;
  for (const gr of grupos) for (const it of gr.items) numero.set(it.gestor, ++nAsesor);

  const barras = (campo: "gestiones" | "efectivas" | "promesas") =>
    card.serie.map((d) => ({ etiqueta: diaCorto(d.fecha), valor: d[campo] }));

  const btn = (activo: boolean) =>
    `flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
      activo
        ? "border-accent bg-accent-soft text-accent-claro"
        : "border-line text-ink-ter hover:border-line-dark"
    }`;

  return (
    <div className="space-y-4">
      {/* ── Fila 1: Indicadores por mes (con botones) + Fuerza laboral ── */}
      <section className="anim-subir grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Indicadores por mes */}
        <div className="rounded-xl border border-line bg-surface p-5 shadow-card lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink">Indicadores por mes</h2>
            <span className="text-[10px] text-ink-ter">El filtro aplica también a las cards y a la fuerza laboral</span>
          </div>
          {/* Botones de cartera */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button onClick={() => setCartera(GLOBAL)} className={btn(esGlobal)}>
              Todas
            </button>
            {payload.carteras.map((c) => (
              <button key={c} onClick={() => setCartera(c)} className={btn(cartera === c)}>
                <LogoCartera cartera={c} alto={16} />
                <span className="max-w-[120px] truncate">{c}</span>
              </button>
            ))}
          </div>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-[15px]">
              <thead>
                <tr className="border-b border-line bg-canvas text-[11px] uppercase tracking-wide text-ink-ter">
                  <th className="px-3.5 py-2.5 text-left font-semibold">Indicador</th>
                  {payload.cols.map((c) => (
                    <th
                      key={c.periodo}
                      className={`px-3.5 py-2.5 text-right font-semibold capitalize ${c.actual ? "text-accent-claro" : ""}`}
                    >
                      {c.mes}
                      {c.actual && <span className="ml-1 text-[10px] normal-case">(actual)</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INDICADORES.map((ind) => {
                  const celdas = payload.cols.map((c) => {
                    const sc = scopeIndicador(c);
                    return sc ? sc.v[ind.clave] : null;
                  });
                  const conValor = celdas.filter((x): x is number => x !== null);
                  const maxFila = conValor.length ? Math.max(...conValor) : -Infinity;
                  return (
                    <tr key={ind.clave} className="border-b border-line/50 last:border-0">
                      <td className="px-3.5 py-2.5 text-ink-sec">{ind.label}</td>
                      {payload.cols.map((c, i) => {
                        const sc = scopeIndicador(c);
                        const val = celdas[i];
                        if (val === null || sc === null) {
                          return (
                            <td key={c.periodo} className={`px-3.5 py-2.5 text-right text-ink-ter ${c.actual ? "bg-accent-soft/40" : ""}`}>
                              —
                            </td>
                          );
                        }
                        const esMax = payload.cols.length > 1 && val >= maxFila - 1e-9;
                        const metaPct = ind.metaKey ? sc.meta[ind.metaKey] : null;
                        return (
                          <td key={c.periodo} className={`px-3.5 py-2.5 text-right ${c.actual ? "bg-accent-soft/40" : ""}`}>
                            <div className="flex flex-col items-end leading-tight">
                              <span className={`tnum inline-flex items-center justify-end gap-1 ${esMax ? "font-extrabold text-pos" : "font-medium text-ink"}`}>
                                {esMax && <Crown className="h-3.5 w-3.5" />}
                                {fmt(val, ind.formato)}
                              </span>
                              {metaPct !== null && metaPct !== undefined && (
                                <span className={`tnum text-[11px] font-semibold ${TEXTO_TONO[tonoCumpl(metaPct)]}`}>
                                  {Math.round(metaPct)}% meta
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-ink-ter">
            Totales acumulados al corte de cada mes · 👑 = mes con más · <span className="font-semibold">% meta</span> = avance vs el ritmo esperado a la fecha (solo meses con metas).
          </p>
        </div>

        {/* Fuerza laboral vs meta */}
        <div className="flex flex-col rounded-xl border border-line bg-surface p-5 shadow-card">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="flex items-baseline gap-2">
              <h2 className="text-sm font-bold text-ink">Fuerza laboral vs meta</h2>
              {fuerza.length > 0 && (
                <span className="tnum text-[11px] font-semibold text-ink-ter">{fuerza.length} asesores</span>
              )}
            </span>
            {promEquipo !== null && (
              <span className="text-[11px] text-ink-ter">
                <Tip texto={DEF_FUERZA}>
                  <span className={`tnum font-bold ${TEXTO_TONO[tonoCumpl(promEquipo)]}`}>{Math.round(promEquipo)}%</span> prom.
                </Tip>
              </span>
            )}
          </div>
          {fuerza.length > 0 ? (
            <div className="-mr-2 max-h-[460px] space-y-3 overflow-y-auto pr-2">
              {grupos.map((grupo) =>
                grupo.items.length > 0 ? (
                  <div key={grupo.k}>
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide">
                      <span className={`h-2 w-2 rounded-full ${grupo.dot}`} />
                      <span className={grupo.clase}>{grupo.label}</span>
                      <span className="text-ink-ter">· {grupo.items.length}</span>
                    </div>
                    <ul className="space-y-1">
                      {grupo.items.map((g) => (
                        <li key={g.gestor} className="flex flex-col gap-0.5 rounded px-1.5 py-1 text-[12px] hover:bg-canvas/50">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="tnum w-4 shrink-0 text-right text-[10px] text-ink-ter">{numero.get(g.gestor)}</span>
                              <span className="truncate font-medium text-ink">{capNombre(g.gestor)}</span>
                            </span>
                            <span className={`tnum shrink-0 font-bold ${TEXTO_TONO[tonoCumpl(g.cumplimiento ?? 0)]}`}>
                              {Math.round(g.cumplimiento ?? 0)}%
                            </span>
                          </div>
                          <div className="tnum flex gap-3 pl-[22px] text-[9px]">
                            <MicroPct label="Gest" p={g.pct_g} />
                            <MicroPct label="Efec" p={g.pct_e} />
                            <MicroPct label="Prom" p={g.pct_p} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}
            </div>
          ) : (
            <p className="text-xs text-ink-ter">
              {esGlobal
                ? "Este mes no tiene metas cargadas; la evaluación usa la mediana del equipo."
                : "Esta cartera no tiene asesores con meta este mes."}
            </p>
          )}
        </div>
      </section>

      {/* ── Fila 2: las 3 cards de la cartera (o global) ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* GESTIONES */}
        <article className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-accent/25 bg-surface p-5 shadow-card">
          <span className="absolute inset-x-0 top-0 h-0.5 bg-accent-claro opacity-70" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-ter">Gestiones</p>
              <p className="mt-1 text-xs text-ink-sec">
                <span className="tnum font-semibold text-ink">{fmtNum(Math.round(card.gestionesDia))}</span> por día
              </p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent-claro">
              <PhoneCall className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="tnum text-4xl font-extrabold leading-none text-accent-claro">
              <Contador key={`g-${cartera}`} valor={card.gestiones} />
            </div>
          </div>
          <BarraMeta meta={card.metaGestiones} />
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[10px] text-ink-ter">
              <span>Detalle por día</span>
              <span>{card.serie.length} días</span>
            </div>
            <div className="-mx-1 h-12">
              <MiniBarras data={barras("gestiones")} alto={48} />
            </div>
          </div>
        </article>

        {/* CONTACTOS EFECTIVOS */}
        <article className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-pos/25 bg-surface p-5 shadow-card">
          <span className="absolute inset-x-0 top-0 h-0.5 bg-pos opacity-70" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-ter">Contactos efectivos</p>
              <p className="mt-1 text-xs text-ink-sec">
                <span className="tnum font-semibold text-pos">{fmtPct(card.tasaContacto, 1)}</span> de contactabilidad
              </p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pos-soft text-pos">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="tnum text-4xl font-extrabold leading-none text-pos">
              <Contador key={`e-${cartera}`} valor={card.efectivas} />
            </div>
          </div>
          <BarraMeta meta={card.metaEfectivas} />
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[10px] text-ink-ter">
              <span>Detalle por día</span>
              <span>{card.serie.length} días</span>
            </div>
            <div className="-mx-1 h-12">
              <MiniBarras data={barras("efectivas")} color="#4fd1c5" alto={48} />
            </div>
          </div>
        </article>

        {/* PROMESAS */}
        <article className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#7c5cff]/25 bg-surface p-5 shadow-card">
          <span className="absolute inset-x-0 top-0 h-0.5 bg-[#a78bfa] opacity-70" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-ter">Promesas</p>
              <p className="mt-1 text-xs text-ink-sec">
                <span className="tnum font-semibold text-[#b79cff]">{fmtPct(card.ptpRate, 1)}</span> de los contactos{" "}
                <Tip texto={DEF_PTP}>
                  <span className="text-ink-ter underline decoration-dotted underline-offset-2">(PTP)</span>
                </Tip>
              </p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1d1640] text-[#b79cff]">
              <Target className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="tnum text-4xl font-extrabold leading-none text-[#b79cff]">
              <Contador key={`p-${cartera}`} valor={card.promesas} />
            </div>
          </div>
          <BarraMeta meta={card.metaPromesas} />
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[10px] text-ink-ter">
              <span>Detalle por día</span>
              <span>{card.serie.length} días</span>
            </div>
            <div className="-mx-1 h-12">
              <MiniBarras data={barras("promesas")} color="#a78bfa" alto={48} />
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
