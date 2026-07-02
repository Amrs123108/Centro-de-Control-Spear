import { fmtNum } from "@/lib/formato";
import type { Gestor, MTDData } from "@/types/mtd";

/** Chip que muestra días ausentes. Rojo si > 0. */
export function AusenciaBadge({ dias }: { dias: number }) {
  if (dias === 0)
    return <span className="tnum text-[11px] text-pos font-semibold">Sin ausencias</span>;
  return (
    <span className="tnum rounded bg-neg-soft px-1.5 py-0.5 text-[11px] font-bold text-neg">
      {dias} día{dias !== 1 ? "s" : ""} ausente{dias !== 1 ? "s" : ""}
    </span>
  );
}

/** Listado de fechas de ausencia en forma compacta. */
export function ListaAusencias({ fechas }: { fechas: string[] }) {
  if (fechas.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {fechas.map((f) => {
        const d = new Date(`${f}T12:00:00`);
        const label = d.toLocaleDateString("es-PA", { day: "numeric", month: "short" });
        return (
          <span key={f} className="rounded bg-neg-soft px-1.5 py-0.5 text-[9px] font-semibold text-neg">
            {label}
          </span>
        );
      })}
    </div>
  );
}

/** Panel de resumen: lista de asesores con ausencias ordenados de mayor a menor. */
export function ResumenAusencias({ gestores, mesMTD }: { gestores: MTDData["gestores"]; mesMTD: string }) {
  const conAusencia = [...gestores]
    .filter((g) => g.dias_ausente > 0)
    .sort((a, b) => b.dias_ausente - a.dias_ausente);

  if (conAusencia.length === 0)
    return <p className="py-6 text-center text-sm text-ink-ter">Sin ausencias registradas en {mesMTD}.</p>;

  return (
    <div className="divide-y divide-line">
      {conAusencia.map((g) => (
        <AsesorAusenciaRow key={g.gestor} g={g} />
      ))}
    </div>
  );
}

function AsesorAusenciaRow({ g }: { g: Gestor }) {
  const titulo = (n: string) =>
    n.split(" ").map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(" ");
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-ink">{titulo(g.gestor)}</span>
          <AusenciaBadge dias={g.dias_ausente} />
        </div>
        <div className="mt-0.5 text-[10px] text-ink-ter">
          {g.cartera_principal} · cumpl.{" "}
          {g.cumplimiento != null ? (
            <span className={g.cumplimiento >= 100 ? "text-pos font-semibold" : g.cumplimiento >= 90 ? "text-warn font-semibold" : "text-neg font-semibold"}>
              {Math.round(g.cumplimiento)}%
            </span>
          ) : "sin meta"}{" "}
          · score {fmtNum(Math.round(g.score))}
        </div>
        <ListaAusencias fechas={g.dias_ausencia_list} />
      </div>
    </div>
  );
}
