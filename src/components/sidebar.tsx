"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Sesion } from "@/lib/auth";
import { CascoGuerrero, LogoSpear } from "@/components/marca";

const NAV = [
  { href: "/dashboard", etiqueta: "Dashboard", icono: LayoutDashboard, activo: true },
  { href: "/productividad", etiqueta: "Productividad", icono: TrendingUp, activo: false },
  { href: "/carteras", etiqueta: "Carteras", icono: Briefcase, activo: false },
  { href: "/gestores", etiqueta: "Gestores", icono: Users, activo: false },
  { href: "/reportes", etiqueta: "Reportes", icono: FileBarChart, activo: false },
];

const ROL_ETIQUETA: Record<string, string> = {
  ADMIN: "Administrador",
  DIRECTIVO: "Directivo",
  GERENCIA: "Gerencia",
};

export default function Sidebar({ sesion }: { sesion: Sesion }) {
  const pathname = usePathname();
  const router = useRouter();

  async function salir() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-navy">
      <div className="px-5 pb-5 pt-6">
        <LogoSpear className="h-12 w-full drop-shadow-[0_0_14px_rgba(27,79,216,0.35)]" />
        <div className="mt-1 text-center text-[10px] uppercase tracking-[0.3em] text-white/40">
          Centro de Control
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <CascoGuerrero className="h-7 w-7" />
          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-gold/80">
            Somos guerreros
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map(({ href, etiqueta, icono: Icono, activo }) => {
          const actual = pathname.startsWith(href);
          if (!activo) {
            return (
              <div
                key={href}
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/30"
                title="Próximamente"
              >
                <Icono className="h-[18px] w-[18px]" />
                {etiqueta}
                <span className="ml-auto rounded border border-white/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/30">
                  Pronto
                </span>
              </div>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                actual
                  ? "bg-accent font-medium text-white shadow-[0_0_18px_rgba(27,79,216,0.5)]"
                  : "text-white/60 hover:translate-x-0.5 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icono className="h-[18px] w-[18px]" />
              {etiqueta}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-light text-xs font-semibold text-white">
            {sesion.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white">
              {sesion.nombre}
            </div>
            <div className="text-[11px] text-white/45">
              {ROL_ETIQUETA[sesion.rol] ?? sesion.rol}
            </div>
          </div>
        </div>
        <button
          onClick={salir}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 py-2 text-xs font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
