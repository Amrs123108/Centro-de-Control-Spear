"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Check, ChevronDown, Radio } from "lucide-react";
import manifestData from "@/data/periodos-manifest.json";

type PeriodoInfo = {
  periodo: string;
  mes_nombre: string;
  anio: string;
  dias: number;
  ultimo_dia: string | null;
  total_gestiones: number;
  con_metas: boolean;
};

const manifest = manifestData as { default: string; periodos: PeriodoInfo[] };

function fechaCorta(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-PA", {
    day: "numeric",
    month: "short",
  });
}

/** Selector de período en la barra superior. Cambia ?periodo=YYYY-MM
    conservando la ruta y el resto de parámetros. */
export function SelectorPeriodo() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const periodos = manifest.periodos;
  const seleccionado = searchParams.get("periodo");
  const actual =
    periodos.find((p) => p.periodo === seleccionado) ??
    periodos.find((p) => p.periodo === manifest.default) ??
    periodos[0];

  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    if (abierto) document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  function elegir(periodo: string) {
    setAbierto(false);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (periodo === manifest.default) params.delete("periodo");
    else params.set("periodo", periodo);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  if (!actual) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Botón principal: período activo */}
      <div ref={ref} className="relative">
        <button
          onClick={() => setAbierto((v) => !v)}
          className="flex items-center gap-2 rounded-md border border-line-dark bg-surface px-2.5 py-1 text-xs font-medium text-ink-sec transition hover:border-accent/40"
        >
          <CalendarDays className="h-3.5 w-3.5 text-accent-claro" />
          <span className="capitalize text-ink">
            {actual.mes_nombre} {actual.anio}
          </span>
          <span className="rounded bg-accent-soft px-1 text-[9px] font-bold uppercase tracking-wider text-accent-claro">
            MTD
          </span>
          <ChevronDown className={`h-3.5 w-3.5 transition ${abierto ? "rotate-180" : ""}`} />
        </button>

        {abierto && (
          <div className="absolute left-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-lg border border-line-dark bg-navy shadow-xl">
            <div className="border-b border-line-dark/60 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-ter">
              Período
            </div>
            <ul className="max-h-72 overflow-y-auto py-1">
              {periodos.map((p) => {
                const activo = p.periodo === actual.periodo;
                return (
                  <li key={p.periodo}>
                    <button
                      onClick={() => elegir(p.periodo)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-surface ${
                        activo ? "bg-surface/60" : ""
                      }`}
                    >
                      <Check
                        className={`h-3.5 w-3.5 shrink-0 ${activo ? "text-accent-claro" : "text-transparent"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold capitalize text-ink">
                            {p.mes_nombre} {p.anio}
                          </span>
                          {p.con_metas && (
                            <span className="rounded bg-pos-soft px-1 text-[8px] font-bold uppercase text-pos">
                              metas
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-ink-ter">
                          {p.dias} días · corte {fechaCorta(p.ultimo_dia)}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Corte del período activo */}
      <span className="hidden items-center gap-1.5 rounded-md border border-line-dark bg-surface px-2.5 py-1 text-xs text-ink-ter sm:flex">
        <Radio className="h-3.5 w-3.5 text-pos" />
        Corte {fechaCorta(actual.ultimo_dia)} · {actual.dias} días
      </span>
    </div>
  );
}
