"use client";

import { useMemo, useState } from "react";
import { Banknote, Bot, PhoneCall, Target, TrendingUp, Users } from "lucide-react";
import { fmtMoneda, fmtNum, fmtPct, fmtRatio } from "@/lib/formato";
import { GraficoTendencia } from "@/components/graficos";
import { Barra, ChipNivel, Delta, ScoreBar, Tip } from "@/components/ui";
import { LogoCartera } from "@/components/logo-cartera";
import { BloqueMeta, CumplBadge } from "@/components/vs-meta";
import { FunnelVsMeta } from "@/components/funnel-vs-meta";
import { NIVEL_META, type MTDData, type Nivel } from "@/types/mtd";

const DEF_PTP = "PTP (Promise To Pay / Promesa de pago): de cada cliente con quien SÍ se habló, cuántos se comprometieron a pagar.";
const DEF_CONTACTO = "Tasa de contacto: de cada 100 gestiones, en cuántas se logró hablar con el titular.";
const DEF_CONV = "Promesa por gestión: cuántas gestiones se necesitan en promedio para lograr 1 promesa de pago (1 ÷ conversión).";

const NIVELES: { k: Nivel; label: string }[] = [
  { k: "elite", label: "Élite" },
  { k: "solido", label: "Sólido" },
  { k: "promedio", label: "Promedio" },
  { k: "bajo", label: "Bajo" },
];

const titulo = (n: string) =>
  n.split(" ").map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(" ");

export default function CarterasVista({ mtd }: { mtd: MTDData }) {
  const todas = useMemo(() => [...mtd.carteras].sort((a, b) => b.score - a.score), [mtd]);
  const bm = mtd.benchmarks;
  // Meta a la fecha de cartera = meta MENSUAL × fracción del mes transcurrida.
  const frac = Math.max(mtd.resumen.pct_mes_transcurrido / 100, 1e-4);
  const espMes = (metaMensual: number | null | undefined) =>
    metaMensual && metaMensual > 0 ? metaMensual * frac : null;

  const [nivel, setNivel] = useState<Nivel | "TODOS">("TODOS");
  const [sel, setSel] = useState(todas[0].cartera);

  const seg = useMemo(
    () => ({
      total: todas.length,
      elite: todas.filter((c) => c.nivel === "elite").length,
      solido: todas.filter((c) => c.nivel === "solido").length,
      promedio: todas.filter((c) => c.nivel === "promedio").length,
      bajo: todas.filter((c) => c.nivel === "bajo").length,
    }),
    [todas]
  );

  const lista = nivel === "TODOS" ? todas : todas.filter((c) => c.nivel === nivel);
  const c = lista.find((x) => x.cartera === sel) ?? lista[0] ?? todas[0];

  const asesores = useMemo(
    () => mtd.gestores.filter((g) => g.cartera_principal === c.cartera).sort((a, b) => b.score - a.score),
    [mtd, c.cartera]
  );

  const tendencia = c.tendencia.map((p) => ({
    fecha: p.fecha,
    gestiones: p.gestiones ?? 0,
    efectivas: p.efectivas ?? 0,
    promesas: p.promesas,
  }));

  return (
    <div className="space-y-5">
      <header className="anim-subir">
        <h1 className="text-lg font-bold text-ink">Carteras</h1>
        <p className="mt-0.5 text-sm text-ink-sec">
          Cada cliente es una línea de ingreso · {mtd.carteras.length} carteras · {mtd.mes_nombre}{" "}
          {mtd.periodo.slice(0, 4)} MTD
        </p>
      </header>

      {/* Segmentación de carteras por nivel */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <CardSeg label="Todas" n={seg.total} sub="carteras activas" activo={nivel === "TODOS"} onClick={() => setNivel("TODOS")} tono="ink" />
        {NIVELES.map((nv) => (
          <CardSeg
            key={nv.k}
            label={nv.label}
            n={seg[nv.k]}
            sub={seg.total > 0 ? fmtPct(seg[nv.k] / seg.total, 0) : "—"}
            activo={nivel === nv.k}
            onClick={() => setNivel(nivel === nv.k ? "TODOS" : nv.k)}
            tono={nv.k}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(280px,360px)_1fr]">
        {/* Ranking */}
        <div className="space-y-2">
          {lista.map((x, i) => {
            const activa = x.cartera === c.cartera;
            return (
              <button
                key={x.cartera}
                onClick={() => setSel(x.cartera)}
                className={`anim-subir w-full rounded-xl border p-3 text-left transition ${
                  activa ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-dark"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="tnum text-[11px] font-bold text-ink-ter">{i + 1}</span>
                    <LogoCartera cartera={x.cartera} alto={24} />
                    <span className="text-sm font-semibold text-ink">{x.cartera}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CumplBadge pct={x.cumplimiento} className="text-[11px]" />
                    <ChipNivel nivel={x.nivel} />
                  </div>
                </div>
                <div className="mt-2"><ScoreBar score={x.score} /></div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-ink-ter">
                  <span>{x.num_asesores} asesores · {fmtNum(x.gestiones)} gest.</span>
                  {x.asesores_alerta > 0 && (
                    <span className="rounded bg-neg-soft px-1.5 py-0.5 font-semibold text-neg">{x.asesores_alerta} alerta{x.asesores_alerta > 1 ? "s" : ""}</span>
                  )}
                </div>
              </button>
            );
          })}
          {lista.length === 0 && <p className="rounded-xl border border-line bg-surface px-4 py-8 text-center text-sm text-ink-ter">Sin carteras en este nivel.</p>}
        </div>

        {/* Detalle */}
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <LogoCartera cartera={c.cartera} alto={40} />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-ink">{c.cartera}</h2>
                    <ChipNivel nivel={c.nivel} />
                  </div>
                  <p className="text-xs text-ink-ter">
                    {c.num_asesores} asesores · mejor: <span className="font-medium text-ink-sec">{titulo(c.mejor_asesor)}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-ink-ter">Score de cartera</div>
                <div className="tnum text-3xl font-extrabold text-accent-claro">{Math.round(c.score)}</div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <KpiCartera icono={PhoneCall} label="Contacto" def={DEF_CONTACTO} valor={fmtPct(c.tasa_contacto, 1)} delta={c.tasa_contacto - bm.tasa_contacto} tono="cian" />
              <KpiCartera icono={Target} label="PTP" def={DEF_PTP} valor={fmtPct(c.ptp_rate, 1)} delta={c.ptp_rate - bm.ptp_rate} tono="pos" />
              <KpiCartera icono={TrendingUp} label="Promesa/gest." def={DEF_CONV} valor={fmtRatio(c.conversion)} delta={c.conversion - bm.conversion} tono="morado" />
              <KpiCartera icono={Banknote} label="Monto promesado" valor={c.monto > 0 ? fmtMoneda(c.monto) : "—"} sub={`monto promedio ${fmtMoneda(c.ticket)}`} tono="gold" />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <MiniDato label="Gestiones" valor={fmtNum(c.gestiones)} />
              <MiniDato label="Promesas" valor={fmtNum(c.promesas)} />
              <MiniDato label="Pagos" valor={fmtNum(c.pagos)} />
            </div>

            <div className="mt-4 space-y-3">
              {c.funnel && c.funnel.length > 0 && (
                <FunnelVsMeta funnel={c.funnel} titulo="Embudo vs meta" />
              )}
              <BloqueMeta
                filas={[
                  { label: "Gestiones", actual: c.gestiones, esperado: espMes(c.meta_gestiones), pct: c.pct_gestiones ?? null },
                  { label: "Efectivas", actual: c.efectivas, esperado: espMes(c.meta_efectivas), pct: c.pct_efectivas ?? null },
                  { label: "Promesas", actual: c.promesas, esperado: espMes(c.meta_promesas), pct: c.pct_promesas ?? null },
                ]}
                cumplimiento={c.cumplimiento ?? null}
              />
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-ink">Trabajo por día</h3>
              <span className="text-[11px] text-ink-ter">
                Gestiones · efectivas · promesas ·{" "}
                <span className="text-neg">▼ baja</span> = día flojo
              </span>
            </div>
            <GraficoTendencia data={tendencia} resaltarBajas />
          </div>

          <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-ink-ter" />
              <h3 className="text-sm font-bold text-ink">Asesores asignados</h3>
              <span className="text-xs text-ink-ter">({asesores.length})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-ink-ter">
                    <th className="pb-2 font-semibold">Asesor</th>
                    <th className="pb-2 text-center font-semibold">Nivel</th>
                    <th className="pb-2 text-right font-semibold">Gestiones</th>
                    <th className="pb-2 text-center font-semibold"><Tip texto={DEF_CONTACTO}>Contacto</Tip></th>
                    <th className="pb-2 text-center font-semibold"><Tip texto={DEF_PTP}>PTP</Tip></th>
                    <th className="pb-2 text-right font-semibold">Promesas</th>
                    <th className="pb-2 text-right font-semibold"><Tip texto="Cumplimiento del asesor vs su meta a la fecha (gestiones, efectivas y promesas).">Cumpl.</Tip></th>
                    <th className="pb-2 font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {asesores.map((g) => (
                    <tr key={g.gestor} className="border-b border-line/50 last:border-0 hover:bg-canvas/50">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <LogoCartera cartera={g.cartera_principal} alto={22} />
                          <span className="font-medium text-ink">{titulo(g.gestor)}</span>
                        </div>
                      </td>
                      <td className="py-2 text-center"><ChipNivel nivel={g.nivel} /></td>
                      <td className="tnum py-2 text-right text-ink-sec">{fmtNum(g.gestiones)}</td>
                      <td className="tnum py-2 text-center text-ink-sec">{fmtPct(g.tasa_contacto, 0)}</td>
                      <td className="tnum py-2 text-center text-ink-sec">{fmtPct(g.ptp_rate, 0)}</td>
                      <td className="tnum py-2 text-right font-semibold text-accent-claro">{fmtNum(g.promesas)}</td>
                      <td className="py-2 text-right"><CumplBadge pct={g.cumplimiento} /></td>
                      <td className="py-2"><div className="w-24"><ScoreBar score={g.score} /></div></td>
                    </tr>
                  ))}
                  {c.predictivo && (
                    <tr className="border-t border-accent/30 bg-accent-soft/30">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-[22px] w-[22px] items-center justify-center rounded bg-accent-soft text-accent-claro">
                            <Bot className="h-3.5 w-3.5" />
                          </span>
                          <div className="leading-tight">
                            <span className="font-semibold text-ink">Sistema predictivo</span>
                            <span className="block text-[10px] text-ink-ter">Marlin · marcador automático (no es asesor)</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 text-center text-ink-ter">—</td>
                      <td className="tnum py-2 text-right text-ink-sec">{fmtNum(c.predictivo.gestiones)}</td>
                      <td className="tnum py-2 text-center text-ink-sec">{fmtPct(c.predictivo.tasa_contacto, 0)}</td>
                      <td className="tnum py-2 text-center text-ink-sec">{fmtPct(c.predictivo.ptp_rate, 0)}</td>
                      <td className="tnum py-2 text-right font-semibold text-accent-claro">{fmtNum(c.predictivo.promesas)}</td>
                      <td className="py-2 text-right text-ink-ter">—</td>
                      <td className="py-2 text-ink-ter">—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {c.predictivo && (
              <p className="mt-2 text-[10px] text-ink-ter">
                La línea del sistema predictivo ya está incluida en los totales y metas de la cartera, pero no entra al ranking ni a los promedios de asesores.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CardSeg({
  label,
  n,
  sub,
  activo,
  onClick,
  tono,
}: {
  label: string;
  n: number;
  sub: string;
  activo: boolean;
  onClick: () => void;
  tono: Nivel | "ink";
}) {
  const acento = {
    ink: { barra: "bg-ink-ter", txt: "text-ink", borde: "border-ink-ter" },
    elite: { barra: "bg-pos", txt: "text-pos", borde: "border-pos" },
    solido: { barra: "bg-accent-claro", txt: "text-accent-claro", borde: "border-accent" },
    promedio: { barra: "bg-warn", txt: "text-warn", borde: "border-warn" },
    bajo: { barra: "bg-neg", txt: "text-neg", borde: "border-neg" },
  }[tono];
  return (
    <button
      onClick={onClick}
      className={`anim-subir relative overflow-hidden rounded-xl border bg-surface px-4 py-3 text-left transition ${
        activo ? acento.borde : "border-line hover:border-line-dark"
      }`}
    >
      <span className={`absolute inset-x-0 top-0 h-0.5 ${acento.barra} ${activo ? "opacity-100" : "opacity-40"}`} />
      <div className={`tnum text-2xl font-extrabold ${acento.txt}`}>{n}</div>
      <div className="text-xs font-semibold text-ink">{label}</div>
      <div className="truncate text-[10px] text-ink-ter">{sub}</div>
    </button>
  );
}

function KpiCartera({
  icono: Icono,
  label,
  def,
  valor,
  delta,
  sub,
  tono,
}: {
  icono: React.ElementType;
  label: string;
  def?: string;
  valor: string;
  delta?: number;
  sub?: string;
  tono: "cian" | "pos" | "morado" | "gold";
}) {
  const c = {
    cian: { icono: "bg-[#0c2a33] text-[#5fd0e6]", barra: "bg-[#22b8d4]" },
    pos: { icono: "bg-pos-soft text-pos", barra: "bg-pos" },
    morado: { icono: "bg-[#1d1640] text-[#b79cff]", barra: "bg-[#a78bfa]" },
    gold: { icono: "bg-gold-soft text-gold", barra: "bg-gold" },
  }[tono];
  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-canvas px-3 py-2.5">
      <span className={`absolute inset-x-0 top-0 h-0.5 ${c.barra} opacity-70`} />
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-ter">
          {def ? <Tip texto={def}>{label}</Tip> : label}
        </span>
        <span className={`flex h-5 w-5 items-center justify-center rounded ${c.icono}`}>
          <Icono className="h-3 w-3" />
        </span>
      </div>
      <div className="tnum mt-1 text-lg font-extrabold text-ink">{valor}</div>
      {delta !== undefined ? (
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-ink-ter">
          <Delta valor={delta} />
        </div>
      ) : (
        sub && <div className="mt-0.5 text-[10px] text-ink-ter">{sub}</div>
      )}
    </div>
  );
}

function MiniDato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg bg-canvas py-2">
      <div className="tnum text-base font-bold text-ink">{valor}</div>
      <div className="text-[10px] uppercase tracking-wider text-ink-ter">{label}</div>
    </div>
  );
}
