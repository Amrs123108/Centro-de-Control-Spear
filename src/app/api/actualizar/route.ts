import { spawn } from "node:child_process";
import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";

/* ── Actualizar datos del panel desde la propia plataforma ────────────────────
   Corre el ETL (python etl/generar_mtd.py --all) en la máquina donde está
   sirviéndose el panel, regenera los JSON sin PII y publica a Vercel (git push).

   SEGURIDAD: solo funciona en LOCAL (npm run dev). Se rechaza en Vercel /
   producción, porque ese entorno no tiene acceso a Z:, ni a Python, ni debe
   tocar datos crudos. Además exige sesión iniciada. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ¿Estamos corriendo en local (no Vercel ni build de producción)? */
function esLocal(): boolean {
  return !process.env.VERCEL && process.env.NODE_ENV !== "production";
}

type Resultado = { code: number; salida: string };

/** Ejecuta un comando y resuelve con su código de salida y su salida combinada
    (stdout + stderr). Nunca rechaza por código ≠ 0: el caller decide. */
function ejecutar(
  cmd: string,
  args: string[],
  timeoutMs = 10 * 60 * 1000
): Promise<Resultado> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd: process.cwd(),
      shell: process.platform === "win32", // resolver python/git desde PATH en Windows
      windowsHide: true,
    });
    let salida = "";
    const acumular = (b: Buffer) => {
      salida += b.toString();
      if (salida.length > 200_000) salida = salida.slice(-200_000); // cota de memoria
    };
    proc.stdout.on("data", acumular);
    proc.stderr.on("data", acumular);

    const t = setTimeout(() => {
      proc.kill();
      reject(new Error(`Tiempo agotado ejecutando ${cmd} ${args.join(" ")}`));
    }, timeoutMs);

    proc.on("error", (e) => {
      clearTimeout(t);
      reject(e);
    });
    proc.on("close", (code) => {
      clearTimeout(t);
      resolve({ code: code ?? -1, salida });
    });
  });
}

/** Últimas N líneas no vacías de un texto (para devolver un resumen legible). */
function cola(texto: string, n = 12): string {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
    .slice(-n)
    .join("\n");
}

export async function POST() {
  if (!esLocal()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "La actualización solo está disponible desde el equipo de datos (local). El sitio publicado no tiene acceso a las gestiones.",
      },
      { status: 403 }
    );
  }

  const sesion = await obtenerSesion();
  if (!sesion) {
    return NextResponse.json({ ok: false, error: "Sesión no válida." }, { status: 401 });
  }

  const pasos: string[] = [];
  try {
    // 1) Regenerar los JSON desde Z: + OneDrive (solo columnas seguras, sin PII).
    const etl = await ejecutar("python", ["etl/generar_mtd.py", "--all"]);
    if (etl.code !== 0) {
      return NextResponse.json(
        {
          ok: false,
          etapa: "etl",
          error: "El ETL terminó con error. Revisa que Z: y OneDrive estén disponibles.",
          detalle: cola(etl.salida),
        },
        { status: 500 }
      );
    }
    pasos.push(cola(etl.salida, 6));

    // 2) Preparar el commit de los datos regenerados.
    await ejecutar("git", ["add", "src/data"]);
    const hayCambios = await ejecutar("git", ["diff", "--cached", "--quiet"]);
    // git diff --quiet: código 0 = sin cambios, 1 = hay cambios staged.
    if (hayCambios.code === 0) {
      return NextResponse.json({
        ok: true,
        publicado: false,
        mensaje: "Datos regenerados. No había cambios nuevos que publicar (ya estaba al día).",
        detalle: pasos.join("\n"),
      });
    }

    // 3) Commit + push → Vercel redespliega.
    const commit = await ejecutar("git", ["commit", "-m", "Actualizar datos del panel"]);
    if (commit.code !== 0) {
      return NextResponse.json(
        { ok: false, etapa: "commit", error: "No se pudo crear el commit.", detalle: cola(commit.salida) },
        { status: 500 }
      );
    }
    const push = await ejecutar("git", ["push"]);
    if (push.code !== 0) {
      return NextResponse.json(
        {
          ok: false,
          etapa: "push",
          error:
            "Los datos quedaron actualizados localmente, pero no se pudieron publicar a Vercel. Revisa conexión/credenciales.",
          detalle: cola(push.salida),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      publicado: true,
      mensaje: "Datos actualizados y publicados. Vercel redesplegará el sitio en 1-2 minutos.",
      detalle: pasos.join("\n"),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error inesperado." },
      { status: 500 }
    );
  }
}
