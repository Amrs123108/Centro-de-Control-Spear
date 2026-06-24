"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Search,
  X,
} from "lucide-react";
import mtdData from "@/data/mtd_gestores.json";
import { fmtMoneda, fmtNum, fmtPct } from "@/lib/formato";
import { Barra, ChipNivel, Delta, ScoreBar } from "@/components/ui";
import {
  ALERTA_META,
  NIVEL_META,
  type Alerta,
  type Gestor,
  type MTDData,
  type Nivel,
} from "@/types/mtd";

const mtd = mtdData as unknown as MTDData;

type Orden = "score" | "gestiones" | "tasa_contacto" | "ptp_rate" | "promesas" | "gestiones_dia" | "dias_activos";

const titulo = (n: string) =>
  n.split(" ").map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(" ");

export default function AsesoresPage() {
  const r = mtd.resumen;
  const bm = mtd.benchmarks;
  const carteras = useMemo(
    () => ["TODAS", ...Array.from(new Set(mtd.gestores.map((g) => g.cartera_principal))).sort()],
    []
  );

  const [cartera, setCartera] = useState("TODAS");
  const [nivel, setNivel] = useState<Nivel | "TODOS">("TODOS");
  const [soloAlerta, setSoloAlerta] = useState(false);
  const [busca, setBusca] = useState("");
  const [orden, setOrden] = useState<Orden>("score");
  const [asc, setAsc] = useState(false);
  const [sel, setSel] = useState<string>(mtd.gestores[0].gestor);

  const lista = useMemo(() => {
    let arr = mtd.gestores.filter((g) => {
      if (cartera !== "TODAS" && g.cartera_principal !== cartera) return false;
      if (nivel !== "TODOS" && g.nivel !== nivel) return false;
      if (soloAlerta && g.alertas.length === 0) return false;
      if (busca && !g.gestor.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
    arr = [...arr].sort((a, b) => {
      const va = a[orden] as number;
      const vb = b[orden] as number;
      return asc ? va - vb : vb - va;
    });
    return arr;
  }, [cartera, nivel, soloAlerta, busca, orden, asc]);

  const ficha = mtd.gestores.find((g) => g.gestor === sel) ?? mtd.gestores[0];

  function toggle(col: Orden) {
    if (orden === col) setAsc(!asc);
    else {
      setOrden(col);
      setAsc(false);
    }
  }

  const niveles: { k: Nivel | "TODOS"; label: string; n: number }[] = [
    { k: "TODOS", label: "Todos", n: r.total_gestores },
    { k: "elite", label: "Élite", n: r.gestores_elite },
    { k: "solido", label: "Sólido", n: r.gestores_solido },
    { k: "promedio", label: "Promedio", n: r.gestores_promedio },
    { k: "bajo", label: "Bajo", n: r.gestores_bajo },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink">Asesores</h1>
          <p className="mt-0.5 text-sm text-ink-sec">
            Scoreboard del equipo · {fmtNum(r.total_gestores)} asesores ·{" "}
            <span className="text-neg">{r.gestores_con_alerta} con alerta</span> ·{" "}
            {mtd.mes_nombre} MTD
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[11px] text-ink-ter">
          Mediana equipo: <span className="tnum font-semibold text-ink-sec">{fmtPct(bm.tasa_contacto, 0)}</span> contacto ·{" "}
          <span className="tnum font-semibold text-ink-sec">{fmtPct(bm.ptp_rate, 0)}</span> PTP ·{" "}
          <span className="tnum font-semibold text-ink-sec">{fmtNum(bm.gestiones_dia)}</span> gest/día
        </div>
      </header>

      {/* Filtros */}
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
          className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink-sec outline-none"
        >
          {carteras.map((c) => (
            <option key={c} value={c} className="bg-surface">{c}</option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          {niveles.map((nv) => (
            <button
              key={nv.k}
              onClick={() => setNivel(nv.k)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                nivel === nv.k
                  ? "border-accent bg-accent text-white"
                  : "border-line text-ink-ter hover:border-line-dark"
              }`}
            >
              {nv.label} <span className="tnum opacity-70">{nv.n}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setSoloAlerta(!soloAlerta)}
          className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
            soloAlerta ? "border-neg bg-neg-soft text-neg" : "border-line text-ink-ter hover:border-line-dark"
          }`}
        >
          Solo con alerta
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
                <Th col="tasa_contacto" label="Contacto" orden={orden} asc={asc} onClick={toggle} />
                <Th col="ptp_rate" label="PTP" orden={orden} asc={asc} onClick={toggle} />
                <Th col="promesas" label="Promesas" orden={orden} asc={asc} onClick={toggle} />
                <Th col="score" label="Score" orden={orden} asc={asc} onClick={toggle} />
              </tr>
            </thead>
            <tbody>
              {lista.map((g) => (
                <tr
                  key={g.gestor}
                  onClick={() => setSel(g.gestor)}
                  className={`cursor-pointer border-b border-line/40 transition ${
                    g.gestor === sel ? "bg-accent-soft" : "hover:bg-canvas/50"
                  }`}
                >
                  <td className="tnum px-3 py-2.5 text-center text-xs text-ink-ter">{g.ranking}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${NIVEL_META[g.nivel].punto}`} />
                      <span className="font-medium text-ink">{titulo(g.gestor)}</span>
                      {g.alertas.length > 0 && (
                        <span className="tnum rounded bg-neg-soft px-1 text-[9px] font-bold text-neg">
                          {g.alertas.length}!
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[10px] text-ink-ter">{g.cartera_principal} · {g.dias_activos}d</div>
                  </td>
                  <td className="tnum px-3 py-2.5 text-right text-ink-sec">{fmtNum(g.gestiones)}</td>
                  <td className="tnum px-3 py-2.5 text-right text-ink-ter">{fmtNum(g.gestiones_dia)}</td>
                  <td className="tnum px-3 py-2.5 text-center text-ink-sec">{fmtPct(g.tasa_contacto, 0)}</td>
                  <td className="tnum px-3 py-2.5 text-center text-ink-sec">{fmtPct(g.ptp_rate, 0)}</td>
                  <td className="tnum px-3 py-2.5 text-right font-semibold text-accent-claro">{fmtNum(g.promesas)}</td>
                  <td className="px-3 py-2.5"><div className="w-24"><ScoreBar score={g.score} /></div></td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-ink-ter">
                    Ningún asesor coincide con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Ficha del asesor */}
        <FichaAsesor g={ficha} bm={bm} dias={r.dias_procesados} />
      </div>
    </div>
  );
}

function Th({
  col,
  label,
  orden,
  asc,
  onClick,
}: {
  col: Orden;
  label: string;
  orden: Orden;
  asc: boolean;
  onClick: (c: Orden) => void;
}) {
  const activo = orden === col;
  return (
    <th
      onClick={() => onClick(col)}
      className="cursor-pointer select-none px-3 py-3 text-right font-semibold hover:text-ink-sec"
    >
      <span className="inline-flex items-center justify-end gap-0.5">
        {label}
        {activo ? (
          asc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3 opacity-25" />
        )}
      </span>
    </th>
  );
}

function FichaAsesor({
  g,
  bm,
  dias,
}: {
  g: Gestor;
  bm: MTDData["benchmarks"];
  dias: number;
}) {
  const m = NIVEL_META[g.nivel];
  return (
    <aside className="h-fit space-y-4 rounded-xl border border-line bg-surface p-5 shadow-card xl:sticky xl:top-20">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold leading-tight text-ink">{titulo(g.gestor)}</h2>
          <p className="text-xs text-ink-ter">{g.cartera_principal} · ranking #{g.ranking}</p>
          <div className="mt-2"><ChipNivel nivel={g.nivel} /></div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-ink-ter">Score</div>
          <div className={`tnum text-4xl font-extrabold ${m.clase.split(" ")[1]}`}>{Math.round(g.score)}</div>
        </div>
      </div>

      {/* Alertas */}
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

      {/* KPIs vs mediana del equipo */}
      <div className="space-y-2.5">
        <ComparaKPI label="Contacto efectivo" valor={fmtPct(g.tasa_contacto, 1)} pct={g.tasa_contacto} mediana={bm.tasa_contacto} delta={g.delta_contacto} />
        <ComparaKPI label="PTP Rate" valor={fmtPct(g.ptp_rate, 1)} pct={g.ptp_rate} mediana={bm.ptp_rate} delta={g.delta_ptp} />
        <ComparaKPI label="Gestiones/día" valor={fmtNum(g.gestiones_dia)} pct={g.gestiones_dia / (bm.gestiones_dia * 2)} mediana={0.5} delta={g.delta_gestiones_dia} deltaFmt="num" />
      </div>

      {/* Cifras crudas */}
      <div className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
        <Cifra label="Gestiones" valor={fmtNum(g.gestiones)} />
        <Cifra label="Efectivas" valor={fmtNum(g.efectivas)} />
        <Cifra label="Promesas" valor={fmtNum(g.promesas)} />
        <Cifra label="Compromisos" valor={fmtNum(g.compromisos)} />
        <Cifra label="Pagos" valor={fmtNum(g.pagos)} />
        <Cifra label="Días activos" valor={`${g.dias_activos}/${dias}`} />
      </div>

      <div className="rounded-lg bg-canvas px-3 py-2 text-center">
        <span className="text-[11px] text-ink-ter">Monto comprometido</span>
        <div className="tnum text-lg font-bold text-gold">{g.recaudo > 0 ? fmtMoneda(g.recaudo) : "—"}</div>
      </div>
    </aside>
  );
}

function ComparaKPI({
  label,
  valor,
  pct,
  mediana,
  delta,
  deltaFmt = "pct",
}: {
  label: string;
  valor: string;
  pct: number;
  mediana: number;
  delta: number;
  deltaFmt?: "pct" | "num";
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-sec">{label}</span>
        <span className="flex items-center gap-2">
          <span className="tnum font-bold text-ink">{valor}</span>
          <Delta valor={delta} formato={deltaFmt} />
        </span>
      </div>
      <div className="relative mt-1.5">
        <Barra pct={Math.min(pct * 100, 100)} tono={pct >= mediana ? "pos" : "neg"} />
        {/* marca de la mediana */}
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
