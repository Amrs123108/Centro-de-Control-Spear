/* ── Contrato de datos del Centro de Control (MTD) ──────────────────────────
   Fuente única: src/data/mtd_gestores.json, generado por etl/generar_mtd.py.
   Todo es Month-to-Date del mes en curso, PII-free. */

export type Nivel = "elite" | "solido" | "promedio" | "bajo";

export type Alerta =
  | "actividad_baja"
  | "pocos_dias"
  | "conversion_baja"
  | "contacto_bajo"
  | "pierde_tiempo";

export type EstadoMeta = "cumpliendo" | "cerca" | "lejos" | "sin_meta";

export type Gestor = {
  ranking: number;
  gestor: string;
  cartera_principal: string;
  nivel: Nivel;
  score: number;
  alertas: Alerta[];
  estado: EstadoMeta;
  gestiones: number;
  efectivas: number;
  promesas: number;
  compromisos: number;
  pagos: number;
  recaudo: number;
  dias_activos: number;
  tasa_contacto: number;
  no_contacto: number;
  ptp_rate: number;
  conversion: number;
  gestiones_dia: number;
  promesas_dia: number;
  ticket: number;
  delta_contacto: number;
  delta_ptp: number;
  delta_gestiones_dia: number;
  meta_gestiones: number | null;
  meta_efectivas: number | null;
  meta_promesas: number | null;
  meta_recaudo: number | null;
  pct_gestiones: number | null;
  pct_efectivas: number | null;
  pct_promesas: number | null;
  pct_recaudo: number | null;
};

export type Benchmarks = {
  tasa_contacto: number;
  ptp_rate: number;
  conversion: number;
  gestiones_dia: number;
  promesas_dia: number;
};

export type PuntoTendencia = { fecha: string; promesas: number };

export type Cartera = {
  cartera: string;
  gestiones: number;
  efectivas: number;
  promesas: number;
  compromisos: number;
  pagos: number;
  monto: number;
  num_asesores: number;
  tasa_contacto: number;
  ptp_rate: number;
  conversion: number;
  ticket: number;
  score: number;
  nivel: Nivel;
  mejor_asesor: string;
  asesores_alerta: number;
  tendencia: PuntoTendencia[];
};

export type Categoria = {
  categoria: string;
  etiqueta: string;
  contacto_efectivo: boolean;
  total: number;
};

export type EtapaFunnel = { etapa: string; valor: number; tasa: number };

export type Insight = {
  tipo: "alerta" | "oportunidad" | "logro" | "info";
  titulo: string;
  detalle: string;
};

export type PorHora = {
  hora: number;
  gestiones: number;
  efectivas: number;
  promesas?: number;
};

export type TendenciaDia = {
  fecha: string;
  gestiones: number;
  efectivas: number;
  promesas: number;
};

export type Resumen = {
  total_gestores: number;
  total_gestiones: number;
  total_efectivas: number;
  total_promesas: number;
  total_compromisos: number;
  total_pagos: number;
  total_recaudo: number;
  tasa_contacto: number;
  ptp_rate: number;
  conversion: number;
  ticket_promedio: number;
  gestiones_por_gestor: number;
  gestiones_por_dia: number;
  gestores_elite: number;
  gestores_solido: number;
  gestores_promedio: number;
  gestores_bajo: number;
  gestores_con_alerta: number;
  gestores_cumpliendo: number;
  gestores_cerca: number;
  gestores_lejos: number;
  gestores_sin_meta: number;
  dias_procesados: number;
  dias_habiles_mes: number;
  pct_mes_transcurrido: number;
};

export type MTDData = {
  generado: string;
  periodo: string;
  mes_nombre: string;
  dias_procesados: string[];
  pct_mes_transcurrido: number;
  resumen: Resumen;
  benchmarks: Benchmarks;
  gestores: Gestor[];
  carteras: Cartera[];
  categorias: Categoria[];
  funnel: EtapaFunnel[];
  insights: Insight[];
  por_hora: PorHora[];
  tendencia_diaria: TendenciaDia[];
  /** Alias de compatibilidad: igual a `carteras`. */
  por_cartera: Cartera[];
};

/* ── Metadatos de presentación compartidos ─────────────────────────────────── */

export const NIVEL_META: Record<
  Nivel,
  { label: string; clase: string; punto: string }
> = {
  elite: { label: "Élite", clase: "bg-pos-soft text-pos border-pos/30", punto: "bg-pos" },
  solido: { label: "Sólido", clase: "bg-accent-soft text-accent-claro border-accent/30", punto: "bg-accent-claro" },
  promedio: { label: "Promedio", clase: "bg-warn-soft text-warn border-warn/30", punto: "bg-warn" },
  bajo: { label: "Bajo", clase: "bg-neg-soft text-neg border-neg/30", punto: "bg-neg" },
};

export const ALERTA_META: Record<Alerta, { label: string; detalle: string }> = {
  actividad_baja: { label: "Baja actividad", detalle: "Gestiona muy por debajo del ritmo del equipo" },
  pocos_dias: { label: "Ausentismo", detalle: "Activo en menos de la mitad de los días del mes" },
  conversion_baja: { label: "Baja conversión", detalle: "Contacta pero no cierra promesas" },
  contacto_bajo: { label: "Baja contactabilidad", detalle: "Marca mucho pero contacta poco" },
  pierde_tiempo: { label: "Esfuerzo sin resultado", detalle: "Alto volumen, pocas promesas" },
};
