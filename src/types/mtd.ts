export type Gestor = {
  ranking: number;
  gestor: string;
  cartera_principal: string;
  estado: "cumpliendo" | "cerca" | "lejos" | "sin_meta";
  gestiones: number;
  efectivas: number;
  promesas: number;
  recaudo: number;
  dias_activos: number;
  meta_gestiones: number | null;
  meta_efectivas: number | null;
  meta_promesas: number | null;
  meta_recaudo: number | null;
  pct_gestiones: number | null;
  pct_efectivas: number | null;
  pct_promesas: number | null;
  pct_recaudo: number | null;
};

export type MTDData = {
  generado: string;
  periodo: string;
  mes_nombre: string;
  dias_procesados: string[];
  pct_mes_transcurrido: number;
  resumen: {
    total_gestores: number;
    total_gestiones: number;
    total_efectivas: number;
    total_promesas: number;
    total_recaudo: number;
    gestores_cumpliendo: number;
    gestores_cerca: number;
    gestores_lejos: number;
    gestores_sin_meta: number;
    dias_procesados: number;
    dias_habiles_mes: number;
    pct_mes_transcurrido: number;
  };
  gestores: Gestor[];
};
