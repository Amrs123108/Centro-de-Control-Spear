"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ArrowRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import supervisoresData from "@/data/supervisores.json";
import manifestData from "@/data/periodos-manifest.json";
import { fmtMoneda, fmtNum, fmtPct } from "@/lib/formato";
import { Delta, Tip } from "@/components/ui";
import { GraficoLineasComparativo } from "@/components/graficos";
import { LogoCartera } from "@/components/logo-cartera";
import { agregarSupervisores, totalesEquipo, type SupAgg } from "@/components/ranking-supervisores";
import {
  ESTADO_META,
  type CompAsesor,
  type Estado,
  type IndicadorDia,
  type MetricaGlobal,
  cambio,
  compararAsesores,
  compararCarteras,
  metricasGlobales,
  serieComparativa,
  totalesComparables,
  veredictoProductividad,
} from "@/lib/comparar";
import type { MTDData } from "@/types/mtd";

const SUP = supervisoresData.supervisores as Record<string, string>;
const GER = supervisoresData.gerentes as Record<string, string>;
const EQUIPOS = ["César Zambrano", "Liliana Caballero"] as const;

const PERIODOS_OPC = (manifestData as {
  periodos: { periodo: string; mes_nombre: string; anio: string }[];
}).periodos;

const titulo = (n: string) =>
  n.split(" ").map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(" ");

function periodoLabel(mtd: MTDData) {
  return `${mtd.mes_nombre} ${mtd.periodo.slice(0, 4)}`;
}

function fechaCorta(iso: string | undefined) {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-PA", { day: "numeric", month: "short" });
}

/** Indicadores diarios disponibles para el gráfico de líneas. */
const IND_BOTONES: { k: IndicadorDia; label: string }[] = [
  { k: "gestiones", label: "Gestiones" },
  { k: "efectivas", label: "Efectivas" },
  { k: "promesas", label: "Promesas" },
  { k: "recaudo", label: "Recaudo" },
];
const IND_COLOR: Record<IndicadorDia, string> = {
  gestiones: "#5b8cff",
  efectivas: "#4fd1c5",
  promesas: "#a78bfa",
  recaudo: "#cda35c",
};

function fmtMetrica(v: number, m: Pick<MetricaGlobal, "formato" | "decimales">) {
  if (m.formato === "pct") return fmtPct(v, m.decimales);
  if (m.formato === "moneda") return fmtMoneda(v);
  return fmtNum(Number(v.toFixed(m.decimales)));
}

const VEREDICTO_UI: Record<Estado, { titulo: string; clase: string; borde: string; Icono: typeof TrendingUp }> = {
  mejor: { titulo: "Vamos MEJOR", clase: "text-pos", borde: "border-pos/40 bg-pos-soft", Icono: TrendingUp },
  igual: { titulo: "Vamos IGUAL", clase: "text-ink", borde: "border-line bg-surface", Icono: Minus },
  peor: { titulo: "Vamos PEOR", clase: "text-neg", borde: "border-neg/40 bg-neg-soft", Icono: TrendingDown },
};

export default function ComparativaVista({
  A,
  B,
  aKey,
  bKey,
}: {
  A: MTDData;
  B: MTDData;
  aKey: string;
  bKey: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function navega(nuevoA: string, nuevoB: string) {
    router.push(`${pathname}?a=${nuevoA}&b=${nuevoB}`);
  }

  const veredicto = veredictoProductividad(A, B);
  const metricas = metricasGlobales(A, B);
  const carteras = compararCarteras(A, B);
  const asesores = compararAsesores(A, B);

  const ambos = asesores.filter((x) => x.presencia === "ambos");
  const subieron = [...ambos].filter((x) => x.indice > 0.02).sort((a, b) => b.indice - a.indice).slice(0, 7);
  const bajaron = [...ambos].filter((x) => x.indice < -0.02).sort((a, b) => a.indice - b.indice).slice(0, 7);
  const nuevos = asesores.filter((x) => x.presencia === "nuevo");
  const salieron = asesores.filter((x) => x.presencia === "salio");

  const equipos = compararEquipos(A, B);
  const V = VEREDICTO_UI[veredicto.estado];

  // Comparación "al mismo punto del mes": A hasta su último día, B hasta el
  // mismo día de mes (no el mes completo).
  const { ta, tb } = totalesComparables(A, B);
  const fechaA = fechaCorta(ta.ultima_fecha); // corte del mes actual
  const fechaB = fechaCorta(tb.ultima_fecha); // mismo punto en el mes anterior

  // Gráfico de líneas diarias (mes anterior vs actual, alineado por día de mes)
  const [indicador, setIndicador] = useState<IndicadorDia>("gestiones");
  const serie = serieComparativa(A, B, indicador);
  const formatoChart: "num" | "moneda" = indicador === "recaudo" ? "moneda" : "num";
  const colorChart = IND_COLOR[indicador];

  return (
    <div className="space-y-4">
      {/* Encabezado + selección de períodos */}
      <header className="anim-subir flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink">Comparativa</h1>
          <p className="mt-0.5 text-sm text-ink-sec">
            Productividad al mismo punto del mes ·{" "}
            <span className="capitalize text-ink">{periodoLabel(A)}</span> (al {fechaA}) vs{" "}
            <span className="capitalize text-ink">{periodoLabel(B)}</span> (al {fechaB})
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs">
          <SelectorMes valor={aKey} onChange={(v) => navega(v, bKey)} etiqueta="Actual" />
          <ArrowRight className="h-4 w-4 text-ink-ter" />
          <SelectorMes valor={bKey} onChange={(v) => navega(aKey, v)} etiqueta="Contra" />
        </div>
      </header>

      {/* ── BENTO GRID ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* VEREDICTO — tile grande */}
        <section className={`anim-subir flex flex-col justify-between rounded-2xl border p-5 shadow-card sm:col-span-2 lg:col-span-2 ${V.borde}`}>
          <div>
            <div className="flex items-start gap-4">
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-canvas ${V.clase}`}>
                <V.Icono className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <div className={`text-3xl font-extrabold leading-none ${V.clase}`}>{V.titulo}</div>
                <div className="mt-1.5 text-sm text-ink-sec">
                  que <span className="font-semibold capitalize text-ink">{periodoLabel(B)}</span> en productividad
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className={`tnum text-3xl font-extrabold ${V.clase}`}>
                  {veredicto.indice > 0 ? "+" : ""}
                  {fmtPct(veredicto.indice, 1)}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-ink-ter">índice</div>
              </div>
            </div>
          </div>

          {/* Qué movió la aguja */}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line/50 pt-3">
            {veredicto.motores.map((m) => (
              <span
                key={m.label}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 py-1 text-[11px]"
              >
                <span className="font-medium text-ink-sec">{m.label}</span>
                <Delta valor={m.rel} formato="pct" />
              </span>
            ))}
          </div>
        </section>

        {/* GRÁFICO COMPARATIVO — tile grande con selector de indicador */}
        <section className="anim-subir flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card sm:col-span-2 lg:col-span-2" style={{ animationDelay: "60ms" }}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-ink">Mes anterior vs actual · por día</h3>
              <p className="mt-0.5 text-xs text-ink-ter">
                <span className="capitalize">{periodoLabel(B)}</span> vs{" "}
                <span className="capitalize">{periodoLabel(A)}</span> · mismo punto del mes (al día {ta.dias} hábil)
              </p>
            </div>
          </div>
          {/* Selector de indicador para no sobrecargar el gráfico */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {IND_BOTONES.map((b) => (
              <button
                key={b.k}
                onClick={() => setIndicador(b.k)}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                  indicador === b.k
                    ? "border-accent bg-accent-soft text-accent-claro"
                    : "border-line text-ink-ter hover:border-line-dark"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className="h-[300px] flex-1">
            <GraficoLineasComparativo
              data={serie}
              labelActual={periodoLabel(A)}
              labelAnterior={periodoLabel(B)}
              formato={formatoChart}
              colorActual={colorChart}
            />
          </div>
        </section>

        {/* MÉTRICAS GLOBALES — 8 tiles del bento (título más visible) */}
        {metricas.map((m, i) => (
          <div
            key={m.clave}
            className="anim-subir relative overflow-hidden rounded-2xl border border-line bg-surface px-4 py-3 shadow-card"
            style={{ animationDelay: `${120 + i * 30}ms` }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-sec">
                {m.ayuda ? <Tip texto={m.ayuda}>{m.label}</Tip> : m.label}
              </span>
              <Delta valor={m.cambio.rel} formato="pct" />
            </div>
            <div className="tnum mt-2 text-2xl font-extrabold text-ink">{fmtMetrica(m.cambio.a, m)}</div>
            <div className="mt-0.5 text-[11px] text-ink-ter">
              {m.corto} al {fechaB}{" "}
              <span className="tnum font-semibold text-ink-sec">{fmtMetrica(m.cambio.b, m)}</span>
            </div>
          </div>
        ))}

        {/* EQUIPOS — 2 tiles */}
        {equipos.map((e) => {
          const eV = VEREDICTO_UI[e.estado];
          return (
            <div key={e.equipo} className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-ink">{e.equipo}</div>
                <span className={`inline-flex items-center gap-1 text-xs font-bold ${eV.clase}`}>
                  <eV.Icono className="h-3.5 w-3.5" />
                  {ESTADO_META[e.estado].label}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <CeldaCmp label="Promesas/día" cambio={e.promesasDia} formato="num" />
                <CeldaCmp label="Conversión" cambio={e.conversion} formato="pct" />
                <CeldaCmp label="Efectividad" cambio={e.efectividad} formato="pct" />
              </div>
            </div>
          );
        })}

        {/* CARTERAS — tile ancho */}
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:col-span-2 lg:col-span-4">
          <h2 className="mb-3 text-sm font-bold text-ink">Por cartera</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-ink-ter">
                <th className="pb-2 font-semibold">Cartera</th>
                <th className="pb-2 text-right font-semibold">Promesas/día</th>
                <th className="pb-2 text-center font-semibold"><Tip texto="Promesas ÷ gestiones">Conversión</Tip></th>
                <th className="pb-2 text-center font-semibold">Contacto</th>
                <th className="pb-2 text-right font-semibold">Productividad</th>
              </tr>
            </thead>
            <tbody>
              {carteras.map((c) => (
                <tr key={c.cartera} className="border-b border-line/40 last:border-0">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <LogoCartera cartera={c.cartera} alto={22} />
                      <span className="font-medium text-ink">{c.cartera}</span>
                      {c.presencia === "solo_a" && <Etiqueta texto="nueva" tono="pos" />}
                      {c.presencia === "solo_b" && <Etiqueta texto="sin datos" tono="neg" />}
                    </div>
                  </td>
                  <td className="py-2 text-right">
                    <ParValores
                      a={fmtNum(Math.round(c.promesasDia.a))}
                      b={fmtNum(Math.round(c.promesasDia.b))}
                      rel={c.presencia === "ambos" ? c.promesasDia.rel : undefined}
                    />
                  </td>
                  <td className="py-2 text-center">
                    <ParValores a={fmtPct(c.conversion.a, 0)} b={fmtPct(c.conversion.b, 0)} rel={c.presencia === "ambos" ? c.conversion.rel : undefined} centro />
                  </td>
                  <td className="py-2 text-center">
                    <ParValores a={fmtPct(c.contacto.a, 0)} b={fmtPct(c.contacto.b, 0)} rel={c.presencia === "ambos" ? c.contacto.rel : undefined} centro />
                  </td>
                  <td className="py-2 text-right">
                    {c.presencia === "ambos" ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-bold ${ESTADO_META[c.estado].clase}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${ESTADO_META[c.estado].punto}`} />
                        {veredictoPct(c.indice)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-ter">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

        {/* ASESORES — quién subió / bajó (2 tiles) */}
        <div className="sm:col-span-2 lg:col-span-2">
          <PanelAsesores titulo="Subieron de productividad" sub="vs su propio mes anterior" lista={subieron} tono="pos" />
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <PanelAsesores titulo="Bajaron de productividad" sub="vs su propio mes anterior" lista={bajaron} tono="neg" />
        </div>

        {/* NUEVOS / SALIERON */}
        {(nuevos.length > 0 || salieron.length > 0) && (
          <>
            <div className="sm:col-span-2 lg:col-span-2">
              <ListaSimple
                titulo={`Nuevos en ${periodoLabel(A)}`}
                sub="no aparecían el mes de comparación"
                items={nuevos.map((x) => x.gestor)}
                tono="pos"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-2">
              <ListaSimple
                titulo={`No están en ${periodoLabel(A)}`}
                sub={`gestionaron en ${periodoLabel(B)} pero ya no`}
                items={salieron.map((x) => x.gestor)}
                tono="neg"
              />
            </div>
          </>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-ink-ter">
        <span className="font-semibold text-ink-sec">Cómo se lee:</span> la comparación es al{" "}
        <b>mismo punto del mes</b> — el mes anterior se corta en el mismo día que llevamos del mes actual
        (al {fechaA} → al {fechaB}), no el mes completo. El veredicto usa <b>productividad por día</b> y{" "}
        <b>tasas</b>; el índice pondera promesas/día (35%), conversión (25%), contacto (20%),
        gestiones/día (10%) y recaudo/día (10%). El gráfico muestra cada día del mes para ver si subimos,
        bajamos o nos mantenemos.
      </p>
    </div>
  );
}

/* ── Comparación por equipo (gerencia) ───────────────────────────────────── */
type CompEquipo = {
  equipo: string;
  promesasDia: ReturnType<typeof cambio>;
  conversion: ReturnType<typeof cambio>;
  efectividad: ReturnType<typeof cambio>;
  estado: Estado;
};

function totalesPorEquipo(mtd: MTDData) {
  const sups: SupAgg[] = agregarSupervisores(mtd.carteras, SUP, GER);
  const dias = Math.max(mtd.resumen.dias_procesados, 1);
  return EQUIPOS.map((eq) => {
    const t = totalesEquipo(sups.filter((s) => s.gerente === eq));
    return { equipo: eq, promesasDia: t.promesas / dias, conversion: t.conversion, efectividad: t.efectividad };
  });
}

function compararEquipos(A: MTDData, B: MTDData): CompEquipo[] {
  const ta = totalesPorEquipo(A);
  const tb = totalesPorEquipo(B);
  return ta.map((a) => {
    const b = tb.find((x) => x.equipo === a.equipo)!;
    const promesasDia = cambio(a.promesasDia, b.promesasDia);
    const conversion = cambio(a.conversion, b.conversion);
    const efectividad = cambio(a.efectividad, b.efectividad);
    const indice = 0.45 * promesasDia.rel + 0.3 * conversion.rel + 0.25 * efectividad.rel;
    const estado: Estado = indice > 0.02 ? "mejor" : indice < -0.02 ? "peor" : "igual";
    return { equipo: a.equipo, promesasDia, conversion, efectividad, estado };
  });
}

/* ── Subcomponentes ──────────────────────────────────────────────────────── */
function veredictoPct(indice: number) {
  return `${indice > 0 ? "+" : ""}${fmtPct(indice, 0)}`;
}

function SelectorMes({
  valor,
  onChange,
  etiqueta,
}: {
  valor: string;
  onChange: (v: string) => void;
  etiqueta: string;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-ink-ter">{etiqueta}</span>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-line px-2 py-1 text-xs font-medium text-ink outline-none"
        style={{ backgroundColor: "#0e1c31", color: "#eaf4f8" }}
      >
        {PERIODOS_OPC.map((p) => (
          <option key={p.periodo} value={p.periodo} style={{ backgroundColor: "#0e1c31", color: "#eaf4f8" }}>
            {p.mes_nombre} {p.anio}
          </option>
        ))}
      </select>
    </label>
  );
}

function ParValores({
  a,
  b,
  rel,
  centro = false,
}: {
  a: string;
  b: string;
  rel?: number;
  centro?: boolean;
}) {
  return (
    <div className={`flex flex-col ${centro ? "items-center" : "items-end"}`}>
      <div className="flex items-center gap-1.5">
        <span className="tnum font-semibold text-ink">{a}</span>
        {rel !== undefined && <Delta valor={rel} formato="pct" />}
      </div>
      <span className="tnum text-[10px] text-ink-ter">antes {b}</span>
    </div>
  );
}

function CeldaCmp({
  label,
  cambio: c,
  formato,
}: {
  label: string;
  cambio: ReturnType<typeof cambio>;
  formato: "num" | "pct";
}) {
  const fmt = (v: number) => (formato === "pct" ? fmtPct(v, 0) : fmtNum(Math.round(v)));
  return (
    <div className="rounded-lg bg-canvas px-2 py-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-ink-ter">{label}</div>
      <div className="tnum mt-0.5 text-sm font-bold text-ink">{fmt(c.a)}</div>
      <div className="mt-0.5 flex items-center justify-center gap-1 text-[10px]">
        <Delta valor={c.rel} formato="pct" />
      </div>
    </div>
  );
}

function PanelAsesores({
  titulo: tit,
  sub,
  lista,
  tono,
}: {
  titulo: string;
  sub: string;
  lista: CompAsesor[];
  tono: "pos" | "neg";
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="mb-3">
        <h3 className={`text-sm font-bold ${tono === "pos" ? "text-pos" : "text-neg"}`}>{tit}</h3>
        <p className="text-xs text-ink-ter">{sub}</p>
      </div>
      {lista.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-ter">Sin movimientos relevantes.</p>
      ) : (
        <div className="space-y-1.5">
          {lista.map((x) => (
            <div key={x.gestor} className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-canvas/50">
              <LogoCartera cartera={x.cartera} alto={24} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-ink">{titulo(x.gestor)}</div>
                <div className="truncate text-[10px] text-ink-ter">{x.cartera}</div>
              </div>
              <div className="text-right">
                <div className="tnum text-xs text-ink-sec">
                  {fmtNum(Math.round(x.promesasDia.a))} <span className="text-ink-ter">prom/día</span>
                </div>
                <div className="tnum text-[10px] text-ink-ter">antes {fmtNum(Math.round(x.promesasDia.b))}</div>
              </div>
              <span className={`tnum w-14 shrink-0 text-right text-sm font-bold ${ESTADO_META[x.estado].clase}`}>
                {veredictoPct(x.indice)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ListaSimple({
  titulo: tit,
  sub,
  items,
  tono,
}: {
  titulo: string;
  sub: string;
  items: string[];
  tono: "pos" | "neg";
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <div className="mb-2">
        <h3 className="text-xs font-bold text-ink">{tit} <span className="text-ink-ter">({items.length})</span></h3>
        <p className="text-[10px] text-ink-ter">{sub}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 ? (
          <span className="text-[11px] text-ink-ter">—</span>
        ) : (
          items.map((n) => (
            <span
              key={n}
              className={`rounded-md border px-2 py-0.5 text-[11px] ${
                tono === "pos" ? "border-pos/25 bg-pos-soft text-pos" : "border-neg/25 bg-neg-soft text-neg"
              }`}
            >
              {titulo(n)}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function Etiqueta({ texto, tono }: { texto: string; tono: "pos" | "neg" }) {
  return (
    <span
      className={`rounded px-1 text-[8px] font-bold uppercase tracking-wide ${
        tono === "pos" ? "bg-pos-soft text-pos" : "bg-neg-soft text-neg"
      }`}
    >
      {texto}
    </span>
  );
}
