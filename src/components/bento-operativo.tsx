"use client";

import { PhoneCall, Target, Users } from "lucide-react";
import { fmtNum, fmtPct } from "@/lib/formato";
import { Contador } from "@/components/animados";
import { Tip } from "@/components/ui";
import { MiniBarras, GraficoTendencia } from "@/components/graficos";
import type { TendenciaDia } from "@/types/mtd";

const DEF_PTP =
  "PTP (Promise To Pay / promesa de pago): de cada cliente con quien SÍ se logró hablar, qué porcentaje se comprometió a pagar.";

/* Datos que alimentan el bento — cifras MTD + serie diaria. */
export type DatosBento = {
  gestiones: number;
  gestionesPorDia: number;
  efectivas: number;
  tasaContacto: number;
  promesas: number;
  ptpRate: number;
  diasProcesados: number;
  /** Serie diaria (orden cronológico) para sparklines y la evolución del mes. */
  serie: TendenciaDia[];
};

/* Fecha corta para las etiquetas de las mini-barras. */
function diaCorto(f: string): string {
  return new Date(`${f}T12:00:00`).toLocaleDateString("es-PA", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Bento grid operativo: las tres métricas del día (gestiones, contactos
 * efectivos, promesas) más la evolución del mes. Gestiones queda alta a la
 * izquierda; efectivas y promesas en la columna central; la evolución ocupa
 * el bloque grande de la derecha.
 */
export function BentoOperativo({ datos }: { datos: DatosBento }) {
  const barrasGest = datos.serie.map((d) => ({ etiqueta: diaCorto(d.fecha), valor: d.gestiones }));
  const barrasEfec = datos.serie.map((d) => ({ etiqueta: diaCorto(d.fecha), valor: d.efectivas }));
  const barrasProm = datos.serie.map((d) => ({ etiqueta: diaCorto(d.fecha), valor: d.promesas }));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
      {/* GESTIONES — protagonista, alta a la izquierda */}
      <article className="anim-subir relative flex flex-col justify-between overflow-hidden rounded-2xl border border-accent/25 bg-surface p-5 shadow-card lg:row-span-2">
        <span className="absolute inset-x-0 top-0 h-0.5 bg-accent-claro opacity-70" />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-ter">
              Gestiones
            </p>
            <p className="mt-1 text-xs text-ink-sec">Volumen total del mes</p>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent-claro">
            <PhoneCall className="h-4 w-4" />
          </span>
        </div>

        <div className="my-4">
          <div className="tnum text-5xl font-extrabold leading-none text-accent-claro">
            <Contador valor={datos.gestiones} />
          </div>
          <p className="mt-2 text-[13px] text-ink-sec">
            <span className="tnum font-semibold text-ink">
              {fmtNum(datos.gestionesPorDia)}
            </span>{" "}
            gestiones por día
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] text-ink-ter">
            <span>Detalle por día</span>
            <span>{barrasGest.length} días</span>
          </div>
          <div className="-mx-1 h-16">
            <MiniBarras data={barrasGest} alto={64} />
          </div>
        </div>
      </article>

      {/* CONTACTOS EFECTIVOS */}
      <article className="anim-subir relative flex flex-col justify-between overflow-hidden rounded-2xl border border-pos/25 bg-surface p-5 shadow-card" style={{ animationDelay: "80ms" }}>
        <span className="absolute inset-x-0 top-0 h-0.5 bg-pos opacity-70" />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-ter">
              Contactos efectivos
            </p>
            <p className="mt-1 text-xs text-ink-sec">
              <span className="tnum font-semibold text-pos">
                {fmtPct(datos.tasaContacto, 1)}
              </span>{" "}
              de contactabilidad
            </p>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pos-soft text-pos">
            <Users className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="tnum text-4xl font-extrabold leading-none text-pos">
            <Contador valor={datos.efectivas} />
          </div>
          <div className="h-10 w-32 shrink-0">
            <MiniBarras data={barrasEfec} color="#4fd1c5" alto={40} />
          </div>
        </div>
      </article>

      {/* EVOLUCIÓN DEL MES — bloque grande a la derecha */}
      <article className="anim-subir relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card sm:col-span-2 lg:col-span-2 lg:row-span-2" style={{ animationDelay: "120ms" }}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-ink">Evolución del mes</h3>
            <p className="mt-0.5 text-xs text-ink-ter">
              Gestiones, efectivas y promesas por día · {datos.diasProcesados} días
            </p>
          </div>
        </div>
        <div className="flex-1">
          <GraficoTendencia data={datos.serie} />
        </div>
      </article>

      {/* PROMESAS */}
      <article className="anim-subir relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#7c5cff]/25 bg-surface p-5 shadow-card" style={{ animationDelay: "160ms" }}>
        <span className="absolute inset-x-0 top-0 h-0.5 bg-[#a78bfa] opacity-70" />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-ter">
              Promesas
            </p>
            <p className="mt-1 text-xs text-ink-sec">
              <span className="tnum font-semibold text-[#b79cff]">
                {fmtPct(datos.ptpRate, 1)}
              </span>{" "}
              de los contactos terminó en promesa{" "}
              <Tip texto={DEF_PTP}>
                <span className="text-ink-ter underline decoration-dotted underline-offset-2">(PTP)</span>
              </Tip>
            </p>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1d1640] text-[#b79cff]">
            <Target className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="tnum text-4xl font-extrabold leading-none text-[#b79cff]">
            <Contador valor={datos.promesas} />
          </div>
          <div className="h-10 w-32 shrink-0">
            <MiniBarras data={barrasProm} color="#a78bfa" alto={40} />
          </div>
        </div>
      </article>
    </div>
  );
}
