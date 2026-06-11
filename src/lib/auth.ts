import { createHash } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type Rol = "ADMIN" | "DIRECTIVO" | "GERENCIA";

export interface Usuario {
  email: string;
  nombre: string;
  rol: Rol;
  password_sha256: string;
}

export interface Sesion {
  email: string;
  nombre: string;
  rol: Rol;
}

const COOKIE = "ccs_session";
const DURACION_SEGUNDOS = 8 * 60 * 60; // jornada laboral

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET no está configurado");
  return new TextEncoder().encode(s);
}

/** Usuarios definidos en la variable de entorno CCS_USERS (JSON). */
export function usuarios(): Usuario[] {
  try {
    return JSON.parse(process.env.CCS_USERS ?? "[]") as Usuario[];
  } catch {
    return [];
  }
}

export function sha256(texto: string): string {
  return createHash("sha256").update(texto).digest("hex");
}

export async function crearSesion(u: Usuario): Promise<void> {
  const token = await new SignJWT({ nombre: u.nombre, rol: u.rol })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(u.email)
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SEGUNDOS}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_SEGUNDOS,
  });
}

export async function obtenerSesion(): Promise<Sesion | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      email: payload.sub as string,
      nombre: payload.nombre as string,
      rol: payload.rol as Rol,
    };
  } catch {
    return null;
  }
}

export async function cerrarSesion(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
