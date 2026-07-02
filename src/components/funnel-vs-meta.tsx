"use client";

import { fmtNum } from "@/lib/formato";
import type { EtapaFunnel } from "@/types/mtd";

const FUNNEL_COLORS = [
  "#2471a3", // azul
  "#148f77", // teal
  "#d68910", // dorado
  "#1e8449", // verde
  "#c0392b", // rojo
];

function tonoPct(pct: number | null | undefined): string {
  if (pct == null) return "text-ink-ter";
  if (pct >= 100) return "text-pos";
  if (pct >= 90) return "text-warn";
  return "text-neg";
}

export function FunnelVsMeta({
  funnel,
  titulo = "Embudo de cobranza",
}: {
  funnel: EtapaFunnel[];
  titulo?: string;
}) {
  if (!funnel || funnel.length === 0) return null;

  const n = funnel.length;
  // Cada nivel se estrecha un paso en cada lado; total ≈ 20% por lado
  const step = 20 / n;
  const bandH = 48; // px por franja

  return (
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-ter">
        {titulo}
      </div>
      <div className="flex items-start gap-3">
        {/* ── Embudo ── */}
        <div className="flex-1" style={{ lineHeight: 0 }}>
          {funnel.map((etapa, i) => {
            const tL = i * step;
            const tR = 100 - i * step;
            const bL = (i + 1) * step;
            const bR = 100 - (i + 1) * step;
            const cp = `polygon(${tL}% 0, ${tR}% 0, ${bR}% 100%, ${bL}% 100%)`;
            return (
              <div
                key={etapa.etapa}
                style={{
                  height: `${bandH}px`,
                  clipPath: cp,
                  backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "700",
                    fontVariantNumeric: "tabular-nums",
                    textShadow: "0 1px 3px rgba(0,0,0,0.45)",
                  }}
                >
                  {fmtNum(etapa.valor)}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Columna derecha: etapa / meta / % ── */}
        <div className="flex shrink-0 flex-col">
          {funnel.map((etapa, i) => (
            <div
              key={etapa.etapa}
              style={{ height: `${bandH}px` }}
              className="flex flex-col justify-center gap-0.5"
            >
              <span className="text-[10px] leading-tight text-ink-ter">
                {etapa.etapa}
              </span>
              {etapa.meta != null && (
                <span className="tnum text-[10px] leading-tight text-ink-sec">
                  meta {fmtNum(etapa.meta)}
                </span>
              )}
              <span
                className={`tnum text-[13px] font-bold leading-tight ${tonoPct(etapa.pct_meta)}`}
              >
                {etapa.pct_meta != null
                  ? `${Math.round(etapa.pct_meta)}%`
                  : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
