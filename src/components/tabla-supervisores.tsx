import { fmtNum } from "@/lib/formato";
import { LogoCartera } from "@/components/logo-cartera";
import type { Cartera } from "@/types/mtd";

type Grupo = {
  supervisor: string;
  carteras: Cartera[];
  asesores: number;
};

function agrupar(
  carteras: Cartera[],
  supervisores: Record<string, string>
): Grupo[] {
  const mapa = new Map<string, Grupo>();
  for (const c of carteras) {
    const sup = supervisores[c.cartera]?.trim() || "Sin asignar";
    let g = mapa.get(sup);
    if (!g) {
      g = { supervisor: sup, carteras: [], asesores: 0 };
      mapa.set(sup, g);
    }
    g.carteras.push(c);
    g.asesores += c.num_asesores;
  }
  // Dentro de cada grupo, la cartera más fuerte primero (orden compartido por
  // las columnas de carteras/gestiones/promesas).
  for (const g of mapa.values()) g.carteras.sort((a, b) => b.gestiones - a.gestiones);
  const total = (g: Grupo) => g.carteras.reduce((s, c) => s + c.gestiones, 0);
  return [...mapa.values()].sort((a, b) => total(b) - total(a));
}

/* Cifra por cartera separada con "/" (mismo orden que la columna Carteras). */
function PorCartera({ valores }: { valores: number[] }) {
  return (
    <span className="tnum inline-flex flex-wrap items-center justify-end gap-1">
      {valores.map((v, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-ink-ter">/</span>}
          <span>{fmtNum(v)}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * Tabla comparativa por supervisor (líder). El líder no viene en la fuente MTD;
 * se toma del mapeo editable en src/data/supervisores.json. Cada supervisor
 * agrupa sus carteras (con logo); gestiones y promesas se muestran por cartera
 * separadas con "/".
 */
export function TablaSupervisores({
  carteras,
  supervisores,
}: {
  carteras: Cartera[];
  supervisores: Record<string, string>;
}) {
  const grupos = agrupar(carteras, supervisores);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.12em] text-ink-ter">
            <th className="py-2 pr-3 font-semibold">Supervisor</th>
            <th className="py-2 pr-3 font-semibold">Carteras</th>
            <th className="py-2 px-3 text-right font-semibold">Asesores</th>
            <th className="py-2 px-3 text-right font-semibold">Gestiones</th>
            <th className="py-2 pl-3 text-right font-semibold">Promesas</th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((g) => (
            <tr key={g.supervisor} className="border-b border-line/50 align-top transition hover:bg-canvas/40">
              <td className="py-3 pr-3 font-semibold text-ink">{g.supervisor}</td>
              <td className="py-3 pr-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                  {g.carteras.map((c, i) => (
                    <span key={c.cartera} className="inline-flex items-center gap-2">
                      {i > 0 && <span className="text-ink-ter">/</span>}
                      <LogoCartera cartera={c.cartera} alto={26} />
                    </span>
                  ))}
                </div>
              </td>
              <td className="tnum py-3 px-3 text-right text-ink-sec">{fmtNum(g.asesores)}</td>
              <td className="py-3 px-3 text-right text-ink-sec">
                <PorCartera valores={g.carteras.map((c) => c.gestiones)} />
              </td>
              <td className="py-3 pl-3 text-right font-semibold text-ink">
                <PorCartera valores={g.carteras.map((c) => c.promesas)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
