/* ── Carga de datos por período (MTD) ───────────────────────────────────────
   Fuente: src/data/mtd/<periodo>.json (uno por mes), generados por
   etl/generar_mtd.py. El manifiesto liviano (periodos-manifest.json) alimenta
   el selector de período; los datasets completos viven en el barrel mtd/index.

   IMPORTANTE: este módulo importa los datasets completos (pesados). Úsalo solo
   en server components. El selector de período (cliente) debe importar el
   manifiesto liviano directamente, NO este archivo. */

import { DATASETS } from "@/data/mtd";
import manifestData from "@/data/periodos-manifest.json";
import type { MTDData } from "@/types/mtd";

export type PeriodoInfo = {
  periodo: string;
  mes_nombre: string;
  anio: string;
  dias: number;
  primer_dia: string | null;
  ultimo_dia: string | null;
  generado: string | null;
  total_gestores: number;
  total_gestiones: number;
  total_efectivas: number;
  total_promesas: number;
  total_recaudo: number;
  tasa_contacto: number;
  ptp_rate: number;
  con_metas: boolean;
};

const manifest = manifestData as { default: string; periodos: PeriodoInfo[] };

/** Períodos disponibles, del más reciente al más antiguo. */
export const PERIODOS: PeriodoInfo[] = manifest.periodos;

/** Período por defecto (el más reciente con datos). */
export const PERIODO_DEFAULT: string = manifest.default;

/** ¿Existe ese período? */
export function periodoValido(periodo?: string | null): periodo is string {
  return !!periodo && periodo in DATASETS;
}

/** Resuelve un período pedido a uno válido (cae al default si no existe). */
export function resolverPeriodo(periodo?: string | null): string {
  return periodoValido(periodo) ? periodo : PERIODO_DEFAULT;
}

/** Carga el dataset MTD completo de un período (default si no se indica). */
export function cargarMTD(periodo?: string | null): MTDData {
  return DATASETS[resolverPeriodo(periodo)];
}

/** Metadatos livianos de un período. */
export function infoPeriodo(periodo?: string | null): PeriodoInfo | undefined {
  const key = resolverPeriodo(periodo);
  return PERIODOS.find((p) => p.periodo === key);
}

/** Período inmediatamente anterior al dado (null si es el más antiguo). */
export function periodoAnterior(periodo?: string | null): string | null {
  const key = resolverPeriodo(periodo);
  // PERIODOS está del más reciente al más antiguo → el anterior es idx + 1.
  const idx = PERIODOS.findIndex((p) => p.periodo === key);
  const prev = idx >= 0 ? PERIODOS[idx + 1] : undefined;
  return prev ? prev.periodo : null;
}
