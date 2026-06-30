"use client";

/* ── Botón "Actualizar datos" de la barra superior ───────────────────────────
   Dispara el ETL + publicación (POST /api/actualizar). Solo está habilitado en
   local; en Vercel se muestra deshabilitado con una nota, porque allá no hay
   acceso a las gestiones. Al terminar con éxito, refresca la vista. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw, TriangleAlert } from "lucide-react";

type Estado = "idle" | "cargando" | "ok" | "error";

type Respuesta = {
  ok: boolean;
  mensaje?: string;
  error?: string;
  publicado?: boolean;
};

export function BotonActualizar({ disponible }: { disponible: boolean }) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("idle");
  const [mensaje, setMensaje] = useState("");

  if (!disponible) {
    return (
      <button
        type="button"
        disabled
        title="Disponible solo desde el equipo de datos (no en el sitio publicado)."
        className="hidden h-8 items-center gap-1.5 rounded-md border border-line-dark px-2.5 text-[11px] font-semibold text-ink-ter/60 lg:flex"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Actualizar
      </button>
    );
  }

  async function actualizar() {
    if (estado === "cargando") return;
    setEstado("cargando");
    setMensaje("Leyendo gestiones y publicando…");
    try {
      const res = await fetch("/api/actualizar", { method: "POST" });
      const data = (await res.json()) as Respuesta;
      if (res.ok && data.ok) {
        setEstado("ok");
        setMensaje(data.mensaje ?? "Datos actualizados.");
        router.refresh();
        setTimeout(() => setEstado("idle"), 6000);
      } else {
        setEstado("error");
        setMensaje(data.error ?? "No se pudo actualizar.");
        setTimeout(() => setEstado("idle"), 8000);
      }
    } catch {
      setEstado("error");
      setMensaje("No se pudo contactar al servidor local.");
      setTimeout(() => setEstado("idle"), 8000);
    }
  }

  const cargando = estado === "cargando";
  const Icono = estado === "ok" ? Check : estado === "error" ? TriangleAlert : RefreshCw;
  const tono =
    estado === "ok"
      ? "border-pos/40 text-pos"
      : estado === "error"
        ? "border-neg/40 text-neg"
        : "border-line-dark text-ink-sec hover:border-accent/50 hover:text-accent-claro";

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={actualizar}
        disabled={cargando}
        title="Regenera los datos desde las gestiones y publica a Vercel."
        className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-semibold transition disabled:opacity-70 ${tono}`}
      >
        <Icono className={`h-3.5 w-3.5 ${cargando ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">{cargando ? "Actualizando…" : "Actualizar"}</span>
      </button>
      {mensaje && estado !== "idle" && (
        <div
          className={`absolute right-0 top-10 z-50 w-64 rounded-lg border bg-navy px-3 py-2 text-[11px] shadow-card ${
            estado === "error" ? "border-neg/40 text-neg" : "border-line text-ink-sec"
          }`}
        >
          {mensaje}
        </div>
      )}
    </div>
  );
}
