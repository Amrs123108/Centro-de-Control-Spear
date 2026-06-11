import { NextResponse } from "next/server";
import { crearSesion, sha256, usuarios } from "@/lib/auth";

export async function POST(request: Request) {
  let email = "";
  let password = "";
  try {
    const body = await request.json();
    email = String(body.email ?? "");
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida" }, { status: 400 });
  }

  const usuario = usuarios().find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  );

  if (!usuario || usuario.password_sha256 !== sha256(password)) {
    return NextResponse.json(
      { ok: false, error: "Credenciales inválidas" },
      { status: 401 }
    );
  }

  await crearSesion(usuario);
  return NextResponse.json({ ok: true });
}
