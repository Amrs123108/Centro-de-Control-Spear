"use client";

/**
 * Kit cinético del Centro de Control — el lenguaje de movimiento de la
 * plataforma: scroll con inercia, intro de carga, tipografía que se revela
 * palabra por palabra, marquesinas gigantes, parallax y cursor propio.
 */

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { LogoSpear } from "@/components/marca";

function movimientoReducido() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ── Scroll con inercia (Lenis) ─────────────────────────────────────────── */

export function ScrollSuave() {
  useEffect(() => {
    if (movimientoReducido()) return;
    const lenis = new Lenis({ lerp: 0.095 });
    let frame: number;
    const raf = (t: number) => {
      lenis.raf(t);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);
  return null;
}

/* ── Intro de carga: la lanza abre la plataforma ────────────────────────── */

export function IntroSpear() {
  const [fase, setFase] = useState<"oculto" | "intro" | "saliendo">("oculto");

  useEffect(() => {
    if (sessionStorage.getItem("spear_intro") || movimientoReducido()) return;
    sessionStorage.setItem("spear_intro", "1");
    setFase("intro");
    const t1 = setTimeout(() => setFase("saliendo"), 2150);
    const t2 = setTimeout(() => setFase("oculto"), 3150);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (fase === "oculto") return null;
  return (
    <div
      className={`intro-cortina fixed inset-0 z-[120] flex flex-col items-center justify-center bg-navy ${
        fase === "saliendo" ? "intro-fuera" : ""
      }`}
      aria-hidden="true"
    >
      <div className="overflow-hidden px-6">
        <div className="intro-logo">
          <LogoSpear className="h-16 w-auto sm:h-20" tono="claro" />
        </div>
      </div>
      <div className="intro-linea mt-7 h-px w-56 origin-left bg-gradient-to-r from-accent via-white/60 to-gold" />
      <div className="intro-lema mt-5 text-[10px] font-bold uppercase tracking-[0.5em] text-white/55">
        Somos guerreros
      </div>
    </div>
  );
}

/* ── Hook compartido: detectar entrada en pantalla ──────────────────────── */

function useEnPantalla<T extends HTMLElement>(margen = "-60px") {
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
    // Respaldo: lo que ya está en pantalla al montar se revela siempre
    const respaldo = setTimeout(() => {
      if (el.getBoundingClientRect().top < window.innerHeight) {
        setVisible(true);
        obs.disconnect();
      }
    }, 350);
    return () => {
      obs.disconnect();
      clearTimeout(respaldo);
    };
  }, [margen]);
  return { ref, visible };
}

/* ── Titulares que se revelan palabra por palabra ───────────────────────── */

export function PalabrasReveladas({
  texto,
  doradas = [],
  className = "",
  retraso = 0,
  paso = 70,
}: {
  texto: string;
  /** Palabras (sin puntuación) que se pintan en dorado */
  doradas?: string[];
  className?: string;
  retraso?: number;
  paso?: number;
}) {
  const { ref, visible } = useEnPantalla<HTMLSpanElement>("-30px");
  const palabras = texto.split(" ");
  return (
    <span ref={ref} className={`${visible ? "visible" : ""} ${className}`}>
      {palabras.map((p, i) => {
        const limpia = p.replace(/[.,:;!?]/g, "");
        const dorada = doradas.includes(limpia);
        return (
          <span key={i} className="palabra-mascara">
            <span
              className={`palabra ${dorada ? "text-gold" : ""}`}
              style={{ transitionDelay: `${retraso + i * paso}ms` }}
            >
              {p}
              {i < palabras.length - 1 ? " " : ""}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/* ── Marquesina gigante de identidad ────────────────────────────────────── */

export function MarquesinaGigante({
  frases,
  className = "",
  duracion = 38,
  trazo = false,
}: {
  frases: string[];
  className?: string;
  /** Segundos por vuelta */
  duracion?: number;
  /** true: texto hueco (solo contorno) */
  trazo?: boolean;
}) {
  const bloque = (clave: string) => (
    <div key={clave} className="flex shrink-0 items-center">
      {frases.map((f, i) => (
        <span key={i} className="flex items-center">
          <span
            className={`whitespace-nowrap text-[11vw] font-extrabold uppercase leading-none tracking-tight lg:text-[88px] ${
              trazo ? "texto-trazo" : ""
            }`}
          >
            {f}
          </span>
          <span className="mx-8 inline-block h-3 w-3 rotate-45 bg-gold lg:mx-12" />
        </span>
      ))}
    </div>
  );
  return (
    <div
      className={`pointer-events-none select-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div
        className="marquesina-pista flex w-max"
        style={{ animationDuration: `${duracion}s` }}
      >
        {bloque("a")}
        {bloque("b")}
      </div>
    </div>
  );
}

/* ── Parallax sutil al hacer scroll ─────────────────────────────────────── */

export function Parallax({
  children,
  velocidad = 0.12,
  className = "",
}: {
  children: React.ReactNode;
  velocidad?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || movimientoReducido()) return;
    let frame = 0;
    const mover = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const desvio =
        (r.top + r.height / 2 - window.innerHeight / 2) * velocidad;
      el.style.transform = `translate3d(0, ${desvio.toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(mover);
    };
    mover();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [velocidad]);
  return (
    <div ref={ref} className={`will-change-transform ${className}`}>
      {children}
    </div>
  );
}

/* ── Cursor propio: un anillo que persigue al puntero ───────────────────── */

export function CursorSpear() {
  const anillo = useRef<HTMLDivElement>(null);
  const punto = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches || movimientoReducido())
      return;
    const a = anillo.current!;
    const p = punto.current!;
    let mx = -100;
    let my = -100;
    let ax = -100;
    let ay = -100;
    let grande = false;
    let frame: number;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      p.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%,-50%)`;
      p.style.opacity = "1";
      a.style.opacity = "1";
    };
    const onOver = (e: MouseEvent) => {
      grande = !!(e.target as HTMLElement).closest(
        "a, button, [role=button], input, select, label, .cursor-grande"
      );
    };
    const tick = () => {
      ax += (mx - ax) * 0.16;
      ay += (my - ay) * 0.16;
      a.style.transform = `translate3d(${ax}px, ${ay}px, 0) translate(-50%,-50%) scale(${grande ? 2.1 : 1})`;
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <div ref={punto} className="cursor-punto" aria-hidden="true" />
      <div ref={anillo} className="cursor-anillo" aria-hidden="true" />
    </>
  );
}
