import {
  AlertTriangle,
  Award,
  CalendarRange,
  Info,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import mtdData from "@/data/mtd_gestores.json";
import supervisoresData from "@/data/supervisores.json";
import { obtenerSesion } from "@/lib/auth";
import { fmtNum, fmtPct } from "@/lib/formato";
import { GraficoHoras } from "@/components/graficos";
import { Barra, ChipNivel, ChipsAlerta, Tip } from "@/components/ui";
import { LogoCartera } from "@/components/logo-cartera";
import { BentoOperativo } from "@/components/bento-operativo";
import { TablaSupervisores } from "@/components/tabla-supervisores";
import { RankingSupervisores } from "@/components/ranking-supervisores";
import { MatrizCarteras } from "@/components/matriz-carteras";
import { Revelar } from "@/components/animados";
import type { Alerta, MTDData } from "@/types/mtd";

const mtd = mtdData as unknown as MTDData;

const DEF_PTP_RESUMEN =
  "PTP (Promise To Pay / promesa de pago): de cada cliente con quien SÍ se logró hablar, qué porcentaje se comprometió a pagar.";

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

function fechaLarga(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-PA", {
    day: "numeric",
    month: "long",
  });
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
  sub?: React.ReactNode;
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
  const dias = mtd.dias_procesados;
  const carteras = [...mtd.carteras].sort((a, b) => b.score - a.score);
  const supervisores = supervisoresData.supervisores as Record<string, string>;
  const gerentes = supervisoresData.gerentes as Record<string, string>;
  const cargos = supervisoresData._cargos as Record<string, string>;
  const ranking = mtd.gestores.slice(0, 8);
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

  const totalNiveles = r.gestores_elite + r.gestores_solido + r.gestores_promedio + r.gestores_bajo;
  const niveles = [
    { k: "Élite", n: r.gestores_elite, clase: "bg-pos" },
    { k: "Sólido", n: r.gestores_solido, clase: "bg-accent-claro" },
    { k: "Promedio", n: r.gestores_promedio, clase: "bg-warn" },
    { k: "Bajo", n: r.gestores_bajo, clase: "bg-neg" },
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado + rango de fechas explícito */}
      <header className="anim-subir flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink">
            {saludo()}, {sesion?.nombre.split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-sm text-ink-sec">Resumen operativo del equipo</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-xs">
          <CalendarRange className="h-4 w-4 text-accent-claro" />
          <span className="text-ink-sec">
            Información del <span className="font-semibold text-ink">{fechaLarga(dias[0])}</span> al{" "}
            <span className="font-semibold text-ink">{fechaLarga(dias[dias.length - 1])}</span>
          </span>
          <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent-claro">
            {dias.length} días
          </span>
        </div>
      </header>

      {/* PULSO — bento: 3 métricas operativas + evolución del mes */}
      <BentoOperativo
        datos={{
          gestiones: r.total_gestiones,
          gestionesPorDia: r.gestiones_por_dia,
          efectivas: r.total_efectivas,
          tasaContacto: r.tasa_contacto,
          promesas: r.total_promesas,
          ptpRate: r.ptp_rate,
          diasProcesados: r.dias_procesados,
          serie: mtd.tendencia_diaria,
        }}
      />

      {/* RANKING DE SUPERVISORES — mejor a peor, dividido por gerencia */}
      <Revelar>
        <Panel
          titulo="Ranking de supervisores"
          sub="Del mejor al peor por score ponderado, separado por la gerencia a la que reporta cada líder — para comparar qué equipo va mejor"
        >
          <RankingSupervisores
            carteras={carteras}
            supervisores={supervisores}
            gerentes={gerentes}
            cargos={cargos}
          />
        </Panel>
      </Revelar>

      {/* SUPERVISORES — tabla comparativa por líder, junto al bento */}
      <Revelar>
        <Panel
          titulo="Supervisores"
          sub="Cada líder con sus carteras y métricas del mes · editable en src/data/supervisores.json"
        >
          <TablaSupervisores carteras={carteras} supervisores={supervisores} />
        </Panel>
      </Revelar>

      {/* MATRIZ DE CARTERAS — ordenable */}
      <Revelar>
        <Panel
          titulo="Matriz de carteras"
          sub="Cada cliente contra el promedio del equipo · clic en una columna para reordenar"
          accion={
            <Link href="/carteras" className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-accent-claro transition hover:border-accent/40">
              Detalle →
            </Link>
          }
        >
          <MatrizCarteras carteras={carteras} bm={bm} />
        </Panel>
      </Revelar>

      {/* TABLA DE POSICIONES (antes "Las lanzas") */}
      <Revelar>
        <Panel
          titulo="Tabla de posiciones del mes"
          sub={
            <>
              Top 8 por <Tip texto="Puntaje 0–100 que combina resultado (promesas/día), conversión (PTP), contactabilidad y volumen, comparado contra el equipo.">score</Tip>{" "}
              compuesto del equipo
            </>
          }
          accion={<Link href="/asesores" className="text-xs font-medium text-accent-claro hover:underline">Todos →</Link>}
        >
          <ListaAsesores asesores={ranking} supervisores={supervisores} />
        </Panel>
      </Revelar>

      {/* RITMO POR HORA */}
      <Revelar>
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
      </Revelar>

      {/* ───── ZONA DE ATENCIÓN (al final, aún por trabajar) ───── */}
      <div className="border-t border-line/60 pt-2">
        <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-ter">
          <AlertTriangle className="h-3.5 w-3.5" />
          Zona de atención · en construcción
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel titulo="Lo que exige atención" sub="Hallazgos automáticos del mes">
            <div className="space-y-2.5">
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

          <Panel
            titulo="Asesores con alerta"
            sub={`${r.gestores_con_alerta} asesores con al menos una señal de desempeño`}
            accion={<Link href="/asesores" className="text-xs font-medium text-accent-claro hover:underline">Gestionar →</Link>}
          >
            {atencion.length > 0 ? (
              <ListaAsesores asesores={atencion} supervisores={supervisores} mostrarAlertas />
            ) : (
              <p className="py-8 text-center text-sm text-ink-ter">Sin alertas de desempeño este mes.</p>
            )}
          </Panel>
        </div>
      </div>

      {/* COMPOSICIÓN DEL EQUIPO — al final por ahora */}
      <Revelar>
        <Panel
          titulo="Composición del equipo"
          sub={`${r.total_gestores} asesores evaluados contra la mediana del equipo`}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-3 flex h-3 overflow-hidden rounded-full">
                {niveles.map((nv) =>
                  nv.n > 0 ? (
                    <div key={nv.k} className={nv.clase} style={{ width: `${(nv.n / totalNiveles) * 100}%` }} title={`${nv.k}: ${nv.n}`} />
                  ) : null
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {niveles.map((nv) => (
                  <div key={nv.k} className="rounded-lg border border-line bg-canvas px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-sm ${nv.clase}`} />
                      <span className="tnum text-lg font-extrabold text-ink">{nv.n}</span>
                    </div>
                    <div className="text-[11px] text-ink-ter">{nv.k}</div>
                  </div>
                ))}
              </div>
            </div>
            <Link
              href="/asesores"
              className="flex items-center justify-center rounded-lg border border-line bg-canvas px-4 text-center text-xs font-medium text-accent-claro transition hover:border-accent/40"
            >
              Ver scoreboard completo →
            </Link>
          </div>
        </Panel>
      </Revelar>
    </div>
  );
}

function ListaAsesores({
  asesores,
  supervisores,
  mostrarAlertas = false,
}: {
  asesores: MTDData["gestores"];
  supervisores?: Record<string, string>;
  mostrarAlertas?: boolean;
}) {
  const maxProm = Math.max(...asesores.map((a) => a.promesas), 1);
  return (
    <div className="space-y-2">
      {asesores.map((g) => {
        const lider = supervisores?.[g.cartera_principal]?.trim();
        return (
          <div key={g.gestor} className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-canvas/50">
            <span className="tnum w-5 shrink-0 text-center text-xs font-bold text-ink-ter">{g.ranking}</span>
            <LogoCartera cartera={g.cartera_principal} alto={30} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-medium text-ink">
                  {g.gestor.split(" ").map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(" ")}
                </span>
                <ChipNivel nivel={g.nivel} />
              </div>
              <div className="mt-0.5 truncate text-[10px] text-ink-ter">
                {lider ? `Líder: ${lider}` : g.cartera_principal}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1"><Barra pct={(g.promesas / maxProm) * 100} tono={mostrarAlertas ? "neg" : "pos"} /></div>
                <span className="tnum shrink-0 text-right text-[11px] text-ink-sec">
                  <b className="font-semibold text-ink">{fmtNum(g.promesas)}</b> promesas
                </span>
                <span className="tnum shrink-0 text-right text-[11px] text-ink-ter">
                  {fmtPct(g.ptp_rate, 0)}{" "}
                  <Tip texto={DEF_PTP_RESUMEN}>PTP</Tip>
                </span>
              </div>
              {mostrarAlertas && <div className="mt-1.5"><ChipsAlerta alertas={g.alertas as Alerta[]} /></div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
