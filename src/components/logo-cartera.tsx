/* Logo de cada cartera. Archivos en public/carteras/.

   Dos clases de logo:
   - Transparentes / fondo blanco → se muestran "contain" sobre un chip blanco
     (varias marcas son azul-marino y se perderían sobre el fondo oscuro).
   - Fondo de color sólido (Tigo, Multibank, Rodelag) → no se les puede quitar el
     fondo sin borrar el wordmark; se muestran "cover" llenando un chip del color
     de la marca, así el wordmark se ve grande en lugar de un cuadrito diminuto. */

type LogoInfo = {
  src: string;
  /** Si la marca trae fondo de color: color del chip; se renderiza a sangre (cover). */
  fill?: string;
  /** Ancho del chip = alto × ratio. Menor ratio = chip más cuadrado = se recorta
      menos la altura del logo (cover). Solo aplica a logos con `fill`. */
  ratio?: number;
};

export const LOGOS: Record<string, LogoInfo> = {
  "BANISTMO ACTIVA": { src: "/carteras/banistmo.png" },
  "BANISTMO RECOVERY": { src: "/carteras/banistmo.png" },
  SURA: { src: "/carteras/sura.png" },
  // Tigo es alto (wordmark + sonrisa) → ratio menor para no recortarlo.
  TIGO: { src: "/carteras/tigo.png", fill: "#0a2c6b", ratio: 1.6 },
  BAC: { src: "/carteras/bac.png" },
  SOLVE: { src: "/carteras/solve.png" },
  KREDIYA: { src: "/carteras/krediya.png" },
  RODELAG: { src: "/carteras/rodelag.png", fill: "#1b6fb3", ratio: 2.4 },
  "BANCO LA HIPOTECARIA": { src: "/carteras/banco-la-hipotecaria.png" },
  "BANCO DELTA": { src: "/carteras/banco-delta.jpg" },
  "GLOBAL BANK": { src: "/carteras/global-bank.png" },
  AFINITI: { src: "/carteras/afiniti.png" },
  MULTIBANK: { src: "/carteras/multibank.png", fill: "#e11b22", ratio: 2.4 },
  // Caja de Ahorros: fondo azul sólido, wordmark blanco → chip a sangre del azul
  // de marca (Recovery reusa el mismo logo, como Banistmo Activa/Recovery).
  "CAJA DE AHORROS": { src: "/carteras/caja-de-ahorros.png", fill: "#0a5ca8", ratio: 2.4 },
  "CAJA DE AHORROS RECOVERY": { src: "/carteras/caja-de-ahorros.png", fill: "#0a5ca8", ratio: 2.4 },
};

export function logoDeCartera(cartera: string): LogoInfo | undefined {
  return LOGOS[cartera.trim().toUpperCase()];
}

/**
 * Chip con el logo de la cartera. Para marcas de fondo claro/transparente:
 * chip blanco + logo "contain". Para marcas de fondo sólido: chip del color de
 * la marca + logo "cover" (a sangre), recortando el relleno vacío para que el
 * wordmark se aprecie grande. Si no hay logo, cae a las iniciales.
 */
export function LogoCartera({
  cartera,
  alto = 24,
  className = "",
}: {
  cartera: string;
  /** Alto del chip en px. */
  alto?: number;
  className?: string;
}) {
  const info = logoDeCartera(cartera);

  if (!info) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-md bg-white/10 px-1.5 text-[10px] font-bold text-ink-sec ${className}`}
        style={{ height: alto }}
        title={cartera}
      >
        {cartera.slice(0, 3)}
      </span>
    );
  }

  // Fondo de color sólido → chip a sangre del color de marca.
  if (info.fill) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md shadow-sm ring-1 ring-black/10 ${className}`}
        style={{ height: alto, width: Math.round(alto * (info.ratio ?? 2.4)), background: info.fill }}
        title={cartera}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={info.src} alt={cartera} className="h-full w-full object-cover" />
      </span>
    );
  }

  // Fondo claro / transparente → chip blanco, logo contenido.
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white px-1.5 shadow-sm ring-1 ring-black/5 ${className}`}
      style={{ height: alto }}
      title={cartera}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={info.src}
        alt={cartera}
        style={{ height: alto - 8 }}
        className="w-auto object-contain"
      />
    </span>
  );
}
