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
      <Sidebar sesion={sesion} />
      <main className="min-w-0 flex-1 overflow-x-hidden px-8 py-7">
        {children}
      </main>
    </div>
  );
}
