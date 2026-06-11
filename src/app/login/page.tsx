"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";

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
      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-navy p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 0%, #1a3158 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 100% 100%, #1b4fd8 0%, transparent 55%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent font-bold text-white">
              S
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.18em] text-white">
                SPEAR CONTACT
              </div>
              <div className="text-xs tracking-wide text-white/50">
                Centro de Control
              </div>
            </div>
          </div>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-light leading-tight text-white">
            Inteligencia operativa para decisiones{" "}
            <span className="font-semibold text-white">estratégicas</span>.
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
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent font-bold text-white">
                S
              </div>
              <div>
                <div className="text-sm font-semibold tracking-[0.18em] text-navy">
                  SPEAR CONTACT
                </div>
                <div className="text-xs tracking-wide text-ink-ter">
                  Centro de Control
                </div>
              </div>
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
