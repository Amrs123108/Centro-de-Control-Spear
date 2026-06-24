"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { fmtMoneda, fmtNum, fmtPct } from "@/lib/formato";
import { Sparkline } from "@/components/graficos";
import { Barra, CeldaCalor, ChipNivel, ScoreBar, Tip } from "@/components/ui";
import type { Benchmarks, Cartera } from "@/types/mtd";

type Col =
  | "cartera"
  | "num_asesores"
  | "gestiones"
  | "tasa_contacto"
  | "ptp_rate"
  | "conversion"
  | "promesas"
  | "monto"
  | "score";

const DEF_CONTACTO = "Tasa de contacto: de cada 100 gestiones, en cuántas se logró hablar con el titular.";
const DEF_PTP = "PTP (Promise To Pay / Promesa de pago): de cada cliente con quien SÍ se habló, cuántos se comprometieron a pagar.";
const DEF_CONV = "Conversión: de cada 100 gestiones realizadas, cuántas terminaron en una promesa de pago.";

export function MatrizCarteras({
  carteras,
  bm,
}: {
  carteras: Cartera[];
  bm: Benchmarks;
}) {
  const [col, setCol] = useState<Col>("score");
  const [asc, setAsc] = useState(false);

  const orden = [...carteras].sort((a, b) => {
    const va = a[col] as number | string;
    const vb = b[col] as number | string;
    if (typeof va === "string" && typeof vb === "string") {
      return asc ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return asc ? (va as number) - (vb as number) : (vb as number) - (va as number);
  });

  const maxGest = Math.max(...carteras.map((c) => c.gestiones));

  function toggle(c: Col) {
    if (col === c) setAsc(!asc);
    else {
      setCol(c);
      setAsc(c === "cartera");
    }
  }

  const Th = ({
    c,
    label,
    align = "right",
    tip,
  }: {
    c: Col;
    label: string;
    align?: "left" | "right" | "center";
    tip?: string;
  }) => {
    const activo = col === c;
    const just = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
    const textAlign = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
    return (
      <th
        onClick={() => toggle(c)}
        className={`cursor-pointer select-none whitespace-nowrap pb-2 ${textAlign} font-semibold transition hover:text-ink-sec ${activo ? "text-accent-claro" : ""}`}
      >
        <span className={`inline-flex items-center gap-0.5 ${just}`}>
          {tip ? <Tip texto={tip}>{label}</Tip> : label}
          {activo ? (
            asc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3 opacity-25" />
          )}
        </span>
      </th>
    );
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-ink-ter">
              <Th c="cartera" label="Cartera" align="left" />
              <Th c="num_asesores" label="Asesores" align="center" />
              <Th c="gestiones" label="Volumen" align="left" />
              <Th c="tasa_contacto" label="Contacto" align="center" tip={DEF_CONTACTO} />
              <Th c="ptp_rate" label="PTP" align="center" tip={DEF_PTP} />
              <Th c="conversion" label="Conversión" align="center" tip={DEF_CONV} />
              <Th c="promesas" label="Promesas" align="right" />
              <Th c="monto" label="Monto promesado" align="right" />
              <th className="pb-2 text-center font-semibold">14 días</th>
              <Th c="score" label="Score" align="left" />
            </tr>
          </thead>
          <tbody>
            {orden.map((c) => (
              <tr key={c.cartera} className="border-b border-line/50 last:border-0 hover:bg-canvas/50">
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink">{c.cartera}</span>
                    <ChipNivel nivel={c.nivel} />
                  </div>
                </td>
                <td className="tnum py-2.5 text-center text-ink-sec">{c.num_asesores}</td>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20"><Barra pct={(c.gestiones / maxGest) * 100} /></div>
                    <span className="tnum text-xs text-ink-sec">{fmtNum(c.gestiones)}</span>
                  </div>
                </td>
                <td className="py-2.5 text-center"><CeldaCalor valor={c.tasa_contacto} referencia={bm.tasa_contacto} /></td>
                <td className="py-2.5 text-center"><CeldaCalor valor={c.ptp_rate} referencia={bm.ptp_rate} /></td>
                <td className="py-2.5 text-center"><CeldaCalor valor={c.conversion} referencia={bm.conversion} /></td>
                <td className="tnum py-2.5 text-right font-semibold text-accent-claro">{fmtNum(c.promesas)}</td>
                <td className="tnum py-2.5 text-right text-ink">{c.monto > 0 ? fmtMoneda(c.monto) : "—"}</td>
                <td className="py-2.5"><div className="mx-auto w-20"><Sparkline data={c.tendencia.slice(-14)} /></div></td>
                <td className="py-2.5"><div className="w-24"><ScoreBar score={c.score} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-ter">
        <span className="font-semibold text-ink-sec">Cómo leerlo:</span> las celdas en{" "}
        <span className="text-pos">verde</span> están sobre el promedio del equipo y en{" "}
        <span className="text-neg">rojo</span> debajo. Pasa el cursor sobre <Tip texto={DEF_PTP}>PTP</Tip> o{" "}
        <Tip texto={DEF_CONV}>Conversión</Tip> para ver su definición. Clic en cualquier columna para reordenar.
      </p>
    </div>
  );
}
