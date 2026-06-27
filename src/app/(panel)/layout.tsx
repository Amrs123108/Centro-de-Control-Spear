import { redirect } from "next/navigation";
import { BarraComando, RailIconos } from "@/components/nav";
import { FondoTecno } from "@/components/fondo-tecno";
import { MarcaFondo } from "@/components/marca";
import { obtenerSesion } from "@/lib/auth";

export default async function PanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <BarraComando sesion={sesion} />
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
