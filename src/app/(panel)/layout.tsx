import { redirect } from "next/navigation";
import { BarraComando, RailIconos } from "@/components/nav";
import { FondoTecno } from "@/components/fondo-tecno";
import { MarcaFondo } from "@/components/marca";
import { obtenerSesion } from "@/lib/auth";
import mtd from "@/data/mtd_gestores.json";

function fechaCorta(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-PA", {
    day: "numeric",
    month: "short",
  });
}

export default async function PanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  const dias = mtd.dias_procesados;
  const periodo = `${mtd.mes_nombre} ${mtd.periodo.slice(0, 4)}`;
  const corte = `Corte ${fechaCorta(dias[dias.length - 1])} · ${dias.length} días`;

  return (
    <div className="flex min-h-screen flex-col">
      <BarraComando sesion={sesion} periodo={periodo} corte={corte} />
      <div className="flex flex-1">
        <RailIconos />
        <main className="relative min-w-0 flex-1 overflow-x-hidden">
          {/* Atmósfera sutil de la sala de mando */}
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
            <FondoTecno />
            <div className="malla-fondo absolute inset-0 opacity-60" />
            <MarcaFondo className="absolute left-1/2 top-1/2 w-[78vw] max-w-[1150px] -translate-x-1/2 -translate-y-1/2 text-accent-claro" />
          </div>
          <div className="mx-auto max-w-[1480px] px-5 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
