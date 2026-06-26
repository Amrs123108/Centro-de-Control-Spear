"use client";

import { useMemo, useState } from "react";
import mtdData from "@/data/mtd_gestores.json";
import supervisoresData from "@/data/supervisores.json";
import { fmtNum, fmtPct } from "@/lib/formato";
import { Barra, Tip } from "@/components/ui";
import { LogoCartera } from "@/components/logo-cartera";
import {
  DEF_CONV,
  DEF_EFECT,
  RankingSupervisores,
  type SupAgg,
  TendIcono,
  agregarSupervisores,
  tonoScore,
  totalesEquipo,
} from "@/components/ranking-supervisores";
import type { MTDData } from "@/types/mtd";

const mtd = mtdData as unknown as MTDData;
const SUP = supervisoresData.supervisores as Record<string, string>;
const GER = supervisoresData.gerentes as Record<string, string>;
const CARGOS = supervisoresData._cargos as Record<string, string>;

const EQUIPOS = ["César Zambrano", "Liliana Caballero"] as const;

const titulo = (n: string) =>
  n.split(" ").map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(" ");

export default function SupervisoresPage() {
  const carteras = mtd.carteras;
  // Solo los dos equipos con gerencia (Yilda/Sin asignar queda fuera).
  const sups = useMemo(
    () =>
      agregarSupervisores(carteras, SUP, GER)
        .filter((s) => (EQUIPOS as readonly string[]).includes(s.gerente))
        .sort((a, b) => b.score - a.score || b.promesas - a.promesas),
    [carteras]
  );

  const [equipo, setEquipo] = useState<"TODOS" | (typeof EQUIPOS)[number]>("TODOS");
  const [sel, setSel] = useState(sups[0]?.supervisor ?? "");

  const lista = useMemo(
    () => (equipo === "TODOS" ? sups : sups.filter((s) => s.gerente === equipo)),
    [sups, equipo]
  );
  const tot = totalesEquipo(lista);
  const ficha = lista.find((s) => s.supervisor === sel) ?? lista[0] ?? sups[0];

  return (
    <div className="space-y-5">
      <header className="anim-subir flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink">Supervisores por equipo</h1>
          <p className="mt-0.5 text-sm text-ink-sec">
            Líderes de cobros agrupados por la gerencia a la que reportan · {mtd.mes_nombre} MTD
          </p>
        </div>
        <div className="rounded-lg border border-line bg-surface px-3 py-2 text-[11px] text-ink-ter">
          {lista.length} supervisores ·{" "}
          <span className="tnum font-semibold text-ink-sec">{fmtNum(tot.asesores)}</span> asesores ·{" "}
          score equipo <span className="tnum font-semibold text-ink-sec">{tot.score}</span>
        </div>
      </header>

      {/* Filtro de equipo (gerencia) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-ink-ter">Equipo:</span>
        {(["TODOS", ...EQUIPOS] as const).map((e) => (
          <button
            key={e}
            onClick={() => setEquipo(e)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              equipo === e ? "border-accent bg-accent-soft text-accent-claro" : "border-line text-ink-ter hover:border-line-dark"
            }`}
          >
            {e === "TODOS" ? "Todos" : e}
            {e !== "TODOS" && (
              <span className="ml-1.5 text-[10px] text-ink-ter">{CARGOS[e]?.split(" ")[0]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Comparativa visual de equipos (mismo ranking del Resumen) */}
      <RankingSupervisores carteras={carteras} supervisores={SUP} gerentes={GER} cargos={CARGOS} />

      {/* Tabla + ficha del supervisor seleccionado */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line">
              <tr className="text-left text-[10px] uppercase tracking-wider text-ink-ter">
                <th className="px-3 py-3 text-center font-semibold">#</th>
                <th className="px-3 py-3 font-semibold">Supervisor</th>
                <th className="px-3 py-3 font-semibold">Carteras</th>
                <th className="px-3 py-3 text-right font-semibold">Asesores</th>
                <th className="px-3 py-3 text-right font-semibold">Gestiones</th>
                <th className="px-3 py-3 text-right font-semibold">Efectivas</th>
                <th className="px-3 py-3 text-center font-semibold">
                  <Tip texto={DEF_EFECT}>Efect.</Tip>
                </th>
                <th className="px-3 py-3 text-center font-semibold">
                  <Tip texto={DEF_CONV}>Conv.</Tip>
                </th>
                <th className="px-3 py-3 text-right font-semibold">Promesas</th>
                <th className="px-3 py-3 font-semibold">Score</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((s, i) => (
                <tr
                  key={s.supervisor}
                  onClick={() => setSel(s.supervisor)}
                  className={`cursor-pointer border-b border-line/40 transition ${
                    s.supervisor === ficha?.supervisor ? "bg-accent-soft" : "hover:bg-canvas/50"
                  }`}
                >
                  <td className="tnum px-3 py-2.5 text-center text-xs text-ink-ter">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-ink">{s.supervisor}</div>
                    <div className="text-[10px] text-ink-ter">{s.gerente}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-1">
                      {s.carteras.map((c) => (
                        <LogoCartera key={c.cartera} cartera={c.cartera} alto={20} />
                      ))}
                    </div>
                  </td>
                  <td className="tnum px-3 py-2.5 text-right text-ink-sec">{fmtNum(s.asesores)}</td>
                  <td className="tnum px-3 py-2.5 text-right text-ink-sec">{fmtNum(s.gestiones)}</td>
                  <td className="tnum px-3 py-2.5 text-right text-ink-sec">{fmtNum(s.efectivas)}</td>
                  <td className="tnum px-3 py-2.5 text-center text-ink-sec">{fmtPct(s.efectividad, 0)}</td>
                  <td className="tnum px-3 py-2.5 text-center text-ink-sec">{fmtPct(s.conversion, 0)}</td>
                  <td className="tnum px-3 py-2.5 text-right font-semibold text-accent-claro">{fmtNum(s.promesas)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <TendIcono v={s.trend} />
                      <div className="w-20">
                        <Barra pct={s.score} tono={tonoScore(s.score)} />
                      </div>
                      <span className="tnum w-7 shrink-0 text-right text-xs font-bold text-ink">{s.score}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {ficha && <FichaSupervisor s={ficha} />}
      </div>

      <p className="text-[11px] leading-relaxed text-ink-ter">
        <span className="font-semibold text-ink-sec">Nota:</span> el equipo se toma de la columna
        “Reporta” del Headcount. Afiniti y Multibank (Yilda Girón) no figuran en ese headcount, así que
        quedan fuera de la comparativa por equipo hasta confirmar su gerencia. Mapeos editables en
        <span className="text-ink-sec"> src/data/supervisores.json</span>.
      </p>
    </div>
  );
}

/* Ficha del supervisor: totales del equipo + el mejor asesor de cada cartera. */
function FichaSupervisor({ s }: { s: SupAgg }) {
  return (
    <aside className="h-fit space-y-4 rounded-xl border border-line bg-surface p-5 shadow-card xl:sticky xl:top-20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold leading-tight text-ink">{s.supervisor}</h2>
          <p className="mt-0.5 text-xs text-ink-ter">
            {s.gerente} · {s.carteras.length} cartera{s.carteras.length > 1 ? "s" : ""} · {fmtNum(s.asesores)} asesores
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-ink-ter">Score</div>
          <div className="flex items-center gap-1">
            <TendIcono v={s.trend} />
            <span className="tnum text-3xl font-extrabold text-accent-claro">{s.score}</span>
          </div>
        </div>
      </div>

      {/* Información de lo trabajado */}
      <div className="grid grid-cols-3 gap-2 border-y border-line py-3 text-center">
        <Dato label="Gestiones" valor={fmtNum(s.gestiones)} />
        <Dato label="Efectivas" valor={fmtNum(s.efectivas)} />
        <Dato label="Promesas" valor={fmtNum(s.promesas)} />
        <Dato label="Efectividad" valor={fmtPct(s.efectividad, 1)} def={DEF_EFECT} />
        <Dato label="Conversión" valor={fmtPct(s.conversion, 1)} def={DEF_CONV} />
        <Dato label="Asesores" valor={fmtNum(s.asesores)} />
      </div>

      {/* Mejor asesor por cartera */}
      <div>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-ter">
          Mejor asesor por cartera
        </div>
        <div className="space-y-2">
          {s.carteras.map((c) => (
            <div key={c.cartera} className="rounded-lg border border-line/60 bg-canvas p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <LogoCartera cartera={c.cartera} alto={22} />
                  <span className="truncate text-xs font-semibold text-ink">{c.cartera}</span>
                </div>
                <span className="tnum shrink-0 text-[11px] text-ink-ter">{fmtNum(c.promesas)} prom.</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="truncate text-[12px] text-ink-sec">
                  <span className="text-ink-ter">★</span> {c.mejor_asesor && c.mejor_asesor !== "—" ? titulo(c.mejor_asesor) : "—"}
                </span>
                <span className="tnum shrink-0 text-[10px] text-ink-ter">
                  {fmtNum(c.gestiones)} gest · {fmtPct(c.conversion, 0)} conv
                </span>
              </div>
              <div className="mt-1.5"><Barra pct={c.score} tono={tonoScore(c.score)} /></div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function Dato({ label, valor, def }: { label: string; valor: string; def?: string }) {
  return (
    <div className="rounded-lg bg-canvas py-2">
      <div className="tnum text-sm font-bold text-ink">{valor}</div>
      <div className="text-[9px] uppercase tracking-wider text-ink-ter">
        {def ? <Tip texto={def}>{label}</Tip> : label}
      </div>
    </div>
  );
}
