import { TrendingUp } from "lucide-react";
import mtdData from "@/data/mtd_gestores.json";
import { obtenerSesion } from "@/lib/auth";
import { redirect } from "next/navigation";
import ScoreboardProductividad from "@/components/productividad";
import { LanzaSpear } from "@/components/marca";
import type { MTDData } from "@/types/mtd";

function TituloSeccion({ numero, titulo }: { numero: string; titulo: string }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-accent-claro/60">
        {numero}
      </span>
      <LanzaSpear className="h-2.5 w-16" color="rgba(91,140,255,0.6)" />
      <h2 className="text-lg font-bold tracking-tight text-ink">{titulo}</h2>
    </div>
  );
}

export default async function ProductividadPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  const data = mtdData as unknown as MTDData;

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Encabezado */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-claro">
            <TrendingUp className="h-3.5 w-3.5" />
            Productividad · MTD {data.mes_nombre} {data.periodo.slice(0, 4)}
          </div>
          <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight text-ink">
            Scoreboard del equipo
          </h1>
          <p className="mt-1 text-sm text-ink-sec">
            {data.resumen.total_gestores} gestores · {data.resumen.dias_procesados} días procesados ·{" "}
            {data.pct_mes_transcurrido}% del mes transcurrido
          </p>
        </div>
        <div className="hidden text-right lg:block">
          <div className="text-[10px] text-ink-ter">Última actualización</div>
          <div className="text-xs font-medium text-ink-sec">
            {new Date(data.generado).toLocaleString("es-PA", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>

      <TituloSeccion numero="01" titulo="Producción del mes" />
      <ScoreboardProductividad data={data} />
    </div>
  );
}
