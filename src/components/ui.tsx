import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { fmtNum, fmtPct, fmtRatio } from "@/lib/formato";
import { Contador } from "@/components/animados";
import {
  ALERTA_META,
  NIVEL_META,
  type Alerta,
  type Nivel,
} from "@/types/mtd";

export type Tono = "ink" | "gold" | "pos" | "accent" | "neg" | "warn" | "morado" | "cian";

const TONO_KPI: Record<
  Tono,
  { valor: string; icono: string; borde: string; barra: string }
> = {
  ink: { valor: "text-ink", icono: "bg-white/5 text-ink-sec", borde: "border-line", barra: "bg-ink-ter" },
  gold: { valor: "text-gold", icono: "bg-gold-soft text-gold", borde: "border-gold/25", barra: "bg-gold" },
  pos: { valor: "text-pos", icono: "bg-pos-soft text-pos", borde: "border-pos/25", barra: "bg-pos" },
  accent: { valor: "text-accent-claro", icono: "bg-accent-soft text-accent-claro", borde: "border-accent/25", barra: "bg-accent-claro" },
  neg: { valor: "text-neg", icono: "bg-neg-soft text-neg", borde: "border-neg/25", barra: "bg-neg" },
  warn: { valor: "text-warn", icono: "bg-warn-soft text-warn", borde: "border-warn/25", barra: "bg-warn" },
  morado: { valor: "text-[#b79cff]", icono: "bg-[#1d1640] text-[#b79cff]", borde: "border-[#7c5cff]/25", barra: "bg-[#a78bfa]" },
  cian: { valor: "text-[#5fd0e6]", icono: "bg-[#0c2a33] text-[#5fd0e6]", borde: "border-[#22b8d4]/25", barra: "bg-[#22b8d4]" },
};

/* Tarjeta KPI compacta — primero el número, con identidad de color y animación */
export function KPI({
  label,
  valor,
  valorNum,
  formato = "num",
  sub,
  tono = "ink",
  icono: Icono,
  retraso = 0,
}: {
  label: string;
  /** Texto ya formateado; o usa valorNum para contador animado */
  valor?: string;
  valorNum?: number;
  formato?: "num" | "moneda" | "pct";
  sub?: string;
  tono?: Tono;
  icono?: React.ElementType;
  retraso?: number;
}) {
  const t = TONO_KPI[tono];
  return (
    <div
      className={`anim-subir relative overflow-hidden rounded-xl border bg-surface px-4 py-3 shadow-card ${t.borde}`}
      style={{ animationDelay: `${retraso}ms` }}
    >
      <span className={`absolute inset-x-0 top-0 h-0.5 ${t.barra} opacity-70`} />
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-ter">{label}</span>
        {Icono && (
          <span className={`flex h-6 w-6 items-center justify-center rounded-md ${t.icono}`}>
            <Icono className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <div className={`tnum mt-1.5 text-[26px] font-extrabold leading-none ${t.valor}`}>
        {valorNum !== undefined ? (
          <Contador valor={valorNum} formato={formato} decimales={formato === "pct" ? 1 : 0} />
        ) : (
          valor
        )}
      </div>
      {sub && <div className="mt-1 truncate text-[11px] text-ink-ter">{sub}</div>}
    </div>
  );
}

/* Etiqueta con definición (tooltip nativo + subrayado punteado) */
export function Tip({ texto, children }: { texto: string; children: React.ReactNode }) {
  return (
    <span
      title={texto}
      className="cursor-help underline decoration-dotted decoration-ink-ter/60 underline-offset-2"
    >
      {children}
    </span>
  );
}

/* Barra de progreso mini */
export function Barra({
  pct,
  tono = "accent",
  alto = "h-1.5",
}: {
  pct: number;
  tono?: "accent" | "pos" | "warn" | "neg" | "gold";
  alto?: string;
}) {
  const color = {
    accent: "bg-accent-claro",
    pos: "bg-pos",
    warn: "bg-warn",
    neg: "bg-neg",
    gold: "bg-gold",
  }[tono];
  return (
    <div className={`w-full overflow-hidden rounded-full bg-line ${alto}`}>
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
      />
    </div>
  );
}

/* Chip de nivel del asesor */
export function ChipNivel({ nivel }: { nivel: Nivel }) {
  const m = NIVEL_META[nivel];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${m.clase}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.punto}`} />
      {m.label}
    </span>
  );
}

/* Chips de alertas */
export function ChipsAlerta({ alertas }: { alertas: Alerta[] }) {
  if (!alertas.length)
    return <span className="text-[11px] text-ink-ter">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {alertas.map((a) => (
        <span
          key={a}
          title={ALERTA_META[a].detalle}
          className="rounded border border-neg/25 bg-neg-soft px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-neg"
        >
          {ALERTA_META[a].label}
        </span>
      ))}
    </div>
  );
}

/* Delta vs referencia (benchmark) */
export function Delta({
  valor,
  formato = "pct",
}: {
  valor: number;
  formato?: "pct" | "num";
}) {
  const positivo = valor > 0.0001;
  const negativo = valor < -0.0001;
  const Icono = positivo ? ArrowUp : negativo ? ArrowDown : Minus;
  const color = positivo ? "text-pos" : negativo ? "text-neg" : "text-ink-ter";
  const txt =
    formato === "pct"
      ? fmtPct(Math.abs(valor), 1)
      : fmtNum(Math.round(Math.abs(valor)));
  return (
    <span className={`tnum inline-flex items-center gap-0.5 text-[11px] font-semibold ${color}`}>
      <Icono className="h-3 w-3" />
      {txt}
    </span>
  );
}

/* Celda heatmap: color según el valor contra una referencia */
export function CeldaCalor({
  valor,
  referencia,
  formato = "pct",
}: {
  valor: number;
  referencia: number;
  formato?: "pct" | "num" | "ratio";
}) {
  const ratio = referencia > 0 ? valor / referencia : 1;
  const clase =
    ratio >= 1.1
      ? "bg-pos/20 text-pos"
      : ratio >= 0.95
        ? "bg-pos-soft text-pos"
        : ratio >= 0.75
          ? "bg-warn-soft text-warn"
          : "bg-neg-soft text-neg";
  const txt =
    formato === "pct"
      ? fmtPct(valor, 1)
      : formato === "ratio"
        ? fmtRatio(valor)
        : fmtNum(Math.round(valor));
  return (
    <span className={`tnum inline-block min-w-[52px] rounded-md px-2 py-1 text-center text-xs font-semibold ${clase}`}>
      {txt}
    </span>
  );
}

/* Medidor de score 0–100 en barra */
export function ScoreBar({ score }: { score: number }) {
  const tono = score >= 70 ? "pos" : score >= 45 ? "accent" : score >= 25 ? "warn" : "neg";
  const color = {
    pos: "text-pos",
    accent: "text-accent-claro",
    warn: "text-warn",
    neg: "text-neg",
  }[tono];
  return (
    <div className="flex items-center gap-2">
      <Barra pct={score} tono={tono} alto="h-1.5" />
      <span className={`tnum w-8 shrink-0 text-right text-xs font-bold ${color}`}>
        {Math.round(score)}
      </span>
    </div>
  );
}
