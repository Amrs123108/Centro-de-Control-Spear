"use client";

import { fmtNum } from "@/lib/formato";
import { tonoCumpl, TEXTO_TONO, FONDO_TONO } from "@/lib/cumplimiento";
import type { EtapaFunnel } from "@/types/mtd";

/** Muestra cuántas gestiones se pierden en cada etapa como porcentaje. */
function TasaChip({ tasa, esPrimero }: { tasa: number; esPrimero: boolean }) {
  if (esPrimero) return null;
  return (
    <div className="flex items-center justify-center py-0.5">
      <span className="text-[9px] text-ink-ter">↓ {Math.round(tasa * 100)}% pasan</span>
    </div>
  );
}

/** Barra de progreso doble: real (sólida) + meta (fantasma). */
function BarraFunnel({
  valor,
  meta,
  maximo,
  tono,
}: {
  valor: number;
  meta: number | null | undefined;
  maximo: number;
  tono: "pos" | "warn" | "neg";
}) {
  const pctReal = Math.min((valor / Math.max(maximo, 1)) * 100, 100);
  const pctMeta = meta ? Math.min((meta / Math.max(maximo, 1)) * 100, 100) : null;
  return (
    <div className="relative h-2 overflow-hidden rounded-full bg-canvas">
      {pctMeta !== null && (
        <div
          className="absolute inset-y-0 left-0 rounded-full border border-dashed border-ink-ter/40 bg-ink-ter/10"
          style={{ width: `${pctMeta}%` }}
        />
      )}
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${FONDO_TONO[tono]}`}
        style={{ width: `${pctReal}%` }}
      />
    </div>
  );
}

export function FunnelVsMeta({
  funnel,
  titulo = "Embudo de cobranza",
}: {
  funnel: EtapaFunnel[];
  titulo?: string;
}) {
  if (!funnel || funnel.length === 0) return null;
  const maximo = funnel[0].valor;

  return (
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-ter">
        {titulo}
      </div>
      <div className="space-y-1">
        {funnel.map((etapa, i) => {
          const tono = etapa.pct_meta != null
            ? tonoCumpl(etapa.pct_meta)
            : "neg";
          return (
            <div key={etapa.etapa}>
              <TasaChip tasa={etapa.tasa} esPrimero={i === 0} />
              <div className="rounded-lg border border-line/50 bg-canvas px-3 py-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-ink-sec">{etapa.etapa}</span>
                  <div className="flex items-center gap-2">
                    <span className="tnum text-sm font-bold text-ink">{fmtNum(etapa.valor)}</span>
                    {etapa.meta != null && (
                      <span className="tnum text-[10px] text-ink-ter">
                        / {fmtNum(etapa.meta)} meta
                      </span>
                    )}
                    {etapa.pct_meta != null && (
                      <span className={`tnum text-[11px] font-bold ${TEXTO_TONO[tono]}`}>
                        {Math.round(etapa.pct_meta)}%
                      </span>
                    )}
                  </div>
                </div>
                <BarraFunnel
                  valor={etapa.valor}
                  meta={etapa.meta}
                  maximo={maximo}
                  tono={etapa.meta != null ? tono : "neg"}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
