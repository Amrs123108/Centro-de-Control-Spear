"use client";

/* ── Botón "Modo enfoque" de la barra superior ──────────────────────────────
   Difumina y atenúa el fondo decorativo (circuito animado) y aplana el cromo de
   los paneles (sheen, sombras) para que los datos pasen a primer plano. No toca
   la legibilidad de los números. Alterna la clase `enfoque` en <html> y la
   recuerda en localStorage. */

import { useEffect, useState } from "react";
import { Focus } from "lucide-react";

const KEY = "modo-enfoque";

export function BotonEnfoque() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const guardado = localStorage.getItem(KEY) === "1";
    setOn(guardado);
    document.documentElement.classList.toggle("enfoque", guardado);
  }, []);

  function toggle() {
    setOn((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("enfoque", next);
      localStorage.setItem(KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      title="Modo enfoque: difumina el fondo y suaviza la interfaz para concentrarte en los datos."
      className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-semibold transition ${
        on
          ? "border-accent/60 bg-accent-soft text-accent-claro"
          : "border-line-dark text-ink-sec hover:border-accent/50 hover:text-accent-claro"
      }`}
    >
      <Focus className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{on ? "Enfoque ✓" : "Enfoque"}</span>
    </button>
  );
}
