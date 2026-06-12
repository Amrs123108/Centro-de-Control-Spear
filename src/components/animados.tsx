"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, Banknote, Handshake, PhoneCall } from "lucide-react";
import { fmtMoneda, fmtNum, fmtPct } from "@/lib/formato";

/* ── Hook: detectar entrada en pantalla ─────────────────────────────────── */

function useVisible<T extends HTMLElement>(margen = "-40px") {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: margen }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [margen]);
  return { ref, visible };
}

/* ── Sección que se revela al hacer scroll ──────────────────────────────── */

export function Revelar({
  children,
  retraso = 0,
  className = "",
}: {
  children: React.ReactNode;
  retraso?: number;
  className?: string;
}) {
  const { ref, visible } = useVisible<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`revelar ${visible ? "visible" : ""} ${className}`}
      style={{ transitionDelay: `${retraso}ms` }}
    >
      {children}
    </div>
  );
}

/* ── Contador que cobra vida ────────────────────────────────────────────── */

export function Contador({
  valor,
  formato = "num",
  decimales = 1,
  duracion = 1600,
  className = "",
}: {
  valor: number;
  formato?: "num" | "moneda" | "pct";
  decimales?: number;
  duracion?: number;
  className?: string;
}) {
  const { ref, visible } = useVisible<HTMLSpanElement>("0px");
  const [actual, setActual] = useState(0);

  useEffect(() => {
    if (!visible) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActual(valor);
      return;
    }
    let frame: number;
    const inicio = performance.now();
    const tick = (ahora: number) => {
      const t = Math.min((ahora - inicio) / duracion, 1);
      const easing = 1 - Math.pow(1 - t, 4); // easeOutQuart
      setActual(valor * easing);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, valor, duracion]);

  const texto =
    formato === "moneda"
      ? fmtMoneda(actual)
      : formato === "pct"
        ? fmtPct(actual, decimales)
        : fmtNum(Math.round(actual));

  return (
    <span ref={ref} className={`tnum ${className}`}>
      {texto}
    </span>
  );
}

/* ── Luz de estado (parpadea si es crítica) ─────────────────────────────── */

export function LuzAlerta({
  tono,
}: {
  tono: "rojo" | "ambar" | "verde" | "azul";
}) {
  const color = {
    rojo: "bg-neg",
    ambar: "bg-warn",
    verde: "bg-pos",
    azul: "bg-accent",
  }[tono];
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${color} ${tono === "rojo" ? "luz-roja" : ""}`}
    />
  );
}

/* ── Ticker: la operación fluyendo en vivo ──────────────────────────────── */

interface Evento {
  hora: string;
  tipo: string;
  cartera: string;
  monto: number | null;
}

const EVENTO_ESTILO: Record<
  string,
  { etiqueta: string; clase: string; icono: React.ElementType }
> = {
  PAGO: { etiqueta: "Pago", clase: "text-gold", icono: Banknote },
  PROMESA: { etiqueta: "Promesa", clase: "text-sky-300", icono: Handshake },
  CONTACTO: { etiqueta: "Contacto", clase: "text-emerald-300", icono: PhoneCall },
};

export function TickerVivo({ eventos }: { eventos: Evento[] }) {
  const pista = [...eventos, ...eventos]; // duplicado para bucle continuo
  return (
    <div className="flex items-stretch overflow-hidden rounded-xl bg-navy shadow-card">
      <div className="z-10 flex shrink-0 items-center gap-2 bg-navy-light px-4 py-2.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-70"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-pos"></span>
        </span>
        <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.18em] text-white">
          Operación en vivo
        </span>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="ticker-pista items-center gap-8 py-2.5 pl-8">
          {pista.map((e, i) => {
            const est = EVENTO_ESTILO[e.tipo] ?? EVENTO_ESTILO.CONTACTO;
            const Icono = est.icono;
            return (
              <span
                key={i}
                className="flex shrink-0 items-center gap-2 text-xs text-white/70"
              >
                <Icono className={`h-3.5 w-3.5 ${est.clase}`} />
                <span className={`font-semibold ${est.clase}`}>
                  {est.etiqueta}
                </span>
                {e.monto != null && (
                  <span className="tnum font-bold text-white">
                    {fmtMoneda(e.monto)}
                  </span>
                )}
                <span className="text-white/45">{e.cartera}</span>
                <span className="tnum text-white/35">{e.hora}</span>
              </span>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-navy to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-navy to-transparent" />
      </div>
    </div>
  );
}

/* ── Cinta de resumen: las cifras reales del corte, a paso de lectura ───── */

export function CintaResumen({
  titulo,
  items,
  duracion = 80,
}: {
  titulo: string;
  items: { etiqueta: string; valor: string; tono?: "oro" | "azul" | "verde" }[];
  /** Segundos por vuelta — lento, para que se pueda leer */
  duracion?: number;
}) {
  const tonoClase: Record<string, string> = {
    oro: "text-gold",
    azul: "text-accent-claro",
    verde: "text-pos",
  };
  const pista = [...items, ...items]; // duplicado para bucle continuo
  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="z-10 flex shrink-0 items-center gap-2 border-r border-line bg-navy px-4 py-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-gold"></span>
        </span>
        <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.18em] text-white">
          {titulo}
        </span>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div
          className="ticker-pista items-center gap-12 py-3 pl-12"
          style={{ animationDuration: `${duracion}s` }}
        >
          {pista.map((it, i) => (
            <span key={i} className="flex shrink-0 items-baseline gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-ter">
                {it.etiqueta}
              </span>
              <span
                className={`tnum text-sm font-bold ${tonoClase[it.tono ?? ""] ?? "text-ink"}`}
              >
                {it.valor}
              </span>
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-surface to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface to-transparent" />
      </div>
    </div>
  );
}

/* ── Embudo cuyas barras crecen al revelarse ────────────────────────────── */

interface EtapaFunnel {
  etapa: string;
  valor: number;
  tasa: number;
}

export function FunnelAnimado({ funnel }: { funnel: EtapaFunnel[] }) {
  const { ref, visible } = useVisible<HTMLDivElement>();
  const colores = ["bg-navy-light", "bg-accent", "bg-pos", "bg-gold"];
  return (
    <div ref={ref} className="space-y-1">
      {funnel.map((f, i) => {
        const ancho = Math.max((f.valor / funnel[0].valor) * 100, 7);
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
            <div
              className={`barra-animada flex h-11 items-center justify-between rounded-lg px-4 text-white ${colores[i]} ${i === 3 ? "text-navy" : ""}`}
              style={{
                width: visible ? `${ancho}%` : "0%",
                minWidth: visible ? "215px" : "0px",
                transitionDelay: `${i * 120}ms`,
              }}
            >
              <span
                className={`truncate text-xs font-medium ${i === 3 ? "text-navy" : ""}`}
              >
                {f.etapa}
              </span>
              <span
                className={`tnum pl-3 text-sm font-bold ${i === 3 ? "text-navy" : ""}`}
              >
                {fmtNum(f.valor)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Barra de progreso que crece ────────────────────────────────────────── */

export function BarraProgreso({
  pct,
  clase = "bg-accent",
  pista = "bg-canvas",
  alto = "h-1.5",
  retraso = 0,
}: {
  pct: number;
  clase?: string;
  pista?: string;
  alto?: string;
  retraso?: number;
}) {
  const { ref, visible } = useVisible<HTMLDivElement>("0px");
  return (
    <div
      ref={ref}
      className={`${alto} flex-1 overflow-hidden rounded-full ${pista}`}
    >
      <div
        className={`barra-animada h-full rounded-full ${clase}`}
        style={{
          width: visible ? `${Math.min(pct, 100)}%` : "0%",
          transitionDelay: `${retraso}ms`,
        }}
      />
    </div>
  );
}
