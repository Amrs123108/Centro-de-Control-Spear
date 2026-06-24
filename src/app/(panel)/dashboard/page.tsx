import {
  AlertTriangle,
  Award,
  Banknote,
  Briefcase,
  Info,
  Lightbulb,
  PhoneCall,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import mtdData from "@/data/mtd_gestores.json";
import { obtenerSesion } from "@/lib/auth";
import { fmtMoneda, fmtNum, fmtPct } from "@/lib/formato";
import { GraficoHoras, GraficoTendencia, Sparkline } from "@/components/graficos";
import { Barra, CeldaCalor, ChipNivel, ChipsAlerta, KPI, ScoreBar } from "@/components/ui";
import type { Alerta, MTDData } from "@/types/mtd";

const mtd = mtdData as unknown as MTDData;

function saludo(): string {
  const hora = Number(
    new Intl.DateTimeFormat("es-PA", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Panama",
    }).format(new Date())
  );
  if (hora < 12) return "Buenos días";
  if (hora < 18) return "Buenas tardes";
  return "Buenas noches";
}

const INSIGHT_ESTILO: Record<string, { icono: React.ElementType; clase: string }> = {
  alerta: { icono: AlertTriangle, clase: "border-neg/25 text-neg" },
  oportunidad: { icono: Lightbulb, clase: "border-warn/25 text-warn" },
  logro: { icono: Award, clase: "border-pos/25 text-pos" },
  info: { icono: Info, clase: "border-accent/25 text-accent-claro" },
};

function Panel({
  titulo,
  sub,
  children,
  accion,
  className = "",
}: {
  titulo: string;
  sub?: string;
  children: React.ReactNode;
  accion?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-5 shadow-card ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink">{titulo}</h3>
          {sub && <p className="mt-0.5 text-xs text-ink-ter">{sub}</p>}
        </div>
        {accion}
      </div>
      {children}
    </section>
  );
}

export default async function DashboardPage() {
  const sesion = await obtenerSesion();
  const r = mtd.resumen;
  const bm = mtd.benchmarks;
  const carteras = [...mtd.carteras].sort((a, b) => b.score - a.score);
  const topAsesores = mtd.gestores.slice(0, 8);
  const atencion = mtd.gestores
    .filter((g) => g.alertas.length > 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);

  const mejorHora =
    mtd.por_hora.length > 1
      ? mtd.por_hora
          .filter((h) => h.gestiones >= 50)
          .reduce((a, b) => (b.efectivas / b.gestiones > a.efectivas / a.gestiones ? b : a)).hora
      : undefined;

  const maxGest = Math.max(...carteras.map((c) => c.gestiones));
  const totalNiveles = r.gestores_elite + r.gestores_solido + r.gestores_promedio + r.gestores_bajo;
  const niveles = [
    { k: "Élite", n: r.gestores_elite, clase: "bg-pos" },
    { k: "Sólido", n: r.gestores_solido, clase: "bg-accent-claro" },
    { k: "Promedio", n: r.gestores_promedio, clase: "bg-warn" },
    { k: "Bajo", n: r.gestores_bajo, clase: "bg-neg" },
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink">
            {saludo()}, {sesion?.nombre.split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-sm text-ink-sec">
            Resumen operativo · {mtd.mes_nombre} {mtd.periodo.slice(0, 4)} ·{" "}
            <span className="text-ink-ter">
              {r.dias_procesados} días · {fmtNum(r.total_gestores)} asesores
            </span>
          </p>
        </div>
      </header>

      {/* PULSO — la cinta de KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KPI label="Gestiones" valor={fmtNum(r.total_gestiones)} sub={`${fmtNum(r.gestiones_por_dia)}/día`} icono={PhoneCall} />
        <KPI label="Contacto efectivo" valor={fmtPct(r.tasa_contacto, 1)} sub={`${fmtNum(r.total_efectivas)} titulares`} tono="accent" icono={Users} />
        <KPI label="PTP Rate" valor={fmtPct(r.ptp_rate, 1)} sub="promesa al contactar" tono="pos" icono={Target} />
        <KPI label="Promesas" valor={fmtNum(r.total_promesas)} sub={`${fmtNum(r.total_pagos)} pagos`} icono={TrendingUp} />
        <KPI label="Monto comprometido" valor={fmtMoneda(r.total_recaudo)} sub={`ticket ${fmtMoneda(r.ticket_promedio)}`} tono="gold" icono={Banknote} />
        <KPI label="Carteras activas" valor={fmtNum(mtd.carteras.length)} sub={`${fmtNum(r.total_gestores)} asesores`} icono={Briefcase} />
      </div>

      {/* COMPOSICIÓN DEL EQUIPO + INSIGHTS */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          titulo="Composición del equipo"
          sub={`Evaluación entre pares · ${r.gestores_con_alerta} asesores con alerta`}
        >
          <div className="mb-3 flex h-3 overflow-hidden rounded-full">
            {niveles.map((nv) =>
              nv.n > 0 ? (
                <div
                  key={nv.k}
                  className={nv.clase}
                  style={{ width: `${(nv.n / totalNiveles) * 100}%` }}
                  title={`${nv.k}: ${nv.n}`}
                />
              ) : null
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {niveles.map((nv) => (
              <div key={nv.k} className="flex items-center gap-2 text-xs">
                <span className={`h-2.5 w-2.5 rounded-sm ${nv.clase}`} />
                <span className="tnum font-bold text-ink">{nv.n}</span>
                <span className="text-ink-ter">{nv.k}</span>
              </div>
            ))}
          </div>
          <Link
            href="/asesores"
            className="mt-4 block rounded-lg border border-line bg-canvas px-3 py-2 text-center text-xs font-medium text-accent-claro transition hover:border-accent/40"
          >
            Ver scoreboard completo →
          </Link>
        </Panel>

        <Panel titulo="Lo que exige atención" sub="Hallazgos automáticos del mes" className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {mtd.insights.map((ins, i) => {
              const e = INSIGHT_ESTILO[ins.tipo] ?? INSIGHT_ESTILO.info;
              const Icono = e.icono;
              return (
                <div key={i} className={`rounded-lg border bg-canvas p-3 ${e.clase}`}>
                  <div className="flex items-start gap-2">
                    <Icono className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold leading-snug text-ink">{ins.titulo}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-sec">{ins.detalle}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* MATRIZ DE CARTERAS — heatmap */}
      <Panel
        titulo="Matriz de carteras"
        sub="Cada cliente contra el promedio del equipo · verde = sobre la media, rojo = bajo la media"
        accion={
          <Link href="/carteras" className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-accent-claro transition hover:border-accent/40">
            Detalle →
          </Link>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-ink-ter">
                <th className="pb-2 font-semibold">Cartera</th>
                <th className="pb-2 text-center font-semibold">Asesores</th>
                <th className="pb-2 font-semibold">Volumen</th>
                <th className="pb-2 text-center font-semibold">Contacto</th>
                <th className="pb-2 text-center font-semibold">PTP</th>
                <th className="pb-2 text-center font-semibold">Conversión</th>
                <th className="pb-2 text-right font-semibold">Promesas</th>
                <th className="pb-2 text-right font-semibold">Monto</th>
                <th className="pb-2 text-center font-semibold">14 días</th>
                <th className="pb-2 font-semibold">Score</th>
              </tr>
            </thead>
            <tbody>
              {carteras.map((c) => (
                <tr key={c.cartera} className="border-b border-line/50 last:border-0 hover:bg-canvas/50">
                  <td className="py-2.5 pr-3 font-medium text-ink">{c.cartera}</td>
                  <td className="tnum py-2.5 text-center text-ink-sec">{c.num_asesores}</td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24"><Barra pct={(c.gestiones / maxGest) * 100} /></div>
                      <span className="tnum text-xs text-ink-sec">{fmtNum(c.gestiones)}</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-center"><CeldaCalor valor={c.tasa_contacto} referencia={bm.tasa_contacto} /></td>
                  <td className="py-2.5 text-center"><CeldaCalor valor={c.ptp_rate} referencia={bm.ptp_rate} /></td>
                  <td className="py-2.5 text-center"><CeldaCalor valor={c.conversion} referencia={bm.conversion} /></td>
                  <td className="tnum py-2.5 text-right font-semibold text-accent-claro">{fmtNum(c.promesas)}</td>
                  <td className="tnum py-2.5 text-right text-ink">{c.monto > 0 ? fmtMoneda(c.monto) : "—"}</td>
                  <td className="py-2.5">
                    <div className="mx-auto w-24"><Sparkline data={c.tendencia.slice(-14)} /></div>
                  </td>
                  <td className="py-2.5"><div className="w-28"><ScoreBar score={c.score} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* TOP + ATENCIÓN */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel
          titulo="Las lanzas del mes"
          sub="Top 8 por score compuesto (resultado + conversión + contacto + volumen)"
          accion={<Link href="/asesores" className="text-xs font-medium text-accent-claro hover:underline">Todos →</Link>}
        >
          <ListaAsesores asesores={topAsesores} />
        </Panel>

        <Panel
          titulo="Requieren atención"
          sub={`${r.gestores_con_alerta} asesores con al menos una alerta de desempeño`}
          accion={<Link href="/asesores" className="text-xs font-medium text-accent-claro hover:underline">Gestionar →</Link>}
        >
          {atencion.length > 0 ? (
            <ListaAsesores asesores={atencion} mostrarAlertas />
          ) : (
            <p className="py-8 text-center text-sm text-ink-ter">Sin alertas de desempeño este mes.</p>
          )}
        </Panel>
      </div>

      {/* RITMO + TENDENCIA */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel
          titulo="Ritmo por hora"
          sub={mtd.por_hora.length > 1 ? "Gestiones y contactos efectivos · franja dorada = mejor contactabilidad" : "Sin datos de hora en los archivos"}
        >
          {mtd.por_hora.length > 1 ? (
            <GraficoHoras data={mtd.por_hora} mejorHora={mejorHora} />
          ) : (
            <p className="py-16 text-center text-sm text-ink-ter">Los archivos del mes no incluyen timestamp de hora.</p>
          )}
        </Panel>

        <Panel titulo="Evolución del mes" sub={`Gestiones, efectivas y promesas por día · ${r.dias_procesados} días`}>
          <GraficoTendencia data={mtd.tendencia_diaria} />
        </Panel>
      </div>
    </div>
  );
}

/* Lista compacta de asesores reutilizable */
function ListaAsesores({
  asesores,
  mostrarAlertas = false,
}: {
  asesores: MTDData["gestores"];
  mostrarAlertas?: boolean;
}) {
  const maxProm = Math.max(...asesores.map((a) => a.promesas), 1);
  return (
    <div className="space-y-2">
      {asesores.map((g, i) => (
        <div key={g.gestor} className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-canvas/50">
          <span className="tnum w-5 shrink-0 text-center text-xs font-bold text-ink-ter">{g.ranking}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] font-medium text-ink">
                {g.gestor.split(" ").map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(" ")}
              </span>
              <ChipNivel nivel={g.nivel} />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1"><Barra pct={(g.promesas / maxProm) * 100} tono={mostrarAlertas ? "neg" : "pos"} /></div>
              <span className="tnum w-10 shrink-0 text-right text-[11px] text-ink-sec">{fmtNum(g.promesas)} ptp</span>
              <span className="tnum w-12 shrink-0 text-right text-[11px] text-ink-ter">{fmtPct(g.ptp_rate, 0)}</span>
            </div>
            {mostrarAlertas && (
              <div className="mt-1.5"><ChipsAlerta alertas={g.alertas as Alerta[]} /></div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
