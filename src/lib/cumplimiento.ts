/* ── Color único de cumplimiento (vs meta a la fecha) ───────────────────────
   Regla acordada con Angel, igual en todo el panel (cards, indicadores por mes,
   fuerza laboral): 100% o más = verde (cumple el ritmo), 90–99% = amarillo (casi),
   menos de 90% = rojo (debe reforzar). */

export type Tono = "pos" | "warn" | "neg";

export function tonoCumpl(pct: number): Tono {
  if (pct >= 100) return "pos";
  if (pct >= 90) return "warn";
  return "neg";
}

export const TEXTO_TONO: Record<Tono, string> = {
  pos: "text-pos",
  warn: "text-warn",
  neg: "text-neg",
};

export const FONDO_TONO: Record<Tono, string> = {
  pos: "bg-pos",
  warn: "bg-warn",
  neg: "bg-neg",
};

/** Clase de texto directo a partir del %. */
export function claseCumpl(pct: number): string {
  return TEXTO_TONO[tonoCumpl(pct)];
}
