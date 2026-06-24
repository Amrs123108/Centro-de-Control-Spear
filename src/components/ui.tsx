import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { fmtNum, fmtPct } from "@/lib/formato";
import {
  ALERTA_META,
  NIVEL_META,
  type Alerta,
  type Nivel,
} from "@/types/mtd";

/* Tarjeta KPI compacta — primero el número */
export function KPI({
  label,
  valor,
  sub,
  tono = "ink",
  icono: Icono,
}: {
  label: string;
  valor: string;
  sub?: string;
  tono?: "ink" | "gold" | "pos" | "accent" | "neg";
  icono?: React.ElementType;
}) {
  const colorValor = {
    ink: "text-ink",
    gold: "text-gold",
    pos: "text-pos",
    accent: "text-accent-claro",
    neg: "text-neg",
  }[tono];
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-ter">
        {Icono && <Icono className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className={`tnum mt-1 text-[26px] font-extrabold leading-none ${colorValor}`}>
        {valor}
      </div>
      {sub && <div className="mt-1 truncate text-[11px] text-ink-ter">{sub}</div>}
    </div>
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
  formato?: "pct" | "num";
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
    formato === "pct" ? fmtPct(valor, 1) : fmtNum(Math.round(valor));
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
