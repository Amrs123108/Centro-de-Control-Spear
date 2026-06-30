"use client";

/* ── Evolución del mes — líneas diarias de TODOS los meses ───────────────────
   Una línea por mes, superpuestas por día de mes (1…31). Los meses cerrados se
   dibujan completos; el actual avanza día a día. Botones para elegir indicador
   y no sobrecargar. */

import { useState } from "react";
import { serieMultiMes, type IndicadorDia } from "@/lib/comparar";
import { GraficoLineasMulti } from "@/components/graficos";
import type { TendenciaDia } from "@/types/mtd";

const BOTONES: { k: IndicadorDia; label: string }[] = [
  { k: "gestiones", label: "Gestiones" },
  { k: "efectivas", label: "Efectivas" },
  { k: "promesas", label: "Promesas" },
  { k: "recaudo", label: "Recaudo" },
];

export type MesEvolucion = {
  clave: string;
  label: string;
  serie: TendenciaDia[];
  actual: boolean;
};

export function EvolucionMes({ meses }: { meses: MesEvolucion[] }) {
  const [ind, setInd] = useState<IndicadorDia>("gestiones");
  // Meses visibles: por defecto todos. Se pueden encender/apagar para ver o
  // comparar solo los que interesan (siempre al menos uno activo).
  const [activos, setActivos] = useState<Set<string>>(() => new Set(meses.map((m) => m.clave)));

  const alternar = (clave: string) => {
    setActivos((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) {
        if (next.size > 1) next.delete(clave); // nunca dejar el gráfico vacío
      } else {
        next.add(clave);
      }
      return next;
    });
  };

  const visibles = meses.filter((m) => activos.has(m.clave));
  const data = serieMultiMes(
    visibles.map((m) => ({ clave: m.clave, serie: m.serie })),
    ind
  );
  const series = visibles.map((m) => ({ clave: m.clave, label: m.label, actual: m.actual }));

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {BOTONES.map((b) => (
          <button
            key={b.k}
            onClick={() => setInd(b.k)}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
              ind === b.k
                ? "border-accent bg-accent-soft text-accent-claro"
                : "border-line text-ink-ter hover:border-line-dark"
            }`}
          >
            {b.label}
          </button>
        ))}
        {/* Selector de meses a mostrar / comparar */}
        <span className="mx-1 h-4 w-px bg-line" />
        <span className="text-[10px] uppercase tracking-wide text-ink-ter">Meses:</span>
        {meses.map((m) => {
          const on = activos.has(m.clave);
          return (
            <button
              key={m.clave}
              onClick={() => alternar(m.clave)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium capitalize transition ${
                on
                  ? m.actual
                    ? "border-accent bg-accent-soft text-accent-claro"
                    : "border-line-dark bg-canvas text-ink"
                  : "border-line text-ink-ter opacity-50 hover:opacity-100"
              }`}
              title={on ? "Ocultar este mes" : "Mostrar este mes"}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      <div className="min-h-[380px] flex-1">
        <GraficoLineasMulti
          data={data}
          series={series}
          formato={ind === "recaudo" ? "moneda" : "num"}
        />
      </div>
    </div>
  );
}
