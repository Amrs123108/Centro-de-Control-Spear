"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Layers, Sparkles } from "lucide-react";

export type Tema = "clasico" | "vidrio";

const CLAVE = "spear-tema";

type Ctx = { tema: Tema; alternar: () => void; definir: (t: Tema) => void };

const TemaContext = createContext<Ctx | null>(null);

/** Lee/escribe el tema activo y lo refleja en <html data-tema>. */
export function TemaProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>("vidrio");

  // Al montar, sincroniza con la preferencia ya aplicada por el script anti-parpadeo.
  useEffect(() => {
    const actual = document.documentElement.dataset.tema;
    if (actual === "clasico") setTema("clasico");
  }, []);

  function definir(t: Tema) {
    setTema(t);
    document.documentElement.dataset.tema = t;
    try {
      localStorage.setItem(CLAVE, t);
    } catch {
      /* almacenamiento no disponible */
    }
  }

  function alternar() {
    definir(tema === "vidrio" ? "clasico" : "vidrio");
  }

  return (
    <TemaContext.Provider value={{ tema, alternar, definir }}>
      {children}
    </TemaContext.Provider>
  );
}

export function useTema(): Ctx {
  const ctx = useContext(TemaContext);
  if (!ctx) throw new Error("useTema debe usarse dentro de <TemaProvider>");
  return ctx;
}

/** Botón flotante para alternar el sistema visual en vivo. */
export function BotonTema() {
  const { tema, alternar } = useTema();
  const vidrio = tema === "vidrio";
  const Icono = vidrio ? Sparkles : Layers;

  return (
    <button
      onClick={alternar}
      title={vidrio ? "Cambiar a tema Clásico" : "Cambiar a tema Vidrio (institucional)"}
      aria-label="Alternar tema visual"
      suppressHydrationWarning
      className="fixed bottom-5 right-5 z-[120] flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3.5 py-2 text-xs font-semibold text-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-md transition hover:border-white/30 hover:bg-black/55"
    >
      <Icono className="h-4 w-4" />
      <span suppressHydrationWarning>{vidrio ? "Vidrio" : "Clásico"}</span>
    </button>
  );
}
