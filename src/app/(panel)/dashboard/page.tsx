import {
  AlertTriangle,
  ArrowDown,
  Award,
  Banknote,
  ChevronRight,
  Info,
  Lightbulb,
  PhoneCall,
  Target,
  Users,
} from "lucide-react";
import kpis from "@/data/kpis.json";
import { obtenerSesion } from "@/lib/auth";
import { fmtMoneda, fmtNum, fmtPct } from "@/lib/formato";
import {
  GaugeMeta,
  GraficoCategorias,
  GraficoHoras,
} from "@/components/graficos";

/* ── Utilidades de presentación ─────────────────────────────────────────── */

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

function mejorHoraContacto(): number | undefined {
  const candidatas = kpis.por_hora.filter((h) => h.gestiones >= 100);
  if (!candidatas.length) return undefined;
  return candidatas.reduce((a, b) =>
    b.efectivas / b.gestiones > a.efectivas / a.gestiones ? b : a
  ).hora;
}

const INSIGHT_ESTILO: Record<
  string,
  { icono: React.ElementType; borde: string; fondo: string; texto: string }
> = {
  alerta: {
    icono: AlertTriangle,
    borde: "border-neg/25",
    fondo: "bg-neg-soft",
    texto: "text-neg",
  },
  oportunidad: {
    icono: Lightbulb,
    borde: "border-warn/25",
    fondo: "bg-warn-soft",
    texto: "text-warn",
  },
  logro: {
    icono: Award,
    borde: "border-pos/25",
    fondo: "bg-pos-soft",
    texto: "text-pos",
  },
  info: {
    icono: Info,
    borde: "border-accent/25",
    fondo: "bg-accent-soft",
    texto: "text-accent",
  },
};

function ChipTasa({ valor, referencia }: { valor: number; referencia: number }) {
  const ratio = referencia > 0 ? valor / referencia : 0;
  const clase =
    ratio >= 1
      ? "bg-pos-soft text-pos"
      : ratio >= 0.75
        ? "bg-warn-soft text-warn"
        : "bg-neg-soft text-neg";
  return (
    <span className={`tnum inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${clase}`}>
      {fmtPct(valor, 1)}
    </span>
  );
}

function Panel({
  titulo,
  subtitulo,
  children,
  className = "",
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-line bg-surface p-5 shadow-card ${className}`}
    >
      <h3 className="text-sm font-semibold text-ink">{titulo}</h3>
      {subtitulo && <p className="mt-0.5 text-xs text-ink-ter">{subtitulo}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* ── Página ─────────────────────────────────────────────────────────────── */

export default async function DashboardPage() {
  const sesion = await obtenerSesion();
  const r = kpis.resumen;
  const meta = kpis.meta;
  const restante = Math.max(meta.monto_diario - r.monto_comprometido, 0);
  const mejorHora = mejorHoraContacto();
  const maxGestionesCartera = Math.max(...kpis.por_proyecto.map((p) => p.gestiones));
  const maxPromesasGestor = Math.max(...kpis.top_gestores.map((g) => g.promesas));
  const promedioConversion = r.tasa_conversion;
  const promedioContacto = r.tasa_contacto_efectivo;

  const fecha = new Date(`${r.fecha}T12:00:00`).toLocaleDateString("es-PA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-[1320px]">
      {/* Encabezado */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">
            {saludo()}, {sesion?.nombre.split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-sm capitalize text-ink-sec">{fecha}</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink-sec shadow-card">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-pos"></span>
          </span>
          Corte de datos: {r.fecha} · {r.hora_corte}
        </div>
      </header>

      {/* HERO — el pulso del negocio */}
      <section className="hero-navy anim-subir relative overflow-hidden rounded-2xl p-7 text-white shadow-float">
        <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.4fr_auto_1fr]">
          {/* Monto y meta */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
              Monto comprometido del día
            </div>
            <div className="tnum mt-2 text-[52px] font-bold leading-none text-gold">
              {fmtMoneda(r.monto_comprometido)}
            </div>
            <div className="mt-4 max-w-md">
              <div className="flex items-baseline justify-between text-xs text-white/60">
                <span>Meta diaria: {fmtMoneda(meta.monto_diario)}</span>
                <span className="tnum">
                  {restante > 0
                    ? `Faltan ${fmtMoneda(restante)}`
                    : "Meta superada"}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold/70 to-gold"
                  style={{ width: `${Math.min(meta.avance * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/55">
              <span>
                Ticket promedio:{" "}
                <strong className="tnum text-white/85">{fmtMoneda(r.ticket_promedio)}</strong>
              </span>
              <span>
                {fmtNum(r.promesas)} promesas ·{" "}
                <strong className="tnum text-white/85">{fmtNum(r.pagos_confirmados)}</strong>{" "}
                pagos confirmados
              </span>
            </div>
          </div>

          {/* Gauge de meta */}
          <div className="hidden justify-center lg:flex">
            <GaugeMeta avance={meta.avance} />
          </div>

          {/* Indicadores operativos */}
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
            {[
              {
                icono: PhoneCall,
                etiqueta: "Gestiones",
                valor: fmtNum(r.total_gestiones),
                pie: `${fmtNum(r.gestores_activos)} gestores en ${fmtNum(r.carteras_activas)} carteras`,
              },
              {
                icono: Users,
                etiqueta: "Contacto efectivo",
                valor: fmtPct(r.tasa_contacto_efectivo),
                pie: `${fmtNum(r.contactos_efectivos)} titulares alcanzados`,
              },
              {
                icono: Target,
                etiqueta: "Conversión",
                valor: fmtPct(r.tasa_conversion),
                pie: "promesa o pago al contactar",
              },
            ].map(({ icono: Icono, etiqueta, valor, pie }) => (
              <div
                key={etiqueta}
                className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  <Icono className="h-3.5 w-3.5" />
                  {etiqueta}
                </div>
                <div className="tnum mt-1 text-2xl font-bold text-white">{valor}</div>
                <div className="mt-0.5 truncate text-[11px] text-white/45">{pie}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INSIGHTS — lo que requiere atención */}
      <section className="anim-subir-2 mt-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <ChevronRight className="h-4 w-4 text-accent" />
          Lo que requiere su atención hoy
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {kpis.insights.map((ins, i) => {
            const e = INSIGHT_ESTILO[ins.tipo] ?? INSIGHT_ESTILO.info;
            const Icono = e.icono;
            return (
              <div
                key={i}
                className={`rounded-xl border bg-surface p-4 shadow-card ${e.borde}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${e.fondo}`}
                  >
                    <Icono className={`h-4 w-4 ${e.texto}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold leading-snug text-ink">
                      {ins.titulo}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink-sec">
                      {ins.detalle}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* EMBUDO + RESULTADOS */}
      <div className="anim-subir-3 mt-5 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel
          titulo="Embudo de cobranza"
          subtitulo="Dónde se gana y dónde se pierde la recuperación"
          className="xl:col-span-3"
        >
          <div className="space-y-1">
            {kpis.funnel.map((f, i) => {
              const ancho = Math.max((f.valor / kpis.funnel[0].valor) * 100, 7);
              const colores = ["bg-navy", "bg-accent", "bg-pos", "bg-gold"];
              return (
                <div key={f.etapa}>
                  {i > 0 && (
                    <div className="flex items-center gap-1.5 py-1 pl-2 text-[11px] text-ink-ter">
                      <ArrowDown className="h-3 w-3" />
                      <span className="tnum font-semibold text-ink-sec">
                        {fmtPct(f.tasa, 1)}
                      </span>
                      pasa a la siguiente etapa
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 items-center justify-between rounded-lg px-4 text-white ${colores[i]}`}
                      style={{ width: `${ancho}%`, minWidth: "210px" }}
                    >
                      <span className="truncate text-xs font-medium">{f.etapa}</span>
                      <span className="tnum pl-3 text-sm font-bold">
                        {fmtNum(f.valor)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 rounded-lg bg-canvas px-3 py-2 text-xs leading-relaxed text-ink-sec">
            <strong className="text-ink">Lectura ejecutiva:</strong> de cada 100
            intentos, {Math.round(r.tasa_contacto_efectivo * 100)} llegan al
            titular y {Math.round(r.tasa_contacto_efectivo * r.tasa_conversion * 100)}{" "}
            terminan en compromiso. La palanca de mayor impacto es elevar la
            contactabilidad.
          </p>
        </Panel>

        <Panel
          titulo="Resultados de gestión"
          subtitulo="Distribución de las 14,756 gestiones del día"
          className="xl:col-span-2"
        >
          <GraficoCategorias data={kpis.por_categoria.slice(0, 8)} />
        </Panel>
      </div>

      {/* ACTIVIDAD + RANKING */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel
          titulo="Ritmo de la operación"
          subtitulo="Gestiones y contactos efectivos por hora — la franja dorada marca la mejor contactabilidad"
          className="xl:col-span-3"
        >
          <GraficoHoras data={kpis.por_hora} mejorHora={mejorHora} />
        </Panel>

        <Panel
          titulo="Las lanzas del día"
          subtitulo="Top 10 gestores por promesas conseguidas"
          className="xl:col-span-2"
        >
          <div className="space-y-2.5">
            {kpis.top_gestores.map((g, i) => {
              const medalla =
                i === 0
                  ? "bg-gold text-navy"
                  : i === 1
                    ? "bg-line-dark text-navy"
                    : i === 2
                      ? "bg-warn-soft text-warn"
                      : "bg-canvas text-ink-ter";
              return (
                <div key={g.gestor} className="flex items-center gap-3">
                  <div
                    className={`tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${medalla}`}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-ink">
                        {g.gestor}
                      </span>
                      <span className="tnum shrink-0 text-xs text-ink-ter">
                        {fmtNum(g.gestiones)} gest.
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{
                            width: `${(g.promesas / maxPromesasGestor) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="tnum w-8 shrink-0 text-right text-xs font-bold text-accent">
                        {g.promesas}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-ink-ter">
            Identidad protegida por política de datos. La barra indica promesas
            conseguidas.
          </p>
        </Panel>
      </div>

      {/* CARTERAS — la vista del negocio */}
      <Panel
        titulo="Desempeño por cartera"
        subtitulo="Cada cliente es una línea de ingreso: contacto y conversión contra el promedio de la operación"
        className="mt-4"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-ter">
                <th className="pb-2.5 font-semibold">Cartera</th>
                <th className="pb-2.5 font-semibold">Volumen de gestión</th>
                <th className="pb-2.5 text-center font-semibold">Contacto</th>
                <th className="pb-2.5 text-center font-semibold">Conversión</th>
                <th className="pb-2.5 text-right font-semibold">Promesas</th>
                <th className="pb-2.5 text-right font-semibold">Pagos</th>
                <th className="pb-2.5 text-right font-semibold">Monto</th>
              </tr>
            </thead>
            <tbody>
              {kpis.por_proyecto.map((p) => (
                <tr
                  key={p.proyecto}
                  className="border-b border-line/60 last:border-0 hover:bg-canvas/60"
                >
                  <td className="py-2.5 pr-4 font-medium text-ink">{p.proyecto}</td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-canvas">
                        <div
                          className="h-full rounded-full bg-navy"
                          style={{
                            width: `${(p.gestiones / maxGestionesCartera) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="tnum text-xs text-ink-sec">
                        {fmtNum(p.gestiones)}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 text-center">
                    <ChipTasa valor={p.tasa_contacto} referencia={promedioContacto} />
                  </td>
                  <td className="py-2.5 text-center">
                    <ChipTasa valor={p.tasa_conversion} referencia={promedioConversion} />
                  </td>
                  <td className="tnum py-2.5 text-right font-semibold text-accent">
                    {fmtNum(p.promesas)}
                  </td>
                  <td className="tnum py-2.5 text-right text-ink-sec">
                    {fmtNum(p.pagos)}
                  </td>
                  <td className="tnum py-2.5 text-right font-semibold text-ink">
                    {p.monto > 0 ? fmtMoneda(p.monto) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-ink-ter">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-pos"></span>
            En o sobre el promedio
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-warn"></span>
            Hasta 25% bajo el promedio
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-neg"></span>
            Más de 25% bajo el promedio — revisar
          </span>
        </div>
      </Panel>

      <footer className="mt-6 flex items-center justify-center gap-2 pb-2 text-[11px] text-ink-ter">
        <Banknote className="h-3.5 w-3.5" />
        Datos agregados sin información personal · Spear Contact ©{" "}
        {new Date().getFullYear()} · Centro de Control
      </footer>
    </div>
  );
}
