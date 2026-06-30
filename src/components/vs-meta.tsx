/* ── Piezas compartidas "resultado vs meta a la fecha" ──────────────────────
   Mismas en Asesores, Carteras y Equipos. "Meta a la fecha" = lo que debería
   llevar HASTA HOY (meta × fracción del mes transcurrida, sábados a ½ jornada).
   100% = va al día. Color único (≥100 verde, 90–99 amarillo, <90 rojo). */

import { fmtNum } from "@/lib/formato";
import { FONDO_TONO, TEXTO_TONO, tonoCumpl } from "@/lib/cumplimiento";

/** Chip de % de cumplimiento (o "—" si no hay meta). */
export function CumplBadge({
  pct,
  className = "",
}: {
  pct: number | null | undefined;
  className?: string;
}) {
  if (pct === null || pct === undefined)
    return <span className={`tnum text-ink-ter ${className}`}>—</span>;
  return (
    <span className={`tnum font-bold ${TEXTO_TONO[tonoCumpl(pct)]} ${className}`}>
      {Math.round(pct)}%
    </span>
  );
}

export type FilaMetaDato = {
  label: string;
  actual: number;
  /** Meta a la fecha (esperado hasta hoy). null = la entidad no tiene meta. */
  esperado: number | null;
  pct: number | null;
};

/** Una métrica: "actual / meta a hoy" + barra y % con color. */
export function FilaMeta({ label, actual, esperado, pct }: FilaMetaDato) {
  const sinMeta = esperado === null || pct === null || pct === undefined;
  const t = sinMeta ? null : tonoCumpl(pct as number);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-sec">{label}</span>
        <span className="tnum">
          <span className="font-bold text-ink">{fmtNum(actual)}</span>
          {!sinMeta && (
            <span className="text-ink-ter"> / {fmtNum(Math.round(esperado as number))} meta</span>
          )}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas">
          {!sinMeta && (
            <div className={`h-full ${FONDO_TONO[t as "pos" | "warn" | "neg"]}`} style={{ width: `${Math.min(pct as number, 100)}%` }} />
          )}
        </div>
        <span className={`tnum w-9 shrink-0 text-right text-[11px] font-bold ${sinMeta ? "text-ink-ter" : TEXTO_TONO[t as "pos" | "warn" | "neg"]}`}>
          {sinMeta ? "—" : `${Math.round(pct as number)}%`}
        </span>
      </div>
    </div>
  );
}

/** Bloque titulado con las 3 métricas vs meta + el cumplimiento global. */
export function BloqueMeta({
  titulo = "Cumplimiento vs meta a la fecha",
  filas,
  cumplimiento,
}: {
  titulo?: string;
  filas: FilaMetaDato[];
  cumplimiento: number | null;
}) {
  const sinMetas = filas.every((f) => f.esperado === null);
  return (
    <div className="rounded-lg border border-line bg-canvas/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-ter">{titulo}</span>
        <CumplBadge pct={cumplimiento} className="text-sm" />
      </div>
      {sinMetas ? (
        <p className="text-[11px] text-ink-ter">Sin metas cargadas para este mes.</p>
      ) : (
        <div className="space-y-2">
          {filas.map((f) => (
            <FilaMeta key={f.label} {...f} />
          ))}
        </div>
      )}
    </div>
  );
}
