"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { CascoGuerrero, Hexagono, LogoSpear } from "@/components/marca";
import { PalabrasReveladas } from "@/components/cinetica";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (r.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      const data = await r.json().catch(() => null);
      setError(data?.error ?? "No se pudo iniciar sesión");
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Panel de marca */}
      <div className="hero-navy relative hidden w-[45%] flex-col justify-between overflow-hidden p-12 lg:flex">
        <div
          className="aurora aurora-a h-[460px] w-[460px] opacity-50"
          style={{ top: "-180px", left: "-120px", background: "#1a3158" }}
        />
        <div
          className="aurora aurora-b h-[420px] w-[420px] opacity-40"
          style={{ bottom: "-220px", right: "-100px", background: "#1b4fd8" }}
        />
        <Hexagono className="flotante absolute right-16 top-24 h-8 w-8" />
        <Hexagono className="flotante-lento absolute bottom-40 left-12 h-5 w-5" />
        <Hexagono
          className="flotante absolute right-32 bottom-24 h-4 w-4"
          color="rgba(232,185,49,0.3)"
        />

        {/* Los guerreros de la marca custodiando el acceso */}
        <CascoGuerrero className="flotante-lento absolute -right-10 top-[30%] h-64 w-64 opacity-[0.16]" />
        <CascoGuerrero className="flotante absolute right-28 top-[44%] h-36 w-36 opacity-[0.22]" />

        <div className="relative">
          <LogoSpear className="h-14 w-auto drop-shadow-[0_0_16px_rgba(27,79,216,0.5)]" />
          <div className="mt-1 text-[10px] uppercase tracking-[0.32em] text-white/50">
            Centro de Control
          </div>
        </div>
        <div className="relative max-w-md">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-px w-10 bg-gold/60" />
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold">
              Somos más que operadores
            </span>
          </div>
          <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-tight text-white">
            <PalabrasReveladas
              texto="Somos guerreros de la recuperación."
              doradas={["guerreros"]}
              retraso={250}
            />
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-white/60">
            Indicadores de recuperación, productividad y comportamiento de
            cartera, consolidados en una sola plataforma para la dirección de
            Spear Contact.
          </p>
        </div>
        <div className="relative flex items-center gap-2 text-xs text-white/40">
          <ShieldCheck className="h-4 w-4" />
          Acceso restringido · Información confidencial
        </div>
      </div>

      {/* Formulario */}
      <div className="flex flex-1 items-center justify-center bg-canvas px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <LogoSpear className="h-12 w-auto" tono="oscuro" />
            <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-ink-ter">
              Centro de Control
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-ink">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-ink-sec">
            Ingrese sus credenciales corporativas para continuar.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-sec"
              >
                Correo corporativo
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-ter" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@spearcontact.com"
                  className="w-full rounded-lg border border-line bg-surface py-2.5 pl-10 pr-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-sec"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-ter" />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full rounded-lg border border-line bg-surface py-2.5 pl-10 pr-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-neg/25 bg-neg-soft px-3 py-2 text-sm text-neg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-navy-light disabled:opacity-60"
            >
              {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
              {cargando ? "Verificando..." : "Ingresar"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-ink-ter">
            Plataforma de uso interno. El acceso es auditado.
          </p>
        </div>
      </div>
    </div>
  );
}
