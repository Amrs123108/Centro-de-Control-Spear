"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Radio,
  Users,
} from "lucide-react";
import type { Sesion } from "@/lib/auth";

const RUTAS = [
  { href: "/dashboard", etiqueta: "Resumen", icono: LayoutDashboard },
  { href: "/carteras", etiqueta: "Carteras", icono: Briefcase },
  { href: "/asesores", etiqueta: "Asesores", icono: Users },
];

const ROL_ETIQUETA: Record<string, string> = {
  ADMIN: "Administrador",
  DIRECTIVO: "Directivo",
  GERENCIA: "Gerencia",
};

/* ── Barra de comando superior ─────────────────────────────────────────────── */
export function BarraComando({
  sesion,
  periodo,
  corte,
}: {
  sesion: Sesion;
  periodo: string;
  corte: string;
}) {
  const router = useRouter();

  async function salir() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-line bg-navy/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-navy/80">
      {/* Identidad */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white shadow-[0_0_16px_rgba(27,79,216,0.5)]">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20 L20 4 M20 4 L13 4 M20 4 L20 11" />
          </svg>
        </span>
        <div className="leading-none">
          <div className="text-sm font-extrabold tracking-tight text-white">SPEAR</div>
          <div className="text-[9px] uppercase tracking-[0.22em] text-white/45">Centro de Control</div>
        </div>
      </div>

      {/* Contexto: período + corte */}
      <div className="ml-2 hidden items-center gap-2 sm:flex">
        <span className="flex items-center gap-1.5 rounded-md border border-line-dark bg-surface px-2.5 py-1 text-xs font-medium text-ink-sec">
          <CalendarDays className="h-3.5 w-3.5 text-accent-claro" />
          {periodo}
          <span className="rounded bg-accent-soft px-1 text-[9px] font-bold uppercase tracking-wider text-accent-claro">MTD</span>
        </span>
        <span className="flex items-center gap-1.5 rounded-md border border-line-dark bg-surface px-2.5 py-1 text-xs text-ink-ter">
          <Radio className="h-3.5 w-3.5 text-pos" />
          {corte}
        </span>
      </div>

      {/* Usuario */}
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right leading-tight md:block">
          <div className="text-xs font-semibold text-white">{sesion.nombre}</div>
          <div className="text-[10px] text-white/45">{ROL_ETIQUETA[sesion.rol] ?? sesion.rol}</div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-light text-xs font-bold text-white">
          {sesion.nombre.charAt(0).toUpperCase()}
        </div>
        <button
          onClick={salir}
          title="Cerrar sesión"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-line-dark text-ink-ter transition hover:border-neg/40 hover:text-neg"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

/* ── Rail de iconos lateral ────────────────────────────────────────────────── */
export function RailIconos() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-14 z-30 flex h-[calc(100vh-3.5rem)] w-16 shrink-0 flex-col items-center gap-1 border-r border-line bg-navy py-4">
      {RUTAS.map(({ href, etiqueta, icono: Icono }) => {
        const activo = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            title={etiqueta}
            className={`group relative flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl transition ${
              activo
                ? "bg-accent text-white shadow-[0_0_18px_rgba(27,79,216,0.45)]"
                : "text-white/55 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icono className="h-[18px] w-[18px]" />
            <span className="text-[8px] font-semibold uppercase tracking-wide">{etiqueta}</span>
            {activo && (
              <span className="absolute -left-[1px] top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-accent-claro" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
