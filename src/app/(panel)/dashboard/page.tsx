import {
  AlertTriangle,
  Award,
  Banknote,
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
import {
  BarraProgreso,
  Contador,
  FunnelAnimado,
  LuzAlerta,
  Revelar,
  TickerVivo,
} from "@/components/animados";
import {
  MarquesinaGigante,
  PalabrasReveladas,
  Parallax,
} from "@/components/cinetica";
import { CascoGuerrero, Hexagono, LogoSpear } from "@/components/marca";

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
  {
    icono: React.ElementType;
    borde: string;
    fondo: string;
    texto: string;
    luz?: "rojo" | "ambar" | "verde" | "azul";
  }
> = {
  alerta: {
    icono: AlertTriangle,
    borde: "border-neg/25",
    fondo: "bg-neg-soft",
    texto: "text-neg",
    luz: "rojo",
  },
  oportunidad: {
    icono: Lightbulb,
    borde: "border-warn/25",
    fondo: "bg-warn-soft",
    texto: "text-warn",
    luz: "ambar",
  },
  logro: {
    icono: Award,
    borde: "border-pos/25",
    fondo: "bg-pos-soft",
    texto: "text-pos",
    luz: "verde",
  },
  info: {
    icono: Info,
    borde: "border-accent/25",
    fondo: "bg-accent-soft",
    texto: "text-accent",
    luz: "azul",
  },
};

function ChipTasa({ valor, referencia }: { valor: number; referencia: number }) {
  const ratio = referencia > 0 ? valor / referencia : 0;
  const critico = ratio < 0.75;
  const clase =
    ratio >= 1
      ? "bg-pos-soft text-pos"
      : ratio >= 0.75
        ? "bg-warn-soft text-warn"
        : "bg-neg-soft text-neg chip-critico";
  return (
    <span
      className={`tnum inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${clase}`}
      title={critico ? "Más de 25% bajo el promedio — revisar" : undefined}
    >
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
      className={`rounded-xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-float ${className}`}
    >
      <h3 className="text-sm font-semibold text-ink">{titulo}</h3>
      {subtitulo && <p className="mt-0.5 text-xs text-ink-ter">{subtitulo}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TituloSeccion({
  numero,
  titulo,
  doradas = [],
  nota,
}: {
  numero: string;
  titulo: string;
  doradas?: string[];
  nota?: string;
}) {
  return (
    <div className="mb-6 mt-14 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="numero-seccion mb-2 flex items-center gap-3 text-[11px] font-bold text-accent">
          <span>{numero}</span>
          <span className="h-px w-12 bg-accent/40" />
        </div>
        <h2 className="text-4xl font-extrabold leading-[1.02] tracking-tight text-ink lg:text-5xl">
          <PalabrasReveladas texto={titulo} doradas={doradas} />
        </h2>
      </div>
      {nota && (
        <p className="max-w-xs pb-1 text-xs leading-relaxed text-ink-ter">
          {nota}
        </p>
      )}
    </div>
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
      <header className="anim-subir mb-5 flex flex-wrap items-end justify-between gap-3">
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
      <section className="hero-navy anim-subir relative overflow-hidden rounded-2xl p-8 text-white shadow-float lg:p-12">
        {/* Atmósfera viva */}
        <div
          className="aurora aurora-a h-[420px] w-[420px] opacity-50"
          style={{ top: "-160px", left: "-80px", background: "#1a3158" }}
        />
        <div
          className="aurora aurora-b h-[380px] w-[380px] opacity-40"
          style={{ bottom: "-200px", right: "-60px", background: "#1b4fd8" }}
        />
        <Hexagono className="flotante absolute right-[28%] top-6 h-7 w-7" />
        <Hexagono className="flotante-lento absolute bottom-8 left-[38%] h-5 w-5" />
        <Hexagono
          className="flotante absolute right-10 top-1/2 h-4 w-4"
          color="rgba(232,185,49,0.25)"
        />
        {/* El guerrero vigila la operación */}
        <Parallax
          velocidad={0.07}
          className="pointer-events-none absolute -right-10 -top-8"
        >
          <CascoGuerrero className="flotante-lento h-80 w-80 opacity-[0.14]" />
        </Parallax>

        {/* Titular de la sala de mando */}
        <div className="relative z-10 mb-10 max-w-3xl">
          <div className="mb-3 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.26em] text-gold/90">
            <span className="h-px w-10 bg-gold/50" />
            La operación, en vivo
          </div>
          <h2 className="text-[44px] font-extrabold leading-[0.98] tracking-tight lg:text-[64px]">
            <PalabrasReveladas
              texto="El pulso de la recuperación."
              doradas={["recuperación"]}
              paso={90}
            />
          </h2>
        </div>

        <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.4fr_auto_1fr]">
          {/* Monto y meta */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
              Monto comprometido del día
            </div>
            <div className="latido-oro mt-2 text-[52px] font-bold leading-none text-gold">
              <Contador valor={r.monto_comprometido} formato="moneda" duracion={2000} />
            </div>
            <div className="mt-4 max-w-md">
              <div className="flex items-baseline justify-between text-xs text-white/60">
                <span>Meta diaria: {fmtMoneda(meta.monto_diario)}</span>
                <span className="tnum">
                  {restante > 0 ? `Faltan ${fmtMoneda(restante)}` : "Meta superada"}
                </span>
              </div>
              <div className="mt-1.5 flex">
                <BarraProgreso
                  pct={meta.avance * 100}
                  clase="bg-gradient-to-r from-gold/70 to-gold"
                  pista="bg-white/10"
                  alto="h-2.5"
                  retraso={300}
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
                valor: r.total_gestiones,
                formato: "num" as const,
                pie: `${fmtNum(r.gestores_activos)} gestores en ${fmtNum(r.carteras_activas)} carteras`,
              },
              {
                icono: Users,
                etiqueta: "Contacto efectivo",
                valor: r.tasa_contacto_efectivo,
                formato: "pct" as const,
                pie: `${fmtNum(r.contactos_efectivos)} titulares alcanzados`,
              },
              {
                icono: Target,
                etiqueta: "Conversión",
                valor: r.tasa_conversion,
                formato: "pct" as const,
                pie: "promesa o pago al contactar",
              },
            ].map(({ icono: Icono, etiqueta, valor, formato, pie }) => (
              <div
                key={etiqueta}
                className="con-barrido rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  <Icono className="h-3.5 w-3.5" />
                  {etiqueta}
                </div>
                <div className="mt-1 text-2xl font-bold text-white">
                  <Contador valor={valor} formato={formato} duracion={1800} />
                </div>
                <div className="mt-0.5 truncate text-[11px] text-white/45">{pie}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TICKER — la operación latiendo */}
      <div className="anim-subir-2 mt-4">
        <TickerVivo eventos={kpis.flujo_vivo} />
      </div>

      {/* Marquesina de identidad */}
      <MarquesinaGigante
        frases={["Somos guerreros", "Somos Spear"]}
        trazo
        className="-mx-8 mt-12 py-2"
      />

      {/* INSIGHTS — lo que requiere atención */}
      <section>
        <TituloSeccion
          numero="01"
          titulo="Lo que exige su atención."
          doradas={["atención"]}
          nota="Hallazgos generados automáticamente a partir de la gestión del día. Las luces rojas parpadean: hay que actuar."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {kpis.insights.map((ins, i) => {
            const e = INSIGHT_ESTILO[ins.tipo] ?? INSIGHT_ESTILO.info;
            const Icono = e.icono;
            return (
              <Revelar key={i} retraso={i * 90}>
                <div
                  className={`h-full rounded-xl border bg-surface p-4 shadow-card transition-transform hover:-translate-y-0.5 ${e.borde}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${e.fondo}`}
                    >
                      <Icono className={`h-4 w-4 ${e.texto}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-start gap-2">
                        <span className="mt-1">
                          {e.luz && <LuzAlerta tono={e.luz} />}
                        </span>
                        <span className="text-[13px] font-semibold leading-snug text-ink">
                          {ins.titulo}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-ink-sec">
                        {ins.detalle}
                      </p>
                    </div>
                  </div>
                </div>
              </Revelar>
            );
          })}
        </div>
      </section>

      {/* EMBUDO + RESULTADOS */}
      <TituloSeccion
        numero="02"
        titulo="Dónde se gana la batalla."
        doradas={["batalla"]}
        nota="El recorrido completo: del intento de contacto al compromiso de pago, y cómo se reparten los resultados."
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Revelar className="xl:col-span-3">
          <Panel
            titulo="Embudo de cobranza"
            subtitulo="Dónde se gana y dónde se pierde la recuperación"
            className="h-full"
          >
            <FunnelAnimado funnel={kpis.funnel} />
            <p className="mt-4 rounded-lg bg-canvas px-3 py-2 text-xs leading-relaxed text-ink-sec">
              <strong className="text-ink">Lectura ejecutiva:</strong> de cada 100
              intentos, {Math.round(r.tasa_contacto_efectivo * 100)} llegan al
              titular y{" "}
              {Math.round(r.tasa_contacto_efectivo * r.tasa_conversion * 100)}{" "}
              terminan en compromiso. La palanca de mayor impacto es elevar la
              contactabilidad.
            </p>
          </Panel>
        </Revelar>

        <Revelar retraso={120} className="xl:col-span-2">
          <Panel
            titulo="Resultados de gestión"
            subtitulo={`Distribución de las ${fmtNum(r.total_gestiones)} gestiones del día`}
            className="h-full"
          >
            <GraficoCategorias data={kpis.por_categoria.slice(0, 8)} />
          </Panel>
        </Revelar>
      </div>

      {/* ACTIVIDAD + RANKING */}
      <TituloSeccion
        numero="03"
        titulo="El ritmo y las lanzas."
        doradas={["lanzas"]}
        nota="Cuándo rinde más la operación y quiénes están ganando el día."
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Revelar className="xl:col-span-3">
          <Panel
            titulo="Ritmo de la operación"
            subtitulo="Gestiones y contactos efectivos por hora — la franja dorada marca la mejor contactabilidad"
            className="h-full"
          >
            <GraficoHoras data={kpis.por_hora} mejorHora={mejorHora} />
          </Panel>
        </Revelar>

        <Revelar retraso={120} className="xl:col-span-2">
          <Panel
            titulo="Las lanzas del día"
            subtitulo="Top 10 gestores por promesas conseguidas"
            className="h-full"
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
                        <BarraProgreso
                          pct={(g.promesas / maxPromesasGestor) * 100}
                          retraso={i * 80}
                        />
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
        </Revelar>
      </div>

      {/* CARTERAS — la vista del negocio */}
      <TituloSeccion
        numero="04"
        titulo="Cada cartera, una línea de ingreso."
        doradas={["ingreso"]}
        nota="Contacto y conversión de cada cliente contra el promedio de la operación. Lo que parpadea en rojo pide una conversación."
      />
      <Revelar>
        <Panel
          titulo="Desempeño por cartera"
          subtitulo="Cada cliente es una línea de ingreso: contacto y conversión contra el promedio de la operación"
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
                {kpis.por_proyecto.map((p, i) => (
                  <tr
                    key={p.proyecto}
                    className="border-b border-line/60 last:border-0 hover:bg-canvas/60"
                  >
                    <td className="py-2.5 pr-4 font-medium text-ink">{p.proyecto}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex w-28">
                          <BarraProgreso
                            pct={(p.gestiones / maxGestionesCartera) * 100}
                            clase="bg-navy"
                            retraso={i * 40}
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
                      <ChipTasa
                        valor={p.tasa_conversion}
                        referencia={promedioConversion}
                      />
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
              <span className="luz-roja inline-block h-2 w-2 rounded-full bg-neg"></span>
              Más de 25% bajo el promedio — parpadea para revisar
            </span>
          </div>
        </Panel>
      </Revelar>

      {/* CIERRE — la firma de la casa */}
      <footer className="hero-navy relative mt-14 overflow-hidden rounded-2xl p-10 text-white shadow-float lg:p-14">
        <div
          className="aurora aurora-b h-[360px] w-[360px] opacity-35"
          style={{ top: "-160px", right: "-100px", background: "#1b4fd8" }}
        />
        <Parallax
          velocidad={0.06}
          className="pointer-events-none absolute -left-8 bottom-[-30px]"
        >
          <CascoGuerrero className="h-56 w-56 opacity-[0.16]" />
        </Parallax>
        <div className="relative z-10 flex flex-col items-center text-center">
          <h2 className="text-[13vw] font-extrabold uppercase leading-[0.92] tracking-tight lg:text-[104px]">
            <PalabrasReveladas
              texto="Somos guerreros."
              doradas={["guerreros"]}
              paso={140}
            />
          </h2>
          <p className="mt-4 max-w-md text-sm text-white/55">
            Cada gestión es una lanza. Cada compromiso, una victoria para
            nuestros clientes.
          </p>
          <LogoSpear className="mt-8 h-10 w-auto opacity-90" />
          <div className="mt-6 flex items-center gap-2 text-[11px] text-white/40">
            <Banknote className="h-3.5 w-3.5" />
            Datos agregados sin información personal · Spear Contact ©{" "}
            {new Date().getFullYear()} · Centro de Control
          </div>
        </div>
      </footer>
    </div>
  );
}
