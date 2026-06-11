import {
  Banknote,
  CheckCircle2,
  Handshake,
  PhoneCall,
  Target,
  Users,
} from "lucide-react";
import kpis from "@/data/kpis.json";
import { fmtMoneda, fmtNum, fmtPct } from "@/lib/formato";
import {
  GraficoCarteras,
  GraficoCategorias,
  GraficoHoras,
} from "@/components/graficos";

function TarjetaKPI({
  etiqueta,
  valor,
  detalle,
  icono: Icono,
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
  icono: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-ter">
          {etiqueta}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft">
          <Icono className="h-4 w-4 text-accent" />
        </div>
      </div>
      <div className="tnum mt-3 text-[28px] font-semibold leading-none text-ink">
        {valor}
      </div>
      <div className="mt-2 text-xs text-ink-sec">{detalle}</div>
    </div>
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

export default function DashboardPage() {
  const r = kpis.resumen;
  const fecha = new Date(`${r.fecha}T12:00:00`).toLocaleDateString("es-PA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-[1280px]">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Resumen Ejecutivo</h1>
          <p className="mt-0.5 text-sm capitalize text-ink-sec">{fecha}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink-sec shadow-card">
          {fmtNum(r.gestores_activos)} gestores activos ·{" "}
          {fmtNum(r.carteras_activas)} carteras
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <TarjetaKPI
          etiqueta="Gestiones realizadas"
          valor={fmtNum(r.total_gestiones)}
          detalle={`${fmtNum(r.deudores_gestionados)} deudores gestionados`}
          icono={PhoneCall}
        />
        <TarjetaKPI
          etiqueta="Contacto efectivo"
          valor={fmtPct(r.tasa_contacto_efectivo)}
          detalle={`${fmtNum(r.contactos_efectivos)} contactos con titular`}
          icono={Users}
        />
        <TarjetaKPI
          etiqueta="Conversión"
          valor={fmtPct(r.tasa_conversion)}
          detalle="Promesas + pagos sobre contactos efectivos"
          icono={Target}
        />
        <TarjetaKPI
          etiqueta="Promesas de pago"
          valor={fmtNum(r.promesas)}
          detalle="Compromisos y seguimientos PTP"
          icono={Handshake}
        />
        <TarjetaKPI
          etiqueta="Pagos confirmados"
          valor={fmtNum(r.pagos_confirmados)}
          detalle="Confirmaciones verificadas en el día"
          icono={CheckCircle2}
        />
        <TarjetaKPI
          etiqueta="Monto comprometido"
          valor={fmtMoneda(r.monto_comprometido)}
          detalle={`Ticket promedio ${fmtMoneda(r.ticket_promedio)}`}
          icono={Banknote}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel
          titulo="Actividad por hora"
          subtitulo="Gestiones totales vs. contactos efectivos"
          className="xl:col-span-3"
        >
          <GraficoHoras data={kpis.por_hora} />
        </Panel>
        <Panel
          titulo="Resultados de gestión"
          subtitulo="Distribución por categoría canónica"
          className="xl:col-span-2"
        >
          <GraficoCategorias data={kpis.por_categoria.slice(0, 8)} />
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel
          titulo="Gestión por cartera"
          subtitulo="Top 8 carteras por volumen"
          className="xl:col-span-3"
        >
          <GraficoCarteras data={kpis.por_proyecto.slice(0, 8)} />
        </Panel>
        <Panel
          titulo="Top gestores"
          subtitulo="Por promesas conseguidas (identidad protegida)"
          className="xl:col-span-2"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-ter">
                <th className="pb-2 font-semibold">Gestor</th>
                <th className="pb-2 text-right font-semibold">Gest.</th>
                <th className="pb-2 text-right font-semibold">PTP</th>
                <th className="pb-2 text-right font-semibold">Monto</th>
              </tr>
            </thead>
            <tbody>
              {kpis.top_gestores.map((g) => (
                <tr key={g.gestor} className="border-b border-line/60 last:border-0">
                  <td className="py-2 font-medium text-ink">{g.gestor}</td>
                  <td className="tnum py-2 text-right text-ink-sec">
                    {fmtNum(g.gestiones)}
                  </td>
                  <td className="tnum py-2 text-right font-semibold text-accent">
                    {fmtNum(g.promesas)}
                  </td>
                  <td className="tnum py-2 text-right text-ink-sec">
                    {fmtMoneda(g.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <footer className="mt-6 text-center text-[11px] text-ink-ter">
        Datos de demostración generados desde una muestra anonimizada · Spear
        Contact © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
