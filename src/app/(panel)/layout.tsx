import { redirect } from "next/navigation";
import Sidebar from "@/components/sidebar";
import { obtenerSesion } from "@/lib/auth";

export default async function PanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  return (
    <div className="flex min-h-screen">
      {/* Atmósfera de la sala de mando: malla y masas de luz tras todo el panel */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <div className="malla-fondo absolute inset-0" />
        <div
          className="aurora aurora-a h-[560px] w-[560px] opacity-25"
          style={{ top: "-220px", right: "10%", background: "#1b4fd8" }}
        />
        <div
          className="aurora aurora-b h-[480px] w-[480px] opacity-20"
          style={{ bottom: "-240px", left: "30%", background: "#1a3158" }}
        />
      </div>
      <Sidebar sesion={sesion} />
      <main className="relative min-w-0 flex-1 overflow-x-hidden px-8 py-7">
        {children}
      </main>
    </div>
  );
}
