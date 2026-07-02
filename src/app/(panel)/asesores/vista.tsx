"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import supervisoresData from "@/data/supervisores.json";
import { fmtMoneda, fmtNum, fmtPct } from "@/lib/formato";
import { Barra, ChipNivel, Delta, ScoreBar, Tip } from "@/components/ui";
import { LogoCartera } from "@/components/logo-cartera";
import { CumplBadge } from "@/components/vs-meta";
import { FunnelVsMeta } from "@/components/funnel-vs-meta";
import { AusenciaBadge, ListaAusencias } from "@/components/ausencias";
import {
  ALERTA_META,
  NIVEL_META,
  type Alerta,
  type Gestor,
  type MTDData,
  type Nivel,
} from "@/types/mtd";

const SUPERVISORES = supervisoresData.supervisores as Record<string, string>;
const liderDe = (cartera: string) => SUPERVISORES[cartera]?.trim() ?? "";

type Orden = "score" | "gestiones" | "tasa_contacto" | "ptp_rate" | "promesas" | "gestiones_dia" | "dias_activos" | "cumplimiento";

const DEF_PTP = "PTP (Promise To Pay / Promesa de pago): de cada cliente con quien SÍ se habló, cuántos se comprometieron a pagar.";
const DEF_CONTACTO = "Tasa de contacto: de cada 100 gestiones, en cuántas se logró hablar con el titular.";

const NIVELES: { k: Nivel; label: string }[] = [
  { k: "elite", label: "Élite" },
  { k: "solido", label: "Sólido" },
  { k: "promedio", label: "Promedio" },
  { k: "bajo", label: "Bajo" },
];

const titulo = (n: string) =>
  n.split(" ").map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(" ");

export default function AsesoresVista({ mtd }: { mtd: MTDData }) {
  const r = mtd.resumen;
  const bm = mtd.benchmarks;
  const carteras = useMemo(
    () => ["TODAS", ...Array.from(new Set(mtd.gestores.map((g) => g.cartera_principal))).sort()],
    [mtd]
  );
  // Supervisores que realmente tienen asesores en la data
  const supervisores = useMemo(
    () => [
      "TODOS",
      ...Array.from(new Set(mtd.gestores.map((g) => liderDe(g.cartera_principal)).filter(Boolean))).sort(),
    ],
    [mtd]
  );

  const [cartera, setCartera] = useState("TODAS");
  const [supervisor, setSupervisor] = useState("TODOS");
  const [nivel, setNivel] = useState<Nivel | "TODOS">("TODOS");
  const [soloAlerta, setSoloAlerta] = useState(false);
  const [busca, setBusca] = useState("");
  const [orden, setOrden] = useState<Orden>("score");
  const [asc, setAsc] = useState(false);
  const [sel, setSel] = useState<string>(mtd.gestores[0].gestor);

  // Base filtrada por cartera + supervisor — alimenta las tarjetas de segmentación
  const baseCartera = useMemo(
    () =>
      mtd.gestores.filter((g) => {
        if (cartera !== "TODAS" && g.cartera_principal !== cartera) return false;
        if (supervisor !== "TODOS" && liderDe(g.cartera_principal) !== supervisor) return false;
        return true;
      }),
    [mtd, cartera, supervisor]
  );

  const seg = useMemo(
    () => ({
      total: baseCartera.length,
      elite: baseCartera.filter((g) => g.nivel === "elite").length,
      solido: baseCartera.filter((g) => g.nivel === "solido").length,
      promedio: baseCartera.filter((g) => g.nivel === "promedio").length,
      bajo: baseCartera.filter((g) => g.nivel === "bajo").length,
      alerta: baseCartera.filter((g) => g.alertas.length > 0).length,
    }),
    [baseCartera]
  );

  const lista = useMemo(() => {
    let arr = baseCartera.filter((g) => {
      if (nivel !== "TODOS" && g.nivel !== nivel) return false;
      if (soloAlerta && g.alertas.length === 0) return false;
      if (busca && !g.gestor.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
    arr = [...arr].sort((a, b) => {
      // cumplimiento puede ser null (asesor sin meta) → al fondo.
      const va = (a[orden] as number | null) ?? -1;
      const vb = (b[orden] as number | null) ?? -1;
      return asc ? va - vb : vb - va;
    });
    return arr;
  }, [baseCartera, nivel, soloAlerta, busca, orden, asc]);

  // La ficha siempre muestra alguien dentro de la lista filtrada
  const ficha = lista.find((g) => g.gestor === sel) ?? lista[0] ?? mtd.gestores[0];

  function toggle(col: Orden) {
    if (orden === col) setAsc(!asc);
    else {
      setOrden(col);
      setAsc(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="anim-subir flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink">Asesores</h1>
          <p className="mt-0.5 text-sm text-ink-sec">
            Scoreboard del equipo · {fmtNum(r.total_gestores)} asesores ·{" "}
            <span className="text-neg">{r.gestores_con_alerta} con alerta</span> · {mtd.mes_nombre} MTD
          </p>
        </div>
        <div className="rounded-lg border border-line bg-surface px-3 py-2 text-[11px] text-ink-ter">
          Mediana equipo:{" "}
          <span className="tnum font-semibold text-ink-sec">{fmtPct(bm.tasa_contacto, 0)}</span>{" "}
          <Tip texto={DEF_CONTACTO}>contacto</Tip> ·{" "}
          <span className="tnum font-semibold text-ink-sec">{fmtPct(bm.ptp_rate, 0)}</span>{" "}
          <Tip texto={DEF_PTP}>PTP</Tip> ·{" "}
          <span className="tnum font-semibold text-ink-sec">{fmtNum(bm.gestiones_dia)}</span> gest/día
        </div>
      </header>

      {/* Segmentación — cambia con la cartera y filtra al hacer clic */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <CardSeg
          label="Todos"
          n={seg.total}
          activo={nivel === "TODOS"}
          onClick={() => setNivel("TODOS")}
          tono="ink"
          sub={cartera === "TODAS" ? "todo el equipo" : cartera}
        />
        {NIVELES.map((nv) => (
          <CardSeg
            key={nv.k}
            label={nv.label}
            n={seg[nv.k]}
            activo={nivel === nv.k}
            onClick={() => setNivel(nivel === nv.k ? "TODOS" : nv.k)}
            tono={nv.k}
            sub={seg.total > 0 ? fmtPct(seg[nv.k] / seg.total, 0) + " del filtro" : "—"}
          />
        ))}
      </div>

      {/* Filtros secundarios */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-ink-ter" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar asesor…"
            className="w-36 bg-transparent text-xs text-ink outline-none placeholder:text-ink-ter"
          />
          {busca && <X className="h-3.5 w-3.5 cursor-pointer text-ink-ter" onClick={() => setBusca("")} />}
        </div>
        <select
          value={cartera}
          onChange={(e) => setCartera(e.target.value)}
          className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink outline-none"
          style={{ backgroundColor: "#0e1c31", color: "#eaf4f8" }}
        >
          {carteras.map((c) => (
            <option key={c} value={c} style={{ backgroundColor: "#0e1c31", color: "#eaf4f8" }}>{c}</option>
          ))}
        </select>
        <select
          value={supervisor}
          onChange={(e) => setSupervisor(e.target.value)}
          className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink outline-none"
          style={{ backgroundColor: "#0e1c31", color: "#eaf4f8" }}
          title="Filtrar por supervisor (líder)"
        >
          {supervisores.map((s) => (
            <option key={s} value={s} style={{ backgroundColor: "#0e1c31", color: "#eaf4f8" }}>
              {s === "TODOS" ? "Todos los supervisores" : s}
            </option>
          ))}
        </select>
        <button
          onClick={() => setSoloAlerta(!soloAlerta)}
          className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
            soloAlerta ? "border-neg bg-neg-soft text-neg" : "border-line text-ink-ter hover:border-line-dark"
          }`}
        >
          Solo con alerta ({seg.alerta})
        </button>
        <span className="ml-auto text-[11px] text-ink-ter">{lista.length} asesores</span>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        {/* Tabla scoreboard */}
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line">
              <tr className="text-left text-[10px] uppercase tracking-wider text-ink-ter">
                <th className="px-3 py-3 text-center font-semibold">#</th>
                <th className="px-3 py-3 font-semibold">Asesor</th>
                <Th col="gestiones" label="Gest." orden={orden} asc={asc} onClick={toggle} />
                <Th col="gestiones_dia" label="/día" orden={orden} asc={asc} onClick={toggle} />
                <Th col="tasa_contacto" label="Contacto" orden={orden} asc={asc} onClick={toggle} tip={DEF_CONTACTO} />
                <Th col="ptp_rate" label="PTP" orden={orden} asc={asc} onClick={toggle} tip={DEF_PTP} />
                <Th col="promesas" label="Promesas" orden={orden} asc={asc} onClick={toggle} />
                <Th col="cumplimiento" label="Cumpl." orden={orden} asc={asc} onClick={toggle} tip="Cumplimiento vs meta a la fecha: promedio de gestiones, efectivas y promesas contra el ritmo esperado hasta hoy. ≥100% al día." />
                <Th col="score" label="Score" orden={orden} asc={asc} onClick={toggle} />
              </tr>
            </thead>
            <tbody>
              {lista.map((g) => (
                <tr
                  key={g.gestor}
                  onClick={() => setSel(g.gestor)}
                  className={`cursor-pointer border-b border-line/40 transition ${
                    g.gestor === ficha.gestor ? "bg-accent-soft" : "hover:bg-canvas/50"
                  }`}
                >
                  <td className="tnum px-3 py-2.5 text-center text-xs text-ink-ter">{g.ranking}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <LogoCartera cartera={g.cartera_principal} alto={30} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${NIVEL_META[g.nivel].punto}`} />
                          <span className="truncate font-medium text-ink">{titulo(g.gestor)}</span>
                          {g.alertas.length > 0 && (
                            <span className="tnum rounded bg-neg-soft px-1 text-[9px] font-bold text-neg">{g.alertas.length}!</span>
                          )}
                        </div>
                        <div className="mt-0.5 truncate text-[10px] text-ink-ter">
                          {g.cartera_principal}
                          {liderDe(g.cartera_principal) && ` · ${liderDe(g.cartera_principal)}`} · {g.dias_activos}d
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="tnum px-3 py-2.5 text-right text-ink-sec">{fmtNum(g.gestiones)}</td>
                  <td className="tnum px-3 py-2.5 text-right text-ink-ter">{fmtNum(g.gestiones_dia)}</td>
                  <td className="tnum px-3 py-2.5 text-center text-ink-sec">{fmtPct(g.tasa_contacto, 0)}</td>
                  <td className="tnum px-3 py-2.5 text-center text-ink-sec">{fmtPct(g.ptp_rate, 0)}</td>
                  <td className="tnum px-3 py-2.5 text-right font-semibold text-accent-claro">{fmtNum(g.promesas)}</td>
                  <td className="px-3 py-2.5 text-right"><CumplBadge pct={g.cumplimiento} /></td>
                  <td className="px-3 py-2.5"><div className="w-24"><ScoreBar score={g.score} /></div></td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-ink-ter">
                    Ningún asesor coincide con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <FichaAsesor g={ficha} bm={bm} dias={r.dias_procesados} diasTrans={r.dias_transcurridos} />
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

function Th({
  col,
  label,
  orden,
  asc,
  onClick,
  tip,
}: {
  col: Orden;
  label: string;
  orden: Orden;
  asc: boolean;
  onClick: (c: Orden) => void;
  tip?: string;
}) {
  const activo = orden === col;
  return (
    <th onClick={() => onClick(col)} className="cursor-pointer select-none px-3 py-3 text-right font-semibold hover:text-ink-sec">
      <span className="inline-flex items-center justify-end gap-0.5">
        {tip ? <Tip texto={tip}>{label}</Tip> : label}
        {activo ? (asc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronDown className="h-3 w-3 opacity-25" />}
      </span>
    </th>
  );
}

function FichaAsesor({
  g,
  bm,
  dias,
  diasTrans,
}: {
  g: Gestor;
  bm: MTDData["benchmarks"];
  dias: number;
  /** Días hábiles transcurridos ponderados (para la meta a la fecha). */
  diasTrans: number;
}) {
  const m = NIVEL_META[g.nivel];
  return (
    <aside className="h-fit space-y-4 rounded-xl border border-line bg-surface p-5 shadow-card xl:sticky xl:top-20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold leading-tight text-ink">{titulo(g.gestor)}</h2>
          <div className="mt-1 flex items-center gap-2">
            <LogoCartera cartera={g.cartera_principal} alto={24} />
            <p className="text-xs text-ink-ter">{g.cartera_principal} · #{g.ranking}</p>
          </div>
          <div className="mt-2"><ChipNivel nivel={g.nivel} /></div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-ink-ter">Score</div>
          <div className={`tnum text-4xl font-extrabold ${m.clase.split(" ")[1]}`}>{Math.round(g.score)}</div>
        </div>
      </div>

      {g.alertas.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-neg/20 bg-neg-soft p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neg">Alertas de desempeño</div>
          {(g.alertas as Alerta[]).map((a) => (
            <div key={a} className="text-[11px] text-ink-sec">
              <span className="font-semibold text-neg">{ALERTA_META[a].label}:</span> {ALERTA_META[a].detalle}
            </div>
          ))}
        </div>
      )}

      {/* Ausencias del mes */}
      <div className="flex items-center justify-between rounded-lg border border-line bg-canvas px-3 py-2">
        <span className="text-[11px] text-ink-ter">Ausencias (L–V)</span>
        <div className="text-right">
          <AusenciaBadge dias={g.dias_ausente} />
          {g.dias_ausente > 0 && <ListaAusencias fechas={g.dias_ausencia_list} />}
        </div>
      </div>

      {/* Embudo del asesor vs su meta */}
      <FunnelVsMeta funnel={g.funnel} titulo="Embudo vs meta" />

      <div className="space-y-2.5">
        <ComparaKPI label="Contacto efectivo" def={DEF_CONTACTO} valor={fmtPct(g.tasa_contacto, 1)} pct={g.tasa_contacto} mediana={bm.tasa_contacto} delta={g.delta_contacto} />
        <ComparaKPI label="PTP" def={DEF_PTP} valor={fmtPct(g.ptp_rate, 1)} pct={g.ptp_rate} mediana={bm.ptp_rate} delta={g.delta_ptp} />
        <ComparaKPI label="Gestiones/día" valor={fmtNum(g.gestiones_dia)} pct={g.gestiones_dia / (bm.gestiones_dia * 2)} mediana={0.5} delta={g.delta_gestiones_dia} deltaFmt="num" />
      </div>

      {/* Ritmo de trabajo — solo cuando los archivos traen timestamp de hora */}
      {g.horas_activas_dia != null && (
        <div className="rounded-lg border border-line bg-canvas p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-ter">
            Ritmo de trabajo
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded bg-surface px-1 py-2">
              <div className="tnum text-sm font-bold text-ink">{g.horas_activas_dia}h</div>
              <div className="mt-0.5 text-[9px] uppercase leading-tight tracking-wider text-ink-ter">
                hrs activas<br />por día
              </div>
            </div>
            <div className="rounded bg-surface px-1 py-2">
              <div className="tnum text-sm font-bold text-ink">{g.tiempo_prom_min} min</div>
              <div className="mt-0.5 text-[9px] uppercase leading-tight tracking-wider text-ink-ter">
                tiempo entre<br />gestiones
              </div>
            </div>
            <div className="rounded bg-surface px-1 py-2">
              <div className="tnum text-sm font-bold text-ink">{g.gestiones_hora}</div>
              <div className="mt-0.5 text-[9px] uppercase leading-tight tracking-wider text-ink-ter">
                gestiones<br />por hora
              </div>
            </div>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-ink-ter">
            Ventana: primera a última gestión del día, descontando 30 min de almuerzo.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
        <Cifra label="Gestiones" valor={fmtNum(g.gestiones)} />
        <Cifra label="Efectivas" valor={fmtNum(g.efectivas)} />
        <Cifra label="Promesas" valor={fmtNum(g.promesas)} />
        <Cifra label="Compromisos" valor={fmtNum(g.compromisos)} />
        <Cifra label="Pagos" valor={fmtNum(g.pagos)} />
        <Cifra label="Días activos" valor={`${g.dias_activos}/${dias}`} />
      </div>

      <div className="rounded-lg bg-canvas px-3 py-2 text-center">
        <span className="text-[11px] text-ink-ter">Monto promesado</span>
        <div className="tnum text-lg font-bold text-gold">{g.recaudo > 0 ? fmtMoneda(g.recaudo) : "—"}</div>
      </div>
    </aside>
  );
}

function ComparaKPI({
  label,
  def,
  valor,
  pct,
  mediana,
  delta,
  deltaFmt = "pct",
}: {
  label: string;
  def?: string;
  valor: string;
  pct: number;
  mediana: number;
  delta: number;
  deltaFmt?: "pct" | "num";
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-sec">{def ? <Tip texto={def}>{label}</Tip> : label}</span>
        <span className="flex items-center gap-2">
          <span className="tnum font-bold text-ink">{valor}</span>
          <Delta valor={delta} formato={deltaFmt} />
        </span>
      </div>
      <div className="relative mt-1.5">
        <Barra pct={Math.min(pct * 100, 100)} tono={pct >= mediana ? "pos" : "neg"} />
        <span
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-ink-ter"
          style={{ left: `${Math.min(mediana * 100, 100)}%` }}
          title="Mediana del equipo"
        />
      </div>
    </div>
  );
}

function Cifra({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg bg-canvas py-2">
      <div className="tnum text-sm font-bold text-ink">{valor}</div>
      <div className="text-[9px] uppercase tracking-wider text-ink-ter">{label}</div>
    </div>
  );
}
