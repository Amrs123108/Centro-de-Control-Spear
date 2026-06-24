"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  Briefcase,
  PhoneCall,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import mtdData from "@/data/mtd_gestores.json";
import { fmtMoneda, fmtNum, fmtPct } from "@/lib/formato";
import { GraficoTendencia } from "@/components/graficos";
import { Barra, ChipNivel, Delta, ScoreBar } from "@/components/ui";
import type { MTDData } from "@/types/mtd";

const mtd = mtdData as unknown as MTDData;

export default function CarterasPage() {
  const carteras = useMemo(
    () => [...mtd.carteras].sort((a, b) => b.score - a.score),
    []
  );
  const [sel, setSel] = useState(carteras[0].cartera);
  const c = carteras.find((x) => x.cartera === sel) ?? carteras[0];
  const bm = mtd.benchmarks;

  const asesores = useMemo(
    () =>
      mtd.gestores
        .filter((g) => g.cartera_principal === c.cartera)
        .sort((a, b) => b.score - a.score),
    [c.cartera]
  );

  // Tendencia diaria de la cartera con gestiones+efectivas reconstruidas no está;
  // usamos la tendencia de promesas (sparkline detallado).
  const tendencia = c.tendencia.map((p) => ({
    fecha: p.fecha,
    gestiones: 0,
    efectivas: 0,
    promesas: p.promesas,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-bold text-ink">Carteras</h1>
        <p className="mt-0.5 text-sm text-ink-sec">
          Cada cliente es una línea de ingreso · {mtd.carteras.length} carteras ·{" "}
          {mtd.mes_nombre} {mtd.periodo.slice(0, 4)} MTD
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(280px,360px)_1fr]">
        {/* Ranking de carteras */}
        <div className="space-y-2">
          {carteras.map((x, i) => {
            const activa = x.cartera === sel;
            return (
              <button
                key={x.cartera}
                onClick={() => setSel(x.cartera)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  activa
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface hover:border-line-dark"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="tnum text-[11px] font-bold text-ink-ter">{i + 1}</span>
                    <span className="text-sm font-semibold text-ink">{x.cartera}</span>
                  </div>
                  <span className="tnum text-xs font-bold text-accent-claro">{Math.round(x.score)}</span>
                </div>
                <div className="mt-2"><ScoreBar score={x.score} /></div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-ink-ter">
                  <span>{x.num_asesores} asesores · {fmtNum(x.gestiones)} gest.</span>
                  {x.asesores_alerta > 0 && (
                    <span className="rounded bg-neg-soft px-1.5 py-0.5 font-semibold text-neg">
                      {x.asesores_alerta} alerta{x.asesores_alerta > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Detalle de la cartera seleccionada */}
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent-claro">
                  <Briefcase className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-extrabold text-ink">{c.cartera}</h2>
                  <p className="text-xs text-ink-ter">
                    {c.num_asesores} asesores · mejor:{" "}
                    <span className="font-medium text-ink-sec">
                      {c.mejor_asesor.split(" ").map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(" ")}
                    </span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-ink-ter">Score de cartera</div>
                <div className="tnum text-3xl font-extrabold text-accent-claro">{Math.round(c.score)}</div>
              </div>
            </div>

            {/* KPIs vs promedio del equipo */}
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <KpiCartera icono={PhoneCall} label="Contacto efectivo" valor={fmtPct(c.tasa_contacto, 1)} delta={c.tasa_contacto - bm.tasa_contacto} />
              <KpiCartera icono={Target} label="PTP Rate" valor={fmtPct(c.ptp_rate, 1)} delta={c.ptp_rate - bm.ptp_rate} />
              <KpiCartera icono={TrendingUp} label="Conversión" valor={fmtPct(c.conversion, 1)} delta={c.conversion - bm.conversion} />
              <KpiCartera icono={Banknote} label="Monto" valor={c.monto > 0 ? fmtMoneda(c.monto) : "—"} sub={`ticket ${fmtMoneda(c.ticket)}`} />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <MiniDato label="Gestiones" valor={fmtNum(c.gestiones)} />
              <MiniDato label="Promesas" valor={fmtNum(c.promesas)} />
              <MiniDato label="Pagos" valor={fmtNum(c.pagos)} />
            </div>
          </div>

          {/* Tendencia de promesas */}
          <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
            <h3 className="mb-3 text-sm font-bold text-ink">Promesas por día</h3>
            <GraficoTendencia data={tendencia} />
          </div>

          {/* Asesores de la cartera */}
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
                    <th className="pb-2 text-center font-semibold">Contacto</th>
                    <th className="pb-2 text-center font-semibold">PTP</th>
                    <th className="pb-2 text-right font-semibold">Promesas</th>
                    <th className="pb-2 font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {asesores.map((g) => (
                    <tr key={g.gestor} className="border-b border-line/50 last:border-0 hover:bg-canvas/50">
                      <td className="py-2 pr-3 font-medium text-ink">
                        {g.gestor.split(" ").map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(" ")}
                      </td>
                      <td className="py-2 text-center"><ChipNivel nivel={g.nivel} /></td>
                      <td className="tnum py-2 text-right text-ink-sec">{fmtNum(g.gestiones)}</td>
                      <td className="tnum py-2 text-center text-ink-sec">{fmtPct(g.tasa_contacto, 0)}</td>
                      <td className="tnum py-2 text-center text-ink-sec">{fmtPct(g.ptp_rate, 0)}</td>
                      <td className="tnum py-2 text-right font-semibold text-accent-claro">{fmtNum(g.promesas)}</td>
                      <td className="py-2"><div className="w-24"><ScoreBar score={g.score} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCartera({
  icono: Icono,
  label,
  valor,
  delta,
  sub,
}: {
  icono: React.ElementType;
  label: string;
  valor: string;
  delta?: number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-canvas px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-ter">
        <Icono className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="tnum mt-1 text-lg font-extrabold text-ink">{valor}</div>
      {delta !== undefined ? (
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-ink-ter">
          <Delta valor={delta} /> vs equipo
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
