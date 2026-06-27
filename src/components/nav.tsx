"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, type CSSProperties } from "react";
import {
  Briefcase,
  GitCompareArrows,
  LayoutDashboard,
  LogOut,
  Network,
  Users,
} from "lucide-react";
import type { Sesion } from "@/lib/auth";
import { LogoSpearAnimado } from "@/components/marca";
import { SelectorPeriodo } from "@/components/selector-periodo";

const RUTAS = [
  {
    href: "/dashboard", etiqueta: "Resumen", icono: LayoutDashboard,
    color: "#22d3ee", soft: "rgba(34,211,238,0.16)", mid: "rgba(34,211,238,0.5)",
  },
  {
    href: "/carteras", etiqueta: "Carteras", icono: Briefcase,
    color: "#34d399", soft: "rgba(52,211,153,0.16)", mid: "rgba(52,211,153,0.5)",
  },
  {
    href: "/asesores", etiqueta: "Asesores", icono: Users,
    color: "#a78bfa", soft: "rgba(167,139,250,0.18)", mid: "rgba(167,139,250,0.5)",
  },
  {
    href: "/supervisores", etiqueta: "Equipos", icono: Network,
    color: "#f472b6", soft: "rgba(244,114,182,0.18)", mid: "rgba(244,114,182,0.5)",
  },
  {
    href: "/comparativa", etiqueta: "Comparar", icono: GitCompareArrows,
    color: "#fbbf24", soft: "rgba(251,191,36,0.16)", mid: "rgba(251,191,36,0.5)",
  },
];

const ROL_ETIQUETA: Record<string, string> = {
  ADMIN: "Administrador",
  DIRECTIVO: "Directivo",
  GERENCIA: "Gerencia",
};

/* ── Barra de comando superior ─────────────────────────────────────────────── */
export function BarraComando({ sesion }: { sesion: Sesion }) {
  const router = useRouter();

  async function salir() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 bg-navy/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-navy/80">
      {/* Identidad — logo animado de la casa + nombre de la herramienta */}
      <div className="flex items-center gap-3">
        <LogoSpearAnimado className="h-8 w-auto drop-shadow-[0_0_12px_rgba(27,79,216,0.4)]" />
        <span className="hidden h-7 w-px bg-gradient-to-b from-transparent via-accent-claro/50 to-transparent sm:block" />
        <div className="hidden flex-col leading-none sm:flex">
          <span className="text-[15px] font-extrabold tracking-tight text-white drop-shadow-[0_0_10px_rgba(91,140,255,0.35)]">
            Centro de <span className="text-accent-claro">Control</span>
          </span>
          <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.34em] text-white/45">
            Spear · Cobranzas
          </span>
        </div>
      </div>

      {/* Contexto: selector de período + corte */}
      <div className="ml-2">
        <Suspense fallback={null}>
          <SelectorPeriodo />
        </Suspense>
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
    <nav className="sticky top-14 z-30 flex h-[calc(100vh-3.5rem)] w-16 shrink-0 flex-col items-center gap-3 py-5">
      {RUTAS.map(({ href, etiqueta, icono: Icono, color, soft, mid }) => {
        const activo = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            title={etiqueta}
            data-activo={activo}
            style={{ "--hud": color, "--hud-soft": soft, "--hud-mid": mid } as CSSProperties}
            className="hud-link relative flex flex-col items-center gap-1.5 rounded-xl py-1"
          >
            {/* Nodo HUD: anillos concéntricos (alternan estilo y dirección) +
                brillo. Giran al pasar el mouse o si la sección está activa. */}
            <span className="hud-nodo">
              <span className="hud-glow" />
              <span className="hud-anillo hud-anillo--a hud-anillo--r1" />
              <span className="hud-anillo hud-anillo--b hud-anillo--r2" />
              <span className="hud-anillo hud-anillo--a hud-anillo--r3" />
              <span className="hud-anillo hud-anillo--b hud-anillo--r4" />
              <span className="hud-diamante" />
              <span className="hud-core">
                <Icono className="h-4 w-4" />
              </span>
            </span>
            <span className="hud-label text-[8px] font-semibold uppercase tracking-wide">
              {etiqueta}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
