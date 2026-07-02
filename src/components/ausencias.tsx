import { fmtNum } from "@/lib/formato";
import type { Gestor, MTDData } from "@/types/mtd";

const titulo = (n: string) =>
  n.split(" ").map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(" ");

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

/** Tabla histórica: un asesor por fila, un mes por columna, ordenado por total de días ausentes. */
export function ResumenAusenciasHistorico({ meses }: { meses: MTDData[] }) {
  const mesesOrd = [...meses].sort((a, b) => a.periodo.localeCompare(b.periodo));

  // Acumular por gestor: { cartera, dias por período }
  type Entrada = { cartera: string; periodos: Record<string, number>; total: number; mesesConAusencia: number };
  const mapa = new Map<string, Entrada>();

  for (const mtd of mesesOrd) {
    for (const g of mtd.gestores) {
      if (!mapa.has(g.gestor)) {
        mapa.set(g.gestor, { cartera: g.cartera_principal, periodos: {}, total: 0, mesesConAusencia: 0 });
      }
      const e = mapa.get(g.gestor)!;
      e.periodos[mtd.periodo] = g.dias_ausente;
      e.total += g.dias_ausente;
      if (g.dias_ausente > 0) e.mesesConAusencia++;
    }
  }

  const ranking = [...mapa.entries()]
    .filter(([, v]) => v.total > 0)
    .sort((a, b) => b[1].total - a[1].total);

  if (ranking.length === 0)
    return <p className="py-6 text-center text-sm text-ink-ter">Sin ausencias en ninguno de los períodos registrados.</p>;

  // Abreviatura de mes: primeras 3 letras capitalizadas
  const abr = (mesNombre: string) => {
    const s = mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1, 3).toLowerCase();
    return s;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-[10px] uppercase tracking-wider text-ink-ter">
            <th className="pb-2 text-left font-semibold">Asesor</th>
            {mesesOrd.map((m) => (
              <th key={m.periodo} className="pb-2 text-center font-semibold">
                {abr(m.mes_nombre)}
              </th>
            ))}
            <th className="pb-2 text-right font-semibold">Total</th>
            <th className="pb-2 text-right font-semibold">Prom/mes</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map(([nombre, data]) => {
            const prom = data.total / mesesOrd.length;
            return (
              <tr key={nombre} className="border-b border-line/40 last:border-0 hover:bg-canvas/50">
                <td className="py-2 pr-4">
                  <div className="text-[13px] font-medium text-ink">{titulo(nombre)}</div>
                  <div className="text-[10px] text-ink-ter">{data.cartera}</div>
                </td>
                {mesesOrd.map((m) => {
                  const dias = data.periodos[m.periodo];
                  if (dias === undefined)
                    return <td key={m.periodo} className="py-2 text-center text-[10px] text-ink-ter">—</td>;
                  if (dias === 0)
                    return (
                      <td key={m.periodo} className="py-2 text-center">
                        <span className="tnum rounded bg-pos/15 px-1.5 py-0.5 text-[10px] font-semibold text-pos">0</span>
                      </td>
                    );
                  return (
                    <td key={m.periodo} className="py-2 text-center">
                      <span className={`tnum rounded px-1.5 py-0.5 text-[10px] font-bold ${dias >= 3 ? "bg-neg-soft text-neg" : "bg-warn-soft text-warn"}`}>
                        {dias}d
                      </span>
                    </td>
                  );
                })}
                <td className="tnum py-2 text-right font-bold text-neg">{data.total}d</td>
                <td className="tnum py-2 pl-3 text-right text-[12px] text-ink-sec">{prom.toFixed(1)}d</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
